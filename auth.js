class AdminAuth {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password visibility toggle
        const togglePassword = document.querySelector('.toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const credentials = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok) {
                // Store auth token
                localStorage.setItem('adminToken', data.token);
                
                // Store remember me preference
                if (credentials.remember) {
                    localStorage.setItem('adminEmail', credentials.email);
                } else {
                    localStorage.removeItem('adminEmail');
                }

                // Redirect to dashboard
                window.location.href = '/admin/dashboard.html';
            } else {
                this.showLoginMessage(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showLoginMessage('An error occurred during login', 'error');
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/admin/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear auth data and redirect
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/login.html';
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('adminToken');
        
        // If no token and not on login page, redirect to login
        if (!token && !window.location.pathname.includes('login.html')) {
            window.location.href = '/admin/login.html';
            return;
        }

        // If token exists, verify it
        if (token) {
            try {
                const response = await fetch('/api/admin/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Invalid token');
                }

                // If on login page with valid token, redirect to dashboard
                if (window.location.pathname.includes('login.html')) {
                    window.location.href = '/admin/dashboard.html';
                }
            } catch (error) {
                console.error('Token verification error:', error);
                localStorage.removeItem('adminToken');
                if (!window.location.pathname.includes('login.html')) {
                    window.location.href = '/admin/login.html';
                }
            }
        }

        // Restore remembered email if exists
        const rememberedEmail = localStorage.getItem('adminEmail');
        if (rememberedEmail) {
            const emailInput = document.querySelector('input[name="email"]');
            if (emailInput) {
                emailInput.value = rememberedEmail;
                document.querySelector('input[name="remember"]').checked = true;
            }
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.querySelector('input[name="password"]');
        const icon = document.querySelector('.toggle-password i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    showLoginMessage(message, type = 'error') {
        const messageDiv = document.getElementById('loginMessage');
        if (messageDiv) {
            messageDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'}`;
            messageDiv.textContent = message;
        }
    }

    // Utility method to get auth headers for API requests
    static getAuthHeaders() {
        const token = localStorage.getItem('adminToken');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialize auth system when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new AdminAuth();
});
