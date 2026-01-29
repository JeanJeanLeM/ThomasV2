import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Modal } from '../Modal';
import { Text } from '../Text';
import { Input } from '../Input';
import { colors } from '../../colors';
import { spacing } from '../../spacing';
import { Ionicons } from '@expo/vector-icons';
import { documentService, Document } from '../../../services/DocumentService';

export interface DocumentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onDocumentSelect: (document: Document) => void;
  farmId: number;
}

export const DocumentPickerModal: React.FC<DocumentPickerModalProps> = ({
  visible,
  onClose,
  onDocumentSelect,
  farmId,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Charger les documents au montage
  useEffect(() => {
    if (visible && farmId) {
      loadDocuments();
    }
  }, [visible, farmId]);

  // Filtrer les documents selon la recherche et catégorie
  useEffect(() => {
    let filtered = documents;

    // Filtrer par catégorie
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Filtrer par terme de recherche
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(term) ||
        doc.description?.toLowerCase().includes(term) ||
        doc.file_name.toLowerCase().includes(term)
      );
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedCategory]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await documentService.getDocumentsByFarm(farmId);
      setDocuments(docs);
    } catch (error) {
      console.error('Erreur chargement documents:', error);
      Alert.alert('Erreur', 'Impossible de charger les documents');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'Tous', icon: 'folder' as const },
    { id: 'photos', label: 'Photos', icon: 'camera' as const },
    { id: 'analyse-sol', label: 'Analyses', icon: 'flask' as const },
    { id: 'certifications', label: 'Certifications', icon: 'ribbon' as const },
    { id: 'contrats', label: 'Contrats', icon: 'document-text' as const },
    { id: 'autre', label: 'Autres', icon: 'ellipsis-horizontal' as const },
  ];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (fileType: string): keyof typeof Ionicons.glyphMap => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'document-text';
    if (fileType.includes('word')) return 'document';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'grid';
    return 'document-outline';
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Sélectionner un document"
      size="lg"
    >
      <View style={{ flex: 1 }}>
        
        {/* Barre de recherche */}
        <Input
          placeholder="Rechercher un document..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          leftIcon="search"
          style={{ marginBottom: spacing.md }}
        />

        {/* Filtres par catégorie */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: spacing.md }}
          contentContainerStyle={{ gap: spacing.sm }}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 20,
                backgroundColor: selectedCategory === category.id 
                  ? colors.primary[500] 
                  : colors.gray[100],
                gap: spacing.xs,
              }}
            >
              <Ionicons 
                name={category.icon} 
                size={16} 
                color={selectedCategory === category.id ? '#ffffff' : colors.gray[600]} 
              />
              <Text 
                style={{ 
                  color: selectedCategory === category.id ? '#ffffff' : colors.gray[700],
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste des documents */}
        <ScrollView 
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {loading ? (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center',
              paddingVertical: spacing.xl,
            }}>
              <Text color={colors.gray[500]}>Chargement des documents...</Text>
            </View>
          ) : filteredDocuments.length === 0 ? (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center',
              paddingVertical: spacing.xl,
            }}>
              <Ionicons name="document-outline" size={48} color={colors.gray[400]} />
              <Text color={colors.gray[500]} style={{ marginTop: spacing.md, textAlign: 'center' }}>
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Aucun document trouvé'
                  : 'Aucun document disponible'
                }
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {filteredDocuments.map((document) => (
                <TouchableOpacity
                  key={document.id}
                  onPress={() => {
                    onDocumentSelect(document);
                    onClose();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: spacing.md,
                    backgroundColor: colors.background.secondary,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border.primary,
                    gap: spacing.md,
                  }}
                >
                  {/* Icône du document */}
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: colors.primary[100],
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons 
                      name={getDocumentIcon(document.file_type)} 
                      size={20} 
                      color={colors.primary[600]} 
                    />
                  </View>

                  {/* Informations du document */}
                  <View style={{ flex: 1 }}>
                    <Text 
                      style={{ 
                        fontSize: 16, 
                        fontWeight: '600',
                        color: colors.gray[900],
                        marginBottom: 2,
                      }}
                      numberOfLines={1}
                    >
                      {document.name}
                    </Text>
                    
                    <Text 
                      style={{ 
                        fontSize: 13, 
                        color: colors.gray[600],
                        marginBottom: 4,
                      }}
                      numberOfLines={1}
                    >
                      {document.file_name}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                        {formatFileSize(document.file_size)}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                        •
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.gray[500] }}>
                        {new Date(document.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>

                  {/* Flèche de sélection */}
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color={colors.gray[400]} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};