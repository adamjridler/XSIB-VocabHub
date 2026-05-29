import { insforge } from './insforge';

export const api = {
  getAuthToken: () => localStorage.getItem("appToken"),
  setAuthToken: (token: string) => localStorage.setItem("appToken", token),
  clearAuthToken: () => {
    localStorage.removeItem("appToken");
    localStorage.removeItem("appUser");
  },
  
  logout: async () => {
    localStorage.removeItem("appToken");
    localStorage.removeItem("appUser");
  },
  
  getUser: () => {
    const u = localStorage.getItem("appUser");
    return u ? JSON.parse(u) : null;
  },
  setUser: (user: any) => localStorage.setItem("appUser", JSON.stringify(user)),

  async login(email, password) {
    if (email === "admin@vocabhub.local" && password === "admin123!") {
       const user = { id: 'admin', uid: 'admin', email, role: 'admin', name: 'Admin' };
       this.setAuthToken('mock-admin-token');
       this.setUser(user);
       return user;
    }
    const role = (email === 'admin@nbxiaoshi.cn' || email === 'adamridler89@gmail.com') ? 'admin' : 'teacher';
    const user = { id: role, uid: role, email, role, name: role === 'admin' ? 'Admin' : 'Teacher' };
    this.setAuthToken(`mock-${role}-token`);
    this.setUser(user);
    return user;
  },

  async signup(email, password) {
    const role = (email === 'admin@nbxiaoshi.cn' || email === 'adamridler89@gmail.com') ? 'admin' : 'teacher';
    const user = { id: role, uid: role, email, role, name: role === 'admin' ? 'Admin' : 'Teacher' };
    this.setAuthToken(`mock-${role}-token`);
    this.setUser(user);
    return { requiresVerification: false };
  },

  async me() {
    return this.getUser();
  },

  async addWords(words: any[], subject: string, level: string, teacherId: string) {
    const existing = JSON.parse(localStorage.getItem('appWords') || '[]');
    const newWords = words.map((w, i) => ({
      id: Date.now().toString() + i,
      word: w.word || '',
      translation: w.translation || '',
      definition: w.definition || '',
      example: w.example || '',
      subject,
      level,
      teacher_id: teacherId
    }));
    localStorage.setItem("appWords", JSON.stringify([...existing, ...newWords]));
    return { success: true, count: words.length };
  },

  async getWords() {
    return JSON.parse(localStorage.getItem('appWords') || '[]');
  },

  async clearAllWords() {
    localStorage.setItem("appWords", "[]");
    return { success: true, msg: "Cleared" };
  },

  async deleteWord(id: string) {
    const existing = JSON.parse(localStorage.getItem('appWords') || '[]');
    localStorage.setItem("appWords", JSON.stringify(existing.filter((w: any) => w.id !== id)));
    return { success: true };
  },

  async updateWord(id: string, updates: any) {
    const existing = JSON.parse(localStorage.getItem('appWords') || '[]');
    const updated = existing.map((w: any) => w.id === id ? { ...w, ...updates } : w);
    localStorage.setItem("appWords", JSON.stringify(updated));
    return { success: true };
  },

  async generateBlanks(words: string[]) {
    return { success: false, msg: "AI functionality removed." };
  },

  async recordGameSession(game: string, score: number, maxScore: number, configId?: string) {
    // MOCK
  },

  async getGameLeaderboard(configId: string) {
    return [];
  },

  async getGameStats() {
    return { totalSessions: 0, averagePercent: 0 };
  },

  async getAccessCodes() {
    return JSON.parse(localStorage.getItem("appAccessCodes") || "[]");
  },

  async createAccessCode(code: string, name: string, gradeLevel: string) {
    const existing = JSON.parse(localStorage.getItem("appAccessCodes") || "[]");
    const newCode = { id: Date.now().toString(), code, name, grade_level: gradeLevel };
    localStorage.setItem("appAccessCodes", JSON.stringify([...existing, newCode]));
    return newCode;
  },

  async deleteAccessCode(id: string) {
    const existing = JSON.parse(localStorage.getItem("appAccessCodes") || "[]");
    localStorage.setItem("appAccessCodes", JSON.stringify(existing.filter((c: any) => c.id !== id)));
    return { success: true };
  },

  async getStudentScore() {
    return this.me(); 
  },

  async recordStudentGameSession(score: number) {
  },

  async checkIdentifier(identifier: string) {
    const existing = JSON.parse(localStorage.getItem("appAccessCodes") || "[]");
    const found = existing.find((c: any) => c.code === identifier);
    return { isCode: !!found, found: !!found };
  },

  async studentSignup(accessCode: string, password: string) {
    const user = { id: Date.now().toString(), role: 'student', access_code: accessCode, name: 'Student', high_score: 0 };
    this.setAuthToken('mock-student-token');
    this.setUser(user);
    return user;
  },

  async studentLogin(identifier: string, password: string) {
    const user = { id: Date.now().toString(), role: 'student', access_code: identifier, name: 'Student', high_score: 0 };
    this.setAuthToken('mock-student-token');
    this.setUser(user);
    return user;
  },

  async getStudentLeaderboard() {
    return [];
  },

  async getAllStudents() {
    return [];
  },

  async getStudentSessions(uid: string) {
    return [];
  },

  async deleteStudent(uid: string) {
    return { success: true };
  }
};

