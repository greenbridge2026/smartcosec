const http = require('http');

http.get('http://localhost:8080/api/prereg-sections', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        process.exit(0);
    });
}).on('error', (err) => {
    console.error(err);
    process.exit(1);
});
