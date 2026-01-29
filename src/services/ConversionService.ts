/**
 * Service de gestion des conversions utilisateur
 * Interface avec la table user_conversion_units
 */

import { DirectSupabaseService } from './DirectSupabaseService';

export interface UserConversion {
  id: string;
  user_id: string;
  farm_id: number;
  container_name: string;
  container_type?: string;
  crop_name: string;
  conversion_value: number;
  conversion_unit: string;
  slugs: string[];
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface ConversionSuggestion {
  container_name: string;
  crop_name: string;
  suggested_values: Array<{ value: number; unit: string }>;
  priority: 'low' | 'medium' | 'high';
}

export class ConversionService {
  
  /**
   * Récupérer toutes les conversions actives d'une ferme
   * Les conversions sont partagées par toute la ferme, pas par utilisateur
   */
  static async getActiveConversions(farmId: number): Promise<UserConversion[]> {
    try {
      console.log('📊 [CONVERSION-SERVICE] Récupération conversions actives pour ferme...', { farmId });
      
      // Récupérer toutes les conversions pour cette ferme
      // Filtrer is_active côté client car la base peut stocker 'true' comme string
      const { data, error } = await DirectSupabaseService.directSelect(
        'user_conversion_units',
        'id, user_id, farm_id, container_name, container_type, crop_name, conversion_value, conversion_unit, slugs, description, is_active, created_at',
        [
          { column: 'farm_id', value: farmId }
          // Ne pas filtrer par user_id - les conversions sont partagées par la ferme
          // Ne pas filtrer is_active ici, on le fait côté client
        ]
      );

      if (error) {
        console.error('❌ [CONVERSION-SERVICE] Erreur récupération:', error);
        return [];
      }

      const allConversions = (data || []) as UserConversion[];
      
      // Filtrer les conversions actives côté client
      // Gérer le cas où is_active est stocké comme string 'true'/'false' ou booléen
      const conversions = allConversions.filter(c => {
        const isActive = c.is_active === true || 
                        c.is_active === 'true' || 
                        (typeof c.is_active === 'string' && c.is_active.toLowerCase() === 'true');
        return isActive;
      });

      console.log(`📋 [CONVERSION-SERVICE] ${allConversions.length} conversions totales trouvées (${conversions.length} actives):`, 
        allConversions.map(c => ({ 
          id: c.id, 
          name: `${c.container_name} de ${c.crop_name}`, 
          active: c.is_active,
          activeType: typeof c.is_active
        }))
      );
      
      if (allConversions.length > 0 && conversions.length === 0) {
        console.warn('⚠️ [CONVERSION-SERVICE] Toutes les conversions sont marquées comme inactives. Vérifiez is_active dans la base.');
      }
      
      return conversions;
    } catch (error) {
      console.error('❌ [CONVERSION-SERVICE] Erreur:', error);
      return [];
    }
  }

  /**
   * Vérifier si une conversion existe déjà pour cette combinaison
   */
  static async findExistingConversion(
    farmId: number,
    containerName: string,
    cropName: string
  ): Promise<UserConversion | null> {
    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'user_conversion_units',
        'id, user_id, farm_id, container_name, container_type, crop_name, conversion_value, conversion_unit, slugs, description, is_active, created_at',
        [
          { column: 'farm_id', value: farmId },
          { column: 'container_name', value: containerName },
          { column: 'crop_name', value: cropName }
        ],
        true // single
      );

      if (error || !data) {
        return null;
      }

      return data as UserConversion;
    } catch (error) {
      console.error('❌ [CONVERSION-SERVICE] Erreur recherche conversion:', error);
      return null;
    }
  }

  /**
   * Créer une nouvelle conversion
   * Retourne l'ID de la conversion créée, ou null si erreur
   * Lance une erreur si une conversion existe déjà
   */
  static async createConversion(
    userId: string,
    farmId: number,
    containerName: string,
    cropName: string,
    conversionValue: number,
    conversionUnit: string,
    aliases: string[] = [],
    description?: string,
    containerType?: string
  ): Promise<{ id: string | null; isDuplicate: boolean; existingId?: string }> {
    try {
      console.log('➕ [CONVERSION-SERVICE] Création conversion:', {
        containerName,
        cropName,
        conversionValue,
        conversionUnit
      });

      // Vérifier si une conversion existe déjà
      const existing = await this.findExistingConversion(farmId, containerName, cropName);
      if (existing) {
        console.warn('⚠️ [CONVERSION-SERVICE] Conversion déjà existante:', existing.id);
        return {
          id: null,
          isDuplicate: true,
          existingId: existing.id
        };
      }

      const conversionData = {
        user_id: userId,
        farm_id: farmId,
        container_name: containerName,
        container_type: containerType || null,
        crop_name: cropName,
        conversion_value: conversionValue,
        conversion_unit: conversionUnit,
        slugs: aliases,
        description: description || null,
        is_active: true
      };

      const { data, error } = await DirectSupabaseService.directInsert(
        'user_conversion_units',
        conversionData
      );

      if (error) {
        // Vérifier si c'est une erreur de doublon
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          console.warn('⚠️ [CONVERSION-SERVICE] Doublon détecté lors de l\'insertion');
          // Essayer de trouver la conversion existante
          const existingAfterError = await this.findExistingConversion(farmId, containerName, cropName);
          return {
            id: null,
            isDuplicate: true,
            existingId: existingAfterError?.id
          };
        }
        
        console.error('❌ [CONVERSION-SERVICE] Erreur création:', error);
        return { id: null, isDuplicate: false };
      }

      // directInsert retourne déjà un objet (pas un tableau) si responseData est un tableau
      const insertedId = Array.isArray(data) ? data[0]?.id : data?.id;
      console.log('✅ [CONVERSION-SERVICE] Conversion créée:', insertedId);
      return { id: insertedId || null, isDuplicate: false };
    } catch (error) {
      console.error('❌ [CONVERSION-SERVICE] Erreur:', error);
      return { id: null, isDuplicate: false };
    }
  }

  /**
   * Mettre à jour une conversion existante
   */
  static async updateConversion(
    conversionId: string,
    updates: Partial<Omit<UserConversion, 'id' | 'user_id' | 'farm_id' | 'created_at'>>
  ): Promise<boolean> {
    try {
      console.log('🔄 [CONVERSION-SERVICE] Mise à jour conversion:', conversionId);

      const { error } = await DirectSupabaseService.directUpdate(
        'user_conversion_units',
        updates,
        [{ column: 'id', value: conversionId }]
      );

      if (error) {
        console.error('❌ [CONVERSION-SERVICE] Erreur mise à jour:', error);
        return false;
      }

      console.log('✅ [CONVERSION-SERVICE] Conversion mise à jour');
      return true;
    } catch (error) {
      console.error('❌ [CONVERSION-SERVICE] Erreur:', error);
      return false;
    }
  }

  /**
   * Désactiver une conversion (soft delete)
   */
  static async deactivateConversion(conversionId: string): Promise<boolean> {
    return this.updateConversion(conversionId, { is_active: false });
  }

  /**
   * Réactiver une conversion
   */
  static async reactivateConversion(conversionId: string): Promise<boolean> {
    return this.updateConversion(conversionId, { is_active: true });
  }

  /**
   * Rechercher une conversion pour une quantité donnée
   */
  static findConversionForQuantity(
    unit: string,
    crop: string | undefined,
    conversions: UserConversion[]
  ): UserConversion | null {
    const unitLower = unit.toLowerCase();
    const cropLower = crop?.toLowerCase();

    // 1. Recherche exacte (container_name + crop)
    let match = conversions.find(c => 
      c.container_name.toLowerCase() === unitLower &&
      (!cropLower || !c.crop_name || c.crop_name.toLowerCase() === cropLower)
    );

    // 2. Recherche par slugs/aliases
    if (!match) {
      match = conversions.find(c => 
        c.slugs?.some(slug => slug.toLowerCase() === unitLower) &&
        (!cropLower || !c.crop_name || c.crop_name.toLowerCase() === cropLower)
      );
    }

    // 3. Recherche partielle
    if (!match) {
      match = conversions.find(c => 
        (c.container_name.toLowerCase().includes(unitLower) || 
         unitLower.includes(c.container_name.toLowerCase())) &&
        (!cropLower || !c.crop_name || c.crop_name.toLowerCase() === cropLower)
      );
    }

    // 4. Recherche générale (sans culture spécifique)
    if (!match && cropLower) {
      match = conversions.find(c => 
        (c.container_name.toLowerCase() === unitLower ||
         c.slugs?.some(slug => slug.toLowerCase() === unitLower)) &&
        !c.crop_name
      );
    }

    return match || null;
  }

  /**
   * Appliquer une conversion à une quantité
   */
  static applyConversion(
    value: number,
    unit: string,
    crop: string | undefined,
    conversions: UserConversion[]
  ): { value: number; unit: string; conversion?: UserConversion } | null {
    const conversion = this.findConversionForQuantity(unit, crop, conversions);
    
    if (conversion) {
      return {
        value: value * conversion.conversion_value,
        unit: conversion.conversion_unit,
        conversion
      };
    }

    return null;
  }

  /**
   * Générer des suggestions de conversion
   */
  static generateConversionSuggestions(
    failedUnits: string[],
    existingConversions: UserConversion[]
  ): ConversionSuggestion[] {
    const suggestions: ConversionSuggestion[] = [];
    
    const commonSuggestions: Record<string, Array<{ value: number; unit: string }>> = {
      'caisse': [
        { value: 5, unit: 'kg' },
        { value: 10, unit: 'kg' },
        { value: 15, unit: 'kg' }
      ],
      'panier': [
        { value: 2, unit: 'kg' },
        { value: 3, unit: 'kg' },
        { value: 5, unit: 'kg' }
      ],
      'bac': [
        { value: 8, unit: 'kg' },
        { value: 12, unit: 'kg' },
        { value: 20, unit: 'kg' }
      ],
      'brouette': [
        { value: 30, unit: 'kg' },
        { value: 50, unit: 'kg' },
        { value: 100, unit: 'litre' }
      ],
      'sac': [
        { value: 25, unit: 'kg' },
        { value: 50, unit: 'kg' }
      ]
    };

    for (const unit of failedUnits) {
      // Vérifier si déjà existant
      const existing = existingConversions.find(c => 
        c.container_name.toLowerCase() === unit.toLowerCase()
      );

      if (!existing) {
        const unitLower = unit.toLowerCase();
        const suggestedValues = commonSuggestions[unitLower] || [
          { value: 1, unit: 'kg' },
          { value: 1, unit: 'litre' },
          { value: 1, unit: 'unité' }
        ];

        suggestions.push({
          container_name: unit,
          crop_name: 'général',
          suggested_values: suggestedValues,
          priority: commonSuggestions[unitLower] ? 'high' : 'medium'
        });
      }
    }

    return suggestions;
  }

  /**
   * Valider les données d'une conversion
   */
  static validateConversion(
    containerName: string,
    cropName: string,
    conversionValue: number,
    conversionUnit: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!containerName?.trim()) {
      errors.push('Nom du contenant requis');
    }

    if (!cropName?.trim()) {
      errors.push('Nom de la culture requis');
    }

    if (conversionValue <= 0) {
      errors.push('La valeur de conversion doit être positive');
    }

    if (conversionValue > 1000) {
      errors.push('La valeur de conversion semble très élevée (>1000)');
    }

    if (!conversionUnit?.trim()) {
      errors.push('Unité de conversion requise');
    }

    const validUnits = ['kg', 'g', 'litre', 'l', 'unité', 'unités', 'pièce', 'pièces', 'botte', 'bottes', 't', 'm3'];
    if (conversionUnit && !validUnits.includes(conversionUnit.toLowerCase())) {
      errors.push(`Unité non supportée. Unités valides: ${validUnits.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Récupérer toutes les conversions d'un utilisateur (toutes fermes confondues)
   * Utile pour le diagnostic
   */
  static async getAllUserConversions(userId: string): Promise<UserConversion[]> {
    try {
      console.log('🔍 [CONVERSION-SERVICE] Récupération TOUTES les conversions utilisateur...', { userId });
      
      const { data, error } = await DirectSupabaseService.directSelect(
        'user_conversion_units',
        'id, user_id, farm_id, container_name, container_type, crop_name, conversion_value, conversion_unit, slugs, description, is_active, created_at',
        [
          { column: 'user_id', value: userId }
        ]
      );

      if (error) {
        console.error('❌ [CONVERSION-SERVICE] Erreur récupération:', error);
        return [];
      }

      const conversions = (data || []) as UserConversion[];
      console.log(`🔍 [CONVERSION-SERVICE] ${conversions.length} conversions trouvées pour l'utilisateur:`, 
        conversions.map(c => ({ 
          id: c.id, 
          farm_id: c.farm_id,
          name: `${c.container_name} de ${c.crop_name}`, 
          active: c.is_active 
        }))
      );
      
      return conversions;
    } catch (error) {
      console.error('❌ [CONVERSION-SERVICE] Erreur:', error);
      return [];
    }
  }

  /**
   * Statistiques des conversions
   */
  static getConversionStats(conversions: UserConversion[]): {
    total: number;
    active: number;
    by_crop: Record<string, number>;
    by_unit: Record<string, number>;
  } {
    const active = conversions.filter(c => c.is_active);
    
    const byCrop: Record<string, number> = {};
    const byUnit: Record<string, number> = {};
    
    active.forEach(conv => {
      const crop = conv.crop_name || 'général';
      byCrop[crop] = (byCrop[crop] || 0) + 1;
      
      const unit = conv.conversion_unit;
      byUnit[unit] = (byUnit[unit] || 0) + 1;
    });

    return {
      total: conversions.length,
      active: active.length,
      by_crop: byCrop,
      by_unit: byUnit
    };
  }
}

