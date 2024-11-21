class ActivityLogger {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
        this.filters = {
            type: '',
            user: '',
            dateFrom: '',
            dateTo: '',
            status: ''
        };
        this.initialize();
    }

    async initialize() {
        await this.loadActivityLogs();
        this.setupEventListeners();
        this.initializeCharts();
        this.setupRealTimeUpdates();
    }

    async loadActivityLogs() {
        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                ...this.filters
            });

            const response = await fetch(`/api/admin/activity-logs?${queryParams}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            
            const data = await response.json();
            this.totalItems = data.total;
            
            this.updateLogsTable(data.logs);
            this.updatePagination();
            this.updateStats(data.stats);
        } catch (error) {
            console.error('Error loading activity logs:', error);
            this.showAlert('error', 'Failed to load activity logs');
        }
    }

    setupEventListeners() {
        // Filter form
        document.getElementById('filterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters(new FormData(e.target));
        });

        // Clear filters
        document.getElementById('clearFilters').addEventListener('click', () => {
            document.getElementById('filterForm').reset();
            this.clearFilters();
        });

        // Pagination
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                this.currentPage = parseInt(e.target.dataset.page);
                this.loadActivityLogs();
            }
        });

        // Export logs
        document.getElementById('exportLogs').addEventListener('click', () => {
            this.exportLogs();
        });

        // Bulk actions
        document.getElementById('bulkActionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.executeBulkAction(new FormData(e.target));
        });

        // Log details
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('view-details')) {
                this.showLogDetails(e.target.dataset.logId);
            }
        });

        // Real-time updates toggle
        document.getElementById('toggleRealTime').addEventListener('change', (e) => {
            this.toggleRealTimeUpdates(e.target.checked);
        });
    }

    initializeCharts() {
        // Activity Timeline Chart
        const timelineCtx = document.getElementById('activityTimeline').getContext('2d');
        this.timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Activity Count',
                    data: [],
                    borderColor: '#4e73df',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });

        // Activity Types Chart
        const typesCtx = document.getElementById('activityTypes').getContext('2d');
        this.typesChart = new Chart(typesCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#4e73df',
                        '#1cc88a',
                        '#36b9cc',
                        '#f6c23e',
                        '#e74a3b'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    setupRealTimeUpdates() {
        this.eventSource = new EventSource('/api/admin/activity-logs/stream');
        
        this.eventSource.onmessage = (event) => {
            const log = JSON.parse(event.data);
            this.addNewLog(log);
        };

        this.eventSource.onerror = () => {
            this.eventSource.close();
            this.showAlert('warning', 'Real-time updates disconnected');
            document.getElementById('toggleRealTime').checked = false;
        };
    }

    updateLogsTable(logs) {
        const tableBody = document.querySelector('#activityLogs tbody');
        if (!tableBody) return;

        tableBody.innerHTML = logs.map(log => `
            <tr>
                <td>
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" name="selectedLogs" 
                               value="${log.id}">
                    </div>
                </td>
                <td>${this.formatDate(log.timestamp)}</td>
                <td>
                    <span class="badge bg-${this.getTypeColor(log.type)}">
                        ${log.type}
                    </span>
                </td>
                <td>${log.user}</td>
                <td>${this.truncateText(log.description, 50)}</td>
                <td>
                    <span class="badge bg-${this.getStatusColor(log.status)}">
                        ${log.status}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-info view-details" data-log-id="${log.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        const pagination = document.getElementById('logsPagination');
        if (!pagination) return;

        let html = '';
        
        // Previous button
        html += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">
                    Previous
                </a>
            </li>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || 
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += `
                    <li class="page-item disabled">
                        <span class="page-link">...</span>
                    </li>
                `;
            }
        }

        // Next button
        html += `
            <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">
                    Next
                </a>
            </li>
        `;

        pagination.innerHTML = html;
    }

    updateStats(stats) {
        // Update timeline chart
        this.timelineChart.data.labels = stats.timeline.labels;
        this.timelineChart.data.datasets[0].data = stats.timeline.data;
        this.timelineChart.update();

        // Update types chart
        this.typesChart.data.labels = stats.types.labels;
        this.typesChart.data.datasets[0].data = stats.types.data;
        this.typesChart.update();

        // Update summary stats
        document.getElementById('totalLogs').textContent = stats.total;
        document.getElementById('todayLogs').textContent = stats.today;
        document.getElementById('errorRate').textContent = `${stats.errorRate}%`;
    }

    async showLogDetails(logId) {
        try {
            const response = await fetch(`/api/admin/activity-logs/${logId}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            
            const log = await response.json();
            
            const modal = new bootstrap.Modal(document.getElementById('logDetailsModal'));
            document.getElementById('logTimestamp').textContent = this.formatDate(log.timestamp);
            document.getElementById('logType').textContent = log.type;
            document.getElementById('logUser').textContent = log.user;
            document.getElementById('logDescription').textContent = log.description;
            document.getElementById('logStatus').textContent = log.status;
            document.getElementById('logDetails').textContent = 
                JSON.stringify(log.details, null, 2);
            
            modal.show();
        } catch (error) {
            console.error('Error loading log details:', error);
            this.showAlert('error', 'Failed to load log details');
        }
    }

    async exportLogs() {
        try {
            const queryParams = new URLSearchParams(this.filters);
            const response = await fetch(`/api/admin/activity-logs/export?${queryParams}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-logs-${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.showAlert('error', 'Failed to export logs');
        }
    }

    async executeBulkAction(formData) {
        const action = formData.get('bulkAction');
        const selectedLogs = Array.from(formData.getAll('selectedLogs'));
        
        if (selectedLogs.length === 0) {
            this.showAlert('warning', 'Please select at least one log');
            return;
        }

        if (!confirm(`Are you sure you want to ${action} the selected logs?`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/activity-logs/bulk-action', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, logs: selectedLogs })
            });

            if (!response.ok) {
                throw new Error('Bulk action failed');
            }

            this.showAlert('success', 'Bulk action completed successfully');
            await this.loadActivityLogs();
        } catch (error) {
            console.error('Error executing bulk action:', error);
            this.showAlert('error', 'Failed to execute bulk action');
        }
    }

    applyFilters(formData) {
        this.filters = {
            type: formData.get('type'),
            user: formData.get('user'),
            dateFrom: formData.get('dateFrom'),
            dateTo: formData.get('dateTo'),
            status: formData.get('status')
        };
        
        this.currentPage = 1;
        this.loadActivityLogs();
    }

    clearFilters() {
        this.filters = {
            type: '',
            user: '',
            dateFrom: '',
            dateTo: '',
            status: ''
        };
        
        this.currentPage = 1;
        this.loadActivityLogs();
    }

    toggleRealTimeUpdates(enabled) {
        if (enabled) {
            this.setupRealTimeUpdates();
        } else {
            this.eventSource?.close();
        }
    }

    addNewLog(log) {
        const tableBody = document.querySelector('#activityLogs tbody');
        if (!tableBody) return;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" name="selectedLogs" 
                           value="${log.id}">
                </div>
            </td>
            <td>${this.formatDate(log.timestamp)}</td>
            <td>
                <span class="badge bg-${this.getTypeColor(log.type)}">
                    ${log.type}
                </span>
            </td>
            <td>${log.user}</td>
            <td>${this.truncateText(log.description, 50)}</td>
            <td>
                <span class="badge bg-${this.getStatusColor(log.status)}">
                    ${log.status}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info view-details" data-log-id="${log.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;

        tableBody.insertBefore(row, tableBody.firstChild);
        row.classList.add('highlight');
        setTimeout(() => row.classList.remove('highlight'), 3000);
    }

    getTypeColor(type) {
        const colors = {
            'auth': 'primary',
            'crud': 'success',
            'system': 'info',
            'error': 'danger',
            'warning': 'warning'
        };
        return colors[type.toLowerCase()] || 'secondary';
    }

    getStatusColor(status) {
        const colors = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info',
            'pending': 'secondary'
        };
        return colors[status.toLowerCase()] || 'secondary';
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    showAlert(type, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.container-fluid').insertBefore(
            alertDiv,
            document.querySelector('.container-fluid').firstChild
        );

        setTimeout(() => alertDiv.remove(), 5000);
    }
}

// Initialize activity logger when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new ActivityLogger();
});
