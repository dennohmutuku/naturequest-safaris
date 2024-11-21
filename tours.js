class ToursManager {
    constructor() {
        this.currentTourId = null;
        this.initialize();
    }

    initialize() {
        this.initializeRichEditor();
        this.loadTours();
        this.setupEventListeners();
    }

    initializeRichEditor() {
        tinymce.init({
            selector: '.rich-editor',
            height: 300,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | formatselect | bold italic | \
                     alignleft aligncenter alignright alignjustify | \
                     bullist numlist outdent indent | removeformat | help',
            content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, \
                           "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 16px }'
        });
    }

    async loadTours() {
        try {
            const response = await fetch('/api/tours');
            const tours = await response.json();
            this.renderTours(tours);
        } catch (error) {
            console.error('Error loading tours:', error);
            this.showAlert('error', 'Failed to load tours');
        }
    }

    renderTours(tours) {
        const grid = document.getElementById('toursGrid');
        grid.innerHTML = tours.map(tour => this.createTourCard(tour)).join('');
    }

    createTourCard(tour) {
        return `
            <div class="col-xl-4 col-md-6 mb-4">
                <div class="card tour-card h-100">
                    <img src="${tour.featuredImage}" class="card-img-top" alt="${tour.name}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
