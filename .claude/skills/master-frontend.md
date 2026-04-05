# Master Table Frontend CRUD Pattern

Create admin panel service + page + nav + route + i18n for a master (super-admin) table.

## Before You Start — Auto-Discovery Steps

When given just a table name (e.g. `master_position_types`), do these steps FIRST:

1. **Read the backend service you just created** (or that already exists) to know the exact API endpoints and data shape.
2. **Derive all names from the table name:**
   - Table `master_position_types` → strip `master_` prefix
   - Frontend service: `positionTypeService.ts` | API path: `/admin/position-types`
   - Page: `PositionTypesPage.tsx` | Route path: `position-types`
   - i18n section key: `positionTypes`
   - Nav label: `Position Types`
3. **Discover languages** — List `admin-panel/src/locales/` to find all language folders (e.g. en, tr, el, ru, de, es, fr). Add i18n keys to ALL of them.
4. **Read an existing page** (e.g. `admin-panel/src/pages/PositionTypesPage.tsx` or `SportTypesPage.tsx`) to confirm exact imports, auth context shape, toast usage, icon imports.
5. **Read App.tsx** — Find where super admin routes are defined and add the new route in the same group.
6. **Read DashboardLayout.tsx** — Find the super admin NavGroup section and add the nav entry with an appropriate lucide-react icon.
7. **Build form fields for ALL columns** — Don't just use `code` and `is_active`. Include every meaningful column from the table as a form field in the modal (text input, dropdown, toggle, etc. based on column type).
8. **If translations exist** — Include language tabs in the modal with inputs for each translatable field (name, description, etc. — whatever the translations table has).

## Service (`admin-panel/src/services/{entityName}Service.ts`)

```typescript
import apiClient from './apiClient';

export interface {EntityType} {
  id: number;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: Array<{
    language_code: string;
    name: string;
    description?: string;
  }>;
}

const {entityName}Service = {
  getAll: async (): Promise<{EntityType}[]> => {
    const response = await apiClient.get('/admin/{url-path}');
    return response.data.data || response.data;
  },

  getById: async (id: number): Promise<{EntityType}> => {
    const response = await apiClient.get(`/admin/{url-path}/${id}`);
    return response.data.data || response.data;
  },

  create: async (data: Partial<{EntityType}>): Promise<{EntityType}> => {
    const response = await apiClient.post('/admin/{url-path}', data);
    return response.data.data || response.data;
  },

  update: async (id: number, data: Partial<{EntityType}>): Promise<{EntityType}> => {
    const response = await apiClient.put(`/admin/{url-path}/${id}`, data);
    return response.data.data || response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/{url-path}/${id}`);
  },
};

export default {entityName}Service;
```

## Page (`admin-panel/src/pages/{EntityName}Page.tsx`)

Key structure:
- State: `items`, `loading`, `showModal`, `editingId`, form fields, `translations` array
- `useEffect` → fetch all on mount
- Table with columns, edit/delete buttons
- Modal with form fields + translations tabs
- Delete uses `window.confirm()`
- Toast via `toast.success()` / `toast.error()` from Sonner
- i18n via `useTranslation()` with `t('key', 'Fallback')`

```tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import {entityName}Service, { {EntityType} } from '../services/{entityName}Service';

// Get available languages from i18n config — check src/i18n.ts or locales folder
// Example: const LANGUAGES = ['en', 'tr', 'el', 'ru', 'de', 'es', 'fr'];

export default function {EntityName}Page() {
  const { t, i18n } = useTranslation();

  // Helper: resolve translated name based on current admin panel language
  const getTranslatedName = (translations: Array<{ language_code?: string; name: string }> | undefined, fallback = '-') => {
    if (!translations || translations.length === 0) return fallback;
    return translations.find(tr => tr.language_code === i18n.language)?.name
      || translations.find(tr => tr.language_code === 'en')?.name
      || translations[0].name
      || fallback;
  };

  const [items, setItems] = useState<{EntityType}[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [translations, setTranslations] = useState<Array<{ language_code: string; name: string; description: string }>>([]);
  const [activeTab, setActiveTab] = useState('en');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await {entityName}Service.getAll();
      setItems(data);
    } catch (error) {
      toast.error(t('{entityNamePlural}.fetchError', 'Failed to load {entities}'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = () => {
    setEditingId(null);
    setFormCode('');
    setFormIsActive(true);
    setTranslations(LANGUAGES.map(lang => ({ language_code: lang, name: '', description: '' })));
    setActiveTab('en');
    setShowModal(true);
  };

  const handleEdit = (item: {EntityType}) => {
    setEditingId(item.id);
    setFormCode(item.code);
    setFormIsActive(item.is_active);
    setTranslations(LANGUAGES.map(lang => {
      const existing = item.translations?.find(tr => tr.language_code === lang);
      return { language_code: lang, name: existing?.name || '', description: existing?.description || '' };
    }));
    setActiveTab('en');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('{entityNamePlural}.confirmDelete', 'Are you sure?'))) return;
    try {
      await {entityName}Service.delete(id);
      toast.success(t('{entityNamePlural}.deleted', 'Deleted successfully'));
      fetchItems();
    } catch (error) {
      toast.error(t('{entityNamePlural}.deleteError', 'Failed to delete'));
    }
  };

  const handleSave = async () => {
    if (!formCode.trim()) {
      toast.error(t('{entityNamePlural}.codeRequired', 'Code is required'));
      return;
    }
    try {
      setSaving(true);
      const payload = {
        code: formCode,
        is_active: formIsActive,
        translations: translations.filter(tr => tr.name.trim()),
      };
      if (editingId) {
        await {entityName}Service.update(editingId, payload);
        toast.success(t('{entityNamePlural}.updated', 'Updated successfully'));
      } else {
        await {entityName}Service.create(payload);
        toast.success(t('{entityNamePlural}.created', 'Created successfully'));
      }
      setShowModal(false);
      fetchItems();
    } catch (error) {
      toast.error(t('{entityNamePlural}.saveError', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const updateTranslation = (langCode: string, field: string, value: string) => {
    setTranslations(prev =>
      prev.map(tr => tr.language_code === langCode ? { ...tr, [field]: value } : tr)
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('{entityNamePlural}.title', '{Entities}')}
        </h1>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          {t('{entityNamePlural}.add', 'Add {Entity}')}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('{entityNamePlural}.code', 'Code')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('{entityNamePlural}.name', 'Name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('common.status', 'Status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getTranslatedName(item.translations)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-3">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {editingId
                  ? t('{entityNamePlural}.edit', 'Edit {Entity}')
                  : t('{entityNamePlural}.add', 'Add {Entity}')}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Code input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('{entityNamePlural}.code', 'Code')}
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">{t('common.active', 'Active')}</span>
              </label>

              {/* Translation tabs */}
              <div>
                <div className="flex gap-1 border-b mb-3">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setActiveTab(lang)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 ${
                        activeTab === lang
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
                {translations.filter(tr => tr.language_code === activeTab).map(tr => (
                  <div key={tr.language_code} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('{entityNamePlural}.translationName', 'Name')} ({tr.language_code.toUpperCase()})
                      </label>
                      <input
                        type="text"
                        value={tr.name}
                        onChange={e => updateTranslation(tr.language_code, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('{entityNamePlural}.translationDescription', 'Description')} ({tr.language_code.toUpperCase()})
                      </label>
                      <textarea
                        value={tr.description}
                        onChange={e => updateTranslation(tr.language_code, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                {t('common.cancel', 'Cancel')}
              </button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save', 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## App.tsx Route

Add import and route inside the super admin route group:
```tsx
import {EntityName}Page from './pages/{EntityName}Page';
// Inside <Route> for super admin:
<Route path="{url-path}" element={<{EntityName}Page />} />
```

## DashboardLayout.tsx Nav

Add to the **`superAdminGroups`** array (NOT `tenantGroups`). Master/platform tables belong in the super admin navigation section which is only visible to super admins:
```typescript
// Inside the superAdminGroups array — find the appropriate group or create a new one
{ name: t('navigation.{entityNamePlural}', '{Entities}'), to: '/{url-path}', icon: {IconName}, show: true }
```
Use a lucide-react icon that matches the entity concept.
**IMPORTANT:** Never add master table nav items to `tenantGroups`. Those are only for tenant-scoped pages (`tenant_*` tables). Master/platform tables (`master_*`, languages, currencies, etc.) always go in `superAdminGroups`.

## i18n Keys

Add to ALL language files in `admin-panel/src/locales/*/translation.json`.
Check how many languages exist first (look at `src/locales/` folder).

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
  "codeRequired": "Code is required"
}
```

## Translation Resolution (IMPORTANT)

When displaying translated names from the database (e.g. in tables, dropdowns, labels), **NEVER** use `translations?.[0]?.name` or hardcode a language like `translations?.find(tr => tr.language_code === 'en')?.name`. These show the wrong language.

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

Use this helper for:
- Table cell display: `getTranslatedName(item.translations)`
- Dropdown options: `getTranslatedName(category.translations)`
- Any place where a translated entity name is shown to the user

For fields other than `name`, create a similar helper or pass the field:
```typescript
const getTranslatedField = (translations: Array<Record<string, any>> | undefined, field: string, fallback = '-') => {
  if (!translations || translations.length === 0) return fallback;
  return translations.find(tr => tr.language_code === i18n.language)?.[field]
    || translations.find(tr => tr.language_code === 'en')?.[field]
    || translations[0]?.[field]
    || fallback;
};
```

## Checklist
- [ ] Service file with axios CRUD wrapper
- [ ] Page file with table + modal + translations tabs
- [ ] Route in App.tsx (super admin group)
- [ ] Nav entry in DashboardLayout.tsx
- [ ] i18n keys in ALL language files
- [ ] Build: `cd admin-panel && npm run build`
