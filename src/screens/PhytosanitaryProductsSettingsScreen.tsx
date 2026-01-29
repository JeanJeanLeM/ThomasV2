import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon,
  TrashIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon
} from '../design-system/icons';
import { Text, Button, Input, Modal, DropdownSelector, Switch } from '../design-system/components';
import type { DropdownItem } from '../design-system/components/DropdownSelector';
import { PhytosanitaryProductService } from '../services/PhytosanitaryProductService';
import { UserPhytosanitaryPreferencesService } from '../services/UserPhytosanitaryPreferencesService';
import { FarmDataCacheService } from '../services/FarmDataCacheService';
import { showAlert, showError } from '../utils/webAlert';
import type { PhytosanitaryProduct, PhytosanitaryUsage, UserPhytosanitaryPreferences } from '../types';

interface PhytosanitaryProductsSettingsScreenProps {
  onTitleChange?: (title: string | null) => void;
  onBack?: () => void;
}

export default function PhytosanitaryProductsSettingsScreen({ 
  onTitleChange, 
  onBack 
}: PhytosanitaryProductsSettingsScreenProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  
  const [preferences, setPreferences] = useState<UserPhytosanitaryPreferences | null>(null);
  const [userProducts, setUserProducts] = useState<PhytosanitaryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtres
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [selectedCultures, setSelectedCultures] = useState<string[]>([]);
  const [availableCultures, setAvailableCultures] = useState<string[]>([]);
  const [selectedPests, setSelectedPests] = useState<string[]>([]);
  const [availablePests, setAvailablePests] = useState<string[]>([]);
  const [isOrganicFilter, setIsOrganicFilter] = useState(false);
  
  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PhytosanitaryProduct[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Affichage de tous les produits filtrés
  const [showAllFilteredProducts, setShowAllFilteredProducts] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<PhytosanitaryProduct[]>([]);
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);
  const [displayedFilteredCount, setDisplayedFilteredCount] = useState(10);
  const [isLoadingFiltered, setIsLoadingFiltered] = useState(false);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<PhytosanitaryProduct | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [productUsages, setProductUsages] = useState<PhytosanitaryUsage[]>([]);
  const [isLoadingUsages, setIsLoadingUsages] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Charger les préférences et produits
  useEffect(() => {
    if (onTitleChange) {
      onTitleChange('Produits phytosanitaires');
    }
    loadData();
    loadAvailableFunctions();
    loadAvailableCultures();
    loadAvailablePests();
  }, [activeFarm?.farm_id, user?.id]);

  const loadData = async () => {
    if (!activeFarm?.farm_id || !user?.id) return;

    setIsLoading(true);
    try {
      // Charger depuis le cache d'abord
      const cachedPrefs = await FarmDataCacheService.getCachedUserPhytoPreferences(user.id, activeFarm.farm_id);
      
      if (cachedPrefs) {
        setPreferences(cachedPrefs);
        setSelectedFunctions(cachedPrefs.function_filter || []);
        setSelectedCultures(cachedPrefs.culture_filter || []);
        setSelectedPests(cachedPrefs.pest_filter || []);
        await loadUserProducts(cachedPrefs);
      } else {
        // Charger depuis la DB
        const prefs = await UserPhytosanitaryPreferencesService.getUserPreferences(user.id, activeFarm.farm_id);
        if (prefs) {
          setPreferences(prefs);
          setSelectedFunctions(prefs.function_filter || []);
          setSelectedCultures(prefs.culture_filter || []);
          setSelectedPests(prefs.pest_filter || []);
          await loadUserProducts(prefs);
          // Sauvegarder en cache
          await FarmDataCacheService.saveUserPhytoPreferences(user.id, activeFarm.farm_id, prefs);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      showError('Erreur', 'Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProducts = async (prefs: UserPhytosanitaryPreferences) => {
    if (!activeFarm?.farm_id || !user?.id) return;
    
    try {
      const products = await UserPhytosanitaryPreferencesService.getUserProducts(user.id, activeFarm.farm_id);
      setUserProducts(products);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    }
  };

  const loadAvailableFunctions = async () => {
    try {
      const functions = await PhytosanitaryProductService.getAvailableFunctions();
      setAvailableFunctions(functions);
    } catch (error) {
      console.error('Erreur lors du chargement des fonctions:', error);
    }
  };

  const loadAvailableCultures = async () => {
    try {
      const cultures = await PhytosanitaryProductService.getAvailableCultures();
      setAvailableCultures(cultures);
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error);
    }
  };

  const loadAvailablePests = async () => {
    try {
      const pests = await PhytosanitaryProductService.getAvailablePests();
      setAvailablePests(pests);
    } catch (error) {
      console.error('Erreur lors du chargement des ravageurs:', error);
    }
  };

  const handleFunctionsChange = async (items: DropdownItem[]) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    const newFunctions = items.map(item => item.label);
    setSelectedFunctions(newFunctions);

    // Sauvegarder les filtres
    await UserPhytosanitaryPreferencesService.updateFilters(user.id, activeFarm.farm_id, {
      function_filter: newFunctions
    });
    
    // Invalider le cache
    await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
  };

  const handleCulturesChange = async (items: DropdownItem[]) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    const newCultures = items.map(item => item.label);
    setSelectedCultures(newCultures);

    // Sauvegarder les filtres
    await UserPhytosanitaryPreferencesService.updateFilters(user.id, activeFarm.farm_id, {
      culture_filter: newCultures
    });
    
    // Invalider le cache
    await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
  };

  const handlePestsChange = async (items: DropdownItem[]) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    const newPests = items.map(item => item.label);
    setSelectedPests(newPests);

    // Sauvegarder les filtres
    await UserPhytosanitaryPreferencesService.updateFilters(user.id, activeFarm.farm_id, {
      pest_filter: newPests
    });
    
    // Invalider le cache
    await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await PhytosanitaryProductService.searchProducts(
        query,
        { 
          functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
          cultures: selectedCultures.length > 0 ? selectedCultures : undefined,
          pests: selectedPests.length > 0 ? selectedPests : undefined,
          organic: isOrganicFilter || undefined,
        },
        activeFarm?.farm_id
      );
      
      // Filtrer les produits déjà dans la liste
      const currentAmms = preferences?.product_amms || [];
      const filtered = results.filter(p => !currentAmms.includes(p.amm));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchProducts = async (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.trim().length > 0);
    await performSearch(query);
  };

  // Relancer la recherche quand les filtres changent
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      performSearch(searchQuery);
    }
    // Réinitialiser l'affichage des produits filtrés quand les filtres changent
    if (showAllFilteredProducts) {
      setShowAllFilteredProducts(false);
      setFilteredProducts([]);
      setDisplayedFilteredCount(10);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunctions, selectedCultures, selectedPests, isOrganicFilter]);

  // Charger le nombre total de produits selon les filtres
  useEffect(() => {
    const loadFilteredCount = async () => {
      if (!activeFarm?.farm_id) return;
      
      const hasFilters = selectedFunctions.length > 0 || selectedCultures.length > 0 || selectedPests.length > 0 || isOrganicFilter;
      if (!hasFilters) {
        setTotalFilteredCount(0);
        return;
      }

      try {
        const count = await PhytosanitaryProductService.countProductsByFilters(
          {
            functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
            cultures: selectedCultures.length > 0 ? selectedCultures : undefined,
            pests: selectedPests.length > 0 ? selectedPests : undefined,
            organic: isOrganicFilter || undefined,
          },
          activeFarm.farm_id
        );
        setTotalFilteredCount(count);
      } catch (error) {
        console.error('Erreur lors du comptage:', error);
        setTotalFilteredCount(0);
      }
    };

    loadFilteredCount();
  }, [selectedFunctions, selectedCultures, selectedPests, isOrganicFilter, activeFarm?.farm_id]);

  const loadFilteredProducts = async (limit: number = 10) => {
    if (!activeFarm?.farm_id) return;

    setIsLoadingFiltered(true);
    try {
      const products = await PhytosanitaryProductService.searchProducts(
        '', // Pas de recherche textuelle, seulement les filtres
        {
          functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
          cultures: selectedCultures.length > 0 ? selectedCultures : undefined,
          pests: selectedPests.length > 0 ? selectedPests : undefined,
          organic: isOrganicFilter || undefined,
        },
        activeFarm.farm_id
      );

      // Filtrer les produits déjà dans la liste utilisateur
      const currentAmms = preferences?.product_amms || [];
      const filtered = products.filter(p => !currentAmms.includes(p.amm));
      
      setFilteredProducts(filtered);
      setDisplayedFilteredCount(Math.min(limit, filtered.length));
    } catch (error) {
      console.error('Erreur lors du chargement des produits filtrés:', error);
    } finally {
      setIsLoadingFiltered(false);
    }
  };

  const handleShowAllFilteredProducts = async () => {
    setShowAllFilteredProducts(true);
    await loadFilteredProducts(10);
  };

  const handleLoadMoreFiltered = async () => {
    const newCount = displayedFilteredCount + 10;
    setDisplayedFilteredCount(Math.min(newCount, filteredProducts.length));
  };

  const handleAddProduct = async (amm: string) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    // Trouver le produit dans les résultats de recherche ou les produits filtrés
    const productToAdd = searchResults.find(p => p.amm === amm) || 
                         filteredProducts.find(p => p.amm === amm);
    if (!productToAdd) return;

    // Mise à jour optimiste : ajouter immédiatement à l'interface
    const previousProducts = [...userProducts];
    const previousPreferences = preferences;
    
    setUserProducts(prev => [...prev, productToAdd]);
    setSearchResults(prev => prev.filter(p => p.amm !== amm));
    setFilteredProducts(prev => prev.filter(p => p.amm !== amm));
    
    // Mettre à jour les préférences localement
    if (preferences) {
      setPreferences({
        ...preferences,
        product_amms: [...preferences.product_amms, amm]
      });
    }

    // Synchroniser avec la DB en arrière-plan
    try {
      const success = await UserPhytosanitaryPreferencesService.addProductToUserList(
        user.id,
        activeFarm.farm_id,
        amm
      );
      
      if (!success) {
        // En cas d'échec, restaurer l'état précédent
        setUserProducts(previousProducts);
        setSearchResults(prev => [...prev, productToAdd]);
        if (previousPreferences) {
          setPreferences(previousPreferences);
        }
        showError('Erreur', 'Impossible d\'ajouter le produit');
      } else {
        // Invalider le cache pour la prochaine synchronisation
        await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      // Restaurer l'état précédent en cas d'erreur
      setUserProducts(previousProducts);
      setSearchResults(prev => [...prev, productToAdd]);
      if (previousPreferences) {
        setPreferences(previousPreferences);
      }
      showError('Erreur', 'Impossible d\'ajouter le produit');
    }
  };

  const handleRemoveProduct = async (product: PhytosanitaryProduct) => {
    console.log('🗑️ [DELETE] handleRemoveProduct appelé', {
      productName: product.name,
      productAmm: product.amm,
      isCustom: product.is_custom,
      hasActiveFarm: !!activeFarm?.farm_id,
      hasUser: !!user?.id,
    });

    if (!activeFarm?.farm_id || !user?.id) {
      console.log('❌ [DELETE] Conditions non remplies - activeFarm ou user manquant');
      return;
    }

    const isCustom = product.is_custom;
    const message = isCustom
      ? 'Êtes-vous sûr de vouloir supprimer définitivement ce produit personnalisé ?'
      : 'Êtes-vous sûr de vouloir retirer ce produit de votre liste ?';

    console.log('📋 [DELETE] Affichage de l\'alerte de confirmation');
    showAlert(
      'Supprimer le produit',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            console.log('✅ [DELETE] Utilisateur a confirmé la suppression');
            
            // Sauvegarder l'état précédent pour rollback en cas d'erreur
            const previousProducts = [...userProducts];
            const previousPreferences = preferences;

            console.log('🔄 [DELETE] Mise à jour optimiste de l\'UI');
            // Mise à jour optimiste : retirer immédiatement de l'interface
            setUserProducts(prev => {
              const filtered = prev.filter(p => p.amm !== product.amm);
              console.log('📊 [DELETE] Produits avant:', prev.length, 'après:', filtered.length);
              return filtered;
            });
            
            // Mettre à jour les préférences localement
            if (preferences) {
              const newProductAmm = preferences.product_amms.filter(a => a !== product.amm);
              console.log('📊 [DELETE] AMMs avant:', preferences.product_amms.length, 'après:', newProductAmm.length);
              setPreferences({
                ...preferences,
                product_amms: newProductAmm
              });
            }

            // Synchroniser avec la DB en arrière-plan
            try {
              console.log('💾 [DELETE] Début de la synchronisation avec la DB');
              let success = false;

              if (isCustom) {
                console.log('🗑️ [DELETE] Suppression d\'un produit personnalisé');
                // Supprimer le produit personnalisé de la base de données
                success = await PhytosanitaryProductService.deleteCustomProduct(
                  product.amm,
                  activeFarm.farm_id
                );
                console.log('📊 [DELETE] Résultat deleteCustomProduct:', success);
                
                if (success) {
                  // Retirer aussi de la liste utilisateur
                  success = await UserPhytosanitaryPreferencesService.removeProductFromUserList(
                    user.id,
                    activeFarm.farm_id,
                    product.amm
                  );
                  console.log('📊 [DELETE] Résultat removeProductFromUserList:', success);
                }
              } else {
                console.log('📋 [DELETE] Retrait d\'un produit de la liste utilisateur');
                // Retirer seulement de la liste utilisateur
                success = await UserPhytosanitaryPreferencesService.removeProductFromUserList(
                  user.id,
                  activeFarm.farm_id,
                  product.amm
                );
                console.log('📊 [DELETE] Résultat removeProductFromUserList:', success);
              }
              
              if (!success) {
                console.error('❌ [DELETE] Échec de la suppression - rollback');
                // En cas d'échec, restaurer l'état précédent
                setUserProducts(previousProducts);
                if (previousPreferences) {
                  setPreferences(previousPreferences);
                }
                showError('Erreur', 'Impossible de supprimer le produit');
              } else {
                console.log('✅ [DELETE] Suppression réussie - invalidation du cache');
                // Invalider le cache pour la prochaine synchronisation
                await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
              }
            } catch (error) {
              console.error('❌ [DELETE] Erreur lors de la suppression:', error);
              // Restaurer l'état précédent en cas d'erreur
              setUserProducts(previousProducts);
              if (previousPreferences) {
                setPreferences(previousPreferences);
              }
              showError('Erreur', 'Impossible de supprimer le produit');
            }
          },
        },
      ]
    );
  };

  const handleCreateCustomProduct = async () => {
    if (!activeFarm?.farm_id || !user?.id || !newProductName.trim()) return;

    const productName = newProductName.trim();
    
    // Créer un produit temporaire pour l'affichage immédiat
    const tempProduct: PhytosanitaryProduct = {
      amm: `TEMP-${Date.now()}`,
      name: productName,
      is_custom: true,
      farm_id: activeFarm.farm_id,
      authorization_state: 'NON_AUTORISE',
      functions: 'Produit personnalisé',
      holder: 'Utilisateur',
    };

    // Mise à jour optimiste : ajouter immédiatement à l'interface
    const previousProducts = [...userProducts];
    const previousPreferences = preferences;
    
    setUserProducts(prev => [...prev, tempProduct]);
    
    // Mettre à jour les préférences localement (avec AMM temporaire)
    if (preferences) {
      setPreferences({
        ...preferences,
        product_amms: [...preferences.product_amms, tempProduct.amm]
      });
    }

    setShowCreateModal(false);
    setNewProductName('');

    // Créer le produit dans la DB en arrière-plan
    try {
      const product = await PhytosanitaryProductService.createCustomProduct({
        name: productName,
        farmId: activeFarm.farm_id,
        userId: user.id
      });

      if (product) {
        // Remplacer le produit temporaire par le vrai produit
        setUserProducts(prev => prev.map(p => 
          p.amm === tempProduct.amm ? product : p
        ));
        
        // Mettre à jour les préférences avec le vrai AMM
        if (preferences) {
          setPreferences({
            ...preferences,
            product_amms: preferences.product_amms.map(a => 
              a === tempProduct.amm ? product.amm : a
            )
          });
        }

        // Ajouter à la liste utilisateur dans la DB
        await UserPhytosanitaryPreferencesService.addProductToUserList(
          user.id,
          activeFarm.farm_id,
          product.amm
        );
        
        // Invalider le cache
        await FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
      } else {
        // En cas d'échec, restaurer l'état précédent
        setUserProducts(previousProducts);
        if (previousPreferences) {
          setPreferences(previousPreferences);
        }
        showError('Erreur', 'Impossible de créer le produit');
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      // Restaurer l'état précédent en cas d'erreur
      setUserProducts(previousProducts);
      if (previousPreferences) {
        setPreferences(previousPreferences);
      }
      showError('Erreur', 'Impossible de créer le produit');
    }
  };

  // Helper pour obtenir l'état d'usage et sa couleur
  const getUsageState = (usageState?: string) => {
    if (!usageState) {
      return { label: 'NON SPÉCIFIÉ', color: colors.text.secondary, bgColor: colors.gray[200] };
    }
    
    const state = usageState.toUpperCase();
    
    if (state.includes('AUTORISE') || state === 'AUTORISE') {
      return { label: 'AUTORISÉ', color: colors.semantic.success, bgColor: colors.semantic.success + '20' };
    }
    
    if (state.includes('RETIRE') || state.includes('RETRAIT')) {
      return { label: 'RETIRÉ', color: colors.semantic.error, bgColor: colors.semantic.error + '20' };
    }
    
    // Par défaut
    return { label: usageState, color: colors.text.secondary, bgColor: colors.gray[200] };
  };

  const handleShowDetails = async (product: PhytosanitaryProduct) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
    setShowAllDetails(false);
    
    // Charger les usages si ce n'est pas un produit personnalisé
    if (!product.is_custom) {
      setIsLoadingUsages(true);
      try {
        const usages = await PhytosanitaryProductService.getProductUsages(product.amm);
        setProductUsages(usages);
      } catch (error) {
        console.error('Erreur lors du chargement des usages:', error);
        setProductUsages([]);
      } finally {
        setIsLoadingUsages(false);
      }
    } else {
      setProductUsages([]);
    }
  };

  if (isLoading && !preferences) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Attribution E-Phy */}
        <View style={styles.attributionBanner}>
          <InformationCircleIcon color={colors.primary[600]} size={20} />
          <Text variant="caption" style={styles.attributionText}>
            Données E-Phy - Anses (mise à jour 2026-01-22)
          </Text>
        </View>

        {/* Filtres */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            Filtres
          </Text>
          
          {/* Filtre par fonction */}
          <View style={styles.filterDropdown}>
            <DropdownSelector
              label="Fonction"
              placeholder="Sélectionner des fonctions..."
              items={availableFunctions.map(func => ({
                id: func,
                label: func,
              }))}
              selectedItems={selectedFunctions.map(func => ({
                id: func,
                label: func,
              }))}
              onSelectionChange={handleFunctionsChange}
              multiSelect={true}
              searchable={true}
              inlineSearch={true}
            />
          </View>

          {/* Filtre par culture */}
          <View style={styles.filterDropdown}>
            <DropdownSelector
              label="Culture"
              placeholder="Sélectionner des cultures..."
              items={availableCultures.map(culture => ({
                id: culture,
                label: culture,
              }))}
              selectedItems={selectedCultures.map(culture => ({
                id: culture,
                label: culture,
              }))}
              onSelectionChange={handleCulturesChange}
              multiSelect={true}
              searchable={true}
              inlineSearch={true}
            />
          </View>

          {/* Filtre par ravageur */}
          <View style={styles.filterDropdown}>
            <DropdownSelector
              label="Ravageur / Bioagresseur"
              placeholder="Sélectionner des ravageurs..."
              items={availablePests.map(pest => ({
                id: pest,
                label: pest,
              }))}
              selectedItems={selectedPests.map(pest => ({
                id: pest,
                label: pest,
              }))}
              onSelectionChange={handlePestsChange}
              multiSelect={true}
              searchable={true}
              inlineSearch={true}
            />
          </View>

          {/* Filtre Agriculture Biologique */}
          <View style={styles.organicFilterContainer}>
            <View style={styles.organicFilterLabel}>
              <Text variant="body" style={styles.organicFilterText}>
                Agriculture Biologique
              </Text>
              <Text variant="caption" style={styles.organicFilterHint}>
                Produits autorisés en agriculture biologique
              </Text>
            </View>
            <Switch
              value={isOrganicFilter}
              onValueChange={(value) => {
                setIsOrganicFilter(value);
                // Invalider le cache quand le filtre change
                if (activeFarm?.farm_id && user?.id) {
                  FarmDataCacheService.invalidateUserPhytoPreferences(user.id, activeFarm.farm_id);
                }
              }}
            />
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            Rechercher un produit
          </Text>
          <Input
            placeholder="Nom du produit, substance active..."
            value={searchQuery}
            onChangeText={handleSearchProducts}
            icon={<SearchIcon color={colors.gray[400]} size={20} />}
            style={styles.searchInput}
          />
          
          {showSearchResults && (
            <View style={styles.searchResultsContainer}>
              {isSearching ? (
                <ActivityIndicator size="small" color={colors.primary[600]} />
              ) : searchResults.length > 0 ? (
                <ScrollView style={styles.searchResultsList} nestedScrollEnabled>
                  {searchResults.map((product) => (
                    <TouchableOpacity
                      key={product.amm}
                      style={styles.searchResultItem}
                      onPress={() => handleAddProduct(product.amm)}
                    >
                      <View style={styles.productInfo}>
                        <Text variant="body" style={styles.productName}>
                          {product.name}
                        </Text>
                        <Text variant="caption" style={styles.productMeta}>
                          {product.functions} • {product.holder}
                        </Text>
                      </View>
                      <PlusIcon color={colors.primary[600]} size={20} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptySearch}>
                  <Text variant="body" style={styles.emptyText}>
                    Aucun produit trouvé. Voulez-vous créer "{searchQuery}" ?
                  </Text>
                  <Button
                    variant="secondary"
                    size="small"
                    onPress={() => {
                      setNewProductName(searchQuery);
                      setShowCreateModal(true);
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                  >
                    Créer ce produit
                  </Button>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Bouton afficher tous les produits filtrés */}
        {(selectedFunctions.length > 0 || selectedCultures.length > 0 || selectedPests.length > 0 || isOrganicFilter) && totalFilteredCount > 0 && (
          <View style={styles.section}>
            {!showAllFilteredProducts ? (
              <TouchableOpacity
                style={styles.showAllButton}
                onPress={handleShowAllFilteredProducts}
                disabled={isLoadingFiltered}
              >
                <Text style={styles.showAllButtonText}>
                  Afficher {totalFilteredCount} produit{totalFilteredCount > 1 ? 's' : ''}
                </Text>
                {isLoadingFiltered ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} style={{ marginLeft: spacing.sm }} />
                ) : (
                  <ChevronDownIcon size={20} color={colors.primary[600]} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.filteredProductsContainer}>
                <View style={styles.filteredProductsHeader}>
                  <Text variant="h4" style={styles.filteredProductsTitle}>
                    {totalFilteredCount} produit{totalFilteredCount > 1 ? 's' : ''} trouvé{totalFilteredCount > 1 ? 's' : ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowAllFilteredProducts(false);
                      setFilteredProducts([]);
                      setDisplayedFilteredCount(10);
                    }}
                  >
                    <Text style={styles.closeButtonText}>Fermer</Text>
                  </TouchableOpacity>
                </View>

                {isLoadingFiltered ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} style={styles.loadingFiltered} />
                ) : filteredProducts.length > 0 ? (
                  <>
                    <View style={styles.filteredProductsList}>
                    {filteredProducts.slice(0, displayedFilteredCount).map((product) => (
                      <TouchableOpacity
                        key={product.amm}
                        style={styles.filteredProductItem}
                        onPress={() => handleAddProduct(product.amm)}
                      >
                        <View style={styles.productInfo}>
                          <Text variant="body" style={styles.productName}>
                            {product.name}
                          </Text>
                          <Text variant="caption" style={styles.productMeta}>
                            {product.functions} • {product.holder}
                          </Text>
                          {product.active_substances && (
                            <Text variant="caption" style={styles.productSubstances} numberOfLines={1}>
                              {product.active_substances.substring(0, 80)}...
                            </Text>
                          )}
                        </View>
                        <PlusIcon color={colors.primary[600]} size={20} />
                      </TouchableOpacity>
                    ))}
                    </View>

                    {displayedFilteredCount < filteredProducts.length && (
                      <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={handleLoadMoreFiltered}
                      >
                        <Text style={styles.loadMoreButtonText}>
                          Afficher {Math.min(10, filteredProducts.length - displayedFilteredCount)} de plus
                        </Text>
                        <ChevronDownIcon size={20} color={colors.primary[600]} />
                      </TouchableOpacity>
                    )}

                    {displayedFilteredCount >= filteredProducts.length && filteredProducts.length > 0 && (
                      <Text style={styles.allProductsShown}>
                        Tous les produits sont affichés ({filteredProducts.length}/{totalFilteredCount})
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.noFilteredProducts}>Aucun produit trouvé avec ces filtres</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Liste des produits utilisateur */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3" style={styles.sectionTitle}>
              Mes produits ({userProducts.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCreateModal(true)}
            >
              <PlusIcon color={colors.text.inverse} size={20} />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {userProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="body" style={styles.emptyStateText}>
                Aucun produit dans votre liste. Recherchez un produit ou créez-en un personnalisé.
              </Text>
            </View>
          ) : (
            <View style={styles.productsList}>
              {userProducts.map((product) => (
                <View key={product.amm} style={styles.productCard}>
                  {product.is_custom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>PRODUIT NON AUTORISÉ</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.productCardContent}
                    onPress={() => {
                      console.log('📋 [CARD] Clic sur la card produit:', product.name);
                      handleShowDetails(product);
                    }}
                  >
                    <View style={styles.productHeader}>
                      <View style={styles.functionBadge}>
                        <Text style={styles.functionBadgeText}>{product.functions}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          console.log('🖱️ [DELETE] Bouton delete pressé', {
                            productName: product.name,
                            productAmm: product.amm,
                            eventType: e?.type,
                            hasStopPropagation: typeof e?.stopPropagation === 'function',
                          });
                          
                          if (e?.stopPropagation) {
                            e.stopPropagation();
                            console.log('✅ [DELETE] stopPropagation appelé');
                          }
                          
                          console.log('🚀 [DELETE] Appel de handleRemoveProduct');
                          handleRemoveProduct(product);
                        }}
                        onPressIn={(e) => {
                          console.log('🖱️ [DELETE] onPressIn déclenché');
                          if (e?.stopPropagation) {
                            e.stopPropagation();
                          }
                        }}
                        style={styles.removeButton}
                        activeOpacity={0.7}
                      >
                        <TrashIcon color={colors.semantic.error} size={18} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text variant="h4" style={styles.productCardName}>
                      {product.name}
                    </Text>
                    
                    <Text variant="caption" style={styles.productCardMeta}>
                      AMM: {product.amm} • {product.holder}
                    </Text>
                    
                    {product.active_substances && (
                      <Text variant="caption" style={styles.productCardSubstances}>
                        {product.active_substances.substring(0, 100)}
                        {product.active_substances.length > 100 ? '...' : ''}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal création produit personnalisé */}
      <Modal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewProductName('');
        }}
        title="Créer un produit personnalisé"
        primaryAction={{
          title: 'Créer',
          onPress: handleCreateCustomProduct,
          disabled: !newProductName.trim(),
        }}
      >
        <View style={styles.modalContent}>
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ Ce produit sera marqué comme NON AUTORISÉ
            </Text>
          </View>
          
          <Input
            label="Nom du produit"
            placeholder="Ex: Mon mélange maison"
            value={newProductName}
            onChangeText={setNewProductName}
          />
        </View>
      </Modal>

      {/* Modal détails produit */}
      {selectedProduct && (
        <Modal
          visible={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProduct(null);
            setProductUsages([]);
            setShowAllDetails(false);
          }}
          title="Détails du produit"
          size="lg"
        >
          <ScrollView 
            style={styles.detailsContent}
            contentContainerStyle={styles.detailsContentContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
          >
            <Text variant="h3" style={styles.detailTitle}>{selectedProduct.name}</Text>
            
            {/* Informations principales */}
            <View style={styles.detailsSection}>
              <Text variant="h4" style={styles.sectionSubtitle}>Informations principales</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Numéro AMM:</Text>
                <Text style={styles.detailValue}>{selectedProduct.amm}</Text>
              </View>
              
              {selectedProduct.holder && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Titulaire:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.holder}</Text>
                </View>
              )}
              
              {selectedProduct.functions && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fonctions:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.functions}</Text>
                </View>
              )}
              
              {selectedProduct.active_substances && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Substances actives:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.active_substances}</Text>
                </View>
              )}
              
              {selectedProduct.authorization_state && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>État d'autorisation:</Text>
                  <Text style={styles.detailValue}>{selectedProduct.authorization_state}</Text>
                </View>
              )}
            </View>

            {/* Usages autorisés */}
            {!selectedProduct.is_custom && (
              <View style={styles.detailsSection}>
                <Text variant="h4" style={styles.sectionSubtitle}>
                  Usages autorisés {productUsages.length > 0 && `(${productUsages.length})`}
                </Text>
                
                {isLoadingUsages ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} style={styles.loadingUsages} />
                ) : productUsages.length > 0 ? (
                  <View style={styles.usagesList}>
                    {productUsages.map((usage, index) => {
                      const usageState = getUsageState(usage.usage_state);
                      return (
                        <View key={usage.id || index} style={styles.usageCard}>
                          <View style={styles.usageHeader}>
                            <Text variant="body" style={styles.usageTitle}>
                              {usage.target_culture || 'Culture non spécifiée'}
                            </Text>
                            <View style={[styles.usageStateBadge, { backgroundColor: usageState.bgColor }]}>
                              <Text style={[styles.usageStateText, { color: usageState.color }]}>
                                {usageState.label}
                              </Text>
                            </View>
                          </View>
                        
                        <View style={styles.usageDetails}>
                          {usage.treated_part && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Partie traitée:</Text>
                              <Text style={styles.usageDetailValue}>{usage.treated_part}</Text>
                            </View>
                          )}
                          
                          {usage.target_pest && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Ravageur:</Text>
                              <Text style={styles.usageDetailValue}>{usage.target_pest}</Text>
                            </View>
                          )}
                          
                          {usage.retained_dose && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Dose retenue:</Text>
                              <Text style={styles.usageDetailValue}>
                                {usage.retained_dose} {usage.retained_dose_unit || ''}
                              </Text>
                            </View>
                          )}
                          
                          {usage.harvest_delay_days && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Délai avant récolte:</Text>
                              <Text style={styles.usageDetailValue}>
                                {usage.harvest_delay_days} jour{usage.harvest_delay_days > 1 ? 's' : ''}
                                {usage.harvest_delay_bbch && ` (${usage.harvest_delay_bbch})`}
                              </Text>
                            </View>
                          )}
                          
                          {usage.max_applications && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Nombre max d'applications:</Text>
                              <Text style={styles.usageDetailValue}>{usage.max_applications}</Text>
                            </View>
                          )}
                          
                          {usage.min_interval_days && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Intervalle minimum:</Text>
                              <Text style={styles.usageDetailValue}>
                                {usage.min_interval_days} jour{usage.min_interval_days > 1 ? 's' : ''}
                              </Text>
                            </View>
                          )}
                          
                          {usage.employment_condition && (
                            <View style={styles.usageDetailRow}>
                              <Text style={styles.usageDetailLabel}>Condition d'emploi:</Text>
                              <Text style={styles.usageDetailValue}>{usage.employment_condition}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                    })}
                  </View>
                ) : (
                  <Text style={styles.noUsagesText}>Aucun usage autorisé trouvé</Text>
                )}
              </View>
            )}

            {/* Bouton afficher plus de détails */}
            {!selectedProduct.is_custom && (
              <TouchableOpacity
                style={styles.showMoreButton}
                onPress={() => setShowAllDetails(!showAllDetails)}
              >
                <Text style={styles.showMoreButtonText}>
                  {showAllDetails ? 'Masquer' : 'Afficher'} plus de détails
                </Text>
                {showAllDetails ? (
                  <ChevronUpIcon size={20} color={colors.primary[600]} />
                ) : (
                  <ChevronDownIcon size={20} color={colors.primary[600]} />
                )}
              </TouchableOpacity>
            )}

            {/* Détails complets (expandable) */}
            {showAllDetails && !selectedProduct.is_custom && (
              <View style={styles.detailsSection}>
                <Text variant="h4" style={styles.sectionSubtitle}>Informations complètes</Text>
                
                {selectedProduct.type_produit && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type de produit:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.type_produit}</Text>
                  </View>
                )}
                
                {selectedProduct.secondary_names && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Autres noms commerciaux:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.secondary_names}</Text>
                  </View>
                )}
                
                {selectedProduct.commercial_type && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type commercial:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.commercial_type}</Text>
                  </View>
                )}
                
                {selectedProduct.usage_range && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gamme d'usage:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.usage_range}</Text>
                  </View>
                )}
                
                {selectedProduct.authorized_mentions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mentions autorisées:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.authorized_mentions}</Text>
                  </View>
                )}
                
                {selectedProduct.usage_restrictions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Restrictions d'usage:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.usage_restrictions}</Text>
                  </View>
                )}
                
                {selectedProduct.formulations && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Formulations:</Text>
                    <Text style={styles.detailValue}>{selectedProduct.formulations}</Text>
                  </View>
                )}
                
                {selectedProduct.withdrawal_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date de retrait:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedProduct.withdrawal_date).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                )}
                
                {selectedProduct.first_authorization_date && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date de première autorisation:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedProduct.first_authorization_date).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                )}
                
                {selectedProduct.reference_product_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Produit de référence:</Text>
                    <Text style={styles.detailValue}>
                      {selectedProduct.reference_product_name}
                      {selectedProduct.reference_amm && ` (AMM: ${selectedProduct.reference_amm})`}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Attribution E-Phy */}
            {!selectedProduct.is_custom && (
              <View style={styles.attributionFooter}>
                <Text style={styles.attributionFooterText}>
                  Données E-Phy - Anses - Mise à jour: 2026-01-22
                </Text>
              </View>
            )}
          </ScrollView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  attributionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: 8,
    gap: spacing.sm,
  },
  attributionText: {
    flex: 1,
    color: colors.primary[700],
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  addButtonText: {
    color: colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  filterDropdown: {
    marginBottom: spacing.md,
  },
  searchInput: {
    marginBottom: spacing.md,
    // Assurer que l'input prend toute la largeur disponible
    width: '100%',
  },
  searchResultsContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.sm,
    maxHeight: 300,
  },
  searchResultsList: {
    maxHeight: 250,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: '600',
  },
  productMeta: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  emptySearch: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  productsList: {
    gap: spacing.md,
  },
  productCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.primary,
    overflow: 'hidden',
  },
  customBadge: {
    backgroundColor: colors.semantic.error,
    padding: spacing.xs,
    alignItems: 'center',
  },
  customBadgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
  },
  productCardContent: {
    padding: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  functionBadge: {
    backgroundColor: colors.semantic.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
  },
  functionBadgeText: {
    color: colors.semantic.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    padding: spacing.sm,
    minWidth: 44, // Zone de touch minimale recommandée
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // S'assurer que le bouton est au-dessus
  },
  productCardName: {
    marginBottom: spacing.xs,
  },
  productCardMeta: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  productCardSubstances: {
    color: colors.text.secondary,
    fontSize: 11,
    lineHeight: 14,
  },
  modalContent: {
    padding: spacing.lg,
  },
  warningBanner: {
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  warningText: {
    color: colors.semantic.error,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContent: {
    flex: 1,
    width: '100%',
  },
  detailsContentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  detailTitle: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  attributionFooter: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
  },
  attributionFooterText: {
    fontSize: 11,
    color: colors.primary[700],
    textAlign: 'center',
  },
  detailsSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
  },
  sectionSubtitle: {
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  loadingUsages: {
    marginVertical: spacing.md,
  },
  usagesList: {
    gap: spacing.md,
  },
  usageCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  usageTitle: {
    flex: 1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  usageStateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
  },
  usageStateText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  usageDetails: {
    gap: spacing.xs,
  },
  usageDetailRow: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  usageDetailLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
    minWidth: 120,
  },
  usageDetailValue: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
  },
  noUsagesText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  showMoreButtonText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200],
    gap: spacing.sm,
  },
  showAllButtonText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  filteredProductsContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  filteredProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filteredProductsTitle: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  closeButtonText: {
    color: colors.primary[600],
    fontSize: 14,
    fontWeight: '600',
  },
  loadingFiltered: {
    marginVertical: spacing.md,
  },
  filteredProductsList: {
    gap: spacing.sm,
  },
  filteredProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  productSubstances: {
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    gap: spacing.sm,
  },
  loadMoreButtonText: {
    color: colors.primary[600],
    fontWeight: '600',
    fontSize: 14,
  },
  allProductsShown: {
    textAlign: 'center',
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  noFilteredProducts: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: spacing.md,
    fontStyle: 'italic',
  },
  organicFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginTop: spacing.sm,
  },
  organicFilterLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  organicFilterText: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  organicFilterHint: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
