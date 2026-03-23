/**
 * Service de gestion des produits commerciaux
 * Interface avec la table products
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { Product } from '../types';

export class ProductService {
  static async getProducts(farmId: number): Promise<Product[]> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'v_products_with_today_price',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'listing_status', value: 'listed' },
      ]
    );

    if (!error) {
      return (data ?? []) as Product[];
    }

    // Fallback de compatibilité: si la vue n'existe pas encore (ou colonnes absentes),
    // revenir à la table products pour ne pas bloquer l'app.
    const { data: fallbackData, error: fallbackError } = await DirectSupabaseService.directSelect(
      'products',
      '*',
      [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true },
        { column: 'listing_status', value: 'listed' },
      ]
    );

    if (fallbackError) {
      console.error('[ProductService] getProducts error:', error);
      console.error('[ProductService] getProducts fallback error:', fallbackError);
      return [];
    }

    return (fallbackData ?? []) as Product[];
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
        { column: 'listing_status', value: 'listed' },
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
      listing_status: params.listing_status ?? 'listed',
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

  static async createProductSalePrice(params: {
    product_id: string;
    farm_id: number;
    canal_de_vente: string;
    prix: number;
    unite_prix: string;
    pourcentage_vente?: number;
    valid_week_start?: number | null;
    valid_week_end?: number | null;
    notes?: string | null;
  }): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('product_sale_prices', {
      product_id: params.product_id,
      farm_id: params.farm_id,
      canal_de_vente: params.canal_de_vente,
      prix: params.prix,
      unite_prix: params.unite_prix,
      pourcentage_vente: params.pourcentage_vente ?? 0,
      valid_week_start: params.valid_week_start ?? null,
      valid_week_end: params.valid_week_end ?? null,
      notes: params.notes ?? null,
      is_active: true,
    });

    if (error) {
      console.error('[ProductService] createProductSalePrice error:', error);
      return false;
    }

    return true;
  }
}
