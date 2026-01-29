import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlusIcon,
  TrashIcon,
  SearchIcon,
  XIcon
} from '../design-system/icons';
import { Text, Button, Input, Modal } from '../design-system/components';
import { cultureService } from '../services/CultureService';
import { userCulturePreferencesService } from '../services/UserCulturePreferencesService';
import { FarmDataCacheService } from '../services/FarmDataCacheService';
import type { Culture, CultureProfileType, UserCulturePreferences } from '../types';

interface CulturesListSettingsScreenProps {
  onTitleChange?: (title: string | null) => void;
  onBack?: () => void;
}

export default function CulturesListSettingsScreen({ onTitleChange, onBack }: CulturesListSettingsScreenProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  
  const [preferences, setPreferences] = useState<UserCulturePreferences | null>(null);
  const [userCultures, setUserCultures] = useState<Culture[]>([]);
  const [allCultures, setAllCultures] = useState<Culture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState<CultureProfileType[]>([]);
  
  // Recherche directe sur l'écran
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Culture[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Modals
  const [showCreateCultureModal, setShowCreateCultureModal] = useState(false);
  const [newCultureName, setNewCultureName] = useState('');
  const [newCultureType, setNewCultureType] = useState<string>('legume_fruit');

  const availableProfiles = userCulturePreferencesService.getAvailableProfiles();

  // Fonction pour déterminer quels profils sont actifs en comparant les cultureIds
  const detectActiveProfiles = async (cultureIds: number[]): Promise<CultureProfileType[]> => {
    if (!cultureIds || cultureIds.length === 0) {
      return [];
    }

    const activeProfiles: CultureProfileType[] = [];
    const profileTypes: CultureProfileType[] = ['maraichage', 'pepiniere', 'floriculture', 'arboriculture', 'grande_culture', 'tropical'];

    // Pour chaque profil, vérifier si ses cultures sont présentes dans la liste utilisateur
    for (const profileType of profileTypes) {
      try {
        const profileCultureIds = await userCulturePreferencesService.getProfileCultures(profileType);
        
        if (profileCultureIds.length === 0) continue;

        // Vérifier si au moins 80% des cultures du profil sont dans la liste utilisateur
        // Cela permet de détecter un profil même si l'utilisateur a ajouté/supprimé quelques cultures
        const matchingCultures = profileCultureIds.filter(id => cultureIds.includes(id));
        const matchPercentage = matchingCultures.length / profileCultureIds.length;

        // Si au moins 80% des cultures du profil sont présentes, considérer le profil comme actif
        if (matchPercentage >= 0.8) {
          activeProfiles.push(profileType);
        }
      } catch (error) {
        console.error(`Erreur lors de la vérification du profil ${profileType}:`, error);
      }
    }

    return activeProfiles;
  };

  // Charger les préférences et cultures
  useEffect(() => {
    if (onTitleChange) {
      onTitleChange('Liste de cultures');
    }
    loadData();
  }, [activeFarm?.farm_id, user?.id]);

  const loadData = async () => {
    if (!activeFarm?.farm_id || !user?.id) return;

    setIsLoading(true);
    try {
      // Charger depuis le cache d'abord
      const cachedPrefs = await FarmDataCacheService.getCachedUserCulturePreferences(user.id, activeFarm.farm_id);
      
      if (cachedPrefs) {
        setPreferences(cachedPrefs);
        // Détecter les profils actifs à partir des cultureIds
        const activeProfiles = await detectActiveProfiles(cachedPrefs.cultureIds);
        setSelectedProfiles(activeProfiles);
        await loadUserCultures(cachedPrefs.cultureIds);
      } else {
        // Charger depuis la DB
        const prefs = await userCulturePreferencesService.getUserPreferences(user.id, activeFarm.farm_id);
        setPreferences(prefs);
        if (prefs) {
          // Détecter les profils actifs à partir des cultureIds
          const activeProfiles = await detectActiveProfiles(prefs.cultureIds);
          setSelectedProfiles(activeProfiles);
          await loadUserCultures(prefs.cultureIds);
          // Sauvegarder en cache
          await FarmDataCacheService.saveUserCulturePreferences(user.id, activeFarm.farm_id, prefs);
        } else {
          setSelectedProfiles([]);
        }
      }

      // Charger toutes les cultures disponibles
      const all = await cultureService.getCultures(activeFarm.farm_id);
      setAllCultures(all);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCultures = async (cultureIds: number[]) => {
    if (cultureIds.length === 0) {
      setUserCultures([]);
      return;
    }

    try {
      // Utiliser allCultures si disponible (plus rapide, pas besoin de refetch)
      const culturesToFilter = allCultures.length > 0 ? allCultures : await cultureService.getCultures(activeFarm?.farm_id);
      const filtered = culturesToFilter.filter(c => cultureIds.includes(c.id));
      setUserCultures(filtered);
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error);
    }
  };

  const handleToggleProfile = async (profileType: CultureProfileType) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    // Sauvegarder l'état précédent pour rollback en cas d'erreur
    const previousSelectedProfiles = [...selectedProfiles];
    const previousUserCultures = [...userCultures];
    const previousPreferences = preferences;

    // 1. Mise à jour optimiste immédiate de l'UI
    const newSelectedProfiles = selectedProfiles.includes(profileType)
      ? selectedProfiles.filter(p => p !== profileType)
      : [...selectedProfiles, profileType];

    setSelectedProfiles(newSelectedProfiles);

    // Si aucun profil sélectionné, on garde juste la liste actuelle
    if (newSelectedProfiles.length === 0) {
      // Mise à jour optimiste : vider la liste
      setUserCultures([]);
      if (preferences) {
        setPreferences({
          ...preferences,
          cultureIds: [],
          profileType: 'custom',
        });
      }
      
      // Exécuter l'action en arrière-plan
      (async () => {
        try {
          const prefs = await userCulturePreferencesService.updateCultureList(
            user.id,
            activeFarm.farm_id,
            []
          );
          setPreferences(prefs);
          await FarmDataCacheService.invalidateUserCulturePreferences(user.id, activeFarm.farm_id);
          await FarmDataCacheService.saveUserCulturePreferences(user.id, activeFarm.farm_id, prefs);
        } catch (error) {
          console.error('Erreur lors de la mise à jour:', error);
          // Rollback en cas d'erreur
          setSelectedProfiles(previousSelectedProfiles);
          setUserCultures(previousUserCultures);
          setPreferences(previousPreferences);
          Alert.alert('Erreur', 'Impossible de mettre à jour les profils');
        }
      })();
      return;
    }

    // 2. Précharger les cultures des profils en parallèle (optimistic)
    (async () => {
      try {
        // Combiner les cultures de tous les profils sélectionnés
        const profilePromises = newSelectedProfiles.map(profile => 
          userCulturePreferencesService.getProfileCultures(profile)
        );
        const profileCulturesArrays = await Promise.all(profilePromises);
        const allProfileCultureIds = profileCulturesArrays.flat();
        
        // Dédupliquer les IDs
        const uniqueCultureIds = Array.from(new Set(allProfileCultureIds));

        // Mise à jour optimiste : charger les cultures immédiatement
        await loadUserCultures(uniqueCultureIds);
        
        // Mise à jour optimiste des préférences
        if (preferences) {
          setPreferences({
            ...preferences,
            cultureIds: uniqueCultureIds,
            profileType: newSelectedProfiles.length === 1 ? newSelectedProfiles[0] : 'custom',
          });
        }

        // 3. Exécuter l'action API en arrière-plan
        const prefs = await userCulturePreferencesService.updateCultureList(
          user.id,
          activeFarm.farm_id,
          uniqueCultureIds
        );
        
        setPreferences(prefs);
        
        // Mettre à jour le cache
        await FarmDataCacheService.invalidateUserCulturePreferences(user.id, activeFarm.farm_id);
        await FarmDataCacheService.saveUserCulturePreferences(user.id, activeFarm.farm_id, prefs);
      } catch (error) {
        console.error('Erreur lors de la sélection du profil:', error);
        // Rollback en cas d'erreur
        setSelectedProfiles(previousSelectedProfiles);
        setUserCultures(previousUserCultures);
        setPreferences(previousPreferences);
        Alert.alert('Erreur', 'Impossible de mettre à jour les profils');
      }
    })();
  };

  const handleRemoveCulture = async (cultureId: number) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    Alert.alert(
      'Supprimer la culture',
      'Êtes-vous sûr de vouloir retirer cette culture de votre liste ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            // Sauvegarder l'état précédent pour rollback en cas d'erreur
            const previousUserCultures = [...userCultures];
            const previousPreferences = preferences;
            const removedCulture = userCultures.find(c => c.id === cultureId);

            // 1. Mise à jour optimiste immédiate de l'UI
            setUserCultures(prev => prev.filter(c => c.id !== cultureId));
            
            // Mise à jour optimiste des préférences
            if (preferences) {
              setPreferences({
                ...preferences,
                cultureIds: preferences.cultureIds.filter(id => id !== cultureId),
              });
            }

            // 2. Exécuter l'action API en arrière-plan
            try {
              const prefs = await userCulturePreferencesService.removeCultureFromUserList(
                user.id,
                activeFarm.farm_id,
                cultureId
              );
              setPreferences(prefs);
              await loadUserCultures(prefs.cultureIds);
              
              // Invalider le cache
              await FarmDataCacheService.invalidateUserCulturePreferences(user.id, activeFarm.farm_id);
              await FarmDataCacheService.saveUserCulturePreferences(user.id, activeFarm.farm_id, prefs);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              // Rollback en cas d'erreur
              setUserCultures(previousUserCultures);
              setPreferences(previousPreferences);
              Alert.alert('Erreur', 'Impossible de supprimer la culture');
            }
          },
        },
      ]
    );
  };

  const handleSearchCultures = async (query: string) => {
    setSearchQuery(query);
    setShowSearchResults(query.trim().length > 0);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Rechercher parmi toutes les cultures
      const results = await cultureService.searchCultures(query, activeFarm?.farm_id);
      
      // Filtrer les cultures déjà dans la liste
      const currentIds = preferences?.cultureIds || [];
      const filtered = results.filter(c => !currentIds.includes(c.id));
      setSearchResults(filtered);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    }
  };


  const handleAddCulture = async (cultureId: number) => {
    if (!activeFarm?.farm_id || !user?.id) return;

    // Sauvegarder l'état précédent pour rollback en cas d'erreur
    const previousUserCultures = [...userCultures];
    const previousPreferences = preferences;
    const cultureToAdd = allCultures.find(c => c.id === cultureId);

    // 1. Mise à jour optimiste immédiate de l'UI
    if (cultureToAdd && !userCultures.find(c => c.id === cultureId)) {
      setUserCultures(prev => [...prev, cultureToAdd]);
    }
    
    // Retirer immédiatement de la recherche
    setSearchResults(prev => prev.filter(c => c.id !== cultureId));
    
    // Mise à jour optimiste des préférences
    if (preferences && !preferences.cultureIds.includes(cultureId)) {
      setPreferences({
        ...preferences,
        cultureIds: [...preferences.cultureIds, cultureId],
      });
    }

    // 2. Exécuter l'action API en arrière-plan
    (async () => {
      try {
        const prefs = await userCulturePreferencesService.addCultureToUserList(
          user.id,
          activeFarm.farm_id,
          cultureId
        );
        setPreferences(prefs);
        await loadUserCultures(prefs.cultureIds);
        
        // Invalider le cache
        await FarmDataCacheService.invalidateUserCulturePreferences(user.id, activeFarm.farm_id);
        await FarmDataCacheService.saveUserCulturePreferences(user.id, activeFarm.farm_id, prefs);
      } catch (error) {
        console.error('Erreur lors de l\'ajout:', error);
        // Rollback en cas d'erreur
        setUserCultures(previousUserCultures);
        setPreferences(previousPreferences);
        setSearchResults(prev => {
          if (cultureToAdd && !prev.find(c => c.id === cultureId)) {
            return [...prev, cultureToAdd];
          }
          return prev;
        });
        Alert.alert('Erreur', 'Impossible d\'ajouter la culture');
      }
    })();
  };

  const handleCreateCulture = async () => {
    if (!activeFarm?.farm_id || !user?.id || !newCultureName.trim()) return;

    try {
      const newCulture = await cultureService.createCulture({
        name: newCultureName.trim(),
        type: newCultureType as any,
        category: 'recolte',
        isCustom: true,
        farmId: activeFarm.farm_id,
      });

      // Ajouter à la liste utilisateur
      await handleAddCulture(newCulture.id);
      
      setShowCreateCultureModal(false);
      setNewCultureName('');
      setNewCultureType('legume_fruit');
      setSearchQuery('');
      setShowSearchResults(false);
      
      // Recharger toutes les cultures
      const all = await cultureService.getCultures(activeFarm.farm_id);
      setAllCultures(all);
      
      Alert.alert('Succès', `Culture "${newCulture.name}" créée et ajoutée à votre liste`);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      Alert.alert('Erreur', 'Impossible de créer la culture');
    }
  };

  const getProfileLabel = (profileType: CultureProfileType): string => {
    const profile = availableProfiles.find(p => p.type === profileType);
    return profile?.label || profileType;
  };

  const cultureTypes = cultureService.getCultureTypes();

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
        {/* Barre de recherche */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            Rechercher une culture
          </Text>
          <Input
            placeholder="Rechercher une culture..."
            value={searchQuery}
            onChangeText={handleSearchCultures}
            icon={<SearchIcon color={colors.gray[400]} size={20} />}
            style={styles.searchInputMain}
          />
          
          {showSearchResults && searchResults.length > 0 && (
            <View style={styles.searchResultsMain}>
              <ScrollView style={styles.searchResultsListMain} nestedScrollEnabled>
                {searchResults.map((culture) => (
                  <TouchableOpacity
                    key={culture.id}
                    style={styles.searchResultItemMain}
                    onPress={() => handleAddCulture(culture.id)}
                  >
                    <View
                      style={[
                        styles.cultureColor,
                        { backgroundColor: culture.color || colors.primary[500] },
                      ]}
                    />
                    <View style={styles.cultureDetails}>
                      <Text variant="body">{culture.name}</Text>
                      <Text variant="caption" style={styles.cultureType}>
                        {cultureTypes.find(t => t.value === culture.type)?.label || culture.type}
                        {culture.filiere && ` • ${culture.filiere}`}
                      </Text>
                    </View>
                    <PlusIcon color={colors.primary[600]} size={20} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
            <View style={styles.emptySearchStateMain}>
              <Text variant="body" style={styles.emptySearchText}>
                Aucune culture trouvée. Souhaitez-vous créer "{searchQuery}" ?
              </Text>
              <Button
                variant="secondary"
                size="small"
                onPress={() => {
                  setNewCultureName(searchQuery);
                  setShowCreateCultureModal(true);
                  setSearchQuery('');
                  setShowSearchResults(false);
                }}
                style={styles.createFromSearchButton}
              >
                Créer cette culture
              </Button>
            </View>
          )}
        </View>

        {/* Sélection de profil */}
        <View style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>
            Choisir des profils
          </Text>
          <Text variant="caption" style={styles.sectionDescription}>
            Sélectionnez un ou plusieurs profils pour charger leurs cultures. Toutes les cultures restent disponibles dans les sélecteurs.
          </Text>
          
          <View style={styles.profilesContainer}>
            {availableProfiles.map((profile) => {
              const isSelected = selectedProfiles.includes(profile.type);
              return (
                <TouchableOpacity
                  key={profile.type}
                  style={[
                    styles.profileChip,
                    isSelected && styles.profileChipSelected,
                  ]}
                  onPress={() => handleToggleProfile(profile.type)}
                  disabled={isLoading}
                >
                  {isSelected && (
                    <View style={styles.checkmarkContainer}>
                      <Text style={styles.checkmark}>✓</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.profileChipText,
                      isSelected && styles.profileChipTextSelected,
                    ]}
                  >
                    {profile.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Liste des cultures */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3" style={styles.sectionTitle}>
              Mes cultures ({userCultures.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                setNewCultureName('');
                setShowCreateCultureModal(true);
              }}
              activeOpacity={0.7}
            >
              <PlusIcon color={colors.text.inverse} size={20} />
              <Text style={styles.addButtonText}>Créer</Text>
            </TouchableOpacity>
          </View>

          {userCultures.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="body" style={styles.emptyStateText}>
                Aucune culture dans votre liste de préférences. Toutes les cultures restent disponibles. Sélectionnez un profil ou ajoutez des cultures pour les mettre en avant dans les sélecteurs.
              </Text>
            </View>
          ) : (
            <View style={styles.culturesList}>
              {userCultures.map((culture) => (
                <View key={culture.id} style={styles.cultureItem}>
                  <View style={styles.cultureInfo}>
                    <View
                      style={[
                        styles.cultureColor,
                        { backgroundColor: culture.color || colors.primary[500] },
                      ]}
                    />
                    <View style={styles.cultureDetails}>
                      <Text variant="body" style={styles.cultureName}>
                        {culture.name}
                      </Text>
                      <Text variant="caption" style={styles.cultureType}>
                        {cultureTypes.find(t => t.value === culture.type)?.label || culture.type}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveCulture(culture.id)}
                    style={styles.removeButton}
                  >
                    <TrashIcon color={colors.semantic.error} size={20} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Créer culture */}
      <Modal
        visible={showCreateCultureModal}
        onClose={() => {
          setShowCreateCultureModal(false);
          setNewCultureName('');
          setNewCultureType('legume_fruit');
        }}
        title="Créer une culture personnalisée"
        primaryAction={{
          title: 'Créer et ajouter à ma liste',
          onPress: handleCreateCulture,
          disabled: !newCultureName.trim(),
        }}
      >
        <View style={styles.modalContent}>
          <Input
            label="Nom de la culture"
            placeholder="Ex: Tomate cerise"
            value={newCultureName}
            onChangeText={setNewCultureName}
            style={styles.formInput}
          />

          <View style={styles.formSection}>
            <Text variant="label" style={styles.formLabel}>
              Type de culture
            </Text>
            <View style={styles.typeChips}>
              {cultureTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeChip,
                    newCultureType === type.value && styles.typeChipSelected,
                  ]}
                  onPress={() => setNewCultureType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      newCultureType === type.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.xs,
    flex: 1,
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
  sectionDescription: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  profilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  profileChipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  profileChipText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  profileChipTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  checkmarkContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  checkmark: {
    color: colors.text.inverse,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  culturesList: {
    gap: spacing.sm,
  },
  cultureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cultureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cultureColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  cultureDetails: {
    flex: 1,
  },
  cultureName: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  cultureType: {
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
  removeButton: {
    padding: spacing.sm,
  },
  modalContent: {
    padding: spacing.lg,
  },
  searchInputMain: {
    marginBottom: spacing.md,
  },
  searchResultsMain: {
    marginTop: spacing.md,
    maxHeight: 300,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.sm,
  },
  searchResultsListMain: {
    maxHeight: 250,
  },
  searchResultItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  emptySearchStateMain: {
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  createFromSearchButton: {
    marginTop: spacing.md,
  },
  searchInput: {
    marginBottom: spacing.md,
  },
  searchResults: {
    marginTop: spacing.md,
    maxHeight: 300,
  },
  searchResultsTitle: {
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  searchResultsList: {
    maxHeight: 250,
  },
  emptySearchState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptySearchText: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  modalActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  createButton: {
    marginTop: spacing.md,
  },
  formInput: {
    marginBottom: spacing.md,
  },
  formSection: {
    marginBottom: spacing.md,
  },
  formLabel: {
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  typeChipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[600],
  },
  typeChipText: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  typeChipTextSelected: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
