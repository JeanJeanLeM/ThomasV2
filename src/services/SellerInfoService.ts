/**
 * Service de gestion des informations vendeur (seller_info)
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { SellerInfo } from '../types';

export class SellerInfoService {
  static async getByFarm(farmId: number): Promise<SellerInfo | null> {
    const { data, error } = await DirectSupabaseService.directSelect(
      'seller_info',
      '*',
      [{ column: 'farm_id', value: farmId }],
      true
    );
    if (error) return null;
    return data as SellerInfo;
  }

  static async upsert(params: Partial<SellerInfo> & { farm_id: number; company_name: string }): Promise<SellerInfo | null> {
    const existing = await this.getByFarm(params.farm_id);
    if (existing) {
      const { data, error } = await DirectSupabaseService.directUpdate(
        'seller_info',
        {
          company_name: params.company_name,
          legal_status: params.legal_status ?? null,
          address: params.address ?? null,
          postal_code: params.postal_code ?? null,
          city: params.city ?? null,
          country: params.country ?? 'France',
          siret: params.siret ?? null,
          siren: params.siren ?? null,
          vat_number: params.vat_number ?? null,
          email: params.email ?? null,
          phone: params.phone ?? null,
          logo_url: params.logo_url ?? null,
          vat_not_applicable: params.vat_not_applicable ?? false,
        },
        [{ column: 'farm_id', value: params.farm_id }]
      );
      if (error) return null;
      const result = Array.isArray(data) ? data[0] : data;
      return result as SellerInfo;
    } else {
      const { data, error } = await DirectSupabaseService.directInsert('seller_info', {
        farm_id: params.farm_id,
        user_id: params.user_id ?? null,
        company_name: params.company_name,
        legal_status: params.legal_status ?? null,
        address: params.address ?? null,
        postal_code: params.postal_code ?? null,
        city: params.city ?? null,
        country: params.country ?? 'France',
        siret: params.siret ?? null,
        siren: params.siren ?? null,
        vat_number: params.vat_number ?? null,
        email: params.email ?? null,
        phone: params.phone ?? null,
        logo_url: params.logo_url ?? null,
        vat_not_applicable: params.vat_not_applicable ?? false,
      });
      if (error) return null;
      return data as SellerInfo;
    }
  }
}
