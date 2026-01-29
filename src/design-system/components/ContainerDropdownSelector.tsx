import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ViewStyle,
  Alert,
} from 'react-native';
import { Text } from './Text';
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
import { containerService } from '../../services/ContainerService';
import type { Container, ContainerType, CultureCategory } from '../../types';

export interface ContainerDropdownItem {
  id: string;
  label: string;
  container: Container;
  type: ContainerType;
  category: CultureCategory;
}

export interface ContainerDropdownSelectorProps {
  label?: string;
  placeholder?: string;
  selectedItem?: ContainerDropdownItem;
  onSelectionChange: (item: ContainerDropdownItem | null) => void;
  farmId?: number;
  categoryFilter?: CultureCategory; // Filtrer par catégorie
  typeFilter?: ContainerType; // Filtrer par type
  searchable?: boolean;
  onAddContainer?: () => void;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  style?: ViewStyle;
}

export const ContainerDropdownSelector: React.FC<ContainerDropdownSelectorProps> = ({
  label,
  placeholder = "Sélectionner un contenant...",
  selectedItem,
  onSelectionChange,
  farmId,
  categoryFilter,
  typeFilter,
  searchable = true,
  onAddContainer,
  disabled = false,
  error,
  hint,
  required = false,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState<ContainerType | 'all'>('all');
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les contenants au montage
  useEffect(() => {
    loadContainers();
  }, [farmId, categoryFilter]);

  const loadContainers = async () => {
    try {
      setLoading(true);
      let loadedContainers: Container[];
      
      if (categoryFilter) {
        loadedContainers = await containerService.getContainersByCategory(categoryFilter, farmId);
      } else {
        loadedContainers = await containerService.getContainers(farmId);
      }
      
      setContainers(loadedContainers);
    } catch (error) {
      console.error('Erreur lors du chargement des contenants:', error);
      Alert.alert('Erreur', 'Impossible de charger les contenants');
    } finally {
      setLoading(false);
    }
  };

  // Créer les items pour le dropdown
  const dropdownItems = useMemo(() => {
    let filteredContainers = containers;

    // Filtrer par type si spécifié
    if (typeFilter) {
      filteredContainers = filteredContainers.filter(c => c.type === typeFilter);
    } else if (selectedType !== 'all') {
      filteredContainers = filteredContainers.filter(c => c.type === selectedType);
    }

    // Filtrer par recherche
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filteredContainers = filteredContainers.filter(container =>
        container.name.toLowerCase().includes(search) ||
        container.description?.toLowerCase().includes(search) ||
        container.type.toLowerCase().includes(search) ||
        container.material?.toLowerCase().includes(search) ||
        container.slugs.some(slug => slug.toLowerCase().includes(search))
      );
    }

    // Convertir en items dropdown
    const items: ContainerDropdownItem[] = filteredContainers.map(container => ({
      id: `container-${container.id}`,
      label: container.name,
      container,
      type: container.type,
      category: container.category,
    }));

    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [containers, selectedType, searchText, typeFilter]);

  const handleItemSelect = (item: ContainerDropdownItem) => {
    onSelectionChange(item);
    setSearchText(item.label); // Mettre le nom dans le champ
    setIsOpen(false);
  };

  const clearSelection = () => {
    onSelectionChange(null);
    setSearchText('');
  };

  // Initialiser le champ avec l'élément sélectionné
  React.useEffect(() => {
    if (selectedItem && !searchText) {
      setSearchText(selectedItem.label);
    }
  }, [selectedItem]);

  const getTypeLabel = (type: ContainerType | 'all') => {
    const types = containerService.getContainerTypes();
    if (type === 'all') return 'Tous types';
    return types.find(t => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: ContainerType | 'all') => {
    const types = containerService.getContainerTypes();
    if (type === 'all') return '📋';
    return types.find(t => t.value === type)?.icon || '📋';
  };

  const availableTypes: (ContainerType | 'all')[] = [
    'all',
    ...Array.from(new Set(containers.map(c => c.type)))
  ];

  const formatCapacity = (container: Container) => {
    const parts = [];
    if (container.typicalCapacityKg) {
      parts.push(`${container.typicalCapacityKg}kg`);
    }
    if (container.typicalCapacityL) {
      parts.push(`${container.typicalCapacityL}L`);
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
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

      {/* Sélecteur principal avec champ éditable */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: error ? colors.border.error : isOpen ? colors.border.focus : colors.border.primary,
          borderRadius: 8,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          backgroundColor: '#FFFFFF', // ✅ Blanc pur
          minHeight: spacing.interactive?.inputHeight ?? 44,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.text.primary,
            padding: 0,
            margin: 0,
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={searchText}
          onChangeText={(text) => {
            setSearchText(text);
            if (!isOpen) setIsOpen(true); // Ouvrir le dropdown quand on tape
          }}
          onFocus={() => {
            if (!isOpen) setIsOpen(true);
          }}
          editable={!disabled}
        />
        
        {selectedItem && !disabled && (
          <TouchableOpacity
            onPress={() => {
              clearSelection();
              setSearchText('');
            }}
            style={{ marginRight: spacing.sm, padding: 2 }}
          >
            <XIcon size={16} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={() => !disabled && setIsOpen(!isOpen)}
          style={{ padding: 2 }}
        >
          {isOpen ? (
            <ChevronUpIcon size={20} color={colors.gray[500]} />
          ) : (
            <ChevronDownIcon size={20} color={colors.gray[500]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Dropdown */}
      {isOpen && (
        <View
          style={{
            backgroundColor: '#FFFFFF', // ✅ Blanc pur au lieu de colors.background.primary
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
          }}
        >
          {/* Pas de champ de recherche séparé - la recherche se fait dans le champ principal */}

          {/* Filtres par type de contenant */}
          {!typeFilter && availableTypes.length > 1 && (
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
                {availableTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: 16,
                      backgroundColor: selectedType === type
                        ? colors.primary[600]
                        : colors.gray[100],
                      borderWidth: selectedType === type ? 0 : 1,
                      borderColor: colors.border.primary,
                      gap: spacing.xs,
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>
                      {getTypeIcon(type)}
                    </Text>
                    <Text
                      variant="caption"
                      color={selectedType === type ? colors.text.inverse : colors.gray[700]}
                      weight="medium"
                    >
                      {getTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Liste des éléments */}
          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                <Text variant="body" color={colors.gray[500]}>
                  Chargement...
                </Text>
              </View>
            ) : (
              <>
                {dropdownItems.map((item) => (
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
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Icône du type */}
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>
                      {getTypeIcon(item.type)}
                    </Text>

                    <View style={{ flex: 1 }}>
                      <Text variant="body" color={colors.text.primary}>
                        {item.label}
                      </Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: spacing.sm }}>
                        {/* Type et matériau */}
                        <Text variant="caption" color={colors.text.secondary}>
                          {getTypeLabel(item.type)}
                          {item.container.material && ` • ${item.container.material}`}
                        </Text>
                        
                        {/* Capacité */}
                        {formatCapacity(item.container) && (
                          <Text variant="caption" color={colors.primary[600]} weight="medium">
                            {formatCapacity(item.container)}
                          </Text>
                        )}
                      </View>

                      {item.container.description && (
                        <Text variant="caption" color={colors.text.secondary} numberOfLines={1} style={{ marginTop: 2 }}>
                          {item.container.description}
                        </Text>
                      )}
                    </View>

                    {/* Badge catégorie */}
                    <View style={{
                      backgroundColor: item.category === 'recolte' ? colors.semantic.success + '20' : colors.semantic.warning + '20',
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: 12,
                      marginLeft: spacing.md,
                    }}>
                      <Text
                        variant="caption"
                        color={item.category === 'recolte' ? colors.semantic.success : colors.semantic.warning}
                        weight="medium"
                      >
                        {item.category === 'recolte' ? 'Récolte' : 'Intrant'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* Message si aucun résultat + bouton d'ajout */}
                {dropdownItems.length === 0 && (
                  <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                    <Text variant="body" color={colors.gray[500]} align="center">
                      Aucun contenant trouvé
                    </Text>
                    {searchText.trim() && (
                      <>
                        <Text variant="caption" color={colors.gray[400]} align="center" style={{ marginTop: spacing.xs }}>
                          Essayez de modifier votre recherche
                        </Text>
                        {onAddContainer && (
                          <TouchableOpacity
                            onPress={() => {
                              onAddContainer();
                              setIsOpen(false);
                            }}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              marginTop: spacing.md,
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                              borderRadius: 999,
                              backgroundColor: colors.primary[50],
                              borderWidth: 1,
                              borderColor: colors.primary[200],
                            }}
                            activeOpacity={0.8}
                          >
                            <PlusIcon size={16} color={colors.primary[700]} />
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
              </>
            )}

            {/* Bouton d'ajout */}
            {onAddContainer && (
              <View style={{
                borderTopWidth: 1,
                borderTopColor: colors.border.primary,
                backgroundColor: colors.primary[50],
              }}>
                <TouchableOpacity
                  onPress={() => {
                    onAddContainer();
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
                    Ajouter un nouveau contenant
                  </Text>
                </TouchableOpacity>
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

