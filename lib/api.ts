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
      
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          role: role,
          name: role === 'admin' ? 'Admin' : (role === 'student' ? 'Student' : 'Teacher'),
          high_score: 0
        });
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
      studentName: profilesMap[row.user_id] || 'Anonymous'
    }));

    const seen = new Set();
    const unique = [];
    for (const row of mapped) {
      if (!seen.has(row.studentName)) {
        seen.add(row.studentName);
        unique.push(row);
      }
    }
    return unique.slice(0, 10);
  },

  async getGameStats() {
    // Stub
    return { totalSessions: 0, averagePercent: 0 };
  },

  async getAccessCodes() {
    const { data, error } = await supabase.from('access_codes').select('*');
    return data || [];
  },

  async createAccessCode(code: string, name: string, gradeLevel: string) {
    const { data, error } = await supabase.from('access_codes').insert([{
      code, name, grade_level: gradeLevel
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteAccessCode(id: string) {
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

  async getStudentLeaderboard() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, high_score')
      .eq('role', 'student')
      .order('high_score', { ascending: false })
      .limit(10);
      
    if (error) return [];
    
    return data.map((profile: any) => ({
      id: profile.id,
      name: profile.name,
      highScore: profile.high_score || 0,
      gradeLevel: 'Student'
    }));
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

