import { useEffect, useState } from 'react';
import { Shield, Plus, Edit, Trash2, X, Users, Check } from 'lucide-react';
import { rolePermissionService, Role, Permission, CreateRoleData, UpdateRoleData } from '../../services/frontend-rolePermissionService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function RolesPage() {
  const { } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<CreateRoleData>({
    name: '',
    display_name: '',
    description: '',
    is_system_role: false,
    is_active: true,
    permission_ids: [],
  });

  const [editForm, setEditForm] = useState<UpdateRoleData>({});

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await rolePermissionService.getRoles();
      setRoles(data);
    } catch (error: any) {
      toast.error('Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const data = await rolePermissionService.getPermissionsGrouped();
      setPermissions(data);
    } catch (error: any) {
      toast.error('Failed to load permissions');
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.name || !createForm.display_name) {
      toast.error('Name and Display Name are required');
      return;
    }

    try {
      await rolePermissionService.createRole(createForm);
      toast.success('Role created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    try {
      await rolePermissionService.updateRole(selectedRole.id, editForm);
      toast.success('Role updated successfully');
      setShowEditModal(false);
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system role');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) return;

    try {
      await rolePermissionService.deleteRole(role.id);
      toast.success('Role deleted successfully');
      loadRoles();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setEditForm({
      name: role.name,
      display_name: role.display_name,
      description: role.description || '',
      is_active: role.is_active,
      permission_ids: role.permissions?.map(p => p.id) || [],
    });
    setShowEditModal(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      display_name: '',
      description: '',
      is_system_role: false,
      is_active: true,
      permission_ids: [],
    });
  };

  const togglePermission = (permissionId: number, isCreate: boolean) => {
    if (isCreate) {
      setCreateForm(prev => ({
        ...prev,
        permission_ids: prev.permission_ids?.includes(permissionId)
          ? prev.permission_ids.filter(id => id !== permissionId)
          : [...(prev.permission_ids || []), permissionId],
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        permission_ids: prev.permission_ids?.includes(permissionId)
          ? prev.permission_ids.filter(id => id !== permissionId)
          : [...(prev.permission_ids || []), permissionId],
      }));
    }
  };

  const renderPermissionSelector = (isCreate: boolean) => {
    const selectedPermissions = isCreate ? createForm.permission_ids : editForm.permission_ids;

    return (
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions
        </label>
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 space-y-4">
          {Object.entries(permissions).map(([module, perms]) => (
            <div key={module} className="space-y-2">
              <h4 className="font-semibold text-sm text-gray-800 capitalize border-b pb-1">
                {module}
              </h4>
              <div className="grid grid-cols-1 gap-2 pl-2">
                {perms.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions?.includes(permission.id)}
                      onChange={() => togglePermission(permission.id, isCreate)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-900">{permission.display_name}</span>
                      {permission.description && (
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {selectedPermissions?.length || 0} permission(s) selected
        </p>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-2">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Create Role
        </button>
      </div>

      {/* Roles Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading roles...</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No roles found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Create your first role
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {role.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{role.display_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        {role.permissions?.length || 0} permissions
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{role.user_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {role.is_system_role && (
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                        System
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        role.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(role)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!role.is_system_role && (
                        <button
                          onClick={() => handleDeleteRole(role)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Create New Role</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., store_manager"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use lowercase with underscores, no spaces
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm({ ...createForm, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Store Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description of this role..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              {renderPermissionSelector(true)}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Edit Role</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={selectedRole.is_system_role}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editForm.display_name}
                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>

              {renderPermissionSelector(false)}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Update Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
