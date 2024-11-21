class APIDocumentation {
    constructor() {
        this.endpoints = {};
        this.currentEndpoint = null;
        this.initialize();
    }

    async initialize() {
        await this.loadAPISpec();
        this.setupEventListeners();
        this.initializeCodeHighlighting();
    }

    async loadAPISpec() {
        try {
            const response = await fetch('/api/admin/docs/spec', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.endpoints = await response.json();
            this.renderEndpoints();
        } catch (error) {
            console.error('Error loading API specification:', error);
            this.showAlert('error', 'Failed to load API documentation');
        }
    }

    setupEventListeners() {
        // Endpoint selection
        document.getElementById('endpointList').addEventListener('click', (e) => {
            const endpoint = e.target.closest('.endpoint-item');
            if (endpoint) {
                this.showEndpointDetails(endpoint.dataset.path, endpoint.dataset.method);
            }
        });

        // Try it out functionality
        document.getElementById('tryEndpoint').addEventListener('click', () => {
            this.tryEndpoint();
        });

        // Authentication token input
        document.getElementById('authToken').addEventListener('input', (e) => {
            localStorage.setItem('apiTestToken', e.target.value);
        });

        // Search functionality
        document.getElementById('searchDocs').addEventListener('input', (e) => {
            this.filterEndpoints(e.target.value);
        });

        // Copy code buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-code')) {
                this.copyCode(e.target);
            }
        });
    }

    initializeCodeHighlighting() {
        // Initialize Prism.js for syntax highlighting
        Prism.highlightAll();
    }

    renderEndpoints() {
        const container = document.getElementById('endpointList');
        const groups = this.groupEndpoints();
        
        container.innerHTML = Object.entries(groups).map(([group, endpoints]) => `
            <div class="endpoint-group mb-3">
                <h6 class="group-title">${group}</h6>
                ${endpoints.map(endpoint => `
                    <div class="endpoint-item" data-path="${endpoint.path}" 
                         data-method="${endpoint.method}">
                        <span class="method-badge ${endpoint.method.toLowerCase()}">
                            ${endpoint.method}
                        </span>
                        <span class="endpoint-path">${endpoint.path}</span>
                        <small class="endpoint-summary">${endpoint.summary}</small>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    groupEndpoints() {
        const groups = {};
        
        for (const [path, methods] of Object.entries(this.endpoints.paths)) {
            for (const [method, spec] of Object.entries(methods)) {
                const group = spec.tags?.[0] || 'Other';
                if (!groups[group]) {
                    groups[group] = [];
                }
                groups[group].push({
                    path,
                    method: method.toUpperCase(),
                    summary: spec.summary,
                    spec
                });
            }
        }

        return groups;
    }

    showEndpointDetails(path, method) {
        const spec = this.endpoints.paths[path][method.toLowerCase()];
        this.currentEndpoint = { path, method, spec };

        const container = document.getElementById('endpointDetails');
        container.innerHTML = `
            <div class="endpoint-header">
                <h4>
                    <span class="method-badge ${method.toLowerCase()}">${method}</span>
                    ${path}
                </h4>
                <p class="endpoint-description">${spec.description || spec.summary}</p>
            </div>

            ${this.renderParameters(spec.parameters)}
            ${this.renderRequestBody(spec.requestBody)}
            ${this.renderResponses(spec.responses)}
            ${this.renderExamples(spec)}
        `;

        this.initializeCodeHighlighting();
    }

    renderParameters(parameters = []) {
        if (!parameters.length) return '';

        return `
            <div class="section">
                <h5>Parameters</h5>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parameters.map(param => `
                            <tr>
                                <td>${param.name}</td>
                                <td><code>${param.in}</code></td>
                                <td><code>${param.schema.type}</code></td>
                                <td>${param.required ? '✓' : ''}</td>
                                <td>${param.description || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRequestBody(requestBody) {
        if (!requestBody) return '';

        const content = requestBody.content['application/json'];
        return `
            <div class="section">
                <h5>Request Body</h5>
                <div class="schema-wrapper">
                    ${this.renderSchema(content.schema)}
                </div>
            </div>
        `;
    }

    renderResponses(responses) {
        return `
            <div class="section">
                <h5>Responses</h5>
                ${Object.entries(responses).map(([code, response]) => `
                    <div class="response-item">
                        <h6>
                            <span class="status-code">${code}</span>
                            ${response.description}
                        </h6>
                        ${response.content ? this.renderSchema(
                            response.content['application/json'].schema
                        ) : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSchema(schema) {
        if (schema.type === 'object') {
            return `
                <div class="schema-object">
                    ${Object.entries(schema.properties).map(([prop, details]) => `
                        <div class="schema-property">
                            <code>${prop}</code>
                            <span class="property-type">${details.type}</span>
                            ${details.description ? 
                                `<p class="property-description">${details.description}</p>` : 
                                ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }
        return `<code>${schema.type}</code>`;
    }

    renderExamples(spec) {
        return `
            <div class="section">
                <h5>Examples</h5>
                <div class="example-tabs">
                    <ul class="nav nav-tabs" role="tablist">
                        <li class="nav-item">
                            <a class="nav-link active" data-bs-toggle="tab" href="#curlExample">
                                cURL
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="tab" href="#jsExample">
                                JavaScript
                            </a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="tab" href="#pythonExample">
                                Python
                            </a>
                        </li>
                    </ul>
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="curlExample">
                            ${this.generateCurlExample(spec)}
                        </div>
                        <div class="tab-pane fade" id="jsExample">
                            ${this.generateJavaScriptExample(spec)}
                        </div>
                        <div class="tab-pane fade" id="pythonExample">
                            ${this.generatePythonExample(spec)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async tryEndpoint() {
        if (!this.currentEndpoint) return;

        const form = document.getElementById('tryItForm');
        const formData = new FormData(form);
        const params = Object.fromEntries(formData.entries());

        try {
            const response = await this.executeRequest(
                this.currentEndpoint.path,
                this.currentEndpoint.method,
                params
            );

            document.getElementById('responseBody').textContent = 
                JSON.stringify(response, null, 2);
            
            this.initializeCodeHighlighting();
        } catch (error) {
            console.error('Error executing request:', error);
            this.showAlert('error', 'Request failed');
        }
    }

    async executeRequest(path, method, params) {
        const url = new URL(path, window.location.origin);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${document.getElementById('authToken').value}`
            }
        };

        if (method !== 'GET') {
            options.body = JSON.stringify(params);
        } else {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    filterEndpoints(query) {
        const items = document.querySelectorAll('.endpoint-item');
        const groups = document.querySelectorAll('.endpoint-group');
        
        items.forEach(item => {
            const path = item.dataset.path.toLowerCase();
            const method = item.dataset.method.toLowerCase();
            const summary = item.querySelector('.endpoint-summary').textContent.toLowerCase();
            
            const matches = path.includes(query.toLowerCase()) || 
                           summary.includes(query.toLowerCase());
            
            item.style.display = matches ? 'flex' : 'none';
        });

        groups.forEach(group => {
            const hasVisibleEndpoints = Array.from(
                group.querySelectorAll('.endpoint-item')
            ).some(item => item.style.display !== 'none');
            
            group.style.display = hasVisibleEndpoints ? 'block' : 'none';
        });
    }

    copyCode(button) {
        const codeBlock = button.closest('.code-wrapper').querySelector('code');
        navigator.clipboard.writeText(codeBlock.textContent);
        
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
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

// Initialize API documentation when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new APIDocumentation();
});
