import { appConfig } from '../config/app.config.js';

export interface PolarCustomer {
  id: string;
  email: string;
  name?: string | null;
  organizationId?: string | null;
  externalId?: string | null;
  createdAt?: string;
}

export interface CustomerSessionResult {
  token: string;
  customerPortalUrl: string;
  customerId: string;
  expiresAt: string;
}

export interface PolarProduct {
  id: string;
  name: string;
  organizationId: string;
  prices?: any[];
}

export class PolarService {
  private static get baseUrl(): string {
    return 'https://api.polar.sh/v1';
  }

  private static get token(): string {
    const token = appConfig.polar.accessToken;
    if (!token) {
      throw new Error('[PolarService] POLAR_ACCESS_TOKEN is not configured.');
    }
    return token;
  }

  /**
   * Find a customer in Polar by email.
   */
  static async findCustomerByEmail(email: string): Promise<PolarCustomer | null> {
    const url = `${this.baseUrl}/customers/?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[PolarService] Failed to find customer: ${res.status} ${errText}`);
    }

    const data = await res.json() as { items?: any[] };
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        id: item.id,
        email: item.email,
        name: item.name,
        organizationId: item.organization_id,
        externalId: item.external_id,
        createdAt: item.created_at,
      };
    }
    return null;
  }

  /**
   * Create a customer in Polar.
   * Note: When using an organization access token (polar_oat_...), organization_id
   * is automatically inferred by Polar and must NOT be provided in the request body.
   */
  static async createCustomer(params: { email: string; name?: string; externalId?: string }): Promise<PolarCustomer> {
    const url = `${this.baseUrl}/customers/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        name: params.name || params.email.split('@')[0],
        ...(params.externalId ? { external_id: params.externalId } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[PolarService] Failed to create customer: ${res.status} ${errText}`);
    }

    const item = await res.json() as any;
    return {
      id: item.id,
      email: item.email,
      name: item.name,
      organizationId: item.organization_id,
      externalId: item.external_id,
      createdAt: item.created_at,
    };
  }

  /**
   * Get or create customer by user profile.
   */
  static async getOrCreateCustomer(user: { id?: string; email: string; name?: string | null }): Promise<PolarCustomer> {
    const existing = await this.findCustomerByEmail(user.email);
    if (existing) {
      return existing;
    }
    return await this.createCustomer({
      email: user.email,
      name: user.name || undefined,
      externalId: user.id,
    });
  }

  /**
   * Create a Customer Session and return the authenticated Customer Portal URL.
   */
  static async createCustomerSession(customerId: string): Promise<CustomerSessionResult> {
    const url = `${this.baseUrl}/customer-sessions/`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        customer_id: customerId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[PolarService] Failed to create customer session: ${res.status} ${errText}`);
    }

    const data = await res.json() as any;
    return {
      token: data.token,
      customerPortalUrl: data.customer_portal_url,
      customerId: data.customer_id,
      expiresAt: data.expires_at,
    };
  }

  /**
   * List configured products in the Polar organization.
   */
  static async listProducts(): Promise<PolarProduct[]> {
    const url = `${this.baseUrl}/products/`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[PolarService] Failed to list products: ${res.status} ${errText}`);
    }

    const data = await res.json() as { items?: any[] };
    return (data.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      organizationId: item.organization_id,
      prices: item.prices,
    }));
  }

  /**
   * High-level: generate billing portal URL for a user session.
   */
  static async getCustomerPortalUrl(user: { id?: string; email: string; name?: string | null }): Promise<string> {
    const customer = await this.getOrCreateCustomer(user);
    const session = await this.createCustomerSession(customer.id);
    return session.customerPortalUrl;
  }
}
