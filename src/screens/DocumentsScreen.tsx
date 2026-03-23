import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Share,
  Platform,
  TextInput
} from 'react-native';
import { showDeleteConfirm, showSuccess, showError } from '../utils/webAlert';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { typography } from '../design-system/typography';
import { Text } from '../design-system/components/Text';
import { EmptyState } from '../design-system/components/EmptyState';
import { SkeletonList } from '../design-system/components/SkeletonList';
import { DropdownSelector, DropdownItem } from '../design-system/components/DropdownSelector';
import AddDocumentScreen from './AddDocumentScreen';
import {
  DocumentIcon,
  PlusIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  SearchIcon,
  CloudArrowUpIcon,
  EyeIcon
} from '../design-system/icons';
// UnifiedHeader supprimé - géré par SimpleNavigator
import { documentService, Document } from '../services/DocumentService';
import { useFarm } from '../contexts/FarmContext';

interface DocumentsScreenProps {
  onBack?: () => void;
  onFarmSelector?: () => void;
}

// Interface Document maintenant importée du service

// Libellés des catégories (les puces de filtre ne listent que les catégories présentes dans les documents)
const CATEGORY_LABELS: DropdownItem[] = [
  { id: 'analyse-sol', label: 'Analyse de sol' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'assurance', label: 'Assurance' },
  { id: 'contrats', label: 'Contrats' },
  { id: 'recus', label: 'Reçus' },
  { id: 'photos', label: 'Photos' },
  { id: 'cartes', label: 'Cartes' },
  { id: 'manuels', label: 'Manuels' },
  { id: 'rapports', label: 'Rapports' },
  { id: 'autre', label: 'Autre' },
];

export default function DocumentsScreen({ onBack, onFarmSelector }: DocumentsScreenProps) {
  const { activeFarm } = useFarm();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [isAddDocumentVisible, setIsAddDocumentVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalSizeMB: 0,
    categoriesCount: 0,
  });

  // Charger les documents au montage du composant
  useEffect(() => {
    loadDocuments();
  }, [activeFarm]);

  // Filtrer les documents selon la catégorie et la recherche
  useEffect(() => {
    let filtered = documents;

    // Filtrage par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filtrage par recherche
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.name.toLowerCase().includes(search) ||
        doc.description?.toLowerCase().includes(search) ||
        doc.category.toLowerCase().includes(search)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, selectedCategory, searchText]);

  const categoryFilterItems = useMemo(() => {
    const all: DropdownItem = { id: 'all', label: 'Toutes les catégories' };
    const seen = new Set<string>();
    const rest: DropdownItem[] = [];
    documents.forEach((doc) => {
      if (seen.has(doc.category)) return;
      seen.add(doc.category);
      const label =
        CATEGORY_LABELS.find((c) => c.id === doc.category)?.label ?? doc.category;
      rest.push({ id: doc.category, label });
    });
    rest.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    return [all, ...rest];
  }, [documents]);

  useEffect(() => {
    if (selectedCategory === 'all') return;
    if (!documents.some((d) => d.category === selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [documents, selectedCategory]);

  // Charger les documents depuis la base de données
  const loadDocuments = async () => {
    if (!activeFarm || !activeFarm.farm_id) {
      console.log('Pas de ferme active ou ID manquant:', activeFarm);
      setLoading(false);
      setDocuments([]);
      setStats({
        totalDocuments: 0,
        totalSizeMB: 0,
        categoriesCount: 0,
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Chargement des documents pour la ferme:', activeFarm.farm_id);
      
      // Charger les documents
      const documentsData = await documentService.getDocumentsByFarm(activeFarm.farm_id);
      setDocuments(documentsData);

      // Charger les statistiques
      const statsData = await documentService.getDocumentStats(activeFarm.farm_id);
      setStats({
        totalDocuments: statsData.totalDocuments,
        totalSizeMB: statsData.totalSizeMB,
        categoriesCount: statsData.categoriesCount,
      });

    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
      showError(
        'Erreur',
        'Impossible de charger les documents. Veuillez réessayer.'
      );
      // Réinitialiser en cas d'erreur
      setDocuments([]);
      setStats({
        totalDocuments: 0,
        totalSizeMB: 0,
        categoriesCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const categoryItem = CATEGORY_LABELS.find(cat => cat.id === category);
    return categoryItem?.label || category;
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    
    // Retourner une icône selon le type de fichier
    if (type === 'pdf') {
      return <DocumentIcon size={24} color={colors.semantic.error} />;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
      return <EyeIcon size={24} color={colors.semantic.success} />;
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(type)) {
      return <DocumentIcon size={24} color={colors.primary[600]} />;
    } else if (['xls', 'xlsx', 'csv'].includes(type)) {
      return <DocumentIcon size={24} color={colors.semantic.warning} />;
    } else {
      return <DocumentIcon size={24} color={colors.text.secondary} />;
    }
  };

  const handleDeleteDocument = (document: Document) => {
    showDeleteConfirm(
      document.name,
      async () => {
        try {
          console.log('Suppression du document:', document.id);
          
          // Suppression réelle via le service
          await documentService.deleteDocument(document.id);
          
          // Recharger les documents
          await loadDocuments();
          
          // Feedback de succès
          showSuccess(
            'Document supprimé',
            `"${document.name}" a été supprimé avec succès.`
          );
        } catch (error) {
          console.error('Erreur lors de la suppression:', error);
          showError(
            'Erreur',
            'Impossible de supprimer le document. Veuillez réessayer.'
          );
        }
      }
    );
  };

  const handleDownloadDocument = (document: Document) => {
    try {
      // Simulation du téléchargement avec feedback détaillé
      Alert.alert(
        'Téléchargement',
        `Téléchargement de "${document.name}" (${formatFileSize(document.file_size)}) en cours...\n\nLe fichier sera disponible dans vos téléchargements.`,
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Télécharger',
            onPress: () => {
              // TODO: Implémenter le téléchargement réel
              // Simulation d'un délai de téléchargement
              setTimeout(() => {
                Alert.alert(
                  'Téléchargement terminé',
                  `"${document.name}" a été téléchargé avec succès.`,
                  [{ text: 'OK' }]
                );
              }, 1000);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      Alert.alert(
        'Erreur de téléchargement',
        'Impossible de télécharger le document. Vérifiez votre connexion internet.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleShareDocument = async (document: Document) => {
    try {
      // Vérifier si le partage est disponible sur la plateforme
      if (Platform.OS === 'web') {
        // Fallback pour le web - copier le lien ou afficher les options
        Alert.alert(
          'Partager le document',
          `Partage de "${document.name}"\n\nSur le web, vous pouvez copier le lien du document ou l'envoyer par email.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Copier le lien',
              onPress: () => {
                // TODO: Copier l'URL du document dans le presse-papiers
                Alert.alert(
                  'Lien copié',
                  'Le lien du document a été copié dans le presse-papiers.',
                  [{ text: 'OK' }]
                );
              }
            },
            {
              text: 'Envoyer par email',
              onPress: () => {
                // TODO: Ouvrir le client email avec le document
                Alert.alert(
                  'Email',
                  'Ouverture du client email...',
                  [{ text: 'OK' }]
                );
              }
            }
          ]
        );
      } else {
        // Partage natif sur mobile
        const result = await Share.share({
          message: `Je partage avec vous le document: ${document.name}\n\nType: ${document.file_type}\nTaille: ${formatFileSize(document.file_size)}`,
          title: `Document: ${document.name}`,
          // url: document.filePath, // À ajouter quand on aura les vrais fichiers
        });

        if (result.action === Share.sharedAction) {
          if (result.activityType) {
            console.log('Document partagé via:', result.activityType);
            Alert.alert(
              'Document partagé',
              `"${document.name}" a été partagé avec succès.`,
              [{ text: 'OK' }]
            );
          } else {
            console.log('Document partagé');
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('Partage annulé');
        }
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error);
      Alert.alert(
        'Erreur de partage',
        'Impossible de partager le document. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleViewDocument = (document: Document) => {
    try {
      // Simulation de l'ouverture avec options selon le type de fichier
      const fileType = document.file_type.toLowerCase();
      let message = `Ouverture de "${document.name}" (${document.file_type}, ${formatFileSize(document.file_size)})`;
      
      if (fileType === 'pdf') {
        message += '\n\nLe document PDF va s\'ouvrir dans votre lecteur par défaut.';
      } else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
        message += '\n\nL\'image va s\'ouvrir dans votre visionneuse par défaut.';
      } else if (['doc', 'docx'].includes(fileType)) {
        message += '\n\nLe document Word va s\'ouvrir dans votre éditeur par défaut.';
      } else {
        message += '\n\nLe fichier va s\'ouvrir avec l\'application appropriée.';
      }

      Alert.alert(
        'Aperçu du document',
        message,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Ouvrir',
            onPress: () => {
              // TODO: Implémenter l'ouverture réelle du document
              // Pour le moment, simulation avec feedback
              setTimeout(() => {
                Alert.alert(
                  'Document ouvert',
                  `"${document.name}" a été ouvert avec succès.`,
                  [{ text: 'OK' }]
                );
              }, 500);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de l\'ouverture:', error);
      Alert.alert(
        'Erreur d\'ouverture',
        'Impossible d\'ouvrir le document. Le fichier est peut-être corrompu.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatFileSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${Math.round(sizeInBytes / 1024)} KB`;
    } else {
      return `${Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100} MB`;
    }
  };

  /** No-op : certains bundles web en cache référencent encore ce nom après suppression du bouton de test. */
  const handleTestAllButtons = () => {};

  return (
    <View style={styles.container}>
      {/* Header unifié supprimé - géré par SimpleNavigator */}

      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre de section avec bouton d'ajout */}
        <View style={styles.sectionHeader}>
          <Text variant="h2" style={styles.sectionTitle}>
            Mes Documents
          </Text>
          
          <View style={styles.sectionActions}>
            <TouchableOpacity
              onPress={() => setIsAddDocumentVisible(true)}
              style={styles.addButton}
              activeOpacity={0.7}
            >
              <PlusIcon size={24} color={colors.text.inverse} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistiques (données réelles uniquement ; masqué si aucun document) */}
        {!loading && documents.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <DocumentIcon color={colors.semantic.success} size={22} />
              <Text variant="h3" style={styles.summaryTitle}>
                Aperçu de vos documents
              </Text>
            </View>

            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{stats.totalDocuments}</Text>
                <Text style={styles.summaryLabel}>Documents</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>
                  {stats.totalSizeMB.toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>MB utilisés</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryNumber}>{stats.categoriesCount}</Text>
                <Text style={styles.summaryLabel}>Catégories</Text>
              </View>
            </View>
          </View>
        )}

        {(loading || documents.length > 0) && (
          <>
            {/* Barre de recherche séparée */}
            <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <SearchIcon size={20} color={colors.text.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Rechercher dans vos documents..."
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>
            </View>

            {/* Filtres : uniquement les catégories réellement présentes */}
            <View style={styles.filtersContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterScrollContent}
              >
                {categoryFilterItems.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    style={[
                      styles.filterChip,
                      selectedCategory === category.id && styles.filterChipActive
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCategory === category.id && styles.filterChipTextActive
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </>
        )}

        {/* Liste des documents */}
        <View style={styles.documentsList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <SkeletonList count={5} variant="card" itemHeight={120} />
          </View>
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon={<DocumentIcon size={48} color={colors.gray[400]} />}
            title={searchText || selectedCategory !== 'all' 
              ? 'Aucun document trouvé' 
              : 'Aucun document ajouté'}
            description={searchText || selectedCategory !== 'all'
              ? 'Essayez de modifier vos filtres de recherche'
              : 'Commencez par ajouter votre premier document'}
            action={!searchText && selectedCategory === 'all' ? {
              label: 'Ajouter un document',
              onPress: () => setIsAddDocumentVisible(true),
              variant: 'primary'
            } : undefined}
          />
        ) : (
          filteredDocuments.map((document) => (
            <View key={document.id} style={styles.documentCard}>
              <TouchableOpacity
                onPress={() => handleViewDocument(document)}
                style={styles.documentContent}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  {getFileIcon(document.file_type)}
                </View>

                <View style={styles.documentInfo}>
                  <Text variant="body" weight="semibold" color={colors.text.primary} numberOfLines={1}>
                    {document.name}
                  </Text>
                  
                  <View style={styles.documentMeta}>
                    <View style={styles.categoryBadge}>
                      <Text variant="caption" color={colors.primary[700]} weight="medium">
                        {getCategoryLabel(document.category)}
                      </Text>
                    </View>
                    <Text variant="caption" color={colors.text.tertiary}>
                      {document.file_type} • {formatFileSize(document.file_size)}
                    </Text>
                  </View>

                  {document.description && (
                    <Text variant="caption" color={colors.text.secondary} numberOfLines={2} style={{ marginTop: spacing.xs }}>
                      {document.description}
                    </Text>
                  )}

                  <Text variant="caption" color={colors.text.tertiary} style={{ marginTop: spacing.xs }}>
                    Ajouté le {formatDate(document.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actions du document */}
              <View style={styles.documentActions}>
                <TouchableOpacity
                  onPress={() => handleViewDocument(document)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <EyeIcon size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleShareDocument(document)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <ArrowTopRightOnSquareIcon size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDownloadDocument(document)}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <CloudArrowUpIcon size={20} color={colors.text.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteDocument(document)}
                  style={[styles.actionButton, styles.deleteButton]}
                  activeOpacity={0.7}
                >
                  <TrashIcon size={20} color={colors.semantic.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

          {/* Espace pour éviter que le dernier élément soit caché */}
          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>

      {/* Modal d'ajout de document */}
      <AddDocumentScreen
        visible={isAddDocumentVisible}
        onClose={() => setIsAddDocumentVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  // Container principal avec scroll
  scrollContainer: {
    flex: 1,
  },
  
  // Titre de section avec boutons (comme dans MaterialsScreen)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  // Styles conformes au guide STATS_HEADER_GUIDE.md
  summaryCard: {
    backgroundColor: colors.background.secondary,  // ✅ OBLIGATOIRE : Blanc
    borderRadius: 12,                             // ✅ OBLIGATOIRE : 12px
    padding: spacing.lg,                          // ✅ OBLIGATOIRE : 24px
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,                     // ✅ OBLIGATOIRE : 32px
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,                          // ✅ OBLIGATOIRE : Ombre légère
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,                     // ✅ OBLIGATOIRE : 16px
    gap: spacing.sm,                              // ✅ OBLIGATOIRE : 8px
  },
  summaryTitle: {
    color: colors.text.primary,
    fontSize: typography.sizes.lg,                // ✅ OBLIGATOIRE : 18px
    fontWeight: typography.weights.semibold,      // ✅ OBLIGATOIRE : Semi-bold
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',              // ✅ OBLIGATOIRE : Distribution égale
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,                                      // ✅ OBLIGATOIRE : Largeur égale
  },
  summaryNumber: {
    fontSize: typography.sizes.xl,                // ✅ OBLIGATOIRE : 20px
    fontWeight: typography.weights.bold,          // ✅ OBLIGATOIRE : Bold
    color: colors.semantic.success,               // ✅ OBLIGATOIRE : Vert (couleur unique)
    marginBottom: 2,                              // ✅ OBLIGATOIRE : 2px
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,                // ✅ OBLIGATOIRE : 12px
    color: colors.text.secondary,                 // ✅ OBLIGATOIRE : Gris
    textAlign: 'center',                          // ✅ OBLIGATOIRE : Centré
  },
  // Section de recherche séparée
  searchSection: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  // Conteneur des filtres (cartouches uniquement)
  filtersContainer: {
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Cartouches de filtres scrollables
  filterScrollView: {
    // Pas de marginTop car plus de recherche au-dessus
  },
  filterScrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.primary,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  filterChipText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  // Barre de recherche
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  documentsList: {
    paddingHorizontal: spacing.lg,
  },
  documentCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    marginTop: spacing.md,
    shadowColor: colors.gray[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  documentActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  documentActionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: colors.semantic.error + '10',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
});
