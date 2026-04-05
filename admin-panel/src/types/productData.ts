export interface ProductData {
  // Identity
  id?: number | string; // optional (sometimes you only have tenant_product_id)
  tenant_product_id?: number;

  // Core display
  name: string;
  brand?: string;
  sku?: string;
  description?: string;

  // Image
  image?: string | null;

  // Pricing (numbers only in UI)
  regularPrice?: number | null;
  salePrice?: number | null;
  discountPercent?: number | null;
  pricePerUnit?: string | null;

  // Optional helpful extras
  currencyCode?: string;
  currencySymbol?: string;

  // For campaign countdown / UI
  campaignValidTo?: string | null; // ISO datetime
}
