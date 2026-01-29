/**
 * Service pour les opérations de base de données des parcelles
 * Thomas V2
 */

import { supabase } from '../utils/supabase';
import type { PlotData } from '../design-system/components/cards/PlotCardStandard';

export interface DatabasePlot {
  id: number;
  farm_id: number;
  name: string;
  code?: string;
  type: string;
  length?: number;
  width?: number;
  surface_area?: number;
  description?: string;
  is_active: boolean;
  aliases?: string[];
  llm_keywords?: string[];
  created_at: string;
  updated_at: string;
}

export interface DatabaseSurfaceUnit {
  id: number;
  plot_id: number;
  name: string;
  code?: string;
  type: string;
  sequence_number?: number;
  length?: number;
  width?: number;
  area?: number;
  llm_keywords?: string[];
  is_active: boolean;
  created_at: string;
}

export class PlotService {
  /**
   * Test d'insertion simple d'une unité de surface pour debug
   */
  static async testSurfaceUnitInsert(plotId: number): Promise<void> {
    console.log('🧪 [PlotService] Test insertion unité de surface simple pour plot:', plotId);
    
    const testUnit = {
      plot_id: plotId,
      name: 'Test Unit',
      type: 'planche',
      is_active: true,
    };
    
    console.log('📝 [PlotService] Données test:', testUnit);
    
    try {
      const { data, error } = await supabase
        .from('surface_units')
        .insert(testUnit)
        .select()
        .single();
        
      if (error) {
        console.error('❌ [PlotService] Erreur test insertion:', error);
      } else {
        console.log('✅ [PlotService] Test insertion réussie:', data);
        
        // Nettoyer le test
        await supabase
          .from('surface_units')
          .delete()
          .eq('id', data.id);
          
        console.log('🧹 [PlotService] Test nettoyé');
      }
    } catch (error) {
      console.error('❌ [PlotService] Exception test insertion:', error);
    }
  }
  /**
   * Récupère toutes les parcelles d'une ferme
   */
  static async getPlotsByFarm(farmId: number): Promise<PlotData[]> {
    console.log('🔍 [PlotService] Récupération des parcelles pour la ferme:', farmId);
    
    try {
      // Récupérer les parcelles
      const { data: plots, error: plotsError } = await supabase
        .from('plots')
        .select('*')
        .eq('farm_id', farmId)
        .order('created_at', { ascending: false });

      if (plotsError) {
        console.error('❌ [PlotService] Erreur récupération parcelles:', plotsError);
        throw plotsError;
      }

      console.log('✅ [PlotService] Parcelles récupérées:', plots?.length || 0);

      if (!plots || plots.length === 0) {
        return [];
      }

      // Récupérer les unités de surface pour toutes les parcelles
      const plotIds = plots.map(p => p.id);
      const { data: surfaceUnits, error: unitsError } = await supabase
        .from('surface_units')
        .select('*')
        .in('plot_id', plotIds)
        .order('sequence_number', { ascending: true });

      if (unitsError) {
        console.error('❌ [PlotService] Erreur récupération unités surface:', unitsError);
        // On continue sans les unités de surface
      }

      console.log('✅ [PlotService] Unités de surface récupérées:', surfaceUnits?.length || 0);

      // Convertir en format PlotData
      const plotsData: PlotData[] = plots.map(plot => {
        const plotSurfaceUnits = surfaceUnits?.filter(unit => unit.plot_id === plot.id) || [];
        
        return {
          id: plot.id.toString(),
          name: plot.name,
          code: plot.code || '',
          type: plot.type as PlotData['type'],
          length: plot.length || 0,
          width: plot.width || 0,
          area: plot.surface_area ? Number((plot.surface_area / 10000).toFixed(4)) : 0, // Conversion m² -> ha
          unit: 'ha' as const,
          description: plot.description || '',
          status: plot.is_active ? 'active' : 'inactive',
          slug: plot.aliases?.[0] || '',
          aliases: plot.aliases || [],
          surfaceUnits: plotSurfaceUnits.map(unit => ({
            id: unit.id.toString(),
            name: unit.name,
            code: unit.code || '',
            fullName: `${plot.name} ${unit.name}`, // Nom complet : parcelle + unité
            type: unit.type,
            sequenceNumber: unit.sequence_number || 1,
            length: unit.length || undefined,
            width: unit.width || undefined,
          })),
        };
      });

      console.log('✅ [PlotService] Conversion terminée, parcelles formatées:', plotsData.length);
      return plotsData;

    } catch (error) {
      console.error('❌ [PlotService] Erreur lors de la récupération des parcelles:', error);
      throw error;
    }
  }

  /**
   * Crée une nouvelle parcelle avec ses unités de surface
   */
  static async createPlot(farmId: number, plotData: Omit<PlotData, 'id'>): Promise<PlotData> {
    console.log('🔍 [PlotService] Création d\'une nouvelle parcelle:', {
      farmId,
      name: plotData.name,
      type: plotData.type,
      surfaceUnitsCount: plotData.surfaceUnits?.length || 0
    });

    try {
      // 1. Créer la parcelle principale
      const plotToInsert = {
        farm_id: farmId,
        name: plotData.name,
        code: plotData.code || null,
        type: plotData.type,
        length: plotData.length || null,
        width: plotData.width || null,
        description: plotData.description || null,
        is_active: plotData.status !== 'inactive',
        aliases: plotData.aliases || [],
        llm_keywords: plotData.aliases || [], // Utiliser les aliases comme keywords LLM
      };

      console.log('📝 [PlotService] Données parcelle à insérer:', plotToInsert);

      const { data: createdPlot, error: plotError } = await supabase
        .from('plots')
        .insert(plotToInsert)
        .select()
        .single();

      if (plotError) {
        console.error('❌ [PlotService] Erreur création parcelle:', plotError);
        throw plotError;
      }

      console.log('✅ [PlotService] Parcelle créée avec ID:', createdPlot.id);

      // 2. Créer les unités de surface si elles existent
      let createdSurfaceUnits: DatabaseSurfaceUnit[] = [];
      
      if (plotData.surfaceUnits && plotData.surfaceUnits.length > 0) {
        console.log('📝 [PlotService] Création des unités de surface:', plotData.surfaceUnits.length);
        // Limite de sécurité pour éviter les insertions trop importantes
        if (plotData.surfaceUnits.length > 100) {
          console.warn('⚠️ [PlotService] Nombre important d\'unités de surface:', plotData.surfaceUnits.length);
        }
        
        // Créer des unités de surface avec le minimum de champs pour éviter les erreurs RLS
        const surfaceUnitsToInsert = plotData.surfaceUnits.map(unit => {
          const unitData = {
            plot_id: createdPlot.id,
            name: unit.name,
            type: unit.type || 'planche',
            is_active: true,
          };
          
          // Ajouter les champs optionnels seulement s'ils sont valides
          if (unit.code && unit.code.trim()) {
            (unitData as any).code = unit.code.trim();
          }
          if (unit.sequenceNumber && unit.sequenceNumber > 0) {
            (unitData as any).sequence_number = unit.sequenceNumber;
          }
          if (unit.length && unit.length > 0) {
            (unitData as any).length = unit.length;
          }
          if (unit.width && unit.width > 0) {
            (unitData as any).width = unit.width;
          }
          if (unit.length && unit.width && unit.length > 0 && unit.width > 0) {
            (unitData as any).area = unit.length * unit.width;
          }
          
          // Validation des types
          if (typeof unitData.plot_id !== 'number') {
            console.error('❌ [PlotService] plot_id invalide:', unitData.plot_id, typeof unitData.plot_id);
          }
          if (!unitData.name || typeof unitData.name !== 'string') {
            console.error('❌ [PlotService] name invalide:', unitData.name, typeof unitData.name);
          }
          
          return unitData;
        });

        console.log('📝 [PlotService] Données unités à insérer (première unité):', surfaceUnitsToInsert[0]);
        console.log('📝 [PlotService] Nombre total d\'unités à insérer:', surfaceUnitsToInsert.length);

        // Essayer d'insérer par petits batches pour éviter les problèmes de performance
        const allCreatedUnits: DatabaseSurfaceUnit[] = [];
        const batchSize = 5; // Réduire la taille des batches
        
        for (let i = 0; i < surfaceUnitsToInsert.length; i += batchSize) {
          const batch = surfaceUnitsToInsert.slice(i, i + batchSize);
          console.log(`📝 [PlotService] Insertion batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(surfaceUnitsToInsert.length/batchSize)} (${batch.length} unités)`);
          
          try {
            const { data: batchData, error: batchError } = await supabase
              .from('surface_units')
              .insert(batch)
              .select();

            if (batchError) {
              console.error(`❌ [PlotService] Erreur batch ${Math.floor(i/batchSize) + 1}:`, batchError);
              
              // Si le batch échoue, essayer une par une
              for (let j = 0; j < batch.length; j++) {
                const unit = batch[j];
                console.log(`🔄 [PlotService] Tentative individuelle unité ${i + j + 1}:`, unit);
                
                try {
                  const { data: unitData, error: unitError } = await supabase
                    .from('surface_units')
                    .insert(unit)
                    .select()
                    .single();

                  if (unitError) {
                    console.error(`❌ [PlotService] Erreur unité individuelle ${i + j + 1}:`, unitError);
                  } else {
                    allCreatedUnits.push(unitData);
                    console.log(`✅ [PlotService] Unité individuelle ${i + j + 1} créée:`, unitData.id);
                  }
                } catch (error) {
                  console.error(`❌ [PlotService] Exception unité individuelle ${i + j + 1}:`, error);
                }
              }
            } else {
              allCreatedUnits.push(...(batchData || []));
              console.log(`✅ [PlotService] Batch ${Math.floor(i/batchSize) + 1} créé: ${batchData?.length || 0} unités`);
            }
          } catch (error) {
            console.error(`❌ [PlotService] Exception batch ${Math.floor(i/batchSize) + 1}:`, error);
          }
        }
        
        createdSurfaceUnits = allCreatedUnits;
        console.log('✅ [PlotService] Total unités de surface créées:', createdSurfaceUnits.length);
      }

      // 3. Retourner la parcelle créée au format PlotData
      const result: PlotData = {
        id: createdPlot.id.toString(),
        name: createdPlot.name,
        code: createdPlot.code || '',
        type: createdPlot.type as PlotData['type'],
        length: createdPlot.length || 0,
        width: createdPlot.width || 0,
        area: createdPlot.surface_area ? Number((createdPlot.surface_area / 10000).toFixed(4)) : 0,
        unit: 'ha' as const,
        description: createdPlot.description || '',
        status: createdPlot.is_active ? 'active' : 'inactive',
        slug: createdPlot.aliases?.[0] || '',
        aliases: createdPlot.aliases || [],
        surfaceUnits: createdSurfaceUnits.map(unit => ({
          id: unit.id.toString(),
          name: unit.name,
          code: unit.code || '',
          fullName: `${plotData.name} ${unit.name}`, // Nom complet : parcelle + unité
          type: unit.type,
          sequenceNumber: unit.sequence_number || 1,
          length: unit.length || undefined,
          width: unit.width || undefined,
        })),
      };

      console.log('✅ [PlotService] Parcelle créée avec succès:', result.id);
      return result;

    } catch (error) {
      console.error('❌ [PlotService] Erreur lors de la création de la parcelle:', error);
      throw error;
    }
  }

  /**
   * Met à jour une parcelle existante
   */
  static async updatePlot(plotData: PlotData): Promise<PlotData> {
    console.log('🔍 [PlotService] Mise à jour de la parcelle:', plotData.id);

    try {
      const plotId = parseInt(plotData.id);
      
      // 1. Mettre à jour la parcelle principale
      const plotToUpdate = {
        name: plotData.name,
        code: plotData.code || null,
        type: plotData.type,
        length: plotData.length || null,
        width: plotData.width || null,
        description: plotData.description || null,
        is_active: plotData.status !== 'inactive',
        aliases: plotData.aliases || [],
        llm_keywords: plotData.aliases || [],
        updated_at: new Date().toISOString(),
      };

      console.log('📝 [PlotService] Données parcelle à mettre à jour:', plotToUpdate);

      const { data: updatedPlot, error: plotError } = await supabase
        .from('plots')
        .update(plotToUpdate)
        .eq('id', plotId)
        .select()
        .single();

      if (plotError) {
        console.error('❌ [PlotService] Erreur mise à jour parcelle:', plotError);
        throw plotError;
      }

      console.log('✅ [PlotService] Parcelle mise à jour:', updatedPlot.id);

      // 2. Gérer les unités de surface (suppression puis recréation pour simplifier)
      if (plotData.surfaceUnits && plotData.surfaceUnits.length > 0) {
        console.log('📝 [PlotService] Mise à jour des unités de surface');
        
        // Supprimer les anciennes unités
        const { error: deleteError } = await supabase
          .from('surface_units')
          .delete()
          .eq('plot_id', plotId);

        if (deleteError) {
          console.error('❌ [PlotService] Erreur suppression anciennes unités:', deleteError);
        }

        // Créer les nouvelles unités avec approche simplifiée
        const surfaceUnitsToInsert = plotData.surfaceUnits.map(unit => {
          const unitData = {
            plot_id: plotId,
            name: unit.name,
            type: unit.type || 'planche',
            is_active: true,
          };
          
          // Ajouter les champs optionnels seulement s'ils sont valides
          if (unit.code && unit.code.trim()) {
            (unitData as any).code = unit.code.trim();
          }
          if (unit.sequenceNumber && unit.sequenceNumber > 0) {
            (unitData as any).sequence_number = unit.sequenceNumber;
          }
          if (unit.length && unit.length > 0) {
            (unitData as any).length = unit.length;
          }
          if (unit.width && unit.width > 0) {
            (unitData as any).width = unit.width;
          }
          if (unit.length && unit.width && unit.length > 0 && unit.width > 0) {
            (unitData as any).area = unit.length * unit.width;
          }
          
          return unitData;
        });

        console.log('📝 [PlotService] Unités à recréer:', surfaceUnitsToInsert.length);
        
        // Insérer par petits batches
        const newSurfaceUnits: DatabaseSurfaceUnit[] = [];
        const batchSize = 5;
        
        for (let i = 0; i < surfaceUnitsToInsert.length; i += batchSize) {
          const batch = surfaceUnitsToInsert.slice(i, i + batchSize);
          console.log(`📝 [PlotService] Recréation batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(surfaceUnitsToInsert.length/batchSize)}`);
          
          try {
            const { data: batchData, error: batchError } = await supabase
              .from('surface_units')
              .insert(batch)
              .select();

            if (batchError) {
              console.error(`❌ [PlotService] Erreur recréation batch:`, batchError);
            } else {
              newSurfaceUnits.push(...(batchData || []));
              console.log(`✅ [PlotService] Batch recréé: ${batchData?.length || 0} unités`);
            }
          } catch (error) {
            console.error(`❌ [PlotService] Exception recréation batch:`, error);
          }
        }
        
        console.log('✅ [PlotService] Nouvelles unités de surface créées:', newSurfaceUnits.length);
      }

      // 3. Récupérer la parcelle mise à jour avec ses unités
      return await this.getPlotById(plotId);

    } catch (error) {
      console.error('❌ [PlotService] Erreur lors de la mise à jour de la parcelle:', error);
      throw error;
    }
  }

  /**
   * Suppression douce d'une parcelle (toggle is_active)
   */
  static async togglePlotStatus(plotId: string): Promise<void> {
    console.log('🔍 [PlotService] Toggle statut parcelle:', plotId);

    try {
      const id = parseInt(plotId);
      
      // Récupérer le statut actuel
      const { data: currentPlot, error: fetchError } = await supabase
        .from('plots')
        .select('is_active')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ [PlotService] Erreur récupération statut actuel:', fetchError);
        throw fetchError;
      }

      const newStatus = !currentPlot.is_active;
      console.log('📝 [PlotService] Nouveau statut:', newStatus ? 'active' : 'inactive');

      // Mettre à jour le statut
      const { error: updateError } = await supabase
        .from('plots')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('❌ [PlotService] Erreur mise à jour statut:', updateError);
        throw updateError;
      }

      console.log('✅ [PlotService] Statut parcelle mis à jour avec succès');

    } catch (error) {
      console.error('❌ [PlotService] Erreur lors du toggle statut:', error);
      throw error;
    }
  }

  /**
   * Récupère une parcelle par son ID
   */
  private static async getPlotById(plotId: number): Promise<PlotData> {
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('*')
      .eq('id', plotId)
      .single();

    if (plotError) throw plotError;

    const { data: surfaceUnits, error: unitsError } = await supabase
      .from('surface_units')
      .select('*')
      .eq('plot_id', plotId)
      .order('sequence_number', { ascending: true });

    if (unitsError) {
      console.error('❌ [PlotService] Erreur récupération unités surface:', unitsError);
    }

    return {
      id: plot.id.toString(),
      name: plot.name,
      code: plot.code || '',
      type: plot.type as PlotData['type'],
      length: plot.length || 0,
      width: plot.width || 0,
      area: plot.surface_area ? Number((plot.surface_area / 10000).toFixed(4)) : 0,
      unit: 'ha' as const,
      description: plot.description || '',
      status: plot.is_active ? 'active' : 'inactive',
      slug: plot.aliases?.[0] || '',
      aliases: plot.aliases || [],
      surfaceUnits: (surfaceUnits || []).map(unit => ({
        id: unit.id.toString(),
        name: unit.name,
        code: unit.code || '',
        fullName: `${plot.name} ${unit.name}`, // Nom complet : parcelle + unité
        type: unit.type,
        sequenceNumber: unit.sequence_number || 1,
        length: unit.length || undefined,
        width: unit.width || undefined,
      })),
    };
  }
}
