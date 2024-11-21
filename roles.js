class RolesManager {
    constructor() {
        this.roles = {};
        this.permissions = {};
        this.initialize();
    }

    async initialize() {
        await Promise.all([
            this.loadRoles(),
            this.loadPermissions()
        ]);
        this.setupEventListeners();
        this.renderRolesTable();
    }

    async loadRoles() {
        try {
            const response = await fetch('/api/admin/roles', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.roles = await response.json();
        } catch (error) {
            console.error('Error loading roles:', error);
            this.showAlert('error', 'Failed to load roles');
        }
    }

    async loadPermissions() {
        try {
            const response = await fetch('/api/admin/permissions', {
                headers: AdminAuth.getAuthHeaders()
            });
            this.permissions = await response.json();
        } catch (error) {
            console.error('Error loading permissions:', error);
            this.showAlert('error', 'Failed to load permissions');
        }
    }

    setupEventListeners() {
        // New role button
        document.getElementById('newRoleBtn').addEventListener('click', () => {
            this.showRoleModal();
        });

        // Save role
        document.getElementById('saveRole').addEventListener('click', () => {
            this.saveRole();
        });

        // Role actions (edit/delete)
        document.getElementById('rolesTable').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const roleId = btn.dataset.roleId;
            if (btn.classList.contains('edit-role')) {
                this.editRole(roleId);
            } else if (btn.classList.contains('delete-role')) {
                this.confirmDeleteRole(roleId);
            }
        });

        // Bulk permission toggles
        document.querySelectorAll('.toggle-all').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const checked = e.target.checked;
                document.querySelectorAll(`.permission-${category}`).forEach(checkbox => {
                    checkbox.checked = checked;
                });
            });
        });
    }

    renderRolesTable() {
        const table = document.getElementById('rolesTable');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = Object.entries(this.roles).map(([id, role]) => `
            <tr>
                <td>${role.name}</td>
                <td>${role.description}</td>
                <td>${role.users?.length || 0}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-info edit-role" data-role-id="${id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-role" data-role-id="${id}"
                                ${role.name === 'admin' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showRoleModal(role = null) {
        const modal = document.getElementById('roleModal');
        const form = document.getElementById('roleForm');
        
        // Reset form
        form.reset();
        document.querySelectorAll('.permission-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });

        if (role) {
            // Fill form with role
