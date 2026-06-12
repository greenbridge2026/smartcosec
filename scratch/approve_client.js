async function approveClient() {
    try {
        // Fetch all applications
        console.log('Fetching applications from backend...');
        const res = await fetch('http://localhost:8080/api/applications');
        if (!res.ok) {
            console.error('Failed to fetch applications', res.statusText);
            return;
        }
        const apps = await res.json();
        console.log('Found', apps.length, 'applications.');

        // Find Ethan Tan's application
        // In the backend application mapping:
        // map.put("id", req.getId() != null ? req.getId().replace("SRV-", "APP-") : "APP-unknown");
        // But the database requirement ID is the original mongo ID.
        // Let's fetch the actual requirements list or map the client name.
        // Wait, let's fetch /api/clients/C-1001/services to get the actual serviceId.
        console.log("Fetching client C-1001 services...");
        const servicesRes = await fetch('http://localhost:8080/api/clients/C-1001/services');
        if (!servicesRes.ok) {
            console.error('Failed to fetch services for client C-1001');
            return;
        }
        const servicesData = await servicesRes.json();
        const service = servicesData.services[0];
        if (!service) {
            console.log('No service found for client C-1001');
            return;
        }

        const serviceId = service.serviceId;
        console.log(`Found service ID: ${serviceId} with current status: ${service.status}`);

        // Patch the service status to approved
        console.log(`Sending PATCH request to approve service ${serviceId}...`);
        const patchRes = await fetch(`http://localhost:8080/api/services/${serviceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
        });

        if (patchRes.ok) {
            const updated = await patchRes.json();
            console.log('Successfully approved client! New status:', updated.status);
        } else {
            console.error('Failed to update service status:', patchRes.statusText);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

approveClient();
