class AdminDashboard {
    constructor() {
        this.initializeSidebar();
        this.initializeCharts();
        this.loadRecentBookings();
        this.setupEventListeners();
        this.initializeNotifications();
    }

    initializeSidebar() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const adminWrapper = document.querySelector('.admin-wrapper');

        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                adminWrapper.classList.toggle('sidebar-collapsed');
            });
        }
    }

    initializeCharts() {
        this.createBookingsChart();
        this.createPopularToursChart();
    }

    createBookingsChart() {
        const ctx = document.getElementById('bookingsChart');
        if (!ctx) return;

        // Sample data - would be fetched from API in production
        const bookingsData = {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [
                {
                    label: 'Bookings',
                    data: [65, 59, 80, 81, 56, 55, 40, 88, 96, 67, 71, 86],
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Revenue ($K)',
                    data: [28, 48, 40, 19, 86, 27, 90, 102, 89, 95, 119, 110],
                    fill: false,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1
                }
            ]
        };

        new Chart(ctx, {
            type: 'line',
            data: bookingsData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Bookings & Revenue Overview'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createPopularToursChart() {
        const ctx = document.getElementById('toursChart');
        if (!ctx) return;

        // Sample data - would be fetched from API in production
        const toursData = {
            labels: [
                'Serengeti Migration',
                'Kilimanjaro Trek',
                'Gorilla Safari',
                'Masai Mara',
                'Zanzibar Beach'
            ],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: [
                    '#4e73df',
                    '#1cc88a',
                    '#36b9cc',
                    '#f6c23e',
                    '#e74a3b'
                ]
            }]
        };

        new Chart(ctx, {
            type: 'doughnut',
            data: toursData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Most Popular Tours'
                    }
                }
            }
        });
    }

    async loadRecentBookings() {
        const tableBody = document.querySelector('#recentBookings tbody');
        if (!tableBody) return;

        try {
            // Simulate API call - replace with actual API endpoint
            const bookings = await this.fetchRecentBookings();
            
            tableBody.innerHTML = bookings.map(booking => `
                <tr>
                    <td>${booking.id}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <img src="${booking.customerAvatar}" class="rounded-circle mr-2" width="32">
                            <div class="ml-2">${booking.customerName}</div>
                        </div>
                    </td>
                    <td>${booking.tour}</td>
                    <td>${booking.date}</td>
                    <td>
                        <span class="badge bg-${this.getStatusColor(booking.status)}">
                            ${booking.status}
                        </span>
                    </td>
                    <td>$${booking.amount.toLocaleString()}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-primary" onclick="viewBooking('${booking.id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="approveBooking('${booking.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="cancelBooking('${booking.id}')">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading recent bookings:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        Error loading bookings. Please try again later.
                    </td>
                </tr>
            `;
        }
    }

    async fetchRecentBookings() {
        // Simulate API call - replace with actual API endpoint
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        id: 'BK001',
                        customerName: 'John Doe',
                        customerAvatar: '../images/avatars/user1.jpg',
                        tour: 'Serengeti Migration Safari',
                        date: '2024-06-15',
                        status: 'pending',
                        amount: 2500
                    },
                    // Add more sample bookings
                ]);
            }, 1000);
        });
    }

    getStatusColor(status) {
        const colors = {
            pending: 'warning',
            confirmed: 'success',
            cancelled: 'danger',
            completed: 'info'
        };
        return colors[status] || 'secondary';
    }

    setupEventListeners() {
        // Logout handler
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }

        // Notification handlers
        document.querySelectorAll('[data-notification]').forEach(element => {
            element.addEventListener('click', () => {
                this.markNotificationAsRead(element.dataset.notification);
            });
        });
    }

    async handleLogout() {
        try {
            // Simulate API call - replace with actual logout endpoint
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    initializeNotifications() {
        // WebSocket connection for real-time notifications
        this.setupWebSocket();

        // Load initial notifications
        this.loadNotifications();
    }

    setupWebSocket() {
        // Simulate WebSocket connection - replace with actual WebSocket endpoint
        const ws = new WebSocket('wss://your-api-endpoint/notifications');

        ws.onmessage = (event) => {
            const notification = JSON.parse(event.data);
            this.addNotification(notification);
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    async loadNotifications() {
        try {
            // Simulate API call - replace with actual API endpoint
            const response = await fetch('/api/notifications');
            const notifications = await response.json();
            
            const container = document.querySelector('#notificationsDropdown .dropdown-menu');
            if (container) {
                this.renderNotifications(container, notifications);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    renderNotifications(container, notifications) {
        const content = notifications.map(notification => `
            <a class="dropdown-item" href="#" data-notification="${notification.id}">
                <div class="d-flex align-items-center">
                    <div class="mr-3">
                        <div class="icon-circle bg-${notification.type}">
                            <i class="fas ${this.getNotificationIcon(notification.type)} text-white"></i>
                        </div>
                    </div>
                    <div>
                        <div class="small text-gray-500">${notification.date}</div>
                        <span class="${notification.read ? 'text-gray-500' : 'font-weight-bold'}">
                            ${notification.message}
                        </span>
                    </div>
                </div>
            </a>
        `).join('');

        container.innerHTML = content;
    }

    getNotificationIcon(type) {
        const icons = {
            booking: 'fa-calendar-check',
            payment: 'fa-dollar-sign',
            review: 'fa-star',
            alert: 'fa-exclamation-triangle'
        };
        return icons[type] || 'fa-bell';
    }

    async markNotificationAsRead(notificationId) {
        try {
            // Simulate API call - replace with actual API endpoint
            await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            
            // Update UI
            const notification = document.querySelector(`[data-notification="${notificationId}"]`);
            if (notification) {
                notification.classList.add('text-gray-500');
                notification.classList.remove('font-weight-bold');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});
