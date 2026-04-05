# Skill Files — Usage Examples

Simple prompts for generating full CRUD. Claude Code will auto-discover columns, relationships, languages, and existing patterns from the codebase.

---

## Master Table (backend + frontend)

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_position_types + master_position_type_translations.
```

## Tenant Table (backend + frontend)

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for tenant_position_types + tenant_position_type_translations. 
```

## Backend only (master)

```
Read .claude/skills/master-backend.md.
Create backend CRUD for master_age_groups + master_age_group_translations.
```

## Frontend only (tenant)

```
Read .claude/skills/tenant-frontend.md.
Create frontend page for tenant_teams (backend already exists).
```

## Multiple tables at once

```
Read .claude/skills/tenant-backend.md and .claude/skills/tenant-frontend.md.
Create full CRUD for these tables (one at a time, build after each):
1. tenant_position_types + tenant_position_type_translations
2. tenant_formations + tenant_formation_translations
3. tenant_teams
```

## Table without translations

```
Read .claude/skills/master-backend.md and .claude/skills/master-frontend.md.
Create full CRUD for master_units (no translations table).
```

---

## Tips

- You do NOT need to specify columns — the skill files tell Claude to read the migration
- You do NOT need to specify JOINs — Claude detects FK columns automatically
- You do NOT need to specify permissions — Claude derives the module name and seeds them
- You do NOT need to specify languages — Claude reads the locales folder
- Mention `+ {table}_translations` only if you want to be explicit about translations existing
- Say "build after each" if you want compilation checks between tables
