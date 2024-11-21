class BackupManager {
    constructor() {
        this.backupStatus = null;
        this.backupHistory = [];
        this.initialize();
    }

    async initialize() {
        await Promise.all([
            this.loadBackupStatus(),
            this.loadBackupHistory()
        ]);
        this.setupEventListeners();
        this.initializeScheduler();
    }

    async loadBackupStatus() {
        try {
            const response = await fetch('/api/admin/backup/status', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.backupStatus = await response.json();
            this.updateStatusDisplay();
        } catch (error) {
            console.error('Error loading backup status:', error);
            this.showAlert('error', 'Failed to load backup status');
        }
    }

    async loadBackupHistory() {
        try {
            const response = await fetch('/api/admin/backup/history', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.backupHistory = await response.json();
            this.updateHistoryTable();
        } catch (error) {
            console.error('Error loading backup history:', error);
            this.showAlert('error', 'Failed to load backup history');
        }
    }

    setupEventListeners() {
        // Manual backup button
        document.getElementById('startBackup').addEventListener('click', () => {
            this.startManualBackup();
        });

        // Restore backup form
        document.getElementById('restoreBackupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.restoreBackup(new FormData(e.target));
        });

        // Download backup button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('download-backup')) {
                this.downloadBackup(e.target.dataset.backupId);
            }
        });

        // Delete backup button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-backup')) {
                this.deleteBackup(e.target.dataset.backupId);
            }
        });

        // Schedule settings form
        document.getElementById('scheduleSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateScheduleSettings(new FormData(e.target));
        });

        // Storage settings form
        document.getElementById('storageSettingsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateStorageSettings(new FormData(e.target));
        });
    }

    initializeScheduler() {
        // Check backup status periodically
        setInterval(() => {
            this.loadBackupStatus();
        }, 30000); // Every 30 seconds
    }

    async startManualBackup() {
        try {
            const response = await fetch('/api/admin/backup/start', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to start backup');
            }

            this.showAlert('success', 'Backup started successfully');
            this.loadBackupStatus();
        } catch (error) {
            console.error('Error starting backup:', error);
            this.showAlert('error', 'Failed to start backup');
        }
    }

    async restoreBackup(formData) {
        try {
            if (!confirm('Are you sure? This will overwrite current data.')) {
                return;
            }

            const response = await fetch('/api/admin/backup/restore', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to restore backup');
            }

            this.showAlert('success', 'Backup restored successfully');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error('Error restoring backup:', error);
            this.showAlert('error', 'Failed to restore backup');
        }
    }

    async downloadBackup(backupId) {
        try {
            const response = await fetch(`/api/admin/backup/download/${backupId}`, {
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to download backup');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${backupId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Error downloading backup:', error);
            this.showAlert('error', 'Failed to download backup');
        }
    }

    async deleteBackup(backupId) {
        try {
            if (!confirm('Are you sure you want to delete this backup?')) {
                return;
            }

            const response = await fetch(`/api/admin/backup/delete/${backupId}`, {
                method: 'DELETE',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete backup');
            }

            this.showAlert('success', 'Backup deleted successfully');
            this.loadBackupHistory();
        } catch (error) {
            console.error('Error deleting backup:', error);
            this.showAlert('error', 'Failed to delete backup');
        }
    }

    async updateScheduleSettings(formData) {
        try {
            const response = await fetch('/api/admin/backup/schedule', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(Object.fromEntries(formData))
            });

            if (!response.ok) {
                throw new Error('Failed to update schedule settings');
            }

            this.showAlert('success', 'Schedule settings updated successfully');
            this.loadBackupStatus();
        } catch (error) {
            console.error('Error updating schedule settings:', error);
            this.showAlert('error', 'Failed to update schedule settings');
        }
    }

    async updateStorageSettings(formData) {
        try {
            const response = await fetch('/api/admin/backup/storage', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(Object.fromEntries(formData))
            });

            if (!response.ok) {
                throw new Error('Failed to update storage settings');
            }

            this.showAlert('success', 'Storage settings updated successfully');
            this.loadBackupStatus();
        } catch (error) {
            console.error('Error updating storage settings:', error);
            this.showAlert('error', 'Failed to update storage settings');
        }
    }

    updateStatusDisplay() {
        const statusElement = document.getElementById('backupStatus');
        if (!statusElement) return;

        const { lastBackup, nextBackup, status } = this.backupStatus;

        statusElement.innerHTML = `
            <div class="status-item">
                <span class="label">Status:</span>
                <span class="value ${status.toLowerCase()}">${status}</span>
            </div>
            <div class="status-item">
                <span class="label">Last Backup:</span>
                <span class="value">${this.formatDate(lastBackup)}</span>
            </div>
            <div class="status-item">
                <span class="label">Next Backup:</span>
                <span class="value">${this.formatDate(nextBackup)}</span>
            </div>
        `;
    }

    updateHistoryTable() {
        const tableBody = document.querySelector('#backupHistory tbody');
        if (!tableBody) return;

        tableBody.innerHTML = this.backupHistory.map(backup => `
            <tr>
                <td>${this.formatDate(backup.timestamp)}</td>
                <td>${backup.type}</td>
                <td>${this.formatSize(backup.size)}</td>
                <td>${backup.status}</td>
                <td>
                    <button class="btn btn-sm btn-primary download-backup" 
                            data-backup-id="${backup.id}">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-backup" 
                            data-backup-id="${backup.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        return new Date(timestamp).toLocaleString();
    }

    formatSize(bytes) {
        if (!bytes) return 'N/A';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
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

// Initialize backup manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new BackupManager();
});
