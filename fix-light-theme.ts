import * as fs from 'fs';

const replacements = [
    [/text-white/g, 'text-slate-900'],
    [/text-slate-900\/90/g, 'text-white/90'], // Fix interactive games description
    [/text-slate-900 font-bold/g, 'text-white font-bold'], // interactive games title
];

function fixApp() {
    let content = fs.readFileSync('src/App.tsx', 'utf-8');
    
    // Fix the logo X color
    content = content.replace('flex items-center justify-center text-slate-900 font-bold">X', 'flex items-center justify-center text-white font-bold">X');
    
    // Fix buttons
    content = content.replace('text-slate-900 font-bold uppercase tracking-widest', 'text-white font-bold uppercase tracking-widest');
    content = content.replace('text-slate-900 font-bold tracking-tight', 'text-slate-900 font-bold tracking-tight');
    
    // Icon circular backgrounds in cards
    content = content.replace('justify-center text-slate-900 shadow-md', 'justify-center text-white shadow-md');
    
    // Interactive games card text needs to be white because of the purple background
    content = content.replace('text-lg text-slate-900 font-bold tracking-tight">Interactive Games', 'text-lg text-white font-bold tracking-tight">Interactive Games');
    content = content.replace('<CardDescription className="text-sm text-slate-900 font-medium">', '<CardDescription className="text-sm text-white/90 font-medium">');
    content = content.replace('bg-white flex items-center justify-center text-slate-900', 'bg-white/20 flex items-center justify-center text-white');
    
    fs.writeFileSync('src/App.tsx', content);
}

function fixDashboard() {
    let content = fs.readFileSync('components/TeacherDashboard.tsx', 'utf-8');
    
    content = content.replace(/text-white/g, 'text-slate-900');
    // Button text: Add Words, Review Words, etc. 
    content = content.replace(/text-slate-900 font-bold uppercase tracking-widest/g, 'text-white font-bold uppercase tracking-widest');
    content = content.replace('flex items-center justify-center text-slate-900 font-bold">X', 'flex items-center justify-center text-white font-bold">X');
    content = content.replace(/from-teal to-navy text-slate-900/g, 'from-purple-600 to-purple-500 text-white'); // Fix the submit button color
    content = content.replace(/placeholder:text-slate-9000/g, 'placeholder:text-slate-400');
    content = content.replace(/selection:text-slate-900/g, 'selection:text-purple-900');
    
    fs.writeFileSync('components/TeacherDashboard.tsx', content);
}

function fixModal() {
    let content = fs.readFileSync('components/TeacherAuthModal.tsx', 'utf-8');
    
    content = content.replace(/text-white/g, 'text-slate-900');
    content = content.replace(/text-slate-900 font-bold rounded-xl/g, 'text-white font-bold rounded-xl');
    content = content.replace(/bg-teal/g, 'bg-purple-100/50'); // the buttons in the tabs
    content = content.replace(/data-\[state=active\]:bg-purple-100\/50 data-\[state=active\]:text-slate-900/g, 'data-[state=active]:bg-purple-600 data-[state=active]:text-white');
    content = content.replace(/bg-white\/5/g, 'bg-white');
    content = content.replace(/placeholder:text-slate-9000/g, 'placeholder:text-slate-400');
    
    fs.writeFileSync('components/TeacherAuthModal.tsx', content);
}

fixApp();
fixDashboard();
fixModal();
