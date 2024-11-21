class NotificationSystem {
    constructor() {
        this.templates = {};
        this.initialize();
    }

    async initialize() {
        await this.loadTemplates();
        this.setupEventListeners();
    }

    async loadTemplates() {
        try {
            const response = await fetch('/api/admin/email-templates', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.templates = await response.json();
        } catch (error) {
            console.error('Error loading email templates:', error);
        }
    }

    setupEventListeners() {
        // Preview email template
        document.querySelectorAll('.preview-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.dataset.templateId;
                this.previewTemplate(templateId);
            });
        });

        // Send test email
        document.querySelectorAll('.send-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.dataset.templateId;
                this.sendTestEmail(templateId);
            });
        });

        // Save template changes
        document.querySelectorAll('.save-template').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const templateId = e.target.dataset.templateId;
                this.saveTemplate(templateId);
            });
        });
    }

    async sendEmail(type, recipient, data) {
        try {
            const response = await fetch('/api/admin/send-email', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: JSON.stringify({
                    type,
                    recipient,
                    data
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send email');
            }

            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }

    async sendBookingConfirmation(booking) {
        const emailData = {
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            tourName: booking.tour.name,
            bookingDate: new Date(booking.date).toLocaleDateString(),
            bookingReference: booking.reference,
            totalAmount: booking.amount.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            }),
            tourDetails: {
                startDate: new Date(booking.tour.startDate).toLocaleDateString(),
                duration: booking.tour.duration,
                location: booking.tour.location,
                participants: booking.participants
            }
        };

        return this.sendEmail('booking_confirmation', booking.customer.email, emailData);
    }

    async sendPaymentReminder(booking) {
        const emailData = {
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            tourName: booking.tour.name,
            dueDate: new Date(booking.paymentDueDate).toLocaleDateString(),
            amountDue: booking.amountDue.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD'
            }),
            paymentLink: `https://example.com/payment/${booking.reference}`
        };

        return this.sendEmail('payment_reminder', booking.customer.email, emailData);
    }

    async sendTourReminder(booking) {
        const emailData = {
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            tourName: booking.tour.name,
            startDate: new Date(booking.tour.startDate).toLocaleDateString(),
            meetingPoint: booking.tour.meetingPoint,
            meetingTime: booking.tour.meetingTime,
            essentialItems: booking.tour.essentialItems,
            guideContact: booking.tour.guideContact
        };

        return this.sendEmail('tour_reminder', booking.customer.email, emailData);
    }

    async sendFeedbackRequest(booking) {
        const emailData = {
            customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
            tourName: booking.tour.name,
            feedbackLink: `https://example.com/feedback/${booking.reference}`
        };

        return this.sendEmail('feedback_request', booking.customer.email, emailData);
    }

    async sendNewsletterToSubscribers(newsletter) {
        try {
            const response = await fetch('/api/admin/send-newsletter', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: JSON.stringify(newsletter)
            });

            if (!response.ok) {
                throw new Error('Failed to send newsletter');
            }

            return true;
        } catch (error) {
            console.error('Error sending newsletter:', error);
            return false;
        }
    }

    previewTemplate(templateId) {
        const template = this.templates[templateId];
        if (!template) return;

        const previewModal = new bootstrap.Modal(document.getElementById('templatePreviewModal'));
        const previewContent = document.getElementById('templatePreviewContent');
        
        // Insert sample data into template
        const sampleData = this.getSampleData(templateId);
        let previewHtml = template.html;
        
        for (const [key, value] of Object.entries(sampleData)) {
            previewHtml = previewHtml.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        previewContent.innerHTML = previewHtml;
        previewModal.show();
    }

    async sendTestEmail(templateId) {
        const testEmail = prompt('Enter email address for test:');
        if (!testEmail) return;

        const sampleData = this.getSampleData(templateId);
        
        try {
            await this.sendEmail(templateId, testEmail, sampleData);
            this.showAlert('success', 'Test email sent successfully');
        } catch (error) {
            this.showAlert('error', 'Failed to send test email');
        }
    }

    async saveTemplate(templateId) {
        const template = this.templates[templateId];
        if (!template) return;

        const editor = document.querySelector(`#template-${templateId} .template-editor`);
        const updatedHtml = editor.value;

        try {
            const response = await fetch(`/api/admin/email-templates/${templateId}`, {
                method: 'PUT',
                headers: AdminAuth.getAuthHeaders(),
                body: JSON.stringify({
                    html: updatedHtml
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save template');
            }

            this.templates[templateId].html = updatedHtml;
            this.showAlert('success', 'Template saved successfully');
        } catch (error) {
            console.error('Error saving template:', error);
            this.showAlert('error', 'Failed to save template');
        }
    }

    getSampleData(templateId) {
        const sampleData = {
            booking_confirmation: {
                customerName: 'John Doe',
                tourName: 'Serengeti Safari Adventure',
                bookingDate: '2024-03-15',
                bookingReference: 'BOOK-123456',
                totalAmount: '$2,499.00',
                startDate: '2024-04-01',
                duration: '7 days',
                location: 'Serengeti National Park',
                participants: '2 adults'
            },
            payment_reminder: {
                customerName: 'Jane Smith',
                tourName: 'Kilimanjaro Climb',
                dueDate: '2024-03-20',
                amountDue: '$1,499.00',
                paymentLink: 'https://example.com/payment/BOOK-789012'
            },
            tour_reminder: {
                customerName: 'Michael Johnson',
                tourName: 'Zanzibar Beach Retreat',
                startDate: '2024-03-25',
                meetingPoint: 'Stone Town Ferry Terminal',
                meetingTime: '09:00 AM',
                essentialItems: 'Sunscreen, hat, swimwear',
                guideContact: '+255 123 456 789'
            },
            feedback_request: {
                customerName: 'Sarah Wilson',
                tourName: 'Ngorongoro Crater Safari',
                feedbackLink: 'https://example.com/feedback/BOOK-345678'
            }
        };

        return sampleData[templateId] || {};
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

// Initialize notification system when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem = new NotificationSystem();
});
