
        // Authentication Check
        if (!localStorage.getItem('staff_auth')) {
            window.location.href = '/staff';
        }

        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: { sans: ['Inter', 'sans-serif'], outfit: ['Outfit', 'sans-serif'] },
                    colors: { 
                        slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 800: '#1e293b', 900: '#0f172a' },
                        primary: '#0f172a',
                        accent: '#10b981' // Keep emerald as a signature staff color but with admin-style UI
                    }
                }
            }
        }
    
