# Tenant Table Frontend CRUD Pattern

Create admin panel service + page + nav + route + i18n for a tenant-scoped table.

## Before You Start — Auto-Discovery Steps

When given just a table name (e.g. `tenant_position_types`), do these steps FIRST:

1. **Read the backend service you just created** (or that already exists) to know the exact API endpoints and data shape.
2. **Derive all names from the table name:**
   - Table `tenant_position_types` → strip `tenant_` prefix for URL path
   - Frontend service file: `frontend-tenantPositionTypeService.ts` | Prefix: `frontend-` to distinguish from backend
   - API path prefix: `/api/tenant/position-types` (NOT `/api/admin/`)
   - Page: `TenantPositionTypesPage.tsx` | Route path: `tenant-position-types`
   - i18n section key: `tenantPositionTypes`
   - Nav label: `Position Types` (under tenantGroups)
   - Permission module: `tenant_position_types`
3. **Discover languages** — List `admin-panel/src/locales/` to find all language folders (e.g. en, tr, el, ru, de, es, fr). Add i18n keys to ALL of them.
4. **Read an existing tenant page** (e.g. `admin-panel/src/pages/MasterData/TenantTeamsPage.tsx`) to confirm exact imports, `usePermissions()` hook, `useAuthStore()` usage, toast library, icon imports.
5. **Read App.tsx** — Find where tenant routes are defined and add the new route in the same group.
6. **Read DashboardLayout.tsx** — Find the `tenantGroups` array and add the nav entry with `show: hasPermission('{module}.view')`.
7. **Build form fields for ALL columns** — Include every meaningful column from the table as a form field (text input, dropdown, color picker, toggle, etc.). For FK columns (e.g. `tenant_sport_id`), fetch the related data and render a dropdown.
8. **CRITICAL: Related data must use `/api/tenant/` endpoints** — When a tenant page needs dropdown data (e.g. sports list, position types), it MUST call a tenant-accessible endpoint under `/api/tenant/`, NOT `/api/admin/`. Admin endpoints require `requireSuperAdmin` and will return 403 for tenant users. If no tenant endpoint exists for the related data, create one in the backend (add a lookup route to the same tenant routes file).
9. **If translations exist** — Include language tabs in the modal with inputs for each translatable field.
10. **If master link exists** — Add an "Import from Master" button that shows a selection modal of unimported master records.

## Service (`admin-panel/src/services/frontend-{entityName}Service.ts`)

Uses `/api/tenant/{url-path}` prefix. The `apiClient` interceptor automatically sends `X-Tenant-ID` header from `localStorage.getItem('selectedTenantId')`, so NO need to pass `tenant_id` in params or body.

```typescript
import apiClient from './apiClient';

export interface {EntityType} {
  id: number;
  // Do NOT include tenant_id in frontend interface — it's implicit from X-Tenant-ID header
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const {entityName}Service = {
  getAll: async (filters?: Record<string, any>): Promise<{EntityType}[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.append(k, String(v));
      });
    }
    const response = await apiClient.get(`/api/tenant/{url-path}?${params.toString()}`);
    return response.data.data || response.data;
  },

  getById: async (id: number): Promise<{EntityType}> => {
    const response = await apiClient.get(`/api/tenant/{url-path}/${id}`);
    return response.data.data || response.data;
  },

  create: async (data: Partial<{EntityType}>): Promise<{EntityType}> => {
    const response = await apiClient.post('/api/tenant/{url-path}', data);
    return response.data.data || response.data;
  },

  update: async (id: number, data: Partial<{EntityType}>): Promise<{EntityType}> => {
    const response = await apiClient.put(`/api/tenant/{url-path}/${id}`, data);
    return response.data.data || response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/tenant/{url-path}/${id}`);
  },

  // Optional: import from master
  importFromMaster: async (masterIds: number[]): Promise<any> => {
    const response = await apiClient.post('/api/tenant/{url-path}/import', { masterIds });
    return response.data;
  },
};

export default {entityName}Service;
```

**IMPORTANT:** All API paths use `/api/tenant/` prefix, NOT `/api/admin/`. The tenant ID is sent automatically via the `X-Tenant-ID` header by the apiClient interceptor — never pass `tenant_id` in request body or query params.

## Page (`admin-panel/src/pages/MasterData/{EntityName}Page.tsx`)

Key differences from master pages:

1. **Permission checks** via `usePermissions()` hook (from `../hooks/usePermissions`)
2. **No tenant selector** — tenant is implicit from the selected tenant in sidebar
3. **Tenant guard** — Show "Please select a tenant" if no tenant is selected
4. **Import from Master** button (if applicable)

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2, Download } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import {entityName}Service, { {EntityType} } from '../../services/frontend-{entityName}Service';

export default function {EntityName}Page() {
  const { t, i18n } = useTranslation();
  const { hasPermission } = usePermissions();
  const { selectedTenant } = useAuthStore();

  // Permission checks for conditional rendering
  const canCreate = hasPermission('{module}.create');
  const canEdit = hasPermission('{module}.edit');
  const canDelete = hasPermission('{module}.delete');

  // Guard: require tenant selection
  if (!selectedTenant) {
    return (
      <div className="p-6 text-center text-gray-500">
        {t('common.selectTenantFirst', 'Please select a tenant first')}
      </div>
    );
  }

  // ... same state pattern as master page (items, loading, showModal, editingId, form fields) ...

  // fetchItems uses the service directly — tenant ID is sent via X-Tenant-ID header automatically
  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await {entityName}Service.getAll(filters);
      setItems(data);
    } catch (error) {
      toast.error(t('{i18nKey}.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when selectedTenant changes
  useEffect(() => {
    fetchItems();
  }, [selectedTenant?.id]);

  // In the JSX:
  // - Only show "Add" button if canCreate
  // - Only show Pencil edit icon if canEdit
  // - Only show Trash2 delete icon if canDelete
  // - No tenant dropdown/selector anywhere

  // Example: Add button with permission check
  // {canCreate && (
  //   <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
  //     <Plus className="w-4 h-4" />
  //     {t('{i18nKey}.add', 'Add {Entity}')}
  //   </button>
  // )}

  // Example: Action buttons with permission checks
  // <td className="px-6 py-4 text-right">
  //   {canEdit && (
  //     <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
  //       <Pencil className="w-4 h-4" />
  //     </button>
  //   )}
  //   {canDelete && (
  //     <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">
  //       <Trash2 className="w-4 h-4" />
  //     </button>
  //   )}
  // </td>
}
```

## App.tsx Route

Add route inside the **tenant route group** (not super admin):
```tsx
import {EntityName}Page from './pages/MasterData/{EntityName}Page';
// Inside tenant <Route> group:
<Route path="{url-path}" element={<{EntityName}Page />} />
```

## DashboardLayout.tsx Nav

Add to the **`tenantGroups`** array (NOT `superAdminGroups`). Tenant tables belong in the tenant navigation section which is only visible when a tenant is selected. Use `hasPermission` for visibility:
```typescript
// Inside the tenantGroups array — find an existing group or create a new one
{ name: t('navigation.{entityNamePlural}', '{Entities}'), to: '/{url-path}', icon: {IconName}, show: hasPermission('{module}.view') }
```
**IMPORTANT:** Never add tenant table nav items to `superAdminGroups`. Those are only for master/platform-level pages (`master_*` tables, languages, currencies, tenant management). Tenant-scoped tables (`tenant_*`) always go in `tenantGroups`.

## i18n Keys

Same pattern as master-frontend.md — add keys to ALL language files.
Check `admin-panel/src/locales/` to see how many languages exist and add to each one.

Add under a new section:
```json
"{entityNamePlural}": {
  "title": "{Entities}",
  "add": "Add {Entity}",
  "edit": "Edit {Entity}",
  "code": "Code",
  "name": "Name",
  "confirmDelete": "Are you sure you want to delete this {entity}?",
  "created": "{Entity} created successfully",
  "updated": "{Entity} updated successfully",
  "deleted": "{Entity} deleted successfully",
  "fetchError": "Failed to load {entities}",
  "saveError": "Failed to save {entity}",
  "deleteError": "Failed to delete {entity}",
  "codeRequired": "Code is required",
  "importFromMaster": "Import from Master",
  "imported": "Imported successfully"
}
```

## Master vs Tenant Frontend Comparison

| Aspect | Master tables | Tenant tables |
|--------|--------------|---------------|
| API path prefix | `/api/admin/{path}` | `/api/tenant/{path}` |
| Service file prefix | `frontend-` (optional) | `frontend-` (recommended) |
| Nav location | `superAdminGroups` | `tenantGroups` |
| Nav visibility | `show: true` (super admin always sees) | `show: hasPermission('module.view')` |
| Permission hook | None needed (super admin has all) | `usePermissions()` → `hasPermission()` |
| Tenant selector in form | Yes (super admin picks tenant) | No (implicit from selected tenant) |
| Tenant guard | Not needed | Show "Please select a tenant" if none selected |
| Auth store usage | Optional | `useAuthStore()` → `selectedTenant` |
| Re-fetch trigger | None | `useEffect` on `selectedTenant?.id` change |

## Import from Master Pattern (Frontend)

When a tenant table links to a master table, add "Import from Master" UI:

### Frontend service methods

```typescript
// In the service object:
async getAvailableMaster(filters?: Record<string, any>): Promise<MasterEntityForImport[]> {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v !== undefined) params.append(k, String(v)); });
  const response = await apiClient.get(`/api/tenant/{url-path}/master/available?${params.toString()}`);
  return response.data;
},

async importFromMaster(data: { tenant_sport_id: number; master_{entity}_ids: number[] }): Promise<{ message: string; imported_count: number; imported_ids: number[] }> {
  const response = await apiClient.post('/api/tenant/{url-path}/import', data);
  return response.data;
},
```

### Import interface

```typescript
export interface MasterEntityForImport {
  id: number;
  code: string;
  is_imported: boolean;  // Backend computes via LEFT JOIN
  translations?: { language_id: number; language_code: string; name: string; }[];
}
```

### Page UI pattern

**State:**
```typescript
const [isImportModalOpen, setIsImportModalOpen] = useState(false);
const [masterItems, setMasterItems] = useState<MasterEntityForImport[]>([]);
const [selectedMasterIds, setSelectedMasterIds] = useState<Set<number>>(new Set());
const [importSportId, setImportSportId] = useState(0);
const [importing, setImporting] = useState(false);
```

**Button:** Purple "Import from Master" button next to blue "Add" button, guarded by `canCreate`:
```tsx
<button onClick={openImportModal} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
  {t('{i18nKey}.importFromMaster')}
</button>
```

**Modal structure:**
1. Sport selector (required)
2. Optional category filter (for position types)
3. Select all / deselect all buttons
4. Flat list with checkboxes, name, code, "Already imported" badge
5. Footer: selected count + Cancel + Import Selected button

### i18n keys for import

Add to the entity's i18n section in ALL 7 languages:
```
importFromMaster, importTitle, importSubtitle, selectSportForImport, selectAll, deselectAll, alreadyImported, importing, importSelected, importedCount, noMasterAvailable, sportRequired
```
For position types also add: `filterByCategory`, `allCategories`

## Translation Resolution (IMPORTANT)

When displaying translated names from the database (e.g. in tables, dropdowns, labels), **NEVER** use `translations?.[0]?.name` or hardcode a language. These show the wrong language.

**Always use a `getTranslatedName()` helper** that matches the current admin panel language via `i18n.language`:

```typescript
const { t, i18n } = useTranslation();

const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
  if (!translations || translations.length === 0) return fallback;
  return translations.find(tr => tr.language_code === i18n.language)?.name
    || translations.find(tr => tr.language_code === 'en')?.name
    || translations[0].name
    || fallback;
};
```

**Fallback chain:** current UI language → English → first available → fallback string.

Use this for table cells, dropdown options, and anywhere a translated entity name is displayed. For non-`name` fields, use a `getTranslatedField()` variant (see master-frontend.md for the full pattern).

## Checklist
- [ ] Service file with `/api/tenant/` paths
- [ ] If master link exists: add `getAvailableMaster()` + `importFromMaster()` to service
- [ ] Page file with table + modal + permission checks + tenant guard
- [ ] If master link exists: add import button + import modal to page
- [ ] Route in App.tsx (tenant group)
- [ ] Nav entry in DashboardLayout.tsx (`tenantGroups`, with `hasPermission` check)
- [ ] i18n keys in ALL language files (including import keys if applicable)
- [ ] Build: `cd admin-panel && npm run build`
