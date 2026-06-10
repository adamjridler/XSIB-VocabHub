import { supabase } from './supabase';

export const api = {
  // Auth state is now managed by Supabase, but we can keep these helpers for compatibility if needed.
  getAuthToken: () => localStorage.getItem("sb-auth-token"),
  
  logout: async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.error("Signout error:", e);
    } finally {
      localStorage.removeItem("appUser");
    }
  },
  
  getUser: () => {
    const u = localStorage.getItem("appUser");
    return u ? JSON.parse(u) : null;
  },
  setUser: (user: any) => localStorage.setItem("appUser", JSON.stringify(user)),

  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Fetch profile / role
    let role = 'teacher';
    if (email === 'admin@nbxiaoshi.cn' || email === 'adamridler89@gmail.com') {
      role = 'admin';
    }

    await supabase.from('profiles').upsert({
      id: data.user.id,
      role: role,
      name: role === 'admin' ? 'Admin' : 'Teacher'
    });

    const user = { id: data.user.id, uid: data.user.id, email: data.user.email, role, name: role === 'admin' ? 'Admin' : 'Teacher' };
    this.setUser(user);
    return user;
  },

  async signup(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    let role = 'teacher';
    if (email === 'admin@nbxiaoshi.cn' || email === 'adamridler89@gmail.com') {
      role = 'admin';
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: role,
        name: role === 'admin' ? 'Admin' : 'Teacher'
      });
    }

    return { requiresVerification: false };
  },

  async me() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      // Ensure profile exists on load
      let role = 'teacher';
      const email = data.user.email || '';
      if (email === 'admin@nbxiaoshi.cn' || email === 'adamridler89@gmail.com') {
        role = 'admin';
      } else if (email.endsWith('@student.vocabhub.local')) {
        role = 'student';
      }
      
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();

      if (!profile) {
        const metadata = data.user.user_metadata || {};
        const profileName = metadata.name || (role === 'admin' ? 'Admin' : (role === 'student' ? 'Student' : 'Teacher'));
        
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: role,
          name: profileName,
          access_code: metadata.access_code || null,
          high_score: 0
        });

        // re-fetch to ensure we have the fully inserted object
        const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        profile = newProfile;
      }

      let finalRole = profile?.role || role;
      if (role === 'admin') finalRole = 'admin';

      const sessionUser = {
        id: data.user.id,
        uid: data.user.id,
        email: data.user.email,
        role: finalRole,
        name: profile?.name || (role === 'admin' ? 'Admin' : (role === 'student' ? 'Student' : 'Teacher')),
        access_code: profile?.access_code || undefined,
        high_score: profile?.high_score || 0
      };

      this.setUser(sessionUser);
      return sessionUser; // Return fresh DB user meta
    }
    return null;
  },

  async addWords(words: any[], subject: string, level: string, teacherId: string) {
    const newWords = words.map(w => ({
      word: w.word || '',
      translation: w.translation || '',
      definition: w.definition || '',
      example: w.example || '',
      subject,
      level,
      teacher_id: teacherId
    }));

    const { data, error } = await supabase.from('words').insert(newWords).select();
    if (error) throw error;
    return { success: true, count: words.length };
  },

  async getWords() {
    const { data, error } = await supabase.from('words').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error)
      return [];
    }
    return data.map((w: any) => ({ ...w, createdAt: w.created_at || w.createdAt }));
  },

  async clearAllWords() {
    const { error } = await supabase.from('words').delete().not('id', 'is', null); // Delete all
    if (error) throw error;
    return { success: true, msg: "Cleared" };
  },

  async deleteWord(id: string) {
    const { error } = await supabase.from('words').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async updateWord(id: string, updates: any) {
    const { error } = await supabase.from('words').update(updates).eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async generateBlanks(words: string[]) {
    try {
      const response = await fetch('/api/generate-blanks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words })
      });
      if (!response.ok) throw new Error('Network error');
      return await response.json();
    } catch (e) {
      console.error(e);
      return { success: false, msg: "Failed to generate.", text: "", answers: [] as any[] };
    }
  },

  lastRecorded: null as { timestamp: number, score: number, game: string } | null,

  async recordGameSession(game: string, score: number, maxScore: number, configId?: string) {
    const user = this.getUser();
    if (!user) return;
    
    // Deduplicate calls within 2 seconds
    const now = Date.now();
    if (this.lastRecorded && 
        this.lastRecorded.score === score && 
        this.lastRecorded.game === game && 
        now - this.lastRecorded.timestamp < 2000) {
      return;
    }
    this.lastRecorded = { timestamp: now, score, game };

    const { error } = await supabase.from('game_sessions').insert({
      user_id: user.id,
      game,
      score,
      max_score: maxScore,
      config_id: configId
    });
    if (error) console.error("Error recording game session:", error);

    try {
      const { data: profile } = await supabase.from('profiles').select('high_score').eq('id', user.id).single();
      const currentScore = profile?.high_score || 0;
      await supabase.from('profiles').update({ high_score: currentScore + score }).eq('id', user.id);
    } catch(err) {
      console.error("Error updating profile score:", err);
    }
  },

  async getGameLeaderboard(configId: string) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('config_id', configId)
      .order('score', { ascending: false })
      .limit(50);
      
    if (error || !data) return [];

    // Fetch profiles manually to avoid missing foreign key relation error
    const userIds = [...new Set(data.map(d => d.user_id).filter(Boolean))];
    let profilesMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, name').in('id', userIds);
      if (profilesData) {
        profilesMap = profilesData.reduce((acc: any, p: any) => ({...acc, [p.id]: p.name }), {});
      }
    }

    const mapped = data.map((row: any) => ({
      score: row.score,
      studentName: profilesMap[row.user_id] || 'Anonymous',
      userId: row.user_id
    }));

    const seen = new Set();
    const unique = [];
    for (const row of mapped) {
      if (!seen.has(row.userId)) {
        seen.add(row.userId);
        unique.push(row);
      }
    }
    return unique.slice(0, 10);
  },

  async getGameStats() {
    const { count } = await supabase.from('game_sessions').select('*', { count: 'exact', head: true });
    
    const { data: recentSessions, error } = await supabase
      .from('game_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    let recentScores: any[] = [];
    if (!error && recentSessions && recentSessions.length > 0) {
      const userIds = [...new Set(recentSessions.map((s: any) => s.user_id).filter(Boolean))];
      const { data: profilesData } = await supabase.from('profiles').select('id, name').in('id', userIds);
      const profilesMap: Record<string, string> = {};
      if (profilesData) {
        profilesData.forEach((p: any) => profilesMap[p.id] = p.name);
      }
      recentScores = recentSessions.map(s => ({
        game: s.game,
        score: s.score,
        studentName: profilesMap[s.user_id] || 'Anonymous',
        configId: s.config_id || null
      }));
    }

    return { totalSessions: count || 0, recentScores };
  },

  async getAccessCodes() {
    const { data: codes, error } = await supabase.from('access_codes').select('*').neq('code', 'SYS_PUBLIC_MESSAGE').order('created_at', { ascending: false });
    if (error || !codes) return [];

    const { data: profiles } = await supabase.from('profiles').select('id, access_code');
    const claimedMap = new Map((profiles || []).filter(p => p.access_code).map(p => [p.access_code, p.id]));

    return codes.map(c => ({
      ...c,
      claimed: claimedMap.has(c.code),
      userId: claimedMap.get(c.code) || null
    }));
  },

  async createAccessCode(code: string, name: string, gradeLevel: string) {
    const { data, error } = await supabase.from('access_codes').insert([{
      code, name, grade_level: gradeLevel
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteAccessCode(id: string) {
    const { data: codeData } = await supabase.from('access_codes').select('code').eq('id', id).maybeSingle();
    
    if (codeData && codeData.code) {
      const { data: profile } = await supabase.from('profiles').select('id').eq('access_code', codeData.code).maybeSingle();
      if (profile && profile.id) {
        try {
          await fetch('/api/delete-student', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: profile.id })
          });
        } catch (err) {
          console.error("Failed to delete user via admin API", err);
        }
      }
    }

    const { error } = await supabase.from('access_codes').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  },

  async getStudentScore() {
    return this.me(); 
  },

  async recordStudentGameSession(score: number) {
    this.recordGameSession('general', score, 100);
  },

  async checkIdentifier(identifier: string) {
    const { data: accessData, error } = await supabase.from('access_codes')
      .select('*')
      .or(`code.eq."${identifier}",name.ilike."${identifier}"`)
      .limit(1)
      .maybeSingle();

    if (error || !accessData) {
      throw new Error(`We couldn't track down an access code for "${identifier}". Please double-check with your teacher.`);
    }

    const { data: profile } = await supabase.from('profiles')
      .select('id')
      .eq('access_code', accessData.code)
      .maybeSingle();

    if (!profile && identifier.toLowerCase() !== accessData.code.toLowerCase()) {
      throw new Error(`For your first login, please use your 6-digit access code (not your name).`);
    }

    return { 
      type: profile ? 'login' : 'signup',
      accessCode: accessData.code,
      name: accessData.name
    };
  },

  // Students use pseudo-emails for auth backend
  async studentSignup(accessCode: string, password: string) {
    // Look up the registered name
    const { data: codeData } = await supabase.from('access_codes')
      .select('name')
      .eq('code', accessCode)
      .maybeSingle();
      
    const studentName = codeData?.name || accessCode;

    // We treat accessCode as a surrogate identifier.
    const pseudoEmail = `${accessCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.vocabhub.local`;
    
    // Call server to bypass email confirmation
    const res = await fetch('/api/student-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode, pseudoEmail, password, studentName })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to sign up student');
    }
    
    // Now actually log in using standard auth to generate standard session
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: password
    });
    if (signInErr) throw signInErr;

    const user = { id: signInData.user?.id, role: 'student', access_code: accessCode, name: studentName, high_score: 0 };
    this.setUser(user);
    return user;
  },

  async updatePassword(password: string) {
    const { data: { user }, error } = await supabase.auth.updateUser({
      password: password
    });
    if (error) throw error;
    return { success: true };
  },

  async resetStudentPassword(uid: string, newPassword: string) {
    const res = await fetch('/api/reset-student-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, newPassword })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to reset student password');
    }
    return true;
  },

  async resetTeacherPasswordForEmail(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname + '?mode=reset-password',
    });
    if (error) throw error;
    return true;
  },

  async confirmPasswordReset(newPassword: string) {
    // Assuming the user is returned via supabase auth callback in URL hash
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  },

  async resendVerification(email: string, _password?: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    if (error) throw error;
    return true;
  },

  async studentLogin(identifier: string, password: string) {
    const pseudoEmail = `${identifier.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.vocabhub.local`;
    const { data, error } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password: password
    });
    if (error) throw error;
    
    // Fetch real profile name
    const { data: profile } = await supabase.from('profiles')
      .select('name')
      .eq('id', data.user.id)
      .maybeSingle();

    const studentName = profile?.name || identifier;
    
    const user = { id: data.user?.id, role: 'student', access_code: identifier, name: studentName, high_score: 0 };
    this.setUser(user);
    return user;
  },

  async getHallOfFameData() {
    const { data: sessions, error } = await supabase.from('game_sessions').select('user_id, score, created_at');
    const { data: profiles } = await supabase.from('profiles').select('id, name, access_code').eq('role', 'student');
    const { data: codes } = await supabase.from('access_codes').select('code, grade_level');

    if (!sessions || !profiles) return {};

    const codeToGrade = new Map((codes || []).map(c => [c.code, c.grade_level]));
    const profileMap = new Map(profiles.map(p => [p.id, { name: p.name, gradeLevel: p.access_code ? (codeToGrade.get(p.access_code) || 'Unknown') : 'Unknown' }]));

    const monthUserScores = new Map<string, Map<string, number>>(); 

    for (const s of sessions) {
      if (!s.created_at || s.score == null) continue;
      const date = new Date(s.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthUserScores.has(monthKey)) monthUserScores.set(monthKey, new Map());
      const userMap = monthUserScores.get(monthKey)!;
      userMap.set(s.user_id, (userMap.get(s.user_id) || 0) + s.score);
    }

    const hallOfFame: Record<string, Record<string, any[]>> = {}; 

    for (const [monthKey, userMap] of monthUserScores.entries()) {
      hallOfFame[monthKey] = {};
      
      const students = Array.from(userMap.entries()).map(([userId, score]) => {
        const p: any = profileMap.get(userId) || { name: 'Unknown', gradeLevel: 'Unknown' };
        return { id: userId, name: p.name, gradeLevel: p.gradeLevel, score };
      });

      const byGrade: Record<string, any[]> = {};
      for (const st of students) {
         if (!byGrade[st.gradeLevel]) byGrade[st.gradeLevel] = [];
         byGrade[st.gradeLevel].push(st);
      }

      for (const grade in byGrade) {
        byGrade[grade].sort((a, b) => b.score - a.score);
        hallOfFame[monthKey][grade] = byGrade[grade].slice(0, 3);
      }
    }

    return hallOfFame;
  },

  async getPublicMessage() {
    const { data } = await supabase.from('access_codes').select('name').eq('code', 'SYS_PUBLIC_MESSAGE').maybeSingle();
    return data?.name || '';
  },

  async setPublicMessage(msg: string) {
    const { data } = await supabase.from('access_codes').select('id').eq('code', 'SYS_PUBLIC_MESSAGE').maybeSingle();
    if (!data) {
       await supabase.from('access_codes').insert({ code: 'SYS_PUBLIC_MESSAGE', name: msg, grade_level: 'admin' });
    } else {
       await supabase.from('access_codes').update({ name: msg }).eq('code', 'SYS_PUBLIC_MESSAGE');
    }
    return { success: true };
  },

  async getStudentLeaderboard() {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, high_score, access_code')
      .eq('role', 'student');
      
    if (error || !profiles) return [];

    const { data: codes } = await supabase.from('access_codes').select('code, grade_level');
    
    const codeToGrade = new Map((codes || []).map(c => [c.code, c.grade_level]));
    
    const results = profiles.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      highScore: profile.high_score || 0, // Used as global score
      gradeLevel: profile.access_code ? (codeToGrade.get(profile.access_code) || 'Unknown') : 'Unknown'
    }));

    return results.sort((a, b) => b.highScore - a.highScore);
  },

  async getAllStudents() {
    const { data: profiles, error } = await supabase.from('profiles').select('*').eq('role', 'student');
    if (error) {
      console.error(error);
      return [];
    }
    return profiles.map((p: any) => ({
      id: p.id,
      name: p.name,
      accessCode: p.access_code,
      highScore: p.high_score || 0
    }));
  },

  async getStudentSessions(uid: string) {
    const { data: sessions, error } = await supabase.from('game_sessions').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return sessions.map((s: any) => ({
      game: s.game,
      score: s.score,
      maxScore: s.max_score,
      createdAt: s.created_at
    }));
  },

  async resetAllScores() {
    try {
      const res = await fetch('/api/reset-all-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset scores');
      }
      return { success: true };
    } catch (err: any) {
      console.error("Error resetting scores:", err);
      return { success: false, msg: err.message };
    }
  },

  async deleteStudent(uid: string) {
    try {
      const res = await fetch('/api/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      if (!res.ok) {
        throw new Error('Failed to delete student');
      }
      return { success: true };
    } catch(err: any) {
      return { success: false, error: err.message };
    }
  }
};

