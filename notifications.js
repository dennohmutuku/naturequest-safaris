class NotificationManager {
    constructor() {
        this.unreadCount = 0;
        this.notifications = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalItems = 0;
        this.filters = {
            type: '',
            read: '',
            dateFrom: '',
            dateTo: ''
        };
        this.initialize();
    }

    async initialize() {
        await Promise.all([
            this.loadNotifications(),
            this.setupWebSocket()
        ]);
        this.setupEventListeners();
        this.initializeToasts();
    }

    async loadNotifications() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/admin/notifications?${queryParams}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            
            const data = await response.json();
            this.notifications = data.notifications;
            this.unreadCount = data.unreadCount;
            this.totalItems = data.total;
            
            this.updateNotificationsList();
            this.updateUnreadBadge();
            this.updatePagination();
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showAlert('error', 'Failed to load notifications');
        }
    }

    setupWebSocket() {
        this.ws = new WebSocket(
            `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/notifications`
        );

        this.ws.onmessage = (event) => {
            const notification = JSON.parse(event.data);
            this.handleNewNotification(notification);
        };

        this.ws.onclose = () => {
            setTimeout(() => this.setupWebSocket(), 5000); // Reconnect after 5 seconds
        };
    }

    setupEventListeners() {
        // Mark all as read
        document.getElementById('markAllRead').addEventListener('click', () => {
            this.markAllAsRead();
        });

        // Clear all notifications
        document.getElementById('clearAll').addEventListener('click', () => {
            this.clearAllNotifications();
        });

        // Filter form
        document.getElementById('filterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters(new FormData(e.target));
        });

        // Individual notification actions
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('mark-read')) {
                this.markAsRead(e.target.dataset.notificationId);
            } else if (e.target.classList.contains('delete-notification')) {
                this.deleteNotification(e.target.dataset.notificationId);
            }
        });

        // Notification click
        document.addEventListener('click', (e) => {
            const notification = e.target.closest('.notification-item');
            if (notification && !e.target.closest('.notification-actions')) {
                this.handleNotificationClick(notification.dataset.notificationId);
            }
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                this.currentPage = parseInt(e.target.dataset.page);
                this.loadNotifications();
            }
        });
    }

    initializeToasts() {
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(this.toastContainer);
    }

    handleNewNotification(notification) {
        // Update unread count
        this.unreadCount++;
        this.updateUnreadBadge();

        // Add to list if on first page
        if (this.currentPage === 1) {
            this.notifications.unshift(notification);
            this.updateNotificationsList();
        }

        // Show toast notification
        this.showToast(notification);

        // Play notification sound
        this.playNotificationSound();
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/admin/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to mark notification as read');
            }

            this.notifications = this.notifications.map(notification => {
                if (notification.id === notificationId) {
                    return { ...notification, read: true };
                }
                return notification;
            });

            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.updateNotificationsList();
            this.updateUnreadBadge();
        } catch (error) {
            console.error('Error marking notification as read:', error);
            this.showAlert('error', 'Failed to mark notification as read');
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/admin/notifications/mark-all-read', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to mark all notifications as read');
            }

            this.notifications = this.notifications.map(notification => ({
                ...notification,
                read: true
            }));

            this.unreadCount = 0;
            this.updateNotificationsList();
            this.updateUnreadBadge();
            this.showAlert('success', 'All notifications marked as read');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            this.showAlert('error', 'Failed to mark all notifications as read');
        }
    }

    async deleteNotification(notificationId) {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete notification');
            }

            this.notifications = this.notifications.filter(
                notification => notification.id !== notificationId
            );
            
            if (!this.notifications.length && this.currentPage > 1) {
                this.currentPage--;
                await this.loadNotifications();
            } else {
                this.updateNotificationsList();
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showAlert('error', 'Failed to delete notification');
        }
    }

    async clearAllNotifications() {
        if (!confirm('Are you sure you want to clear all notifications?')) {
            return;
        }

        try {
            const response = await fetch('/api/admin/notifications/clear-all', {
                method: 'DELETE',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to clear notifications');
            }

            this.notifications = [];
            this.unreadCount = 0;
            this.currentPage = 1;
            this.updateNotificationsList();
            this.updateUnreadBadge();
            this.showAlert('success', 'All notifications cleared');
        } catch (error) {
            console.error('Error clearing notifications:', error);
            this.showAlert('error', 'Failed to clear notifications');
        }
    }

    handleNotificationClick(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (!notification) return;

        // Mark as read if unread
        if (!notification.read) {
            this.markAsRead(notificationId);
        }

        // Handle notification action based on type
        switch (notification.type) {
            case 
