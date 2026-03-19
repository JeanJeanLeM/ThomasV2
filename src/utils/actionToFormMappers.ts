/**
 * Mappers pour convertir extracted_data (actions management) vers les formats des formulaires.
 */

import type { PlotData } from '../design-system/components/cards/PlotCardStandard';
import type { QuickConversionData } from '../design-system/components/modals/QuickConversionModal';
import type { MaterialData } from '../design-system/components/cards/MaterialCardStandard';

export interface ManagementExtractedData {
  name?: string;
  type?: string;
  code?: string;
  length?: number;
  width?: number;
  description?: string;
  aliases?: string[];
  llm_keywords?: string[];
  surface_units_config?: {
    count: number;
    naming_pattern: string;
    type: string;
    sequence_start: number;
    length?: number;
    width?: number;
  };
  plank_dimensions?: { length?: number; width?: number };
  surface_units_count?: number;  // Alias API (surface_units_config.count)
  surfaceUnits?: Array<{ id: string; name: string; code?: string; type?: string }>;  // Depuis save form
  record_id?: string | number;
  container_name?: string;
  crop_name?: string;
  conversion_value?: number;
  conversion_unit?: string;
  container_type?: string;
  category?: string;
  brand?: string;
  model?: string;
  cost?: number;
  purchase_date?: string;
  supplier?: string;
  condition_notes?: string;
  custom_category?: string;
  [key: string]: unknown;
}

/**
 * Convertit extracted_data d'une action manage_plot vers PlotData pour PlotFormModal.
 */
export function mapToPlotData(extracted: ManagementExtractedData): Partial<PlotData> {
  const suConfig = extracted.surface_units_config;
  // Priorité: surfaceUnits (save récent) > surface_units_count + suConfig (modification/création)
  const count = extracted.surface_units_count ?? suConfig?.count ?? 0;
  const safeCount = count > 0 ? Math.min(count, 100) : 0;
  const suLength = suConfig?.length ?? extracted.plank_dimensions?.length;
  const suWidth = suConfig?.width ?? extracted.plank_dimensions?.width;
  const surfaceUnits = extracted.surfaceUnits?.length
    ? extracted.surfaceUnits
    : safeCount > 0 && suConfig
    ? Array.from({ length: safeCount }, (_, i) => {
        const n = (suConfig.sequence_start ?? 1) + i;
        const pattern = suConfig.naming_pattern || `${suConfig.type || 'planche'} {n}`;
        const name = pattern.replace('{n}', String(n)).replace('{N}', String(n));
        return {
          id: `su-${i}`,
          name,
          code: name,
          type: suConfig.type,
          ...(suLength != null && { length: suLength }),
          ...(suWidth != null && { width: suWidth }),
        };
      })
    : undefined;

  const length = extracted.length ?? 0;
  const width = extracted.width ?? 0;
  return {
    id: extracted.record_id?.toString() || '',
    name: extracted.name || '',
    code: extracted.code || '',
    type: (extracted.type as PlotData['type']) || 'plein_champ',
    length,
    width,
    area: length && width ? length * width : 0,
    unit: 'ha',
    description: extracted.description || '',
    slug: extracted.llm_keywords?.[0],
    aliases: extracted.aliases,
    surfaceUnits,
    status: 'active',
    is_active: true,
    isActive: true,
  };
}

/**
 * Convertit extracted_data d'une action manage_conversion vers QuickConversionData.
 */
export function mapToQuickConversionData(extracted: ManagementExtractedData): Partial<QuickConversionData> {
  return {
    containerName: extracted.container_name || '',
    cropName: extracted.crop_name || '',
    conversionValue: extracted.conversion_value ?? 0,
    conversionUnit: extracted.conversion_unit || 'kg',
    containerType: extracted.container_type,
    description: extracted.description,
  };
}

/**
 * Convertit extracted_data d'une action manage_material vers MaterialData pour MaterialFormModal.
 */
export function mapToMaterialData(extracted: ManagementExtractedData): Partial<MaterialData> {
  const category = extracted.category || 'autre';
  const mapCategoryToType = (cat: string): MaterialData['type'] => {
    switch (cat) {
      case 'tracteurs': return 'tractor';
      case 'outils_tracteur':
      case 'outils_manuels':
      case 'petit_equipement': return 'implement';
      case 'materiel_marketing': return 'tool';
      default: return 'vehicle';
    }
  };

  return {
    id: extracted.record_id?.toString(),
    name: extracted.name || '',
    type: mapCategoryToType(category),
    brand: extracted.brand || '',
    model: extracted.model || '',
    category: category as MaterialData['category'],
    custom_category: extracted.custom_category,
    llm_keywords: extracted.llm_keywords,
    is_active: true,
  };
}
