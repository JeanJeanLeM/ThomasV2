/**
 * Service de gestion des produits commerciaux
 * Interface avec la table products
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { Product } from '../types';

export class ProductService {
  static async getProducts(farmId: number): Promise<Product[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'products',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
      ]
    );
    if (error) {
      console.error('[ProductService] getProducts error:', error);
      return [];
    }
    return (data ?? []) as Product[];
  }

  static async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'products',
      '*',
      [{ column: 'id', value: id }],
      true
    );
    if (error) return null;
    return data as Product;
  }

  static async getProductsByCulture(cultureId: number): Promise<Product[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'products',
      '*',
      [
        { column: 'culture_id', value: cultureId },
        { column: 'is_active', value: true },
      ]
    );
    if (error) return [];
    return (data ?? []) as Product[];
  }

  static async createProduct(params: Partial<Product> & { farm_id: number; name: string; unit: string }): Promise<{ id: string } | null> {
    const { data, error } = await DirectSupabaseService.directInsert('products', {
      farm_id: params.farm_id,
      name: params.name,
      description: params.description ?? null,
      culture_id: params.culture_id ?? null,
      unit: params.unit,
      default_price_ht: params.default_price_ht ?? null,
      default_vat_rate: params.default_vat_rate ?? 5.5,
      is_active: true,
    });
    if (error) {
      console.error('[ProductService] createProduct error:', error);
      return null;
    }
    return data ? { id: data.id } : null;
  }

  static async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'products',
      updates,
      [{ column: 'id', value: id }]
    );
    if (error) {
      console.error('[ProductService] updateProduct error:', error);
      return false;
    }
    return true;
  }

  static async deactivateProduct(id: string): Promise<boolean> {
    return this.updateProduct(id, { is_active: false });
  }
}
