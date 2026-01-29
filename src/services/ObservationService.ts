import { DirectSupabaseService } from './DirectSupabaseService';
import type { Database } from '../types/database';

type ObservationRow = Database['public']['Tables']['observations']['Row'];

export interface ObservationFilters {
  farmId: number;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  category?: string;
  severity?: string;
}

/**
 * Service for managing observations with soft delete support
 */
export class ObservationService {

  /**
   * Get all active observations for a farm
   */
  static async getObservationsByFarm(farmId: number): Promise<ObservationRow[]> {
    try {
      console.log('👁️ [OBSERVATION-SERVICE] Fetching observations for farm:', farmId);

      const conditions = [
        { column: 'farm_id', value: farmId },
        { column: 'is_active', value: true } // Only active observations
      ];

      const observationsResult = await DirectSupabaseService.directSelect(
        'observations',
        '*',
        conditions
      );

      if (observationsResult.error) {
        console.error('❌ [OBSERVATION-SERVICE] Error fetching observations:', observationsResult.error);
        return [];
      }

      console.log('✅ [OBSERVATION-SERVICE] Observations fetched:', observationsResult.data?.length || 0);
      return observationsResult.data || [];

    } catch (error) {
      console.error('❌ [OBSERVATION-SERVICE] Exception fetching observations:', error);
      return [];
    }
  }

  /**
   * Get observations with filters
   */
  static async getFilteredObservations(filters: ObservationFilters): Promise<ObservationRow[]> {
    try {
      console.log('👁️ [OBSERVATION-SERVICE] Fetching filtered observations:', filters);

      const conditions: { column: string; value: any }[] = [
        { column: 'farm_id', value: filters.farmId },
        { column: 'is_active', value: true } // Only active observations
      ];

      // Add optional filters
      if (filters.userId) {
        conditions.push({ column: 'user_id', value: filters.userId });
      }

      if (filters.category) {
        conditions.push({ column: 'category', value: filters.category });
      }

      if (filters.severity) {
        conditions.push({ column: 'severity', value: filters.severity });
      }

      const observationsResult = await DirectSupabaseService.directSelect(
        'observations',
        '*',
        conditions
      );

      if (observationsResult.error) {
        console.error('❌ [OBSERVATION-SERVICE] Error fetching filtered observations:', observationsResult.error);
        return [];
      }

      let observations: ObservationRow[] = observationsResult.data || [];

      // Apply date filters client-side if provided
      if (filters.startDate) {
        const startDateStr = filters.startDate.toISOString().split('T')[0];
        observations = observations.filter(obs => obs.date >= startDateStr);
      }

      if (filters.endDate) {
        const endDateStr = filters.endDate.toISOString().split('T')[0];
        observations = observations.filter(obs => obs.date <= endDateStr);
      }

      console.log('✅ [OBSERVATION-SERVICE] Filtered observations:', observations.length);
      return observations;

    } catch (error) {
      console.error('❌ [OBSERVATION-SERVICE] Exception fetching filtered observations:', error);
      return [];
    }
  }

  /**
   * Soft delete an observation by setting is_active to false
   */
  static async deleteObservation(observationId: string): Promise<void> {
    try {
      console.log('🗑️ [OBSERVATION-SERVICE] Soft deleting observation:', observationId);

      const { data, error } = await DirectSupabaseService.directUpdate(
        'observations',
        { 
          is_active: false // Now we can use is_active after migration
        },
        [{ column: 'id', value: observationId }]
      );

      if (error) {
        console.error('❌ [OBSERVATION-SERVICE] Error soft deleting observation:', error);
        throw new Error(error.message || 'Erreur suppression observation');
      }

      console.log('✅ [OBSERVATION-SERVICE] Observation soft deleted successfully:', observationId);
    } catch (error) {
      console.error('❌ [OBSERVATION-SERVICE] Exception deleting observation:', error);
      throw error;
    }
  }

  /**
   * Create a new observation
   */
  static async createObservation(observationData: Partial<ObservationRow>): Promise<ObservationRow> {
    try {
      console.log('➕ [OBSERVATION-SERVICE] Creating observation:', observationData.title);

      const { data, error } = await DirectSupabaseService.directInsert(
        'observations',
        {
          ...observationData,
          is_active: true, // Set as active by default
          created_at: new Date().toISOString()
        }
      );

      if (error) {
        console.error('❌ [OBSERVATION-SERVICE] Error creating observation:', error);
        throw new Error(error.message || 'Erreur création observation');
      }

      const createdObservation = Array.isArray(data) ? data[0] : data;
      console.log('✅ [OBSERVATION-SERVICE] Observation created:', createdObservation.id);
      return createdObservation;

    } catch (error) {
      console.error('❌ [OBSERVATION-SERVICE] Exception creating observation:', error);
      throw error;
    }
  }

  /**
   * Update an existing observation
   */
  static async updateObservation(observationId: string, updateData: Partial<ObservationRow>): Promise<ObservationRow> {
    try {
      console.log('✏️ [OBSERVATION-SERVICE] Updating observation:', observationId);

      const { data, error } = await DirectSupabaseService.directUpdate(
        'observations',
        updateData,
        [{ column: 'id', value: observationId }]
      );

      if (error) {
        console.error('❌ [OBSERVATION-SERVICE] Error updating observation:', error);
        throw new Error(error.message || 'Erreur mise à jour observation');
      }

      const updatedObservation = Array.isArray(data) ? data[0] : data;
      console.log('✅ [OBSERVATION-SERVICE] Observation updated:', updatedObservation.id);
      return updatedObservation;

    } catch (error) {
      console.error('❌ [OBSERVATION-SERVICE] Exception updating observation:', error);
      throw error;
    }
  }
}
