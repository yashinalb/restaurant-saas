// Common types
export interface DatabaseRow {
  id: bigint;
  created_at: Date;
  updated_at?: Date;
}

// Tenant
export interface Tenant extends DatabaseRow {
  name: string;
  slug: string;
  domain: string | null;
  subdomain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  trial_ends_at: Date | null;
  settings: any;
}

// Admin User
export interface AdminUser extends DatabaseRow {
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  email_verified_at: Date | null;
}

// Role
export interface Role extends DatabaseRow {
  name: string;
  display_name: string;
  description: string | null;
  is_system_role: boolean;
  is_active: boolean;
}

// Permission
export interface Permission {
  id: bigint;
  name: string;
  display_name: string;
  description: string | null;
  module: string;
  is_active: boolean;
  created_at: Date;
}

// Admin Tenant Access
export interface AdminTenantAccess extends DatabaseRow {
  admin_user_id: bigint;
  tenant_id: bigint;
  role_id: bigint;
}

// Product
export interface Product extends DatabaseRow {
  tenant_id: bigint;
  master_product_id: bigint | null;
  sku: string;
  barcode: string | null;
  brand: string | null;
  weight: string | null;
  package_info: string | null;
  is_featured: boolean;
  is_active: boolean;
}

// Campaign
export interface Campaign extends DatabaseRow {
  tenant_id: bigint;
  campaign_type: string;
  slug: string;
  banner_image_url: string | null;
  badge_text: string | null;
  badge_color: string | null;
  badge_background: string | null;
  valid_from: Date;
  valid_to: Date;
  is_active: boolean;
  sort_order: number;
}

// Category
export interface ProductCategory extends DatabaseRow {
  tenant_id: bigint;
  parent_id: bigint | null;
  level: number;
  path: string | null;
  slug: string;
  icon_url: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

// JWT Payload
export interface JWTPayload {
  adminId: bigint;
  email: string;
  isSuperAdmin: boolean;
}

// Request with auth
export interface AuthRequest extends Request {
  admin?: AdminUser;
  tenant?: Tenant;
}
