class MediaManager {
    constructor() {
        this.currentFolder = '/';
        this.selectedFiles = new Set();
        this.clipboardFiles = new Set();
        this.clipboardOperation = null; // 'copy' or 'cut'
        this.viewMode = 'grid'; // 'grid' or 'list'
        this.sortBy = 'name';
        this.sortOrder = 'asc';
        this.initialize();
    }

    async initialize() {
        await this.loadCurrentFolder();
        this.setupEventListeners();
        this.initializeUploader();
        this.initializeImageEditor();
    }

    async loadCurrentFolder() {
        try {
            const response = await fetch(`/api/admin/media${this.currentFolder}`, {
                headers: AdminAuth.getAuthHeaders()
            });
            const data = await response.json();
            this.updateBreadcrumb();
            this.updateFileList(data.files);
            this.updateFolderTree(data.folders);
            this.updateStorageStats(data.stats);
        } catch (error) {
            console.error('Error loading folder:', error);
            this.showAlert('error', 'Failed to load folder contents');
        }
    }

    setupEventListeners() {
        // File selection
        document.addEventListener('click', (e) => {
            if (e.target.closest('.media-item')) {
                this.handleFileSelection(e);
            }
        });

        // Folder navigation
        document.addEventListener('click', (e) => {
            if (e.target.closest('.folder-item')) {
                e.preventDefault();
                const path = e.target.closest('.folder-item').dataset.path;
                this.navigateToFolder(path);
            }
        });

        // Toolbar actions
        document.getElementById('createFolder').addEventListener('click', () => {
            this.showCreateFolderDialog();
        });

        document.getElementById('uploadFiles').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('deleteSelected').addEventListener('click', () => {
            this.deleteSelectedFiles();
        });

        document.getElementById('copySelected').addEventListener('click', () => {
            this.copySelectedFiles();
        });

        document.getElementById('cutSelected').addEventListener('click', () => {
            this.cutSelectedFiles();
        });

        document.getElementById('paste').addEventListener('click', () => {
            this.pasteFiles();
        });

        // View mode toggle
        document.getElementById('viewMode').addEventListener('change', (e) => {
            this.viewMode = e.target.value;
            this.updateFileList();
        });

        // Sort options
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.updateFileList();
        });

        document.getElementById('sortOrder').addEventListener('change', (e) => {
            this.sortOrder = e.target.value;
            this.updateFileList();
        });

        // Search
        document.getElementById('searchFiles').addEventListener('input', (e) => {
            this.searchFiles(e.target.value);
        });

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            const mediaItem = e.target.closest('.media-item');
            if (mediaItem) {
                e.preventDefault();
                this.showContextMenu(e, mediaItem);
            }
        });

        // Drag and drop
        const dropZone = document.getElementById('fileList');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            this.uploadFiles(files);
        });
    }

    initializeUploader() {
        const uploader = new Dropzone('#uploadDropzone', {
            url: '/api/admin/media/upload',
            headers: AdminAuth.getAuthHeaders(),
            paramName: 'files',
            maxFilesize: 10, // MB
            acceptedFiles: 'image/*,application/pdf,.doc,.docx,.xls,.xlsx',
            addRemoveLinks: true,
            parallelUploads: 4,
            createImageThumbnails: true,
            init: () => {
                this.setupUploaderEvents(uploader);
            }
        });
    }

    initializeImageEditor() {
        // Initialize image editor (e.g., using Cropper.js)
        this.imageEditor = new Cropper('#imageEditor', {
            aspectRatio: NaN,
            viewMode: 2,
            crop: (event) => {
                this.updateCropData(event.detail);
            }
        });
    }

    async uploadFiles(files) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        formData.append('path', this.currentFolder);

        try {
            const response = await fetch('/api/admin/media/upload', {
                method: 'POST',
                headers: AdminAuth.getAuthHeaders(),
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            const result = await response.json();
            this.showAlert('success', `Successfully uploaded ${files.length} files`);
            this.loadCurrentFolder();
        } catch (error) {
            console.error('Error uploading files:', error);
            this.showAlert('error', 'Failed to upload files');
        }
    }

    async deleteSelectedFiles() {
        if (!this.selectedFiles.size) return;

        if (!confirm(`Are you sure you want to delete ${this.selectedFiles.size} items?`)) {
            return;
        }

        try {
            const response = await fetch('/api/admin/media/delete', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: Array.from(this.selectedFiles)
                })
            });

            if (!response.ok) throw new Error('Delete failed');

            this.showAlert('success', `Successfully deleted ${this.selectedFiles.size} items`);
            this.selectedFiles.clear();
            this.loadCurrentFolder();
        } catch (error) {
            console.error('Error deleting files:', error);
            this.showAlert('error', 'Failed to delete files');
        }
    }

    async createFolder(name) {
        try {
            const response = await fetch('/api/admin/media/create-folder', {
                method: 'POST',
                headers: {
                    ...AdminAuth.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: `${this.currentFolder}${name}`
                })
            });

            if (!response.ok) throw new Error('Failed to create folder');

            this.showAlert('success', `Folder "${name}" created successfully`);
            this.loadCurrentFolder();
        } catch (error) {
            console.error('Error creating folder:', error);
            this.showAlert('error', 'Failed to create folder');
        }
    }

    updateFileList(files) {
        const container = document.getElementById('fileList');
        
        if (!files.length) {
            container.innerHTML = `
                <div class="text-center text-muted py-5">
                    <i class="fas fa-folder-open fa-3x mb-3"></i>
                    <p>This folder is empty</p>
                </div>
            `;
            return;
        }

        // Sort files
        files.sort((a, b) => {
            const aValue = a[this.sortBy];
            const bValue = b[this.sortBy];
            const modifier = this.sortOrder === 'asc' ? 1 : -1;
            
            if (aValue < bValue) return -1 * modifier;
            if (aValue > bValue) return 1 * modifier;
            return 0;
        });

        container.innerHTML = files.map(file => `
            <div class="media-item ${this.viewMode}" data-path="${file.path}">
                <div class="media-preview">
                    ${this.getFilePreview(file)}
                </div>
                <div class="media-info">
                    <div class="media-name">${file.name}</div>
                    <div class="media-meta">
                        <span>${this.formatFileSize(file.size)}</span>
                        <span>${this.formatDate(file.modified)}</span>
                    </div>
                </div>
                <div class="media-actions">
                    <button class="btn btn-sm btn-primary preview-file">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-info edit-file">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-file">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Update selection state
        this.selectedFiles.forEach(path => {
            const item = container.querySelector(`[data-path="${path}"]`);
            if (item) item.classList.add('selected');
        });
    }

    getFilePreview(file) {
        if (file.type.startsWith('image/')) {
            return `<img src="${file.thumbnail}" alt="${file.name}">`;
        }

        const icons = {
            'application/pdf': 'fa-file-pdf',
            'application/msword': 'fa-file-word',
            'application/vnd.ms-excel': 'fa-file-excel',
            'text/plain': 'fa-file-text',
            'directory': 'fa-folder'
        };

        const iconClass = icons[file.type] || 'fa-file';
        return `<i class="fas ${iconClass}"></i>`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
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

// Initialize media manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new MediaManager();
});
