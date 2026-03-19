/**
 * Service de gestion des fournisseurs
 * Interface avec la table suppliers
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { Supplier } from '../types';

export class SupplierService {
  static async getSuppliers(farmId: number): Promise<Supplier[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'suppliers',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
      ]
    );
    if (error) {
      console.error('[SupplierService] getSuppliers error:', error);
      return [];
    }
    return (data ?? []) as Supplier[];
  }

  static async getSupplierById(id: string): Promise<Supplier | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'suppliers',
      '*',
      [{ column: 'id', value: id }],
      true
    );
    if (error) return null;
    return data as Supplier;
  }

  static async searchSuppliers(farmId: number, query: string): Promise<Supplier[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'suppliers',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
        { column: 'company_name', value: `%${query}%`, operator: 'ilike' },
      ]
    );
    if (error) return [];
    return (data ?? []) as Supplier[];
  }

  static async createSupplier(params: Partial<Supplier> & { farm_id: number; company_name: string }): Promise<{ id: string } | null> {
    const { data, error } = await DirectSupabaseService.directInsert('suppliers', {
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
      is_active: true,
    });
    if (error) {
      console.error('[SupplierService] createSupplier error:', error);
      return null;
    }
    return data ? { id: data.id } : null;
  }

  static async updateSupplier(id: string, updates: Partial<Supplier>): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'suppliers',
      updates,
      [{ column: 'id', value: id }]
    );
    if (error) {
      console.error('[SupplierService] updateSupplier error:', error);
      return false;
    }
    return true;
  }

  static async deactivateSupplier(id: string): Promise<boolean> {
    return this.updateSupplier(id, { is_active: false });
  }
}
