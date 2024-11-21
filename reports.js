class ReportsManager {
    constructor() {
        this.currentReport = null;
        this.reportData = null;
        this.charts = {};
        this.initialize();
    }

    async initialize() {
        this.setupEventListeners();
        this.initializeDateRangePicker();
        await this.loadReportTypes();
    }

    setupEventListeners() {
        // Report type selection
        document.getElementById('reportType').addEventListener('change', (e) => {
            this.loadReportConfig(e.target.value);
        });

        // Generate report button
        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });

        // Export buttons
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.format;
                this.exportReport(format);
            });
        });

        // Schedule report form
        document.getElementById('scheduleReportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.scheduleReport();
        });

        // Save report template
        document.getElementById('saveTemplate').addEventListener('click', () => {
            this.saveReportTemplate();
        });
    }

    initializeDateRangePicker() {
        const picker = new DateRangePicker('#reportDateRange', {
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract(1, 'month').startOf('month'), 
                             moment().subtract(1, 'month').endOf('month')]
            },
            startDate: moment().subtract(29, 'days'),
            endDate: moment()
        });

        picker.on('apply.daterangepicker', (ev, picker) => {
            if (this.currentReport) {
                this.generateReport();
            }
        });
    }

    async loadReportTypes() {
        try {
            const response = await fetch('/api/admin/reports/types', {
                headers: AdminAuth.getAuthHeaders()
            });
            const types = await response.json();
            
            const select = document.getElementById('reportType');
            select.innerHTML = types.map(type => `
                <option value="${type.id}">${type.name}</option>
            `).join('');

            if (types.length > 0) {
                this.loadReportConfig(types[0].id);
            }
        } catch (error) {
            console.error('Error loading report types:', error);
            this.showAlert('error', 'Failed to load report types');
        }
    }

    async loadReportConfig(reportId) {
        try {
            const response = await fetch(`/api/admin/reports/config/${reportId}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            const config = await response.json();
            
            this.currentReport = config;
            this.updateReportForm(config);
        } catch (error) {
            console.error('Error loading report config:', error);
            this.showAlert('error', 'Failed to load report configuration');
        }
    }

    updateReportForm(config) {
        const container = document.getElementById('reportParameters');
        container.innerHTML = '';

        config.parameters.forEach(param => {
            const div = document.createElement('div');
            div.className = 'mb-3';
