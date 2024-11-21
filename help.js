class HelpSystem {
    constructor() {
        this.articles = {};
        this.currentArticle = null;
        this.searchIndex = null;
        this.initialize();
    }

    async initialize() {
        await Promise.all([
            this.loadArticles(),
            this.initializeSearchIndex()
        ]);
        this.setupEventListeners();
        this.checkUrlHash();
    }

    async loadArticles() {
        try {
            const response = await fetch('/api/admin/help/articles', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.articles = await response.json();
            this.renderArticlesList();
        } catch (error) {
            console.error('Error loading help articles:', error);
            this.showAlert('error', 'Failed to load help articles');
        }
    }

    async initializeSearchIndex() {
        try {
            // Initialize lunr.js search index
            const response = await fetch('/api/admin/help/search-index', {
                headers: AdminAuth.getAuthHeaders()
            });
            const indexData = await response.json();
            
            this.searchIndex = lunr(function() {
                this.ref('id');
                this.field('title', { boost: 10 });
                this.field('content');
                this.field('tags', { boost: 5 });

                indexData.forEach(doc => {
                    this.add(doc);
                });
            });
        } catch (error) {
            console.error('Error initializing search index:', error);
            this.showAlert('error', 'Failed to initialize search');
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchHelp');
        let searchTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });

        // Category toggles
        document.querySelectorAll('.category-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const category = e.target.closest('.category-section');
                category.classList.toggle('expanded');
            });
        });

        // Article links
        document.getElementById('articlesList').addEventListener('click', (e) => {
            const articleLink = e.target.closest('.article-link');
            if (articleLink) {
                e.preventDefault();
                this.loadArticle(articleLink.dataset.articleId);
            }
        });

        // Feedback buttons
        document.querySelectorAll('.feedback-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.submitFeedback(e.target.dataset.value);
            });
        });

        // Contact support form
        document.getElementById('contactSupportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSupportRequest(new FormData(e.target));
        });
    }

    checkUrlHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.loadArticle(hash);
        } else {
            this.loadArticle('getting-started');
        }
    }

    renderArticlesList() {
        const container = document.getElementById('articlesList');
        container.innerHTML = Object.entries(this.articles.categories).map(([category, data]) => `
            <div class="category-section">
                <div class="category-header">
                    <h6 class="category-title">
                        <i class="fas ${data.icon}"></i>
                        ${data.name}
                    </h6>
                    <button class="category-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="category-articles">
                    ${data.articles.map(article => `
                        <a href="#${article.id}" class="article-link" data-article-id="${article.id}">
                            ${article.title}
                        </a>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    async loadArticle(articleId) {
        try {
            const response = await fetch(`/api/admin/help/articles/${articleId}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            const article = await response.json();
            
            this.currentArticle = article;
            this.renderArticle(article);
            
            // Update URL hash without triggering reload
            history.replaceState(null, null, `#${articleId}`);
            
            // Track article view
            this.trackArticleView(articleId);
        } catch (error) {
            console.error('Error loading article:', error);
            this.showAlert('error', 'Failed to load article');
        }
    }

    renderArticle(article) {
        const container = document.getElementById('articleContent');
        container.innerHTML = `
            <h2 class="article-title">${article.title}</h2>
            <div class="article-metadata">
                <span class="last-updated">
                    Last updated: ${new Date(article.updatedAt).toLocaleDateString()}
                </span>
                <span class="reading-time">
                    ${this.calculateReadingTime(article.content)} min read
                </span>
            </div>
            <div class="article-content">
                ${marked(article.content)}
            </div>
            <div class="article-footer">
                <div class="article-tags">
                    ${article.tags.map(tag => `
                        <span class="tag">${tag}</span>
                    `).join('')}
                </div>
                <div class="article-feedback">
                    <p>Was this article helpful?</p>
                    <button class="btn btn-sm btn-outline-success feedback-btn" data-value="helpful">
                        <i class="fas fa-thumbs-up"></i> Yes
                    </button>
                    <button class="btn btn-sm btn-outline-danger feedback-btn" data-value="not-helpful">
                        <i class="fas fa-thumbs-down"></i> No
                    </button>
                </div>
            </div>
            <div class="related-articles">
                <h5>Related Articles</h5>
                <div class="related-articles-list">
                    ${this.getRelatedArticles(article).map(related => `
                        <a href="#${related.id}" class="related-article-link" 
                           data-article-id="${related.id}">
                            ${related.title}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;

        // Highlight code blocks
        Prism.highlightAll();
    }

    performSearch(query) {
        if (!query.trim()) {
            this.renderArticlesList();
            return;
        }

        try {
            const results = this.searchIndex.search(query);
            this.renderSearchResults(results);
        } catch (error) {
            console.error('Error performing search:', error);
            this.showAlert('error', 'Search failed');
        }
    }

    renderSearchResults(results) {
        const container = document.getElementById('articlesList');
        
        if (results.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>No results found</p>
                    <button class="btn btn-primary" onclick="window.helpSystem.clearSearch()">
                        Clear Search
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="search-results">
                ${results.map(result => {
                    const article = this.articles.all[result.ref];
                    return `
                        <a href="#${article.id}" class="article-link" data-article-id="${article.id}">
                            <h6>${article.title}</h6>
                            <p>${this.truncateText(article.content, 100)}</p>
                            <div class="article-tags">
                                ${article.tags.map(tag => `
                                    <span class="tag">${tag}</span>
                                `).join('')}
                            </div>
                        </a>
                    `;
                }).join('')}
            </div>
        `;
    }

    async submitFeedback(value) {
        if (!this.currentArticle) return;

        try {
            await fetch('/api/admin/help/feedback', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    articleId: this.currentArticle.id,
                    feedback: value
                })
            });

            this.showAlert('success', 'Thank you for your feedback!');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            this.showAlert('error', 'Failed to submit feedback');
        }
    }

    async submitSupportRequest(formData) {
        try {
            const response = await fetch('/api/admin/help/support', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to submit support request');
            }

            this.showAlert('success', 'Support request submitted successfully');
            document.getElementById('contactSupportForm').reset();
        } catch (error) {
            console.error('Error submitting support request:', error);
            this.showAlert('error', 'Failed to submit support request');
        }
    }

    calculateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = content.trim().split(/\s+/).length;
        return Math.ceil(wordCount / wordsPerMinute);
    }

    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    getRelatedArticles(article) {
        // Simple tag-based recommendation
        return Object.values(this.articles.all)
            .filter(a => 
                a.id !== article.id && 
                a.tags.some(tag => article.tags.includes(tag))
            )
            .slice(0, 3);
    }

    async trackArticleView(articleId) {
        try {
            await fetch('/api/admin/help/track-view', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ articleId })
            });
        } catch (error) {
            console.error('Error tracking article view:', error);
        }
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

// Initialize help system when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.helpSystem = new HelpSystem();
});
