class CustomersManager {
    constructor() {
        this.table = null;
        this.selectedCustomers = new Set();
        this.initialize();
    }

    initialize() {
        this.initializeDataTable();
        this.loadCustomerStats();
        this.setupEventListeners();
        this.loadCountries();
    }

    initializeDataTable() {
        this.table = $('#customersTable').DataTable({
            ajax: {
                url: '/api/customers',
                dataSrc: ''
            },
            columns: [
                {
                    data: null,
                    render: function (data) {
                        return `<input type="checkbox" class="form-check-input customer-checkbox" 
                                data-customer-id="${data.id}">`;
                    }
                },
                { data: 'id' },
                {
                    data: null,
                    render: function (data) {
                        return `
                            <div class="d-flex align-items-center">
                                <img src="${data.avatar || '../images/default-avatar.png'}" 
                                     class="rounded-circle mr-2" width="32">
                                <div>
                                    ${data.firstName} ${data.lastName}
                                    ${data.vip ? '<span class="badge bg-warning ms-1">VIP</span>' : ''}
                                </div>
                            </div>
                        `;
                    }
                },
                { data: 'email' },
                { data: 'phone' },
                { 
                    data: null,
                    render: function(data) {
                        return `${data.city}, ${data.country}`;
                    }
                },
                { data: 'totalBookings' },
                {
                    data: 'totalSpent',
                    render: function(data) {
                        return `$${data.toLocaleString()}`;
                    }
                },
                {
                    data: 'lastBooking',
                    render: function(data) {
                        return data ? new Date(data).toLocaleDateString() : 'Never';
                    }
                },
                {
                    data: 'status',
                    render: function(data) {
                        const statusClasses = {
                            active: 'success',
                            inactive: 'secondary',
                            blocked: 'danger'
                        };
                        return `<span class="badge bg-${statusClasses[data]}">${data}</span>`;
                    }
                },
                {
                    data: null,
                    render: function (data) {
                        return `
                            <div class="btn-group">
                                <button class="btn btn-sm btn-primary view-customer" 
                                        data-customer-id="${data.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-info edit-customer" 
                                        data-customer-id="${data.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-customer" 
                                        data-customer-id="${data.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `;
                    }
                }
            ],
            order: [[1, 'desc']],
            pageLength: 25,
            responsive: true
        });
    }

    async loadCustomerStats() {
        try {
            const response = await fetch('/api/customers/stats');
            const stats = await response.json();
            
            document.getElementById('totalCustomers').textContent = stats.total.toLocaleString();
            document.getElementById('activeCustomers').textContent = stats.active.toLocaleString();
            document.getElementById('avgBookings').textContent = stats.averageBookings.toFixed(1);
            document.getElementById('lifetimeValue').textContent = 
                `$${stats.lifetimeValue.toLocaleString()}`;
        } catch (error) {
            console.error('Error loading customer stats:', error);
            this.showAlert('error', 'Failed to load customer statistics');
        }
    }

    setupEventListeners() {
        // Select all checkbox
        $('#selectAll').on('change', (e) => {
            const isChecked = e.target.checked;
            $('.customer-checkbox').prop('checked', isChecked);
            if (isChecked) {
                $('.customer-checkbox').each((i, checkbox) => {
                    this.selectedCustomers.add($(checkbox).data('customer-id'));
                });
            } else {
                this.selectedCustomers.clear();
            }
            this.updateBulkActions();
        });

        // Individual checkboxes
        $('#customersTable').on('change', '.customer-checkbox', (e) => {
            const customerId = $(e.target).data('customer-id');
            if (e.target.checked) {
                this.selectedCustomers.add(customerId);
            } else {
                this.selectedCustomers.delete(customerId);
                $('#selectAll').prop('checked', false);
            }
            this.updateBulkActions();
        });

        // View customer
        $('#customersTable').on('click', '.view-customer', (e) => {
            const customerId = $(e.target).closest('button').data('customer-id');
            this.viewCustomer(customerId);
        });

        // Edit customer
        $('#customersTable').on('click', '.edit-customer', (e) => {
            const customerId = $(e.target).closest('button').data('customer-id');
            this.editCustomer(customerId);
        });

        // Delete customer
        $('#customersTable').on('click', '.delete-customer', (e) => {
            const customerId = $(e.target).closest('button').data('customer-id');
            this.showDeleteConfirmation(customerId);
        });

        // Save customer
        $('#saveCustomer').on('click', () => this.saveCustomer());

        // Export customers
        $('#exportCustomers').on('click', () => this.exportCustomers());
    }

    async loadCountries() {
        try {
            const response = await fetch('https://restcountries.com/v3.1/all');
            const countries = await response.json();
            
            const select = document.querySelector('select[name="country"]');
            select.innerHTML = countries
                .sort((a, b) => a.name.common.localeCompare(b.name.common))
                .map(country => `
                    <option value="${country.cca2}">${country.name.common}</option>
                `)
                .join('');
        } catch (error) {
            console.error('Error loading countries:', error);
        }
    }

    async viewCustomer(customerId) {
        try {
            const response = await fetch(`/api/customers/${customerId}`);
            const customer = await response.json();
            
            const modal = $('#customerDetailsModal');
            modal.find('.modal-body').html(this.generateCustomerDetails(customer));
            modal.modal('show');
        } catch (error) {
            console.error('Error loading customer details:', error);
            this.showAlert('error', 'Failed to load customer details');
        }
    }

    generateCustomerDetails(customer) {
        return `
            <div class="customer-profile mb-4">
                <div class="text-center mb-3">
                    <img src="${customer.avatar || '../images/default-avatar.png'}" 
                         class="rounded-circle" width="100">
                    <h4 class="mt-2">${customer.firstName} ${customer.lastName}</h4>
                    <p class="text-muted">${customer.email}</p>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h6>Contact Information</h6>
                        <p>Phone: ${customer.phone || 'N/A'}</p>
                        <p>Address: ${customer.address || 'N/A'}</p>
                        <p>Location: ${customer.city}, ${customer.country}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Customer Details</h6>
                        <p>Customer Since: ${new Date(customer.createdAt).toLocaleDateString()}</p>
                        <p>Status: <span class="badge bg-${this.getStatusColor(customer.status)}">
                            ${customer.status}</span></p>
                        <p>Newsletter: ${customer.newsletter ? 'Subscribed' : 'Not Subscribed'}</p>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-md-12">
                        <h6>Booking History</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Tour</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.generateBookingHistory(customer.bookings)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="row mt-4">
                    <div class="col-md-12">
                        <h6>Notes</h6>
                        <p>${customer.notes || 'No notes available'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    generateBookingHistory(bookings) {
        if (!bookings || bookings.length === 0) {
            return '<tr><td colspan="4" class="text-center">No booking history</td></tr>';
        }

        return bookings.map(booking => `
            <tr>
                <td>${new Date(booking.date).toLocaleDateString()}</td>
                <td>${booking.tour}</td>
                <td>$${booking.amount.toLocaleString()}</td>
                <td><span class="badge bg-${this.getStatusColor(booking.status)}">
                    ${booking.status}</span></td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        const colors = {
            active: 'success',
            inactive: 'secondary',
            blocked: 'danger',
            completed: 'success',
            pending: 'warning',
            cancelled: 'danger'
        };
        return colors[status] || 'secondary';
    }

    async saveCustomer() {
        const form = document.getElementById('customerForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const customerData = Object.fromEntries(formData.entries());
        customerData.interests = Array.from(formData.getAll('interests[]'));

        try {
            const url = customerData.customerId ? 
                       `/api/customers/${customerData.customerId}` : 
                       '/api/customers';
            
            const response = await fetch(url, {
                method: customerData.customerId ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(customerData)
            });

            if (response.ok) {
                this.showAlert('success', 
                    `Customer ${customerData.customerId ? 'updated' : 'created'} successfully`);
                $('#customerModal').modal('hide');
                this.table.ajax.reload();
                this.loadCustomerStats();
            } else {
                throw new Error('Failed to save customer');
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            this.showAlert('error', 'Failed to save customer');
        }
    }

    async exportCustomers() {
        try {
            const response = await fetch('/api/customers/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    customers: Array.from(this.selectedCustomers)
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'customers_export.xlsx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                throw new Error('Failed to export customers');
            }
        } catch (error) {
            console.error('Error exporting customers:', error);
            this.showAlert('error', 'Failed to export customers');
        }
    }

    updateBulkActions() {
        const hasSelection = this.selectedCustomers.size > 0;
        $('#exportCustomers').prop('disabled', !hasSelection);
    }

    showAlert(type, message) {
        const alertDiv = $(`
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `);

        $('.container-fluid').prepend(alertDiv);
        setTimeout(() => alertDiv.alert('close'), 5000);
    }
}

// Initialize customers manager when document is ready
$(document).ready(() => {
    new CustomersManager();
});
