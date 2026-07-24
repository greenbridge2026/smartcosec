import fs from 'fs';
const content = fs.readFileSync('d:/GitHub/Globalisor/globalisor_fe/client/portal-main.js', 'utf8');

const match = content.match(/function obRenderDocumentChecklistHtml([\s\S]*?)\nfunction obRenderShareCapitalHtml/);
const funcBody = match[1];

const fakeState = {
    requirements: {
        directors: [{ name: 'A', email: 'a@a.com', phone: '123' }],
        shareholders: []
    },
    onboarding: {}
};

const script = `
    let state = ${JSON.stringify(fakeState)};
    function obRenderDocumentChecklistHtml${funcBody}
    try {
        console.log('OUTPUT:', obRenderDocumentChecklistHtml(false).substring(0, 50));
    } catch(e) {
        console.error('ERROR RENDER:', e);
    }
`;
fs.writeFileSync('test_render.js', script);
