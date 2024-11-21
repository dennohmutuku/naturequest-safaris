class SettingsManager {
    constructor() {
        this.currentTab = 'general';
        this.settings = {};
        this.initialize();
    }

    async initialize() {
        await this.loadSettings();
        this.setupEventListeners();
        this.initializeImageUpload();
        this.initializeColorPickers();
        this.initializeEditors();
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/admin/settings', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.settings = await response.json();
            this.populateSettings();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showAlert('error', 'Failed to load settings');
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Form submissions
        document.querySelectorAll('.settings-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings(e.target.id);
            });
        });

        // Test email configuration
        document.getElementById('testEmail').addEventListener('click', () => {
            this.testEmailConfig();
        });

        // Test SMS configuration
        document.getElementById('testSMS').addEventListener('click', () => {
            this.testSMSConfig();
        });

        // Clear cache button
        document.getElementById('clearCache').addEventListener('click', () => {
            this.clearSystemCache();
        });

        // Regenerate API keys
        document.getElementById('regenerateKeys').addEventListener('click', () => {
            this.regenerateAPIKeys();
        });
    }

    initializeImageUpload() {
        const dropzone = new Dropzone('#logoUpload', {
            url: '/api/admin/settings/logo',
            headers: AdminAuth.getAuthHeaders(),
            maxFiles: 1,
            acceptedFiles: 'image/*',
            addRemoveLinks: true,
            success: (file, response) => {
                this.settings.general.logo = response.url;
                this.showAlert('success', 'Logo updated successfully');
            },
            error: (file, error) => {
                console.error('Error uploading logo:', error);
                this.showAlert('error', 'Failed to upload logo');
            }
        });
    }

    initializeColorPickers() {
        document.querySelectorAll('.color-picker').forEach(input => {
            new Pickr({
                el: input,
                theme: 'classic',
                default: input.value,
                components: {
                    preview: true,
                    opacity: true,
                    hue: true,
                    interaction: {
                        hex: true,
                        rgba: true,
                        input: true,
                        save: true
                    }
                }
            }).on('save', (color) => {
                input.value = color.toHEXA().toString();
            });
        });
    }

    initializeEditors() {
        document.querySelectorAll('.rich-editor').forEach(textarea => {
            ClassicEditor
                .create(textarea)
                .catch(error => {
                    console.error('Error initializing editor:', error);
                });
        });
    }

    switchTab(tab) {
        this
