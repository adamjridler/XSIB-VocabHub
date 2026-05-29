import * as fs from 'fs';

let content = fs.readFileSync('components/TeacherDashboard.tsx', 'utf-8');
content = content.replace(/text-slate-9000/g, 'text-slate-400');
content = content.replace(/bg-sky-500 hover:bg-sky-600 text-slate-900/g, 'bg-purple-600 hover:bg-purple-700 text-white');
content = content.replace(/from-teal to-navy text-white/g, 'from-purple-600 to-purple-500 text-white');
fs.writeFileSync('components/TeacherDashboard.tsx', content);

let modalContent = fs.readFileSync('components/TeacherAuthModal.tsx', 'utf-8');
modalContent = modalContent.replace(/text-slate-9000/g, 'text-slate-400');
fs.writeFileSync('components/TeacherAuthModal.tsx', modalContent);
