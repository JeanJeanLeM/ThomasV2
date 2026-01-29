import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  Platform,
} from 'react-native';
import { Text } from './Text';
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
import { PhytosanitaryProductService } from '../../services/PhytosanitaryProductService';
import { UserPhytosanitaryPreferencesService } from '../../services/UserPhytosanitaryPreferencesService';
import { useAuth } from '../../contexts/AuthContext';
import type { Culture, PhytosanitaryProduct } from '../../types';

export interface UnifiedWhatItem {
  id: string;
  label: string;
  type: 'culture' | 'phytosanitary' | 'material' | 'custom';
  category?: string;
  data?: any; // Culture, PhytosanitaryProduct, etc.
}

export interface UnifiedWhatSelectorProps {
  label?: string;
  placeholder?: string;
  selectedItem?: UnifiedWhatItem | null;
  onSelectionChange: (item: UnifiedWhatItem | null) => void;
  farmId?: number;
  searchable?: boolean;
  onAddNew?: (label: string) => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: ViewStyle;
}

// Matières prédéfinies
const PREDEFINED_MATERIALS: UnifiedWhatItem[] = [
  { id: 'compost', label: 'Compost', type: 'material', category: 'matiere_organique' },
  { id: 'terreau', label: 'Terreau', type: 'material', category: 'substrat' },
  { id: 'engrais', label: 'Engrais', type: 'material', category: 'intrant' },
  { id: 'fumier', label: 'Fumier', type: 'material', category: 'matiere_organique' },
  { id: 'paille', label: 'Paille', type: 'material', category: 'matiere_organique' },
  { id: 'copeaux', label: 'Copeaux de bois', type: 'material', category: 'substrat' },
  { id: 'sable', label: 'Sable', type: 'material', category: 'substrat' },
  { id: 'gravier', label: 'Gravier', type: 'material', category: 'substrat' },
  { id: 'tourbe', label: 'Tourbe', type: 'material', category: 'substrat' },
  { id: 'perlite', label: 'Perlite', type: 'material', category: 'substrat' },
  { id: 'vermiculite', label: 'Vermiculite', type: 'material', category: 'substrat' },
];

export const UnifiedWhatSelector: React.FC<UnifiedWhatSelectorProps> = ({
  label,
  placeholder = "Sélectionner une culture, produit ou matière...",
  selectedItem,
  onSelectionChange,
  farmId,
  searchable = true,
  onAddNew,
  disabled = false,
  error,
  hint,
  required = false,
  style,
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dropdownSearchText, setDropdownSearchText] = useState('');
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [phytosanitaryProducts, setPhytosanitaryProducts] = useState<PhytosanitaryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPhyto, setLoadingPhyto] = useState(false);

  // Charger les cultures au montage
  useEffect(() => {
    loadCultures();
  }, [farmId, user?.id]);

  // Charger les produits phytosanitaires quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen) {
      // Charger les produits préférés de l'utilisateur ou faire une recherche
      loadPhytosanitaryProducts();
    }
  }, [isOpen, farmId, user?.id]);

  // Réinitialiser la recherche du dropdown quand on ferme
  useEffect(() => {
    if (!isOpen) {
      setDropdownSearchText('');
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const loadCultures = async () => {
    if (!farmId || !user?.id) return;

    try {
      setLoading(true);
      const loadedCultures = await cultureService.getCulturesForUser(user.id, farmId);
      setCultures(loadedCultures);
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhytosanitaryProducts = async () => {
    if (!farmId || !user?.id) return;

    try {
      setLoadingPhyto(true);
      
      // Récupérer les préférences utilisateur pour filtrer
      const preferences = await UserPhytosanitaryPreferencesService.getUserPreferences(user.id, farmId);
      
      let products: PhytosanitaryProduct[] = [];
      
      if (preferences && preferences.product_amms && preferences.product_amms.length > 0) {
        // Charger les produits de la liste utilisateur
        for (const amm of preferences.product_amms) {
          try {
            const product = await PhytosanitaryProductService.getProductByAmm(amm);
            if (product) {
              products.push(product);
            }
          } catch (err) {
            console.warn(`Produit ${amm} non trouvé:`, err);
          }
        }
      }
      
      // Si recherche active, ajouter des résultats de recherche
      if (dropdownSearchText.trim().length > 0) {
        const searchResults = await PhytosanitaryProductService.searchProducts(
          dropdownSearchText,
          { authorizationState: 'AUTORISE' },
          farmId
        );
        // Limiter à 20 pour la performance
        const limitedResults = searchResults.slice(0, 20);
        
        // Fusionner sans doublons (par AMM)
        const existingAmms = new Set(products.map(p => p.amm));
        const newProducts = limitedResults.filter(p => !existingAmms.has(p.amm));
        products = [...products, ...newProducts];
      }
      
      setPhytosanitaryProducts(products);
    } catch (error) {
      console.error('Erreur lors du chargement des produits phytosanitaires:', error);
    } finally {
      setLoadingPhyto(false);
    }
  };

  // Créer les items pour le dropdown
  const dropdownItems = useMemo(() => {
    const items: UnifiedWhatItem[] = [];
    const searchLower = dropdownSearchText.toLowerCase().trim();

    // Filtrer et ajouter les cultures
    cultures.forEach(culture => {
      if (!searchLower || culture.name.toLowerCase().includes(searchLower)) {
        items.push({
          id: `culture-${culture.id}`,
          label: culture.name,
          type: 'culture',
          category: 'Cultures',
          data: culture,
        });
      }
    });

    // Filtrer et ajouter les produits phytosanitaires
    phytosanitaryProducts.forEach(product => {
      const matches = !searchLower || 
        product.name.toLowerCase().includes(searchLower) ||
        (product.secondary_names && product.secondary_names.toLowerCase().includes(searchLower));
      
      if (matches) {
        items.push({
          id: `phytosanitary-${product.amm}`,
          label: product.name,
          type: 'phytosanitary',
          category: 'Produits phytosanitaires',
          data: product,
        });
      }
    });

    // Filtrer et ajouter les matières prédéfinies
    PREDEFINED_MATERIALS.forEach(material => {
      if (!searchLower || material.label.toLowerCase().includes(searchLower)) {
        items.push({
          ...material,
          category: 'Matières',
        });
      }
    });

    // Grouper par catégorie
    const grouped: { [key: string]: UnifiedWhatItem[] } = {};
    items.forEach(item => {
      const category = item.category || 'Autres';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return { items, grouped };
  }, [cultures, phytosanitaryProducts, dropdownSearchText]);

  const handleItemSelect = (item: UnifiedWhatItem) => {
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
  useEffect(() => {
    if (selectedItem) {
      setSearchText(selectedItem.label);
    } else {
      setSearchText('');
    }
  }, [selectedItem?.id]);

  // Vérifier si on peut ajouter un nouvel item
  const canAddNew = dropdownSearchText.trim().length > 0 && 
    !dropdownItems.items.some(item => 
      item.label.toLowerCase() === dropdownSearchText.toLowerCase().trim()
    );

  const handleAddNew = () => {
    if (canAddNew && onAddNew) {
      const newItem: UnifiedWhatItem = {
        id: `custom-${Date.now()}`,
        label: dropdownSearchText.trim(),
        type: 'custom',
        category: 'Personnalisé',
      };
      onAddNew(dropdownSearchText.trim());
      handleItemSelect(newItem);
    }
  };

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {/* Label */}
      {label && (
        <Text variant="label" style={{ marginBottom: spacing.sm }}>
          {label}
          {required && <Text style={{ color: colors.semantic.error }}> *</Text>}
        </Text>
      )}

      {/* Sélecteur principal */}
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
        onPress={toggleDropdown}
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

      {/* Dropdown */}
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
          {/* Barre de recherche */}
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
                  ...Platform.select({
                    web: {
                      outline: 'none',
                      border: 'none',
                    } as any,
                  }),
                }}
                placeholder="Rechercher..."
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

          {/* Liste des éléments groupés par catégorie */}
          <ScrollView 
            style={{ 
              maxHeight: 300,
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
          >
            {loading ? (
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Text variant="body" color={colors.gray[500]}>
                  Chargement...
                </Text>
              </View>
            ) : (
              <>
                {/* Afficher les items groupés par catégorie */}
                {Object.entries(dropdownItems.grouped).map(([category, items]) => (
                  <View key={category}>
                    {/* En-tête de catégorie */}
                    <View style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: colors.gray[100],
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.primary,
                    }}>
                      <Text variant="caption" style={{ 
                        fontWeight: '600',
                        color: colors.gray[700],
                        textTransform: 'uppercase',
                      }}>
                        {category}
                      </Text>
                    </View>
                    
                    {/* Items de la catégorie */}
                    {items.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={{
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.md,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.border.secondary,
                          backgroundColor: selectedItem?.id === item.id ? colors.primary[50] : 'transparent',
                        }}
                        onPress={() => handleItemSelect(item)}
                        activeOpacity={0.7}
                      >
                        <Text variant="body" style={{
                          color: selectedItem?.id === item.id ? colors.primary[700] : colors.text.primary,
                        }}>
                          {item.label}
                        </Text>
                        {item.type === 'phytosanitary' && item.data && (
                          <Text variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
                            AMM: {item.data.amm}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                {/* Option d'ajout libre */}
                {canAddNew && onAddNew && (
                  <TouchableOpacity
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: colors.border.primary,
                      backgroundColor: colors.primary[50],
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={handleAddNew}
                    activeOpacity={0.7}
                  >
                    <PlusIcon size={16} color={colors.primary[600]} />
                    <Text variant="body" style={{ 
                      marginLeft: spacing.sm,
                      color: colors.primary[600],
                      fontWeight: '500',
                    }}>
                      Ajouter "{dropdownSearchText.trim()}"
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Message si aucun résultat */}
                {dropdownItems.items.length === 0 && !loading && !loadingPhyto && dropdownSearchText.trim().length > 0 && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text variant="body" color={colors.gray[500]}>
                      Aucun résultat trouvé
                    </Text>
                    {onAddNew && (
                      <TouchableOpacity
                        style={{
                          marginTop: spacing.md,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          backgroundColor: colors.primary[50],
                          borderRadius: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                        onPress={handleAddNew}
                      >
                        <PlusIcon size={16} color={colors.primary[600]} />
                        <Text variant="body" style={{ 
                          marginLeft: spacing.sm,
                          color: colors.primary[600],
                        }}>
                          Ajouter "{dropdownSearchText.trim()}"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Hint */}
      {hint && !error && (
        <Text variant="caption" style={{ marginTop: spacing.xs, color: colors.text.secondary }}>
          {hint}
        </Text>
      )}

      {/* Error */}
      {error && (
        <Text variant="caption" style={{ marginTop: spacing.xs, color: colors.semantic.error }}>
          {error}
        </Text>
      )}
    </View>
  );
};
