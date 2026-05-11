const fs = require('fs');

const content = fs.readFileSync('d:/git/Globalisor/globalisor_fe/admin/dashboard.html', 'utf8');
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);

if (scriptMatch) {
    const script = scriptMatch[1];
    try {
        new Function(script);
        console.log('Syntax Check: PASSED');
    } catch (e) {
        console.error('Syntax Check: FAILED');
        console.error(e.message);
        
        // Try to find the line number
        const lines = script.split('\n');
        // This is a rough estimation since Function() doesn't give line numbers easily
    }
} else {
    console.log('No script tag found');
}
