async function test() {
    try {
        const res = await fetch('http://localhost:3000/api/dashboard');
        const data = await res.json();
        console.log('Stats:', data.stats);
        console.log('Clients count:', data.clients.length);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
