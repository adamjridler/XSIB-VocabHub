import * as fs from 'fs';

let content = fs.readFileSync('components/TeacherDashboard.tsx', 'utf-8');

const replacements = [
    ['bg-slate-900', 'bg-mint'],
    ['text-slate-50', 'text-navy'],
    ['selection:bg-sky-500/30 selection:text-sky-200', 'selection:bg-cyan/30 selection:text-navy'],
    ['bg-slate-900/50', 'bg-mint/80'],
    ['border-white/10', 'border-navy/10'],
    ['text-white', 'text-navy'],
    ['bg-gradient-to-br from-sky-400 to-indigo-400 text-slate-900', 'bg-gradient-to-br from-cyan to-teal text-white'],
    ['bg-gradient-to-br from-sky-400 to-indigo-400', 'bg-gradient-to-br from-cyan to-teal'],
    ['hover:bg-white/5 hover:text-slate-200', 'hover:bg-white/40 hover:text-navy'],
    ['text-slate-400', 'text-navy/60'],
    ['text-slate-300', 'text-navy/70'],
    ['text-slate-200', 'text-navy/80'],
    ['text-slate-500', 'text-navy/50'],
    ['text-slate-600', 'text-navy/40'],
    ['bg-sky-400/10', 'bg-teal/10'],
    ['text-sky-400', 'text-teal'],
    ['text-sky-300', 'text-cyan'],
    ['bg-white/5', 'bg-white/60 backdrop-blur-md'],
    ['hover:bg-white/10', 'hover:bg-white/80'],
    ['shadow-none', 'shadow-sm'],
    ['bg-slate-950/50', 'bg-white/80'],
    ['focus:border-sky-400', 'focus:border-teal'],
    ['placeholder:text-slate-600', 'placeholder:text-navy/40'],
    ['text-emerald-400', 'text-teal'],
    ['from-emerald-400 to-teal-500 text-slate-950', 'from-teal to-navy text-white'],
    ['border-none transition-all', 'shadow-md shadow-teal/20 transition-all'],
    ['text-red-400', 'text-red-600'],
    ['text-red-200', 'text-red-700'],
    ['bg-red-500/20', 'bg-red-100 border border-red-200']
];

for (const [oldVal, newVal] of replacements) {
    content = content.split(oldVal).join(newVal);
}

fs.writeFileSync('components/TeacherDashboard.tsx', content);
