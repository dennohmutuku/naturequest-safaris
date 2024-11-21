class BookingsManager {
    constructor() {
        this.table = null;
        this.selectedBookings = new Set();
        this.initialize();
    }

    initialize() {
        this.initializeDataTable();
        this.setupEventListeners();
        this.loadTourPackages();
    }

    initializeDataTable() {
        this.table = $('#bookingsTable').DataTable({
            ajax: {
                url: '/api/bookings',
                dataSrc: ''
            },
            columns: [
                {
                    data: null,
                    render: function (data, type, row) {
                        return `<input type="checkbox" class="form-check-input booking-checkbox" 
                                data-booking-id="${row.id}">`;
                    }
                },
                { data: 'id' },
                {
                    data: null,
                    render: function (data, type, row) {
                        return `
                            <div class="d-flex align-items-center">
                                <img src="${row.customerAvatar}" class="rounded-circle mr-2" width="32">
                                <div class="ml-2">
                                    <div class="font-weight-bold">${row.customerName}</div>
                                    <div class="small text-muted">${row.customerEmail}</div>
                                </div>
                            </div>
                        `;
                    }
                },
                { data: 'tour' },
                {
                    data: 'date',
                    render: function(data) {
                        return new Date(data).toLocaleDateString();
                    }
                },
                { data: 'guests' },
                {
                    data: 'amount',
                    render: function(data) {
                        return `$${data.toLocaleString()}`;
                    }
                },
                {
                    data: 'status',
                    render: function(data) {
                        const statusClasses = {
                            pending: 'warning',
                            confirmed: 'success',
                            completed: 'info',
                            cancelled: 'danger'
                        };
                        return `<span class="badge bg-${statusClasses[data]}">${data}</span>`;
                    }
                },
                {
                    data: null,
                    render: function (data, type, row) {
                        return `
                            <div class="btn-group">
                                <button class="btn btn-sm btn-primary view-booking" 
                                        data-booking-id="${row.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-success confirm-booking" 
                                        data-booking-id="${row.id}">
                                    <i
