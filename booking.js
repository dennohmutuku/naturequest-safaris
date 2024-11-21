class BookingSystem {
    constructor() {
        this.form = document.getElementById('bookingForm');
        this.modal = document.getElementById('bookingModal');
        this.initialize();
    }

    initialize() {
        if (this.form) {
            this.form.addEventListener('submit', this.handleSubmit.bind(this));
            this.setupDateValidation();
            this.setupDynamicPricing();
            this.setupPackageSelection();
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }

        const formData = new FormData(this.form);
        const bookingData = Object.fromEntries(formData.entries());

        // Show loading state
        const submitButton = this.form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

        // Simulate API call
        setTimeout(() => {
            this.processBooking(bookingData)
                .then(response => {
                    this.showSuccessMessage(response);
                    this.resetForm();
                })
                .catch(error => {
                    this.showErrorMessage(error);
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Book Now';
                });
        }, 2000);
    }

    validateForm() {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, 'This field is required');
                isValid = false;
            } else {
                this.clearFieldError(field);
            }
        });

        // Validate dates
        const startDate = new Date(this.form.startDate.value);
        const endDate = new Date(this.form.endDate.value);
        
        if (startDate >= endDate) {
            this.showFieldError(this.form.endDate, 'End date must be after start date');
            isValid = false;
        }

        return isValid;
    }

    setupDateValidation() {
        const startDateInput = this.form.querySelector('[name="startDate"]');
        const endDateInput = this.form.querySelector('[name="endDate"]');

        if (startDateInput && endDateInput) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            startDateInput.min = today;
            endDateInput.min = today;

            // Update end date minimum when start date changes
            startDateInput.addEventListener('change', () => {
                endDateInput.min = startDateInput.value;
            });
        }
    }

    setupDynamicPricing() {
        const packageSelect = this.form.querySelector('[name="package"]');
        const adultsInput = this.form.querySelector('[name="adults"]');
        const childrenInput = this.form.querySelector('[name="children"]');

        if (packageSelect && adultsInput && childrenInput) {
            const updatePrice = () => {
                const package = packageSelect.value;
                const adults = parseInt(adultsInput.value) || 0;
                const children = parseInt(childrenInput.value) || 0;

                const price = this.calculatePrice(package, adults, children);
                this.updatePriceDisplay(price);
            };

            packageSelect.addEventListener('change', updatePrice);
            adultsInput.addEventListener('input', updatePrice);
            childrenInput.addEventListener('input', updatePrice);
        }
    }

    calculatePrice(package, adults, children) {
        const prices = {
            'migration': 2500,
            'gorilla': 3500,
            'kilimanjaro': 2800
        };

        const basePrice = prices[package] || 0;
        const childDiscount = 0.3; // 30% discount for children

        return (adults * basePrice) + (children * basePrice * (1 - childDiscount));
    }

    updatePriceDisplay(price) {
        const priceDisplay = document.getElementById('totalPrice');
        if (priceDisplay) {
            priceDisplay.textContent = `Total: $${price.toLocaleString()}`;
        }
    }

    setupPackageSelection() {
        const destinationSelect = this.form.querySelector('[name="destination"]');
        const packageSelect = this.form.querySelector('[name="package"]');

        if (destinationSelect && packageSelect) {
            destinationSelect.addEventListener('change', () => {
                this.updatePackageOptions(destinationSelect.value);
            });
        }
    }

    updatePackageOptions(destination) {
        const packageOptions = {
            'serengeti': ['migration', 'big-five', 'photography'],
            'masai-mara': ['migration', 'big-five', 'cultural'],
            'bwindi': ['gorilla', 'chimp', 'birding']
        };

        const packageSelect = this.form.querySelector('[name="package"]');
        packageSelect.innerHTML = '<option value="">Select Package</option>';

        if (packageOptions[destination]) {
            packageOptions[destination].forEach(package => {
                const option = document.createElement('option');
                option.value = package;
                option.textContent = this.formatPackageName(package);
                packageSelect.appendChild(option);
            });
        }
    }

    formatPackageName(package) {
        return package
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    async processBooking(bookingData) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            if (Math.random() > 0.1) { // 90% success rate
                resolve({
                    success: true,
                    bookingId: 'BK' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    message: 'Booking successful!'
                });
            } else {
                reject(new Error('Unable to process booking. Please try again.'));
            }
        });
    }

    showSuccessMessage(response) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.innerHTML = `
            <h4>Booking Confirmed!</h4>
            <p>Your booking ID is: ${response.bookingId}</p>
            <p>We'll send you a confirmation email shortly.</p>
        `;

        this.form.insertBefore(alert, this.form.firstChild);
        
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(this.modal);
            modal.hide();
        }, 3000);
    }

    showErrorMessage(error) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.textContent = error.message;

        this.form.insertBefore(alert, this.form.firstChild);
    }

    showFieldError(field, message) {
        field.classList.add('is-invalid');
        
        let errorDiv = field.nextElementSibling;
        if (!errorDiv || !errorDiv.classList.contains('invalid-feedback')) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            field.parentNode.insertBefore(errorDiv, field.nextSibling);
        }
        errorDiv.textContent = message;
    }

    clearFieldError(field) {
        field.classList.remove('is-invalid');
        const errorDiv = field.nextElementSibling;
        if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
            errorDiv.remove();
        }
    }

    resetForm() {
        this.form.reset();
        const alerts = this.form.querySelectorAll('.alert');
        alerts.forEach(alert => alert.remove());
    }
}

// Initialize booking system
document.addEventListener('DOMContentLoaded', () => {
    new BookingSystem();
});
