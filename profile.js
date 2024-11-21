class ProfileManager {
    constructor() {
        this.userData = null;
        this.initialize();
    }

    async initialize() {
        await this.loadUserProfile();
        this.setupEventListeners();
        this.initializeImageUpload();
        this.initializeTwoFactor();
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/api/admin/profile', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.userData = await response.json();
            this.populateProfileData();
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showAlert('error', 'Failed to load profile data');
        }
    }

    setupEventListeners() {
        // Profile update form
        document.getElementById('profileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProfile(new FormData(e.target));
        });

        // Password change form
        document.getElementById('passwordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword(new FormData(e.target));
        });

        // Security preferences form
        document.getElementById('securityForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSecurityPreferences(new FormData(e.target));
        });

        // Notification preferences form
        document.getElementById('notificationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateNotificationPreferences(new FormData(e.target));
        });

        // Session management
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('terminate-session')) {
                this.terminateSession(e.target.dataset.sessionId);
            }
        });

        // API key management
        document.getElementById('generateApiKey').addEventListener('click', () => {
            this.generateNewApiKey();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('revoke-key')) {
                this.revokeApiKey(e.target.dataset.keyId);
            }
        });
    }

    initializeImageUpload() {
        const dropzone = new Dropzone('#avatarUpload', {
            url: '/api/admin/profile/avatar',
            headers: AdminAuth.getAuthHeaders(),
            maxFiles: 1,
            acceptedFiles: 'image/*',
            maxFilesize: 2, // MB
            createImageThumbnails: true,
            init: function() {
                this.on('success', () => {
                    this.loadUserProfile();
                });
            }
        });
    }

    initializeTwoFactor() {
        const qrCode = document.getElementById('twoFactorQR');
        if (qrCode && !this.userData.twoFactorEnabled) {
            this.generateTwoFactorQR();
        }

        document.getElementById('enableTwoFactor').addEventListener('submit', (e) => {
            e.preventDefault();
            this.enableTwoFactor(new FormData(e.target));
        });

        document.getElementById('disableTwoFactor').addEventListener('submit', (e) => {
            e.preventDefault();
            this.disableTwoFactor(new FormData(e.target));
        });
    }

    async updateProfile(formData) {
        try {
            const response = await fetch('/api/admin/profile/update', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            this.showAlert('success', 'Profile updated successfully');
            await this.loadUserProfile();
        } catch (error) {
            console.error('
