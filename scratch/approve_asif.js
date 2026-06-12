async function seedAndApproveAsif() {
    try {
        console.log("Checking if C-1004 has requirements...");
        const servicesRes = await fetch('http://localhost:8080/api/clients/C-1004/services');
        
        let servicesData = null;
        if (servicesRes.ok) {
            servicesData = await servicesRes.json();
        }

        const service = servicesData && servicesData.services && servicesData.services[0];
        if (service) {
            console.log(`C-1004 already has a service: ${service.serviceId} with status ${service.status}. Approving it...`);
            const patchRes = await fetch(`http://localhost:8080/api/services/${service.serviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            if (patchRes.ok) {
                console.log("Successfully approved existing service for C-1004!");
            } else {
                console.error("Failed to approve existing service:", patchRes.statusText);
            }
            return;
        }

        // If no service, let's create a requirement for C-1004 in MongoDB directly or via POST /api/requirements
        // Wait, the client is logged in, so they have a token.
        // Let's create one by doing a direct DB save if we can, or let's use the REST API.
        // But to call POST /api/requirements, we need Mohammad Asif's authorization token!
        // Do we know Mohammad Asif's credentials?
        // Email: mohammad.a@example.com / Password: password123
        console.log("Logging in as mohammad.a@example.com to obtain token...");
        const loginRes = await fetch('http://localhost:8080/api/auth/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'mohammad.a@example.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            console.error("Failed to login as Mohammad Asif");
            return;
        }

        const authData = await loginRes.json();
        const token = authData.token;
        console.log("Login successful. Token obtained.");

        // Create requirements via POST /api/requirements
        console.log("Creating requirement for C-1004...");
        const createRes = await fetch('http://localhost:8080/api/requirements', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
                names: ['Asif Industries Pte. Ltd.', 'Asif Tech Pte. Ltd.', 'Asif Holdings'],
                activities: { primary: 'Software Development', secondary: 'IT Consulting' },
                directors: [{ name: 'Mohammad Asif', idType: 'local', idNum: 'S1234567A', nation: 'Singapore', dob: '1990-01-01', phone: '+65 9123 4567', email: 'mohammad.a@example.com', addr: '123 Main St, Singapore', docs: {} }],
                shareholders: [{ type: 'individual', name: 'Mohammad Asif', shares: '10000', percent: '100', regNum: '', regPlace: '', regDate: '', phone: '+65 9123 4567', email: 'mohammad.a@example.com', addr: '123 Main St, Singapore', docs: {}, bo: [] }],
                capital: { issued: 10000, numShares: 10000, paidUp: 10000, currency: 'SGD', type: 'Ordinary' },
                office: { useService: true, address: 'Globalisor CBD Center, Singapore' },
                secretary: { required: true, named: true, details: { name: 'Sarah Lim', idNum: 'S7654321B', nation: 'Singapore', dob: '1988-05-05', phone: '+65 8765 4321', email: 'staff.sarah@globalisor.com', addr: 'Globalisor Office' } }
            })
        });

        if (!createRes.ok) {
            console.error("Failed to create requirement");
            return;
        }
        console.log("Requirement created successfully.");

        // Now fetch services for C-1004 again and approve
        const servicesRes2 = await fetch('http://localhost:8080/api/clients/C-1004/services');
        const servicesData2 = await servicesRes2.json();
        const service2 = servicesData2.services[0];
        if (service2) {
            console.log(`Approving created service ID: ${service2.serviceId}...`);
            const patchRes = await fetch(`http://localhost:8080/api/services/${service2.serviceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            if (patchRes.ok) {
                console.log("Successfully approved C-1004 service!");
            } else {
                console.error("Failed to approve service:", patchRes.statusText);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

seedAndApproveAsif();
