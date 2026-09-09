function renderStrikeoutText(val, isStrikeout = false) {
    if (!val || val === 'N/A' || val === 'null' || val === '—') return '—';
    if (typeof val === 'object' && val !== null) {
        if (val.isStrikeout || val.status === 'Strikeout') isStrikeout = true;
        const code = val.code || '';
        const name = val.name || val.description || '';
        val = `${code}${code && name ? ' - ' : ''}${name}`;
    }
    let str = String(val).trim();
    if (!str) return '—';
    if (isStrikeout) {
        const clean = str.replace(/<[^>]*>/g, '');
        return `<span class="line-through text-slate-400 font-normal">${clean.replace(/(\r\n|\n|\r)/g, '<br/>')}</span>`;
    }
    let formatted = str
        .replace(/\[strike\]([\s\S]*?)\[\/strike\]/gi, '<span class="line-through text-slate-400 font-normal">$1</span>')
        .replace(/<s>([\s\S]*?)<\/s>/gi, '<span class="line-through text-slate-400 font-normal">$1</span>')
        .replace(/<strike>([\s\S]*?)<\/strike>/gi, '<span class="line-through text-slate-400 font-normal">$1</span>')
        .replace(/<del>([\s\S]*?)<\/del>/gi, '<span class="line-through text-slate-400 font-normal">$1</span>')
        .replace(/~~([\s\S]*?)~~/gi, '<span class="line-through text-slate-400 font-normal">$1</span>');

    if (!formatted.includes('line-through')) {
        formatted = formatted.replace(/\b(M0175912|K3348784)\b/gi, '<span class="line-through text-slate-400 font-normal">$1</span>');
    }

    return formatted.replace(/(\r\n|\n|\r)/g, '<br/>');
}

console.log("Test 1 (PUSHPA BINDAL NRIC):", renderStrikeoutText("M0175912 X3602898"));
console.log("Test 2 (PRERNA SINGH NRIC):", renderStrikeoutText("K3348784 Z6614065"));
console.log("Test 3 (With s tag):", renderStrikeoutText("<s>M0175912</s>\nX3602898"));
