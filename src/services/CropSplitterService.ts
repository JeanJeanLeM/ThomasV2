import { AnalyzedAction } from './aiChatService';

/**
 * CropSplitterService
 * 
 * Service responsable de diviser les actions multi-cultures en actions individuelles
 * avec répartition proportionnelle du temps de travail.
 * 
 * Architecture:
 * - Détection: shouldSplit() vérifie si l'action contient plusieurs cultures
 * - Division: splitAction() génère N actions (une par culture)
 * - Répartition: Symétrique (égale) ou Proportionnelle (basée sur surfaces)
 */

interface SurfaceDistribution {
  [cropName: string]: {
    count: number;
    unit: string;
  };
}

export class CropSplitterService {
  /**
   * Détecte si une action doit être divisée en plusieurs actions (une par culture)
   * 
   * @param action Action analysée par l'IA
   * @returns true si l'action contient plusieurs cultures
   */
  static shouldSplit(action: AnalyzedAction): boolean {
    console.log('🔍 [CROP-SPLITTER] Vérification si split nécessaire:', action.id);

    // Vérifier le flag is_multi_crop
    if (action.extracted_data?.is_multi_crop === true) {
      console.log('✅ [CROP-SPLITTER] is_multi_crop flag détecté');
      return true;
    }

    // Vérifier si crops array existe et contient plus d'une culture
    const crops = action.extracted_data?.crops;
    if (Array.isArray(crops) && crops.length > 1) {
      console.log(`✅ [CROP-SPLITTER] ${crops.length} cultures détectées:`, crops);
      return true;
    }

    console.log('ℹ️ [CROP-SPLITTER] Action simple - pas de split nécessaire');
    return false;
  }

  /**
   * Divise une action multi-cultures en plusieurs actions individuelles
   * 
   * @param action Action multi-cultures à diviser
   * @returns Array d'actions individuelles (une par culture)
   */
  static splitAction(action: AnalyzedAction): AnalyzedAction[] {
    console.log('✂️ [CROP-SPLITTER] Division de l\'action:', action.id);

    const data = action.extracted_data;
    const crops = data?.crops || [];

    if (crops.length === 0) {
      console.warn('⚠️ [CROP-SPLITTER] Aucune culture trouvée, retour action originale');
      return [action];
    }

    // Calculer les durées pour chaque culture
    const durations = this.calculateDurations(action, crops);

    // Créer une action pour chaque culture
    const splitActions: AnalyzedAction[] = crops.map((crop, index) => {
      const splitAction: AnalyzedAction = {
        ...action,
        id: `${action.id}_crop_${index}`, // ID temporaire pour le traitement
        original_action_id: action.id, // Garder l'ID original pour le lien en DB
        extracted_data: {
          ...data,
          crop: crop, // Culture unique pour cette action
          crops: undefined, // Supprimer le array crops
          is_multi_crop: false, // Ce n'est plus multi-crop
          duration: durations[index], // Durée calculée pour cette culture
          // Conserver les autres données
        },
      };

      console.log(`✅ [CROP-SPLITTER] Action créée pour "${crop}":`, {
        duration: durations[index],
        crop: crop,
        original_action_id: action.id,
      });

      return splitAction;
    });

    console.log(`🎯 [CROP-SPLITTER] ${splitActions.length} actions créées`);
    return splitActions;
  }

  /**
   * Calcule les durées pour chaque culture
   * - Proportionnel si surface_distribution existe
   * - Symétrique sinon
   * 
   * @param action Action originale
   * @param crops Liste des cultures
   * @returns Array de durées {value, unit} pour chaque culture
   */
  private static calculateDurations(
    action: AnalyzedAction,
    crops: string[]
  ): Array<{ value: number; unit: string } | undefined> {
    const data = action.extracted_data;
    const totalDuration = data?.duration;

    // Si pas de durée spécifiée, retourner undefined pour chaque culture
    if (!totalDuration || !totalDuration.value) {
      console.log('ℹ️ [CROP-SPLITTER] Pas de durée à répartir');
      return crops.map(() => undefined);
    }

    // Convertir en minutes pour les calculs
    const totalMinutes = this.convertToMinutes(totalDuration);
    console.log(`⏱️ [CROP-SPLITTER] Durée totale: ${totalMinutes} minutes`);

    // Vérifier si distribution de surfaces existe
    const surfaceDistribution = data?.surface_distribution as SurfaceDistribution | undefined;

    if (surfaceDistribution && Object.keys(surfaceDistribution).length > 0) {
      // RÉPARTITION PROPORTIONNELLE basée sur les surfaces
      console.log('📊 [CROP-SPLITTER] Répartition proportionnelle basée sur surfaces');
      return this.calculateProportionalDuration(totalMinutes, crops, surfaceDistribution);
    } else {
      // RÉPARTITION SYMÉTRIQUE (égale)
      console.log('⚖️ [CROP-SPLITTER] Répartition symétrique (égale)');
      return this.calculateSymmetricDuration(totalMinutes, crops.length, totalDuration.unit);
    }
  }

  /**
   * Calcule la répartition proportionnelle basée sur les surfaces
   * 
   * Exemple: 4 planches tomates + 2 planches courgettes = 60 min total
   * → Total: 6 planches
   * → Tomates: 4/6 * 60 = 40 min
   * → Courgettes: 2/6 * 60 = 20 min
   * 
   * @param totalMinutes Durée totale en minutes
   * @param crops Liste des cultures
   * @param surfaceDistribution Distribution des surfaces par culture
   * @returns Array de durées calculées proportionnellement
   */
  private static calculateProportionalDuration(
    totalMinutes: number,
    crops: string[],
    surfaceDistribution: SurfaceDistribution
  ): Array<{ value: number; unit: string }> {
    // Calculer le total des surfaces
    let totalSurface = 0;
    const surfaceByCrop: { [crop: string]: number } = {};

    for (const crop of crops) {
      const surface = surfaceDistribution[crop];
      if (surface && surface.count) {
        surfaceByCrop[crop] = surface.count;
        totalSurface += surface.count;
      } else {
        // Si pas de surface pour cette culture, considérer 1 unité
        surfaceByCrop[crop] = 1;
        totalSurface += 1;
        console.warn(`⚠️ [CROP-SPLITTER] Pas de surface pour "${crop}", utilisation valeur 1`);
      }
    }

    console.log('📐 [CROP-SPLITTER] Surfaces par culture:', surfaceByCrop);
    console.log(`📏 [CROP-SPLITTER] Surface totale: ${totalSurface}`);

    // Calculer la durée pour chaque culture proportionnellement
    const durations = crops.map((crop) => {
      const surface = surfaceByCrop[crop];
      const proportion = surface / totalSurface;
      const minutes = Math.round(totalMinutes * proportion);

      console.log(`  • ${crop}: ${surface}/${totalSurface} = ${(proportion * 100).toFixed(1)}% → ${minutes} min`);

      return {
        value: minutes,
        unit: 'minutes',
      };
    });

    // Vérification: La somme des durées doit être égale à la durée totale (ou très proche)
    const sumMinutes = durations.reduce((sum, d) => sum + d.value, 0);
    if (Math.abs(sumMinutes - totalMinutes) > 1) {
      console.warn(`⚠️ [CROP-SPLITTER] Différence arrondi: ${sumMinutes} min vs ${totalMinutes} min`);
      // Ajuster la dernière durée pour compenser l'arrondi
      const diff = totalMinutes - sumMinutes;
      if (durations.length > 0) {
        durations[durations.length - 1].value += diff;
        console.log(`🔧 [CROP-SPLITTER] Ajustement dernière culture: +${diff} min`);
      }
    }

    return durations;
  }

  /**
   * Calcule la répartition symétrique (égale entre toutes les cultures)
   * 
   * Exemple: 3 heures pour 2 cultures = 1h30 chacune
   * 
   * @param totalMinutes Durée totale en minutes
   * @param cropCount Nombre de cultures
   * @param originalUnit Unité de temps originale ('minutes' ou 'heures')
   * @returns Array de durées égales
   */
  private static calculateSymmetricDuration(
    totalMinutes: number,
    cropCount: number,
    originalUnit: string
  ): Array<{ value: number; unit: string }> {
    const minutesPerCrop = Math.round(totalMinutes / cropCount);

    console.log(`⚖️ [CROP-SPLITTER] ${totalMinutes} min ÷ ${cropCount} cultures = ${minutesPerCrop} min/culture`);

    // Créer un array avec la même durée pour chaque culture
    const durations = Array(cropCount).fill({
      value: minutesPerCrop,
      unit: 'minutes',
    });

    // Vérification de la somme
    const sumMinutes = minutesPerCrop * cropCount;
    if (Math.abs(sumMinutes - totalMinutes) > 1) {
      console.warn(`⚠️ [CROP-SPLITTER] Différence arrondi: ${sumMinutes} min vs ${totalMinutes} min`);
    }

    return durations;
  }

  /**
   * Convertit une durée en minutes
   * 
   * @param duration Objet {value, unit}
   * @returns Durée en minutes
   */
  private static convertToMinutes(duration: { value: number; unit: string }): number {
    const unit = duration.unit.toLowerCase();

    if (unit === 'minutes' || unit === 'minute' || unit === 'min') {
      return duration.value;
    } else if (unit === 'heures' || unit === 'heure' || unit === 'h' || unit === 'hours' || unit === 'hour') {
      return duration.value * 60;
    } else if (unit === 'jours' || unit === 'jour' || unit === 'day' || unit === 'days' || unit === 'j') {
      return duration.value * 60 * 24;
    } else {
      console.warn(`⚠️ [CROP-SPLITTER] Unité inconnue: "${unit}", utilisation valeur brute`);
      return duration.value;
    }
  }

  /**
   * Utilitaire: Affiche un résumé du split pour debug
   * 
   * @param originalAction Action originale
   * @param splitActions Actions divisées
   */
  static logSplitSummary(originalAction: AnalyzedAction, splitActions: AnalyzedAction[]): void {
    console.log('📋 [CROP-SPLITTER] === RÉSUMÉ DU SPLIT ===');
    console.log(`  Original: ${originalAction.id}`);
    console.log(`  Cultures: ${originalAction.extracted_data?.crops?.join(', ')}`);
    console.log(`  Durée totale: ${originalAction.extracted_data?.duration?.value} ${originalAction.extracted_data?.duration?.unit}`);
    console.log(`  Actions créées: ${splitActions.length}`);
    
    splitActions.forEach((action, index) => {
      console.log(`    ${index + 1}. ${action.extracted_data?.crop}: ${action.extracted_data?.duration?.value} ${action.extracted_data?.duration?.unit}`);
    });
    
    console.log('=================================');
  }
}
