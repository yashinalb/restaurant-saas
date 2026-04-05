import { Router } from 'express';
import { Response } from 'express';
import { RoleService } from '../services/roleService.js';
import { PermissionService } from '../services/permissionService.js';
import { AuthRequest } from '../middleware/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/permissions.js';

const router = Router();

// All routes require authentication + super admin
router.use(authenticateToken, requireSuperAdmin);

// ==================== ROLES ====================

// GET /api/admin/roles
router.get('/roles', async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await RoleService.getAllRoles();
    res.json({ data: roles });
  } catch (error: any) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

// GET /api/admin/roles/:id
router.get('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      res.status(400).json({ error: 'Invalid role ID' });
      return;
    }
    const role = await RoleService.getRoleById(roleId);
    res.json({ data: role });
  } catch (error: any) {
    console.error('Get role error:', error);
    if (error.message === 'Role not found') {
      res.status(404).json({ error: 'Role not found' });
    } else {
      res.status(500).json({ error: 'Failed to get role' });
    }
  }
});

// POST /api/admin/roles
router.post('/roles', async (req: AuthRequest, res: Response) => {
  try {
    const { name, display_name, description, is_system_role, is_active, permission_ids } = req.body;
    
    if (!name || !display_name) {
      res.status(400).json({ error: 'name and display_name are required' });
      return;
    }

    const role = await RoleService.createRole({
      name,
      display_name,
      description,
      is_system_role,
      is_active,
      permission_ids,
    });

    res.status(201).json({ message: 'Role created successfully', data: role });
  } catch (error: any) {
    console.error('Create role error:', error);
    if (error.message === 'Role name already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create role' });
    }
  }
});

// PUT /api/admin/roles/:id
router.put('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      res.status(400).json({ error: 'Invalid role ID' });
      return;
    }

    const { name, display_name, description, is_active, permission_ids } = req.body;

    const role = await RoleService.updateRole(roleId, {
      name,
      display_name,
      description,
      is_active,
      permission_ids,
    });

    res.json({ message: 'Role updated successfully', data: role });
  } catch (error: any) {
    console.error('Update role error:', error);
    if (error.message === 'Role not found') {
      res.status(404).json({ error: 'Role not found' });
    } else if (error.message === 'Role name already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
});

// DELETE /api/admin/roles/:id
router.delete('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      res.status(400).json({ error: 'Invalid role ID' });
      return;
    }

    const result = await RoleService.deleteRole(roleId);
    res.json(result);
  } catch (error: any) {
    console.error('Delete role error:', error);
    if (error.message === 'Role not found') {
      res.status(404).json({ error: 'Role not found' });
    } else if (error.message === 'Cannot delete system role' || 
               error.message === 'Cannot delete role that is assigned to users') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }
});

// ==================== PERMISSIONS ====================

// GET /api/admin/permissions
router.get('/permissions', async (_req: AuthRequest, res: Response) => {
  try {
    const permissions = await PermissionService.getAllPermissions();
    res.json({ data: permissions });
  } catch (error: any) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to get permissions' });
  }
});

// GET /api/admin/permissions/grouped
router.get('/permissions/grouped', async (_req: AuthRequest, res: Response) => {
  try {
    const grouped = await PermissionService.getPermissionsByModule();
    res.json({ data: grouped });
  } catch (error: any) {
    console.error('Get grouped permissions error:', error);
    res.status(500).json({ error: 'Failed to get grouped permissions' });
  }
});

// GET /api/admin/permissions/:id
router.get('/permissions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const permissionId = parseInt(req.params.id);
    if (isNaN(permissionId)) {
      res.status(400).json({ error: 'Invalid permission ID' });
      return;
    }
    const permission = await PermissionService.getPermissionById(permissionId);
    res.json({ data: permission });
  } catch (error: any) {
    console.error('Get permission error:', error);
    if (error.message === 'Permission not found') {
      res.status(404).json({ error: 'Permission not found' });
    } else {
      res.status(500).json({ error: 'Failed to get permission' });
    }
  }
});

// POST /api/admin/permissions
router.post('/permissions', async (req: AuthRequest, res: Response) => {
  try {
    const { name, display_name, description, module, is_active } = req.body;

    if (!name || !display_name || !module) {
      res.status(400).json({ error: 'name, display_name, and module are required' });
      return;
    }

    const permission = await PermissionService.createPermission({
      name,
      display_name,
      description,
      module,
      is_active,
    });

    res.status(201).json({ message: 'Permission created successfully', data: permission });
  } catch (error: any) {
    console.error('Create permission error:', error);
    if (error.message === 'Permission name already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create permission' });
    }
  }
});

// PUT /api/admin/permissions/:id
router.put('/permissions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const permissionId = parseInt(req.params.id);
    if (isNaN(permissionId)) {
      res.status(400).json({ error: 'Invalid permission ID' });
      return;
    }

    const { name, display_name, description, module, is_active } = req.body;

    const permission = await PermissionService.updatePermission(permissionId, {
      name,
      display_name,
      description,
      module,
      is_active,
    });

    res.json({ message: 'Permission updated successfully', data: permission });
  } catch (error: any) {
    console.error('Update permission error:', error);
    if (error.message === 'Permission not found') {
      res.status(404).json({ error: 'Permission not found' });
    } else if (error.message === 'Permission name already exists') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update permission' });
    }
  }
});

// DELETE /api/admin/permissions/:id
router.delete('/permissions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const permissionId = parseInt(req.params.id);
    if (isNaN(permissionId)) {
      res.status(400).json({ error: 'Invalid permission ID' });
      return;
    }

    const result = await PermissionService.deletePermission(permissionId);
    res.json(result);
  } catch (error: any) {
    console.error('Delete permission error:', error);
    if (error.message === 'Permission not found') {
      res.status(404).json({ error: 'Permission not found' });
    } else if (error.message === 'Cannot delete permission that is in use') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete permission' });
    }
  }
});

export default router;
