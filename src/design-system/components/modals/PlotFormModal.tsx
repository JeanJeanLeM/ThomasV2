import React, { useState, useEffect } from 'react';
import { View, Alert, Switch } from 'react-native';
import { StandardFormModal, FormSection, RowFields } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { DropdownSelector } from '../DropdownSelector';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import type { PlotData } from '../cards/PlotCardStandard';
import { PlotService } from '../../../services/plotService';

type SurfaceUnitType = 'planche' | 'rang' | 'ligne' | 'chapelle' | 'jardin' | 'autre';

const PLOT_TYPES: { id: string; value: PlotData['type']; label: string }[] = [
  { id: 'plein_champ', value: 'plein_champ', label: 'Plein champ' },
  { id: 'serre_plastique', value: 'serre_plastique', label: 'Serre plastique' },
  { id: 'serre_verre', value: 'serre_verre', label: 'Serre verre' },
  { id: 'tunnel', value: 'tunnel', label: 'Tunnel' },
  { id: 'hydroponique', value: 'hydroponique', label: 'Hydroponique' },
  { id: 'pepiniere', value: 'pepiniere', label: 'Pépinière' },
  { id: 'autre', value: 'autre', label: 'Autre' },
];

const SURFACE_UNIT_TYPES: { id: SurfaceUnitType; label: string }[] = [
  { id: 'planche', label: 'Planche' },
  { id: 'rang', label: 'Rang' },
  { id: 'ligne', label: 'Ligne' },
  { id: 'chapelle', label: 'Chapelle' },
  { id: 'jardin', label: 'Jardin' },
  { id: 'autre', label: 'Autre type' },
];

export interface PlotFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (plot: PlotData) => Promise<void>;
  plot?: PlotData | null;
  isCreating: boolean;
  activeFarm?: {
    farm_id: number;
    farm_name: string;
    role?: string;
    is_owner?: boolean;
  };
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const buildSlugInfo = (name: string, code: string, extra: string) =>
  [name, code, extra].filter(Boolean).join(' ').trim();

export const PlotFormModal: React.FC<PlotFormModalProps> = ({
  visible,
  onClose,
  onSave,
  plot,
  isCreating,
  activeFarm,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<string | null>('plein_champ');
  const [customPlotTypeLabel, setCustomPlotTypeLabel] = useState('');
  const [formLength, setFormLength] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSlugText, setFormSlugText] = useState('');
  const [unitType, setUnitType] = useState<SurfaceUnitType>('planche');
  const [customUnitTypeLabel, setCustomUnitTypeLabel] = useState('');
  const [unitCount, setUnitCount] = useState('1');
  const [unitLength, setUnitLength] = useState('');
  const [unitWidth, setUnitWidth] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Initialiser le formulaire avec les données de la parcelle
  useEffect(() => {
    console.log('🔄 [PlotFormModal] Initializing form:', { plot: !!plot, isCreating, visible });
    
    if (plot && !isCreating) {
      console.log('📝 [PlotFormModal] Loading existing plot data');
      setFormName(plot.name || '');
      setFormCode(plot.code || '');
      setFormType(plot.type || 'plein_champ');
      setCustomPlotTypeLabel(plot.customTypeLabel || '');
      setFormLength(plot.length?.toString() || '');
      setFormWidth(plot.width?.toString() || '');
      setFormDescription(plot.description || '');
      setFormIsActive(plot.isActive !== false);
      setFormSlugText(plot.slug || '');
      // Charger les unités de surface depuis surfaceUnits (pluriel)
      const firstUnit = plot.surfaceUnits?.[0];
      setUnitType((firstUnit?.type as SurfaceUnitType) || 'planche');
      setCustomUnitTypeLabel(''); // Custom label non supporté en édition pour l'instant
      setUnitCount(plot.surfaceUnits?.length.toString() || '1');
      setUnitLength(firstUnit?.length?.toString() || '');
      setUnitWidth(firstUnit?.width?.toString() || '');
      setCodeTouched(true);
    } else {
      // Réinitialiser pour une nouvelle parcelle
      console.log('🆕 [PlotFormModal] Resetting form for new plot');
      setFormName('');
      setFormCode('');
      setFormType('plein_champ');
      setCustomPlotTypeLabel('');
      setFormLength('');
      setFormWidth('');
      setFormDescription('');
      setFormIsActive(true);
      setFormSlugText('');
      setUnitType('planche');
      setCustomUnitTypeLabel('');
      setUnitCount('1');
      setUnitLength('');
      setUnitWidth('');
      setCodeTouched(false);
      setShowAdvancedOptions(false);
    }
  }, [plot, isCreating, visible]);

  // Auto-génération du code basé sur le nom
  useEffect(() => {
    if (!codeTouched && formName) {
      const autoCode = slugify(formName).substring(0, 10);
      setFormCode(autoCode);
    }
  }, [formName, codeTouched]);

  // Auto-génération du slug
  useEffect(() => {
    const slugInfo = buildSlugInfo(formName, formCode, formDescription);
    setFormSlugText(slugify(slugInfo));
  }, [formName, formCode, formDescription]);

  const handleSave = async () => {
    console.log('🚀 [PlotFormModal] handleSave called');
    console.log('📝 [PlotFormModal] formName:', formName);
    console.log('📝 [PlotFormModal] formName.trim():', formName.trim());
    console.log('📝 [PlotFormModal] activeFarm:', activeFarm);
    
    if (!formName.trim()) {
      console.warn('⚠️ [PlotFormModal] Form name is empty');
      Alert.alert('Erreur', 'Le nom de la parcelle est requis');
      return;
    }

    if (!activeFarm) {
      console.warn('⚠️ [PlotFormModal] No active farm');
      Alert.alert('Erreur', 'Aucune ferme active sélectionnée');
      return;
    }

    console.log('✅ [PlotFormModal] Validation passed, starting save...');
    setIsLoading(true);

    try {
      // Générer les unités de surface individuelles basées sur le count
      const count = parseInt(unitCount) || 1;
      const unitLabel = unitType === 'autre' && customUnitTypeLabel 
        ? customUnitTypeLabel 
        : SURFACE_UNIT_TYPES.find(u => u.id === unitType)?.label || 'Unité';
      
      const surfaceUnits = Array.from({ length: count }, (_, i) => {
        const sequenceNum = i + 1;
        return {
          id: `temp-${Date.now()}-${i}`, // ID temporaire
          name: `${unitLabel} ${sequenceNum}`,
          code: `${slugify(unitLabel).substring(0, 3)}-${sequenceNum}`,
          type: unitType,
          sequenceNumber: sequenceNum,
          length: unitLength ? parseFloat(unitLength) : undefined,
          width: unitWidth ? parseFloat(unitWidth) : undefined,
        };
      });

      console.log('📝 [PlotFormModal] Generated surface units:', surfaceUnits.length, 'units');

      const plotData: PlotData = {
        id: plot?.id || Date.now().toString(),
        name: formName.trim(),
        code: formCode.trim() || slugify(formName).substring(0, 10),
        type: formType as PlotData['type'],
        customTypeLabel: formType === 'autre' ? customPlotTypeLabel : undefined,
        length: formLength ? parseFloat(formLength) : 0,
        width: formWidth ? parseFloat(formWidth) : 0,
        area: 0, // Sera calculé par le service
        unit: 'ha',
        description: formDescription.trim() || '',
        status: formIsActive ? 'active' : 'inactive',
        is_active: formIsActive,
        isActive: formIsActive,
        slug: formSlugText,
        aliases: [],
        surfaceUnits: surfaceUnits, // Utiliser surfaceUnits (pluriel) avec le tableau généré
        farmId: activeFarm.farm_id,
      };

      await onSave(plotData);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la parcelle');
    } finally {
      setIsLoading(false);
    }
  };

  const getInfoBanner = () => {
    if (plot && !isCreating) {
      return {
        text: `Modification de la parcelle : ${plot.name}`,
        type: 'info' as const
      };
    }
    return {
      text: "Définissez précisément vos parcelles et unités de surface pour que Thomas puisse les reconnaître dans vos messages.",
      type: 'success' as const
    };
  };

  const isButtonDisabled = !formName.trim() || isLoading;
  
  // Log pour debug
  useEffect(() => {
    if (visible) {
      console.log('🔍 [PlotFormModal] Button state:', {
        formName,
        formNameTrimmed: formName.trim(),
        isButtonDisabled,
        isLoading,
        isCreating,
      });
    }
  }, [visible, formName, isButtonDisabled, isLoading, isCreating]);

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title={plot && !isCreating ? 'Modifier la parcelle' : 'Nouvelle parcelle'}
      primaryAction={{
        title: plot && !isCreating ? 'Sauvegarder' : 'Créer',
        onPress: handleSave,
        loading: isLoading,
        disabled: isButtonDisabled,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={getInfoBanner()}
    >
      <FormSection 
        title="Informations générales"
        description="Nom et type de votre parcelle"
      >
        <EnhancedInput
          label="Nom de la parcelle"
          placeholder="Ex: Serre Nord, Tunnel Tomates..."
          value={formName}
          onChangeText={(value) => {
            console.log('📝 [PlotFormModal] formName changed:', value);
            setFormName(value);
          }}
          required
          hint="Nom descriptif pour identifier facilement la parcelle"
        />

        <EnhancedInput
          label="Code court"
          placeholder="Ex: SN, TT..."
          value={formCode}
          onChangeText={(value) => {
            setFormCode(value);
            setCodeTouched(true);
          }}
          hint="Code court pour les références rapides (auto-généré si vide)"
        />

        <DropdownSelector
          label="Type de parcelle"
          placeholder="Sélectionnez le type"
          items={PLOT_TYPES}
          selectedItems={PLOT_TYPES.filter(type => type.value === formType)}
          onSelectionChange={(items) => setFormType(items[0]?.value || 'plein_champ')}
        />

        {formType === 'autre' && (
          <EnhancedInput
            label="Type personnalisé"
            placeholder="Décrivez le type de parcelle"
            value={customPlotTypeLabel}
            onChangeText={setCustomPlotTypeLabel}
            required
          />
        )}
      </FormSection>

      <FormSection 
        title="Dimensions"
        description="Taille de la parcelle (optionnel)"
      >
        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Longueur (m)"
              placeholder="Ex: 50"
              value={formLength}
              onChangeText={setFormLength}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Largeur (m)"
              placeholder="Ex: 20"
              value={formWidth}
              onChangeText={setFormWidth}
              keyboardType="numeric"
            />
          </View>
        </RowFields>
      </FormSection>

      <FormSection 
        title="Unités de surface"
        description="Configuration des unités internes (planches, rangs, etc.)"
      >
        <DropdownSelector
          label="Type d'unité"
          placeholder="Sélectionnez le type d'unité"
          items={SURFACE_UNIT_TYPES}
          selectedItems={SURFACE_UNIT_TYPES.filter(unit => unit.id === unitType)}
          onSelectionChange={(items) => setUnitType(items[0]?.id || 'planche')}
        />

        {unitType === 'autre' && (
          <EnhancedInput
            label="Type d'unité personnalisé"
            placeholder="Ex: Bac, Carré..."
            value={customUnitTypeLabel}
            onChangeText={setCustomUnitTypeLabel}
            required
          />
        )}

        <EnhancedInput
          label="Nombre d'unités"
          placeholder="Ex: 10"
          value={unitCount}
          onChangeText={setUnitCount}
          keyboardType="numeric"
          hint="Nombre total d'unités dans cette parcelle"
        />

        <RowFields>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Longueur unité (m)"
              placeholder="Ex: 10"
              value={unitLength}
              onChangeText={setUnitLength}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <EnhancedInput
              label="Largeur unité (m)"
              placeholder="Ex: 1.2"
              value={unitWidth}
              onChangeText={setUnitWidth}
              keyboardType="numeric"
            />
          </View>
        </RowFields>
      </FormSection>

      <FormSection 
        title="Informations complémentaires"
        description="Description et statut"
      >
        <EnhancedInput
          label="Description"
          placeholder="Informations supplémentaires sur cette parcelle..."
          value={formDescription}
          onChangeText={setFormDescription}
          multiline
          numberOfLines={3}
        />

        <View>
          <Text variant="body" style={{ 
            marginBottom: spacing.sm,
            fontWeight: '600',
            color: colors.text.primary 
          }}>
            Statut de la parcelle
          </Text>
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: spacing.md,
            backgroundColor: colors.background.secondary,
            borderRadius: 8,
          }}>
            <View>
              <Text variant="body" color={colors.text.primary}>
                Parcelle active
              </Text>
              <Text variant="caption" color={colors.text.secondary}>
                Les parcelles inactives sont masquées par défaut
              </Text>
            </View>
            <Switch
              value={formIsActive}
              onValueChange={setFormIsActive}
              trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
              thumbColor={formIsActive ? colors.primary[600] : colors.gray[500]}
            />
          </View>
        </View>
      </FormSection>
    </StandardFormModal>
  );
};



