// Contact Form Handling
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            // Validate form
            if (!validateForm(formData)) {
                return;
            }

            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            // Simulate form submission
            setTimeout(() => {
                // Success message
                showAlert('success', 'Thank you for your message! We will get back to you soon.');
                
                // Reset form
                contactForm.reset();
                
                // Reset button
                submitButton.disabled = false;
                submitButton.innerHTML = 'Send Message';
            }, 2000);
        });
    }
});

// Form validation
function validateForm(data) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s-]{8,}$/;

    if (!data.name.trim()) {
        showAlert('error', 'Please enter your name');
        return false;
    }

    if (!emailRegex.test(data.email)) {
        showAlert('error', 'Please enter a valid email address');
        return false;
    }

    if (data.phone && !phoneRegex.test(data.phone)) {
        showAlert('error', 'Please enter a valid phone number');
        return false;
    }

    if (!data.subject.trim()) {
        showAlert('error', 'Please enter a subject');
        return false;
    }

    if (!data.message.trim()) {
        showAlert('error', 'Please enter your message');
        return false;
    }

    return true;
}

// Alert message function
function showAlert(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const formContainer = document.querySelector('.contact-form-container');
    formContainer.insertBefore(alertDiv, document.getElementById('contactForm'));

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Google Maps initialization
function initMap() {
    const location = { lat: -3.3667, lng: 36.6833 }; // Arusha coordinates
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: location,
        styles: [
            // Custom map styles
        ]
    });

    const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: 'Naturequest Safaris'
    });
}

// Initialize map when the API is loaded
window.initMap = initMap;
