class MaintenanceManager {
    constructor() {
        this.backupStatus = null;
        this.maintenanceMode = false;
        this.initialize();
    }

    async initialize() {
        await Promise.all([
            this.checkBackupStatus(),
            this.checkMaintenanceMode()
        ]);
        this.setupEventListeners();
        this.initializeScheduler();
    }

    async checkBackupStatus() {
        try {
            const response = await fetch('/api/admin/backup/status', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.backupStatus = await response.json();
            this.updateBackupStatus();
        } catch (error) {
            console.error('Error checking backup status:', error);
            this.showAlert('error', 'Failed to check backup status');
        }
    }

    async checkMaintenanceMode() {
        try {
            const response = await fetch('/api/admin/maintenance/status', {
                headers: AdminAuth.getAuthHeaders()
            });
            const data = await response.json();
            this.maintenanceMode = data.enabled;
            this.updateMaintenanceStatus();
        } catch (error) {
            console.error('Error checking maintenance mode:', error);
            this.showAlert('error', 'Failed to check maintenance mode');
        }
    }

    setupEventListeners() {
        // Backup actions
        document.getElementById('createBackup').addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('restoreBackup').addEventListener('click', () => {
            this.showRestoreModal();
        });

        document.getElementById('downloadBackup').addEventListener('click', () => {
            this.downloadBackup();
        });

        // Maintenance mode toggle
        document.getElementById('maintenanceToggle').addEventListener('change', (e) => {
            this.toggleMaintenanceMode(e.target.checked);
        });

        // Backup schedule form
        document.getElementById('backupScheduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBackupSchedule();
        });

        // System cleanup actions
        document.getElementById('cleanupLogs').addEventListener('click', () => {
            this.cleanupLogs();
        });

        document.getElementById('cleanupTemp').addEventListener('click', () => {
            this.cleanupTemp();
        });

        document.getElementById('cleanupCache').addEventListener('click', () => {
            this.cleanupCache();
        });
    }

    initializeScheduler() {
        const cronInput = document.getElementById('backupSchedule');
        const examples = {
            daily: '0 0 * * *',
            weekly: '0 0 * * 0',
            monthly: '0 0 1 * *'
        };

        document.querySelectorAll('.schedule-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                cronInput.value = examples[btn.dataset.schedule];
            });
        });
    }

    async createBackup() {
        try {
            const response = await fetch('/api/admin/backup/create', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to create backup');
            }

            this.showAlert('success', 'Backup created successfully');
            await this.checkBackupStatus();
        } catch (error) {
            console.error('Error creating backup:', error);
            this.showAlert('error', 'Failed to create backup');
        }
    }

    async restoreBackup(backupId) {
        try {
            const confirmed = await this.showConfirmation(
                'Are you sure you want to restore this backup? This will overwrite current data.'
            );

            if (!confirmed) return;

            const response = await fetch(`/api/admin/backup/restore/${backupId}`, {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
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

    async toggleMaintenanceMode(enabled) {
        try {
            if (enabled) {
                const message = prompt('Enter maintenance message (optional):');
                if (message === null) {
                    document.getElementById('maintenanceToggle').checked = false;
                    return;
                }
            }

            const response = await fetch('/api/admin/maintenance/toggle', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: JSON.stringify({
                    enabled,
                    message: message || ''
                })
            });

            if (!response.ok) {
                throw new Error('Failed to toggle maintenance mode');
            }

            this.maintenanceMode = enabled;
            this.updateMaintenanceStatus();
            this.showAlert('success', 
                `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
            console.error('Error toggling maintenance mode:', error);
            this.showAlert('error', 'Failed to toggle maintenance mode');
            document.getElementById('maintenanceToggle').checked = !enabled;
        }
    }

    async saveBackupSchedule() {
        const form = document.getElementById('backupScheduleForm');
        const formData = new FormData(form);
        const schedule = {
            cron: formData.get('backupSchedule'),
            retention: parseInt(formData.get('backupRetention')),
            notification: formData.get('backupNotification') === 'on'
        };

        try {
            const response = await fetch('/api/admin/backup/schedule', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: JSON.stringify(schedule)
            });

            if (!response.ok) {
                throw new Error('Failed to save backup schedule');
            }

            this.showAlert('success', 'Backup schedule saved successfully');
        } catch (error) {
            console.error('Error saving backup schedule:', error);
            this.showAlert('error', 'Failed to save backup schedule');
        }
    }

    async cleanupLogs() {
        await this.performCleanup('logs');
    }

    async cleanupTemp() {
        await this.performCleanup('temp');
    }

    async cleanupCache() {
        await this.performCleanup('cache');
    }

    async performCleanup(type) {
        try {
            const response = await fetch(`/api/admin/maintenance/cleanup/${type}`, {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Failed to cleanup ${type}`);
            }

            this.showAlert('success', `${type} cleaned up successfully`);
        } catch (error) {
            console.error(`Error cleaning up ${type}:`, error);
            this.showAlert('error', `Failed to cleanup ${type}`);
        }
    }

    updateBackupStatus() {
        const statusElement = document.getElementById('lastBackupStatus');
        if (!statusElement || !this.backupStatus) return;

        const { lastBackup, nextBackup, totalSize } = this.backupStatus;
        
        statusElement.innerHTML = `
            <div class="backup-info">
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    Last Backup: ${lastBackup ? new Date(lastBackup).toLocaleString() : 'Never'}
                </div>
                <div class="info-item">
                    <i class="fas fa-calendar"></i>
                    Next Backup: ${nextBackup ? new Date(nextBackup).toLocaleString() : 'Not scheduled'}
                </div>
                <div class="info-item">
                    <i class="fas fa-database"></i>
                    Total Size: ${this.formatSize(totalSize)}
                </div>
            </div>
        `;
    }

    updateMaintenanceStatus() {
        const toggle = document.getElementById('maintenanceToggle');
        if (toggle) {
            toggle.checked = this.maintenanceMode;
        }

        const status = document.getElementById('maintenanceStatus');
        if (status) {
            status.className = `maintenance-status ${this.maintenanceMode ? 'active' : 'inactive'}`;
            status.textContent = this.maintenanceMode ? 'Active' : 'Inactive';
        }
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    async showConfirmation(message) {
        return new Promise(resolve => {
            const modal = document.getElementById('confirmationModal');
            const confirmBtn = modal.querySelector('#confirmAction');
            
            modal.querySelector('.modal-body').textContent = message;
            
            confirmBtn.onclick = () => {
                bootstrap.Modal.getInstance(modal).hide();
                resolve(true);
            };

            modal.querySelector('[data-bs-dismiss="modal"]').onclick = () => {
                resolve(false);
            };

            new bootstrap.Modal(modal).show();
        });
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

// Initialize maintenance manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new MaintenanceManager();
});
