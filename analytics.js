class DashboardAnalytics {
    constructor() {
        this.charts = {};
        this.dateRange = '30d'; // Default to last 30 days
        this.initialize();
    }

    initialize() {
        this.setupDateRangeSelector();
        this.loadAnalytics();
        this.setupRefreshInterval();
    }

    setupDateRangeSelector() {
        const selector = document.getElementById('dateRangeSelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.dateRange = e.target.value;
                this.loadAnalytics();
            });
        }
    }

    async loadAnalytics() {
        try {
            const response = await fetch(`/api/admin/analytics?range=${this.dateRange}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            const data = await response.json();

            this.updateKPICards(data.kpis);
            this.createRevenueChart(data.revenue);
            this.createBookingsChart(data.bookings);
            this.createPopularToursChart(data.popularTours);
            this.createCustomerSourcesChart(data.customerSources);
            this.updateRecentActivity(data.recentActivity);
            this.updateUpcomingTours(data.upcomingTours);

        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showAlert('error', 'Failed to load analytics data');
        }
    }

    updateKPICards(kpis) {
        const kpiElements = {
            totalRevenue: {
                value: kpis.totalRevenue.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }),
                trend: kpis.revenueTrend
            },
            totalBookings: {
                value: kpis.totalBookings,
                trend: kpis.bookingsTrend
            },
            averageBookingValue: {
                value: kpis.averageBookingValue.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }),
                trend: kpis.avgValueTrend
            },
            conversionRate: {
                value: `${kpis.conversionRate}%`,
                trend: kpis.conversionTrend
            }
        };

        for (const [id, data] of Object.entries(kpiElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.querySelector('.kpi-value').textContent = data.value;
                
                const trendElement = element.querySelector('.kpi-trend');
                const trendIcon = trendElement.querySelector('i');
                const trendValue = trendElement.querySelector('span');
                
                trendIcon.className = `fas fa-${data.trend > 0 ? 'arrow-up' : 'arrow-down'}`;
                trendValue.textContent = `${Math.abs(data.trend)}%`;
                trendElement.className = `kpi-trend ${data.trend > 0 ? 'positive' : 'negative'}`;
            }
        }
    }

    createRevenueChart(data) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Revenue',
                    data: data.values,
                    borderColor: '#4e73df',
                    backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    fill: true,
                    tension:
