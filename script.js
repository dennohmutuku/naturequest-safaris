// Navigation Scroll Effect
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');

    navbarToggler.addEventListener('click', function() {
        navbarCollapse.classList.toggle('show');
    });

    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navbarCollapse.classList.remove('show');
        });
    });
});

// Booking Form Validation and Submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Basic form validation
        const formData = new FormData(this);
        let isValid = true;
        let errorMessage = '';

        // Check required fields
        formData.forEach((value, key) => {
            if (!value && key !== 'special-requirements') {
                isValid = false;
                errorMessage += `${key} is required\n`;
            }
        });

        if (!isValid) {
            alert('Please fill in all required fields:\n' + errorMessage);
            return;
        }

        // Simulate form submission
        const submitButton = bookingForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.innerHTML = 'Processing...';

        // Simulate API call
        setTimeout(() => {
            alert('Booking request received! We will contact you shortly.');
            bookingForm.reset();
            submitButton.disabled = false;
            submitButton.innerHTML = 'Book Now';
            
            // Close modal if exists
            const modal = document.getElementById('bookingModal');
            if (modal) {
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
            }
        }, 2000);
    });
}

// Tour Search Functionality
const tourSearchForm = document.querySelector('.tour-search-form');
if (tourSearchForm) {
    tourSearchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const destination = this.querySelector('select[name="destination"]').value;
        const date = this.querySelector('input[name="date"]').value;
        const guests = this.querySelector('select[name="guests"]').value;

        // Simulate search
        const searchResults = document.getElementById('searchResults');
        if (searchResults) {
            searchResults.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
            
            setTimeout(() => {
                // Simulate API response
                searchResults.innerHTML = `
                    <h3>Available Tours for ${destination}</h3>
                    <div class="row">
                        <!-- Tour cards would be populated here -->
                        <p>Search results for: ${destination}, Date: ${date}, Guests: ${guests}</p>
                    </div>
                `;
            }, 1500);
        }
    });
}

// Image Gallery
document.querySelectorAll('.gallery-image').forEach(image => {
    image.addEventListener('click', function() {
        const modal = document.getElementById('imageModal');
        const modalImg = modal.querySelector('img');
        modalImg.src = this.src;
        
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
    });
});

// Weather Widget
function updateWeather(location) {
    const weatherWidget = document.querySelector('.weather-widget');
    if (weatherWidget) {
        // Simulate weather API call
        const weatherData = {
            temperature: Math.floor(Math.random() * 15) + 20, // Random temp between 20-35
            condition: ['Sunny', 'Partly Cloudy', 'Cloudy'][Math.floor(Math.random() * 3)]
        };

        weatherWidget.innerHTML = `
            <div class="weather-info">
                <h4>${location} Weather</h4>
                <p>${weatherData.temperature}°C</p>
                <p>${weatherData.condition}</p>
            </div>
        `;
    }
}

// Newsletter Subscription
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = this.querySelector('input[type="email"]').value;
        
        // Simulate API call
        const button = this.querySelector('button');
        button.disabled = true;
        button.innerHTML = 'Subscribing...';

        setTimeout(() => {
            alert('Thank you for subscribing to our newsletter!');
            this.reset();
            button.disabled = false;
            button.innerHTML = 'Subscribe';
        }, 1500);
    });
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
