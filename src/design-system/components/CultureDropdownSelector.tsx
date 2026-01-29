import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  Alert,
  Platform,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../colors';
import { spacing } from '../spacing';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  XIcon,
  PlusIcon,
  SearchIcon,
} from '../icons';
import { cultureService } from '../../services/CultureService';
import { useAuth } from '../../contexts/AuthContext';
import type { Culture, CultureVariety, CultureType } from '../../types';

export interface CultureDropdownItem {
  id: string;
  label: string;
  type: 'culture' | 'variety';
  culture?: Culture;
  variety?: CultureVariety;
  cultureType?: CultureType;
}

export interface CultureDropdownSelectorProps {
  label?: string;
  placeholder?: string;
  selectedItem?: CultureDropdownItem;
  onSelectionChange: (item: CultureDropdownItem | null) => void;
  farmId?: number;
  allowVarieties?: boolean; // Si true, affiche aussi les variétés
  cultureTypeFilter?: CultureType; // Filtrer par type de culture
  searchable?: boolean;
  onAddCulture?: () => void;
  onAddVariety?: (culture: Culture) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: ViewStyle;
  useUserPreferences?: boolean; // Si true, filtre selon les préférences utilisateur (défaut: true)
}

export const CultureDropdownSelector: React.FC<CultureDropdownSelectorProps> = ({
  label,
  placeholder = "Sélectionner une culture...",
  selectedItem,
  onSelectionChange,
  farmId,
  allowVarieties = true,
  cultureTypeFilter,
  searchable = true,
  onAddCulture,
  onAddVariety,
  disabled = false,
  error,
  hint,
  required = false,
  style,
  useUserPreferences = true, // Par défaut, utiliser les préférences utilisateur
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dropdownSearchText, setDropdownSearchText] = useState(''); // Recherche dans le dropdown
  const [selectedCultureType, setSelectedCultureType] = useState<CultureType | 'all'>('all');
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [varieties, setVarieties] = useState<CultureVariety[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les cultures au montage
  useEffect(() => {
    loadCultures();
  }, [farmId, cultureTypeFilter, user?.id, useUserPreferences]);

  // Charger les variétés quand une culture est sélectionnée ou le type change
  useEffect(() => {
    if (allowVarieties) {
      loadVarieties();
    }
  }, [cultures, selectedCultureType, allowVarieties]);

  // Réinitialiser la recherche du dropdown quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setDropdownSearchText('');
    }
  }, [isOpen]);

  // Toggle simple du dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const loadCultures = async () => {
    try {
      setLoading(true);
      let loadedCultures: Culture[];
      
      // Utiliser les préférences utilisateur si activé et que l'utilisateur est connecté
      // Les préférences ne sont pas restrictives : toutes les cultures sont visibles,
      // mais celles de la liste utilisateur sont triées en premier
      if (useUserPreferences && user?.id && farmId) {
        loadedCultures = await cultureService.getCulturesForUser(user.id, farmId);
        
        // Appliquer le filtre par type si nécessaire
        if (cultureTypeFilter) {
          loadedCultures = loadedCultures.filter(c => c.type === cultureTypeFilter);
        }
      } else {
        // Comportement par défaut: toutes les cultures
        if (cultureTypeFilter) {
          loadedCultures = await cultureService.getCulturesByType(cultureTypeFilter, farmId);
        } else {
          loadedCultures = await cultureService.getCultures(farmId);
        }
      }
      
      setCultures(loadedCultures);
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error);
      Alert.alert('Erreur', 'Impossible de charger les cultures');
    } finally {
      setLoading(false);
    }
  };

  const loadVarieties = async () => {
    if (!allowVarieties) return;

    try {
      // Charger les variétés pour toutes les cultures du type sélectionné
      const culturesToLoad = selectedCultureType === 'all' 
        ? cultures 
        : cultures.filter(c => c.type === selectedCultureType);

      const allVarieties: CultureVariety[] = [];
      
      for (const culture of culturesToLoad) {
        const cultureVarieties = await cultureService.getCultureVarieties(culture.id, farmId);
        allVarieties.push(...cultureVarieties);
      }
      
      setVarieties(allVarieties);
    } catch (error) {
      console.error('Erreur lors du chargement des variétés:', error);
    }
  };

  // Créer les items pour le dropdown
  const dropdownItems = useMemo(() => {
    const items: CultureDropdownItem[] = [];

    // Filtrer les cultures
    let filteredCultures = cultures;
    if (selectedCultureType !== 'all') {
      filteredCultures = cultures.filter(c => c.type === selectedCultureType);
    }

    // Ajouter les cultures
    filteredCultures.forEach(culture => {
      items.push({
        id: `culture-${culture.id}`,
        label: culture.name,
        type: 'culture',
        culture,
        cultureType: culture.type,
      });
    });

    // Ajouter les variétés si activé
    if (allowVarieties) {
      let filteredVarieties = varieties;
      if (selectedCultureType !== 'all') {
        filteredVarieties = varieties.filter(v => v.culture?.type === selectedCultureType);
      }

      filteredVarieties.forEach(variety => {
        items.push({
          id: `variety-${variety.id}`,
          label: `${variety.culture?.name} - ${variety.name}`,
          type: 'variety',
          variety,
          culture: variety.culture,
          cultureType: variety.culture?.type,
        });
      });
    }

    // Filtrer par recherche si searchable est activé
    // Utiliser dropdownSearchText si disponible, sinon searchText
    const activeSearchText = dropdownSearchText.trim() || searchText.trim();
    if (searchable && activeSearchText) {
      const search = activeSearchText.toLowerCase().trim();
      const filtered = items.filter(item => {
        const label = item.label.toLowerCase();
        const cultureName = item.culture?.name?.toLowerCase() || '';
        const varietyName = item.variety?.name?.toLowerCase() || '';
        const description = item.culture?.description?.toLowerCase() || '';
        const varietyDescription = item.variety?.description?.toLowerCase() || '';
        
        // Recherche dans le label complet, le nom de culture, le nom de variété, et les descriptions
        return label.includes(search) ||
               cultureName.includes(search) ||
               varietyName.includes(search) ||
               description.includes(search) ||
               varietyDescription.includes(search);
      });
      
      // Trier : d'abord ceux qui commencent par la recherche, puis les autres
      return filtered.sort((a, b) => {
        const aLabel = a.label.toLowerCase();
        const bLabel = b.label.toLowerCase();
        const aCultureName = a.culture?.name?.toLowerCase() || '';
        const bCultureName = b.culture?.name?.toLowerCase() || '';
        
        // Prioriser ceux qui commencent par la recherche
        const aStartsWith = aLabel.startsWith(search) || aCultureName.startsWith(search);
        const bStartsWith = bLabel.startsWith(search) || bCultureName.startsWith(search);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Ensuite, prioriser ceux où la recherche est au début du mot (après un espace ou tiret)
        const aWordStart = aLabel.includes(` ${search}`) || aLabel.includes(`-${search}`);
        const bWordStart = bLabel.includes(` ${search}`) || bLabel.includes(`-${search}`);
        
        if (aWordStart && !bWordStart) return -1;
        if (!aWordStart && bWordStart) return 1;
        
        // Sinon, tri alphabétique
        return a.label.localeCompare(b.label);
      });
    }

    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [cultures, varieties, selectedCultureType, allowVarieties, searchable, searchText, dropdownSearchText]);

  const handleItemSelect = (item: CultureDropdownItem) => {
    onSelectionChange(item);
    setSearchText(item.label);
    setDropdownSearchText('');
    setIsOpen(false);
  };

  const clearSelection = () => {
    onSelectionChange(null);
    setSearchText('');
    setDropdownSearchText('');
  };

  // Initialiser le searchText avec l'élément sélectionné
  React.useEffect(() => {
    if (selectedItem) {
      setSearchText(selectedItem.label);
    } else if (!selectedItem) {
      setSearchText('');
    }
  }, [selectedItem?.id]);

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {/* Label */}
      {label && (
        <Text variant="label" style={{ marginBottom: spacing.sm }}>
          {label}
          {required && <Text style={{ color: colors.semantic.error }}> *</Text>}
        </Text>
      )}

      {/* Sélecteur principal - TouchableOpacity simple */}
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.border.error : isOpen ? colors.border.focus : colors.border.primary,
          borderRadius: 8,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          backgroundColor: disabled ? colors.gray[50] : colors.background.secondary,
          minHeight: spacing.interactive?.inputHeight ?? 44,
          overflow: 'hidden',
          ...(isOpen && !error && {
            shadowColor: colors.border.focus,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 2,
          }),
        }}
        onPress={() => {
          if (disabled) return;
          toggleDropdown();
        }}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          variant="body"
          color={selectedItem ? colors.text.primary : colors.text.tertiary}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        
        {selectedItem && !disabled && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            style={{ marginRight: spacing.sm, padding: 2 }}
            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
          >
            <XIcon size={16} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
        
        {isOpen ? (
          <ChevronUpIcon size={20} color={colors.gray[500]} />
        ) : (
          <ChevronDownIcon size={20} color={colors.gray[500]} />
        )}
      </TouchableOpacity>

      {/* Dropdown simple sans Modal */}
      {isOpen && (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: colors.border.primary,
            borderRadius: 8,
            marginTop: spacing.xs,
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            maxHeight: 400,
            ...Platform.select({
              web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
              } as any,
            }),
          }}
        >
          {/* Barre de recherche dans le dropdown */}
          {searchable && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: colors.border.primary,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.gray[50],
            }}>
              <SearchIcon size={16} color={colors.gray[500]} />
              <TextInput
                style={{
                  flex: 1,
                  marginLeft: spacing.sm,
                  paddingVertical: spacing.xs,
                  fontSize: 16,
                  color: colors.text.primary,
                  borderWidth: 0,
                  outline: 'none',
                  boxShadow: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  ...Platform.select({
                    web: {
                      outline: 'none',
                      border: 'none',
                    } as any,
                  }),
                }}
                placeholder="Rechercher une culture..."
                placeholderTextColor={colors.text.tertiary}
                value={dropdownSearchText}
                onChangeText={(text) => {
                  setDropdownSearchText(text);
                }}
                autoFocus={false}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {dropdownSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setDropdownSearchText('')}
                  style={{ padding: spacing.xs }}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <XIcon size={16} color={colors.gray[500]} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Liste des éléments - Affichage simplifié */}
          <ScrollView 
            style={{ 
              maxHeight: 250,
              // Sur web, permettre le scroll avec la molette
              ...Platform.select({
                web: {
                  overflowY: 'auto',
                  overflowX: 'hidden',
                } as any,
              }),
            }} 
            showsVerticalScrollIndicator={Platform.OS !== 'web'}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            onTouchStart={() => {
              // Garder le focus sur le TextInput même quand on touche la liste
              // Cela permet de continuer à taper et filtrer
            }}
          >
            {loading ? (
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Text variant="body" color={colors.gray[500]}>
                  Chargement...
                </Text>
              </View>
            ) : dropdownItems.length > 0 ? (
              dropdownItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    handleItemSelect(item);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border.primary,
                    // Styles web pour meilleure compatibilité
                    ...Platform.select({
                      web: {
                        cursor: 'pointer',
                        userSelect: 'none',
                        ':hover': {
                          backgroundColor: colors.gray[50],
                        },
                      } as any,
                    }),
                  }}
                  activeOpacity={0.7}
                  // Sur web, gérer les clics différemment
                  {...Platform.select({
                    web: {
                      onClick: (e: any) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleItemSelect(item);
                      },
                      onMouseDown: (e: any) => {
                        // Empêcher le blur du TextInput quand on clique sur un item
                        e.preventDefault();
                        e.stopPropagation();
                      },
                    } as any,
                  })}
                >
                  <Text
                    variant="body"
                    color={colors.text.primary}
                    style={{ flex: 1 }}
                    numberOfLines={2}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Text variant="body" color={colors.gray[500]} align="center">
                  Aucune culture trouvée
                </Text>
                {searchable && (dropdownSearchText.trim() || searchText.trim()) && (
                  <Text variant="caption" color={colors.gray[400]} align="center" style={{ marginTop: spacing.xs }}>
                    Essayez de modifier votre recherche
                  </Text>
                )}
              </View>
            )}

            {/* Boutons d'ajout */}
            {(onAddCulture || onAddVariety) && (
              <View style={{
                borderTopWidth: 1,
                borderTopColor: colors.border.primary,
                backgroundColor: colors.primary[50],
              }}>
                {onAddCulture && (
                  <TouchableOpacity
                    onPress={() => {
                      onAddCulture();
                      setIsOpen(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.primary[600],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.sm,
                      }}
                    >
                      <PlusIcon size={14} color={colors.text.inverse} />
                    </View>
                    <Text variant="body" color={colors.primary[700]} weight="semibold">
                      Ajouter une nouvelle culture
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Messages d'erreur et d'aide */}
      {error && (
        <Text variant="error" style={{ marginTop: spacing.xs }}>
          {error}
        </Text>
      )}
      
      {hint && !error && (
        <Text variant="caption" style={{ marginTop: spacing.xs }}>
          {hint}
        </Text>
      )}
    </View>
  );
};

