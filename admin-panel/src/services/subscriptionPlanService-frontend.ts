import api from './api';

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number | null; 
  currency: string;
  billing_period: string;
  max_products?: number | null;
  max_stores?: number;
  max_campaigns?: number | null;
  features?: any;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  active_tenants_count?: number;
  tenant_types_count?: number;
}

export interface CreateSubscriptionPlanData {
  name: string;
  slug: string;
  description?: string;
  price: number | null;
  currency?: string;
  billing_period: string;
  max_products?: number | null;
  max_stores?: number;
  max_campaigns?: number | null;
  features?: any;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateSubscriptionPlanData extends Partial<CreateSubscriptionPlanData> {}

export interface PlanTenantTypeLink {
  tenant_type_id: number;
  is_recommended: boolean;
  custom_price?: number | null;
  custom_features?: any;
  sort_order: number;
  created_at?: string;
  tenant_type_code?: string;
  tenant_type_icon?: string;
  tenant_type_is_active?: boolean;
  translations?: Array<{
    id: number;
    tenant_type_id: number;
    language_id: number;
    language_code: string;
    language_name: string;
    name: string;
    description?: string;
  }>;
}

export const subscriptionPlanService = {
  async getSubscriptionPlans() {
    const response = await api.get<{ data: SubscriptionPlan[] }>('/api/admin/subscription-plans');
    return response.data.data;
  },

  async getSubscriptionPlanById(id: number) {
    const response = await api.get<{ data: SubscriptionPlan }>(
      `/api/admin/subscription-plans/${id}`
    );
    return response.data.data;
  },

  async createSubscriptionPlan(data: CreateSubscriptionPlanData) {
    const response = await api.post<{ message: string; data: SubscriptionPlan }>(
      '/api/admin/subscription-plans',
      data
    );
    return response.data;
  },

  async updateSubscriptionPlan(id: number, data: UpdateSubscriptionPlanData) {
    const response = await api.put<{ message: string; data: SubscriptionPlan }>(
      `/api/admin/subscription-plans/${id}`,
      data
    );
    return response.data;
  },

  async deleteSubscriptionPlan(id: number) {
    const response = await api.delete<{ message: string }>(
      `/api/admin/subscription-plans/${id}`
    );
    return response.data;
  },

  // Tenant Type Management
  async getPlanTenantTypes(planId: number) {
    const response = await api.get<{ data: PlanTenantTypeLink[] }>(
      `/api/admin/subscription-plans/${planId}/tenant-types`
    );
    return response.data.data;
  },

  async updatePlanTenantTypes(
    planId: number,
    tenantTypes: Array<{
      tenant_type_id: number;
      is_recommended: boolean;
      custom_price?: number | null;
      custom_features?: any;
      sort_order: number;
    }>
  ) {
    const response = await api.put<{ message: string }>(
      `/api/admin/subscription-plans/${planId}/tenant-types`,
      { tenant_types: tenantTypes }
    );
    return response.data;
  },

  async getPlansForTenantType(tenantTypeId: number) {
    const response = await api.get<{ data: SubscriptionPlan[] }>(
      `/api/admin/tenant-types/${tenantTypeId}/subscription-plans`
    );
    return response.data.data;
  },
};
