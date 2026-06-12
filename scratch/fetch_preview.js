

async function run() {
    try {
        const loginRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@globalisor.com', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Logged in, token:", token);

        const previewRes = await fetch('http://localhost:8080/api/prereg-sections/published', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const previewData = await previewRes.json();
        console.log("Preview Data:", JSON.stringify(previewData, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
