export type BannerType =
  | 'hero'
  | 'top'
  | 'middle'
  | 'bottom'
  | 'alert'
  | 'promotional'
  | 'sidebar';

export type BannerLinkType = 'menu_item' | 'menu_category' | 'page' | 'url' | 'none';
export type BannerLinkTarget = '_self' | '_blank';
export type BannerCtaStyle = 'primary' | 'secondary' | 'outline' | 'ghost';

export type TextPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type TextAlignment = 'left' | 'center' | 'right';

export interface BannerTranslation {
  language_id: number;
  language_code?: string;
  language_name?: string;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  cta_text?: string | null;
  alt_text?: string | null;
}

export interface Banner {
  id: number;
  tenant_id: number;
  banner_type: BannerType;
  image_url: string | null;
  mobile_image_url: string | null;
  background_color: string | null;
  text_color: string | null;
  text_position: TextPosition;
  text_alignment: TextAlignment;
  text_position_mobile: TextPosition | null;
  text_alignment_mobile: TextAlignment | null;
  text_style: Record<string, number> | null;
  link_type: BannerLinkType;
  link_menu_item_id: number | null;
  link_menu_category_id: number | null;
  link_page_code: string | null;
  link_url: string | null;
  link_target: BannerLinkTarget;
  show_cta: boolean;
  cta_style: BannerCtaStyle;
  valid_from: string | null;
  valid_to: string | null;
  show_on_mobile: boolean;
  show_on_desktop: boolean;
  is_dismissible: boolean;
  is_active: boolean;
  sort_order: number;
  translations: BannerTranslation[];
}

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface MenuCategory {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  category_id: number;
  slug: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_active: boolean;
}

export interface TenantInfo {
  id: number;
  slug: string;
  name: string;
  default_language_code?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}
