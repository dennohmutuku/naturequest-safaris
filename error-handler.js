class ErrorHandler {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupGlobalHandlers();
        this.setupAjaxHandlers();
        this.setupReactErrorBoundary();
        this.initializeErrorReporting();
    }

    setupGlobalHandlers() {
        // Handle uncaught exceptions
        window.onerror = (message, source, lineno, colno, error) => {
            this.handleError(error, {
                type: 'uncaught_exception',
                source: source,
                line: lineno,
                column: colno
            });
            return false;
        };

        // Handle unhandled promise rejections
        window.onunhandledrejection = (event) => {
            this.handleError(event.reason, {
                type: 'unhandled_rejection',
                promise: event.promise
            });
        };

        // Handle runtime errors
        window.addEventListener('error', (event) => {
            if (event.error) {
                this.handleError(event.error, {
                    type: 'runtime_error',
                    element: event.target
                });
            }
        }, true);
    }

    setupAjaxHandlers() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (!response.ok) {
                    throw new HTTPError(response.status, response.statusText, args[0]);
                }
                
                return response;
            } catch (error) {
                this.handleError(error, {
                    type: 'fetch_error',
                    request: args[0]
                });
                throw error;
            }
        };

        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            
            xhr.addEventListener('error', (event) => {
                this.handleError(new Error('XHR request failed'), {
                    type: 'xhr_error',
                    xhr: xhr
                });
            });
            
            return xhr;
        };
    }

    setupReactErrorBoundary() {
        if (window.React) {
            class ErrorBoundary extends React.Component {
                constructor(props) {
                    super(props);
                    this.state = { hasError: false };
                }

                static getDerivedStateFromError(error) {
                    return { hasError: true };
                }

                componentDidCatch(error, errorInfo) {
                    this.handleError(error, {
                        type: 'react_error',
                        componentStack: errorInfo.componentStack
                    });
                }

                render() {
                    if (this.state.hasError) {
                        return this.props.fallback || 
                               <div className="error-boundary">Something went wrong</div>;
                    }
                    return this.props.children;
                }
            }

            window.ErrorBoundary = ErrorBoundary;
        }
    }

    initializeErrorReporting() {
        this.errorQueue = [];
        this.isReporting = false;

        // Process error queue periodically
        setInterval(() => {
            this.processErrorQueue();
        }, 5000);
    }

    async handleError(error, context = {}) {
        const errorData = this.formatError(error, context);
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error('Error caught by handler:', errorData);
        }

        // Add to reporting queue
        this.errorQueue.push(errorData);

        // Show user feedback if appropriate
        this.showUserFeedback(errorData);

        // Trigger immediate processing if critical
        if (this.isCriticalError(errorData)) {
            this.processErrorQueue();
        }
    }

    formatError(error, context) {
        return {
            timestamp: new Date().toISOString(),
            message: error.message || String(error),
            stack: error.stack,
            type: error.name || 'Error',
            context: {
                ...context,
                url: window.location.href,
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            user: this.getUserContext(),
            severity: this.calculateErrorSeverity(error)
        };
    }

    getUserContext() {
        // Get current user information if available
        const user = AdminAuth.getCurrentUser();
        return user ? {
            id: user.id,
            role: user.role,
            // Exclude sensitive information
            lastActive: user.lastActive
        } : null;
    }

    calculateErrorSeverity(error) {
        if (error instanceof HTTPError) {
            return error.status >= 500 ? 'critical' : 'warning';
        }
        
        if (error.message?.includes('memory') || error.message?.includes('storage')) {
            return 'critical';
        }
        
        return 'error';
    }

    isCriticalError(errorData) {
        return errorData.severity === 'critical';
    }

    async processErrorQueue() {
        if (this.isReporting || this.errorQueue.length === 0) {
            return;
        }

        this.isReporting = true;

        try {
            const errors = [...this.errorQueue];
            this.errorQueue = [];

            await fetch('/api/admin/errors/report', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ errors })
            });
        } catch (error) {
            console.error('Error reporting failed:', error);
            // Re-add failed reports to queue
            this.errorQueue.unshift(...errors);
        } finally {
            this.isReporting = false;
        }
    }

    showUserFeedback(errorData) {
        let message = 'An error occurred. Please try again.';
        let type = 'error';

        if (errorData.type === 'HTTPError') {
            switch (errorData.context.status) {
                case 401:
                    message = 'Your session has expired. Please log in again.';
                    AdminAuth.redirectToLogin();
                    break;
                case 403:
                    message = 'You don\'t have permission to perform this action.';
                    break;
                case 404:
                    message = 'The requested resource was not found.';
                    break;
                case 429:
                    message = 'Too many requests. Please try again later.';
                    type = 'warning';
                    break;
                case 500:
                    message = 'A server error occurred. Please try again later.';
                    break;
            }
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.querySelector('.container-fluid')?.insertBefore(
            alertDiv,
            document.querySelector('.container-fluid').firstChild
        );

        setTimeout(() => alertDiv.remove(), 5000);
    }
}

class HTTPError extends Error {
    constructor(status, statusText, url) {
        super(`HTTP ${status}: ${statusText}`);
        this.name = 'HTTPError';
        this.status = status;
        this.statusText = statusText;
        this.url = url;
    }
}

// Initialize error handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.errorHandler = new ErrorHandler();
});
