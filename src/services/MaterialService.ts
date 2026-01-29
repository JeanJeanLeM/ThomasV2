import { DirectSupabaseService } from './DirectSupabaseService';

export interface MaterialCreateData {
  name: string;
  category: string;
  custom_category?: string | null;
  brand?: string;
  model?: string;
  description?: string;
  cost?: number;
  purchase_date?: string;
  supplier?: string;
  condition_notes?: string;
  llm_keywords?: string[];
  farm_id: number;
}

export interface MaterialUpdateData extends Partial<MaterialCreateData> {
  id: number;
}

export interface MaterialFromDB {
  id: number;
  farm_id: number;
  name: string;
  category: string;
  custom_category?: string | null;
  model?: string;
  brand?: string;
  description?: string;
  cost?: number;
  purchase_date?: string;
  supplier?: string;
  condition_notes?: string;
  llm_keywords?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class MaterialService {
  /**
   * Tester la connexion Supabase
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔗 Testing Supabase connection...');
      const { error } = await DirectSupabaseService.directSelect(
        'materials',
        'id',
        undefined,
        true
      );
      console.log('🔗 Connection test result:', { error });
      return !error;
    } catch (error) {
      console.error('🔗 Connection test failed:', error);
      return false;
    }
  }

  /**
   * Récupérer tous les matériels d'une ferme
   */
  static async getMaterialsByFarm(farmId: number): Promise<MaterialFromDB[]> {
    console.log('🔧 MaterialService.getMaterialsByFarm called with farmId:', farmId);

    try {
      const { data, error } = await DirectSupabaseService.directSelect(
        'materials',
        '*',
        [{ column: 'farm_id', value: farmId }]
      );

      console.log('📥 Direct API response (materials):', {
        materials: Array.isArray(data) ? data.length : 0,
        error,
      });

      if (error) {
        console.error('❌ Error fetching materials (Direct API):', error);
        throw new Error(error.message || 'Erreur chargement matériels');
      }

      const materials = (data || []) as MaterialFromDB[];

      // Tri côté client par date de création (descendant)
      materials.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      console.log('✅ Materials fetched successfully:', materials.length, 'items');
      return materials;
    } catch (error) {
      console.error('💥 MaterialService.getMaterialsByFarm failed:', error);
      throw error;
    }
  }

  /**
   * Créer un nouveau matériel
   */
  static async createMaterial(data: MaterialCreateData): Promise<MaterialFromDB> {
    console.log('🔧 MaterialService.createMaterial called with:', data);

    try {
      const insertData = {
        farm_id: data.farm_id,
        name: data.name,
        category: data.category,
        custom_category: data.custom_category,
        model: data.model,
        brand: data.brand,
        description: data.description,
        cost: data.cost,
        purchase_date: data.purchase_date,
        supplier: data.supplier,
        condition_notes: data.condition_notes,
        llm_keywords: data.llm_keywords || [],
        is_active: true,
      };

      console.log('📤 Sending to Supabase:', insertData);

      const { data: created, error } = await DirectSupabaseService.directInsert(
        'materials',
        insertData
      );

      console.log('📥 Direct API response (create material):', { created, error });

      if (error) {
        console.error('❌ Error creating material (Direct API):', error);
        throw new Error(error.message || 'Erreur création matériel');
      }

      const material = (Array.isArray(created) ? created[0] : created) as MaterialFromDB;

      console.log('✅ Material created successfully:', material);
      return material;
    } catch (error) {
      console.error('💥 MaterialService.createMaterial failed:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un matériel existant
   */
  static async updateMaterial(data: MaterialUpdateData): Promise<MaterialFromDB> {
    console.log('🔧 MaterialService.updateMaterial called with:', data);

    try {
      const { id, ...updateData } = data;
      
      const updatePayload = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await DirectSupabaseService.directUpdate(
        'materials',
        updatePayload,
        [{ column: 'id', value: id }]
      );

      if (error) {
        console.error('❌ Error updating material (Direct API):', error);
        throw new Error(error.message || 'Erreur mise à jour matériel');
      }

      const material = (Array.isArray(updated) ? updated[0] : updated) as MaterialFromDB;

      console.log('✅ Material updated successfully:', material);
      return material;
    } catch (error) {
      console.error('💥 MaterialService.updateMaterial failed:', error);
      throw error;
    }
  }

  /**
   * Basculer le statut actif/inactif d'un matériel (soft delete)
   */
  static async toggleMaterialActive(id: number, isActive: boolean): Promise<MaterialFromDB> {
    console.log('🔧 MaterialService.toggleMaterialActive called:', { id, isActive });

    try {
      const { data, error } = await DirectSupabaseService.directUpdate(
        'materials',
        { 
          is_active: isActive,
          updated_at: new Date().toISOString(),
        },
        [{ column: 'id', value: id }]
      );

      if (error) {
        console.error('❌ Error toggling material status (Direct API):', error);
        throw new Error(error.message || 'Erreur changement statut matériel');
      }

      const material = (Array.isArray(data) ? data[0] : data) as MaterialFromDB;

      console.log('✅ Material status toggled successfully:', material);
      return material;
    } catch (error) {
      console.error('💥 MaterialService.toggleMaterialActive failed:', error);
      throw error;
    }
  }

  /**
   * Supprimer définitivement un matériel (à éviter, utiliser toggleMaterialActive)
   */
  static async deleteMaterial(id: number): Promise<void> {
    console.log('🔧 MaterialService.deleteMaterial called with id:', id);
    console.warn('⚠️ WARNING: Hard delete should be avoided. Use toggleMaterialActive instead.');

    try {
      const { error } = await DirectSupabaseService.directDelete(
        'materials',
        [{ column: 'id', value: id }]
      );

      if (error) {
        console.error('❌ Error deleting material (Direct API):', error);
        throw new Error(error.message || 'Erreur suppression matériel');
      }

      console.log('✅ Material deleted successfully');
    } catch (error) {
      console.error('💥 MaterialService.deleteMaterial failed:', error);
      throw error;
    }
  }
}
