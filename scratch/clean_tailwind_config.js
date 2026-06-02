import fs from 'fs';
import path from 'path';

const files = [
  'admin/content.html',
  'admin/blogs.html',
  'admin/reports.html',
  'admin/messages.html',
  'admin/compliance.html',
  'admin/users.html',
  'admin/kyc.html'
];

const basePath = '/Users/ramachandran/git/globalisor/globalisor_fe';

files.forEach(file => {
  const filePath = path.join(basePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;
    
    // Replace script tags containing tailwind.config
    const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
    content = content.replace(scriptRegex, (match, scriptContent) => {
      if (scriptContent.includes('tailwind.config')) {
        // Keep only the lines that are not part of tailwind.config object definition
        const lines = scriptContent.split('\n');
        const filteredLines = lines.filter(line => {
          const trimmed = line.trim();
          return !trimmed.includes('tailwind.config') &&
                 !trimmed.startsWith('theme:') &&
                 !trimmed.startsWith('extend:') &&
                 !trimmed.startsWith('fontFamily:') &&
                 !trimmed.startsWith('colors:') &&
                 !trimmed.startsWith('slate:') &&
                 !trimmed.startsWith('primary:') &&
                 !trimmed.startsWith('accent:') &&
                 trimmed !== '}' &&
                 trimmed !== '}}' &&
                 trimmed !== '}}}' &&
                 trimmed !== '}}}}';
        });
        return `<script>\n${filteredLines.join('\n')}\n    </script>`;
      }
      return match;
    });

    if (content.length !== originalLength) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Cleaned tailwind.config from ${file}`);
    } else {
      console.log(`Could not find tailwind.config pattern in ${file}`);
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
});
