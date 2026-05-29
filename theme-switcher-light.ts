import * as fs from 'fs';

const replacements = [
    // Backgrounds & Text
    [/bg-zinc-950/g, 'bg-slate-50'],
    [/bg-zinc-900\/80/g, 'bg-white/90'],
    [/bg-zinc-900\/50/g, 'bg-white'],
    [/bg-zinc-800\/50/g, 'bg-white'],
    [/text-zinc-50/g, 'text-slate-900'],
    [/text-white font-bold tracking-tight/g, 'text-slate-900 font-bold tracking-tight'],
    [/text-zinc-300/g, 'text-slate-600'],
    [/text-zinc-400/g, 'text-slate-500'],
    [/text-zinc-500/g, 'text-slate-400'],
    [/border-white\/10/g, 'border-slate-200'],

    // Purples
    [/from-cyan-400 to-indigo-500/g, 'from-purple-600 to-purple-500'],
    [/bg-pink-500\/10/g, 'bg-purple-100'],
    [/text-pink-400/g, 'text-purple-600'],
    [/border-pink-500\/30/g, 'border-purple-200'],
    [/border-pink-500\/50/g, 'border-purple-300'],
    [/border-pink-500/g, 'border-purple-600'],
    [/shadow-pink-500\/5/g, 'shadow-purple-500/5'],
    [/shadow-pink-500\/10/g, 'shadow-purple-500/10'],
    [/shadow-pink-500\/20/g, 'shadow-purple-500/20'],
    [/focus:border-pink-500/g, 'focus:border-purple-600'],
    [/focus:ring-pink-500/g, 'focus:ring-purple-600'],
    [/selection:bg-cyan-400\/30/g, 'selection:bg-purple-200'],
    
    // Other
    [/bg-white\/20/g, 'bg-white'],
    [/bg-white text-white/g, 'bg-white text-slate-900'],
    [/hover:bg-white\/50/g, 'hover:bg-slate-50'],
    [/backdrop-blur-xl/g, '']
];

function processFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf-8');
    for (const [regex, replacement] of replacements) {
        content = content.replace(regex, replacement as string);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Processed: ${filePath}`);
}

processFile('src/App.tsx');
processFile('components/TeacherDashboard.tsx');
processFile('components/TeacherAuthModal.tsx');
