/**
 * Service de gestion des clients
 * Interface avec la table customers
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { Customer } from '../types';

export class CustomerService {
  static async getCustomers(farmId: number): Promise<Customer[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'customers',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
      ]
    );
    if (error) {
      console.error('[CustomerService] getCustomers error:', error);
      return [];
    }
    return (data ?? []) as Customer[];
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'customers',
      '*',
      [{ column: 'id', value: id }],
      true
    );
    if (error) return null;
    return data as Customer;
  }

  static async searchCustomers(farmId: number, query: string): Promise<Customer[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'customers',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
        { column: 'company_name', value: `%${query}%`, operator: 'ilike' },
      ]
    );
    if (error) return [];
    return (data ?? []) as Customer[];
  }

  static async createCustomer(params: Partial<Customer> & { farm_id: number; company_name: string }): Promise<{ id: string } | null> {
    const { data, error } = await DirectSupabaseService.directInsert('customers', {
      farm_id: params.farm_id,
      company_name: params.company_name,
      contact_name: params.contact_name ?? null,
      address: params.address ?? null,
      postal_code: params.postal_code ?? null,
      city: params.city ?? null,
      country: params.country ?? 'France',
      siret: params.siret ?? null,
      siren: params.siren ?? null,
      vat_number: params.vat_number ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      notes: params.notes ?? null,
      delivery_addresses: params.delivery_addresses ?? null,
      is_active: true,
    });
    if (error) {
      console.error('[CustomerService] createCustomer error:', error);
      return null;
    }
    return data ? { id: data.id } : null;
  }

  static async updateCustomer(id: string, updates: Partial<Customer>): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'customers',
      updates,
      [{ column: 'id', value: id }]
    );
    if (error) {
      console.error('[CustomerService] updateCustomer error:', error);
      return false;
    }
    return true;
  }

  static async deactivateCustomer(id: string): Promise<boolean> {
    return this.updateCustomer(id, { is_active: false });
  }
}
