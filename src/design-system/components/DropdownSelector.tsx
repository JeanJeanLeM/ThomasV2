import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors } from '../colors';
import { spacing } from '../spacing';
import { textStyles } from '../typography';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
  XIcon,
  PlusIcon,
} from '../icons';

export interface DropdownItem {
  id: string;
  label: string;
  type?: string;
  category?: string;
  description?: string;
  color?: string;
}

export interface DropdownSelectorProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedItems?: DropdownItem[];
  onSelectionChange: (selectedItems: DropdownItem[]) => void;
  multiSelect?: boolean;
  searchable?: boolean;
  /**
   * Quand true, la recherche se fait directement dans le champ principal
   * (type combobox) au lieu d'une ligne de recherche séparée dans la liste.
   */
  inlineSearch?: boolean;
  filterable?: boolean;
  categories?: string[];
  /**
   * Callback d'ajout d'un nouvel élément. Si utilisé avec la recherche,
   * le label saisi est passé en argument pour permettre de le créer.
   */
  onAddNew?: (label?: string) => void;
  addNewLabel?: string;
  maxHeight?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: ViewStyle;
  dropdownStyle?: ViewStyle;
}

export const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  label,
  placeholder = "Sélectionner...",
  items = [],
  selectedItems = [],
  onSelectionChange,
  multiSelect = false,
  searchable = true,
  inlineSearch = false,
  filterable = true,
  categories = [],
  onAddNew,
  addNewLabel = "Ajouter un élément",
  maxHeight = 300,
  disabled = false,
  error,
  hint,
  required = false,
  style,
  dropdownStyle,
}) => {
  // Sécuriser les props pour éviter les erreurs runtime
  const itemsArray = Array.isArray(items) ? items : [];
  const categoriesArray = Array.isArray(categories) ? categories : [];

  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredItems, setFilteredItems] = useState<DropdownItem[]>(itemsArray);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  // Filtrer les éléments selon la recherche et la catégorie
  useEffect(() => {
    let filtered = itemsArray;

    // Filtrage par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category === selectedCategory || item.type === selectedCategory
      );
    }

    // Filtrage par recherche
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(item =>
        item.label.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search) ||
        item.type?.toLowerCase().includes(search)
      );
    }

    setFilteredItems(filtered);
  }, [itemsArray, searchText, selectedCategory]);

  // Animation d'ouverture/fermeture
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleItemSelect = (item: DropdownItem) => {
    if (multiSelect) {
      const isSelected = selectedItems.some(selected => selected.id === item.id);
      let newSelection: DropdownItem[];

      if (isSelected) {
        newSelection = selectedItems.filter(selected => selected.id !== item.id);
      } else {
        newSelection = [...selectedItems, item];
      }

      onSelectionChange(newSelection);
    } else {
      onSelectionChange([item]);
      setIsOpen(false);
      setSearchText('');
    }
  };

  const removeSelectedItem = (itemId: string) => {
    const newSelection = selectedItems.filter(item => item.id !== itemId);
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange([]);
    setSearchText('');
  };

  const isItemSelected = (item: DropdownItem) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  // Obtenir les catégories uniques des items
  const availableCategories: string[] = [
    'all',
    ...Array.from(
      new Set([
        ...itemsArray
          .map((item) => item.category)
          .filter((c): c is string => Boolean(c)),
        ...itemsArray
          .map((item) => item.type)
          .filter((t): t is string => Boolean(t)),
      ]),
    ),
  ];
  const displayCategories: string[] =
    categoriesArray.length > 0 ? ['all', ...categoriesArray] : availableCategories;

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'all': return 'Toutes les catégories';
      case 'production': return 'Production';
      case 'marketing': return 'Marketing';
      case 'commercialisation': return 'Commercialisation';
      case 'administrative': return 'Administrative';
      // Catégories de cultures
      case 'legumes_feuilles': return 'Légumes feuilles';
      case 'legumes_fruits': return 'Légumes fruits';
      case 'legumes_racines': return 'Légumes racines';
      case 'aromates': return 'Aromates';
      // Catégories de matériel
      case 'tracteurs': return 'Tracteurs';
      case 'outils_tracteur': return 'Outils tracteur';
      case 'outils_manuels': return 'Outils manuels';
      case 'petit_equipement': return 'Petit équipement';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'production': return colors.primary[600];
      case 'marketing': return colors.secondary.blue;
      case 'commercialisation': return colors.secondary.orange;
      case 'administrative': return colors.secondary.purple;
      default: return colors.gray[600];
    }
  };

  const getDisplayText = () => {
    if (selectedItems.length === 0) return placeholder;
    if (selectedItems.length === 1) return selectedItems[0]?.label ?? placeholder;
    return `${selectedItems.length} élément${selectedItems.length > 1 ? 's' : ''} sélectionné${selectedItems.length > 1 ? 's' : ''}`;
  };

  const containerStyle: ViewStyle = {
    marginBottom: spacing.md,
    ...(style ? (style as ViewStyle) : {}),
  };

  return (
    <View style={containerStyle}>
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
          // Éviter les effets de superposition
          overflow: 'hidden',
          // Transition douce pour les changements d'état
          transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          // Ombre subtile au focus pour améliorer la visibilité
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
          // Si le dropdown est déjà ouvert, ne rien faire (la flèche gère la fermeture)
          if (isOpen) return;
          // Sinon, ouvrir le dropdown
          if (inlineSearch) {
            setIsOpen(true);
          } else {
            toggleDropdown();
          }
        }}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          {inlineSearch && isOpen ? (
            <TextInput
              style={{
                ...textStyles.input,
                paddingVertical: 0,
                color: colors.text.primary,
                borderWidth: 0,
                outline: 'none',
                boxShadow: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
              } as any}
              placeholder={placeholder}
              placeholderTextColor={colors.text.tertiary}
              value={searchText}
              onChangeText={(text) => setSearchText(text ?? '')}
              editable={!disabled}
              onFocus={() => {
                if (!isOpen) {
                  setIsOpen(true);
                }
              }}
            />
          ) : (
            <Text
              variant="body"
              color={selectedItems.length === 0 ? colors.text.tertiary : colors.text.primary}
              numberOfLines={1}
            >
              {getDisplayText()}
            </Text>
          )}
        </View>
        
        {selectedItems.length > 0 && !disabled && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            style={{ marginRight: spacing.sm, padding: 2 }}
          >
            <XIcon size={16} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            if (disabled) return;
            if (isOpen) {
              setIsOpen(false);
            } else {
              if (inlineSearch) {
                setIsOpen(true);
              } else {
                toggleDropdown();
              }
            }
          }}
          style={{ padding: 2 }}
        >
          {isOpen ? (
            <ChevronUpIcon size={20} color={colors.gray[500]} />
          ) : (
            <ChevronDownIcon size={20} color={colors.gray[500]} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Éléments sélectionnés (mode multi-select) */}
      {multiSelect && selectedItems.length > 0 && (
        <View style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginTop: spacing.sm,
        }}>
          {selectedItems.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.primary[100],
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: 16,
                gap: 4,
              }}
            >
              <Text variant="caption" color={colors.primary[700]} weight="medium">
                {item.label}
              </Text>
              <TouchableOpacity
                onPress={() => removeSelectedItem(item.id)}
                style={{ padding: 2 }}
              >
                <XIcon size={12} color={colors.primary[600]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Dropdown animé */}
      <Animated.View
        style={{
          opacity: animatedHeight,
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, maxHeight + 100], // +100 pour les filtres
          }),
          overflow: 'hidden',
        }}
      >
        {isOpen && (
          <View
            style={[
              {
                backgroundColor: colors.background.secondary,
                borderWidth: 1,
                borderColor: colors.border.primary,
                borderRadius: 8,
                marginTop: spacing.xs,
                shadowColor: colors.gray[900],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 8,
              },
              dropdownStyle,
            ]}
          >
            {/* Champ de recherche */}
            {searchable && !inlineSearch && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderBottomColor: colors.border.primary,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}>
                <SearchIcon size={16} color={colors.gray[500]} />
                <TextInput
                  style={[
                    textStyles.input,
                    {
                      flex: 1,
                      marginLeft: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderWidth: 0,
                      outline: 'none',
                      boxShadow: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none',
                    } as any
                  ]}
                
                  placeholder={`Rechercher...`}
                  placeholderTextColor={colors.text.tertiary}
                  value={searchText}
                  onChangeText={(text) => setSearchText(text ?? '')}
                  autoFocus={false}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchText('')}
                    style={{ padding: spacing.xs }}
                  >
                    <XIcon size={16} color={colors.gray[500]} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Filtres par catégorie */}
            {filterable && displayCategories.length > 1 && (
              <View style={{
                padding: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.border.primary,
              }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing.sm }}
                >
                  {displayCategories.map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setSelectedCategory(category)}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: 16,
                        backgroundColor: selectedCategory === category
                          ? colors.primary[600]
                          : colors.gray[100],
                        borderWidth: selectedCategory === category ? 0 : 1,
                        borderColor: colors.border.primary,
                      }}
                    >
                      <Text
                        variant="caption"
                        color={selectedCategory === category ? colors.text.inverse : colors.gray[700]}
                        weight="medium"
                      >
                        {getCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Liste des éléments */}
            <ScrollView
              style={{ maxHeight }}
              showsVerticalScrollIndicator={false}
            >
              {filteredItems.map((item) => {
                const selected = isItemSelected(item);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleItemSelect(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border.primary,
                      backgroundColor: selected ? colors.primary[100] : 'transparent',
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Contenu de l'élément - Affichage simplifié */}
                    <Text
                      variant="body"
                      color={selected ? colors.primary[700] : colors.text.primary}
                      weight={selected ? 'semibold' : 'normal'}
                      style={{ flex: 1 }}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Bouton d'ajout générique */}
              {onAddNew && !inlineSearch && (
                <TouchableOpacity
                  onPress={() => {
                    onAddNew();
                    setIsOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    backgroundColor: colors.primary[50],
                    borderTopWidth: 1,
                    borderTopColor: colors.border.primary,
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
                    {addNewLabel}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Message si aucun résultat + ajout rapide basé sur la recherche */}
              {filteredItems.length === 0 && (
                <View
                  style={{
                    padding: spacing.lg,
                    alignItems: 'center',
                    gap: spacing.sm,
                  }}
                >
                  <Text variant="body" color={colors.gray[500]} align="center">
                    Aucun élément trouvé
                  </Text>
                  {searchText.trim() && (
                    <>
                      <Text
                        variant="caption"
                        color={colors.gray[400]}
                        align="center"
                      >
                        Essayez de modifier votre recherche
                      </Text>
                      {onAddNew && (
                        <TouchableOpacity
                          onPress={() => {
                            const label = searchText.trim();
                            onAddNew(label);
                            setIsOpen(false);
                            setSearchText('');
                          }}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: spacing.xs,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            borderRadius: 999,
                            backgroundColor: colors.primary[50],
                          }}
                          activeOpacity={0.8}
                        >
                          <PlusIcon size={14} color={colors.primary[700]} />
                          <Text
                            variant="body"
                            style={{ marginLeft: spacing.xs }}
                            color={colors.primary[700]}
                            weight="semibold"
                          >
                            Ajouter "{searchText.trim()}"
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Animated.View>

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
