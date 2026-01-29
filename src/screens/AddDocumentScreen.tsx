import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { Text } from '../design-system/components/Text';
import { StandardFormModal, FormSection, RowFields } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';
import { DropdownSelector, DropdownItem } from '../design-system/components/DropdownSelector';
import { Button } from '../design-system/components/Button';
import { DocumentIcon, CloudArrowUpIcon } from '../design-system/icons';

interface AddDocumentScreenProps {
  visible: boolean;
  onClose: () => void;
}

interface DocumentFormData {
  name: string;
  category: string;
  description: string;
  file?: any; // TODO: Typer correctement selon le système de fichiers utilisé
}

// Catégories de documents disponibles
const DOCUMENT_CATEGORIES: DropdownItem[] = [
  {
    id: 'analyse-sol',
    label: 'Analyse de sol',
    category: 'technique',
    description: 'Analyses chimiques et physiques du sol'
  },
  {
    id: 'certifications',
    label: 'Certifications',
    category: 'administratif',
    description: 'Certificats bio, labels qualité'
  },
  {
    id: 'assurance',
    label: 'Assurance',
    category: 'administratif',
    description: 'Contrats d\'assurance, déclarations'
  },
  {
    id: 'contrats',
    label: 'Contrats',
    category: 'commercial',
    description: 'Contrats de vente, partenariats'
  },
  {
    id: 'recus',
    label: 'Reçus',
    category: 'comptable',
    description: 'Factures, reçus d\'achat'
  },
  {
    id: 'photos',
    label: 'Photos',
    category: 'documentation',
    description: 'Photos des cultures, équipements'
  },
  {
    id: 'cartes',
    label: 'Cartes',
    category: 'technique',
    description: 'Plans parcellaires, cartes topographiques'
  },
  {
    id: 'manuels',
    label: 'Manuels',
    category: 'documentation',
    description: 'Manuels d\'utilisation, guides techniques'
  },
  {
    id: 'rapports',
    label: 'Rapports',
    category: 'technique',
    description: 'Rapports d\'expertise, études'
  }
];

export default function AddDocumentScreen({ visible, onClose }: AddDocumentScreenProps) {
  const [formData, setFormData] = useState<DocumentFormData>({
    name: '',
    category: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (field: keyof DocumentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Nettoyer l'erreur si corrigée
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation nom obligatoire
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du document est obligatoire';
    } else if (formData.name.length < 2 || formData.name.length > 100) {
      newErrors.name = 'Le nom doit contenir entre 2 et 100 caractères';
    }

    // Validation catégorie obligatoire
    if (!formData.category) {
      newErrors.category = 'Veuillez sélectionner une catégorie';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // TODO: Implémenter la logique de sauvegarde du document
      // - Upload du fichier si présent
      // - Sauvegarde des métadonnées en base
      // - Association à l'utilisateur/ferme active

      console.log('Données du document à sauvegarder:', formData);

      // Simulation d'un délai d'upload
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Document ajouté',
        'Votre document a été ajouté avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Réinitialiser le formulaire
              setFormData({
                name: '',
                category: '',
                description: '',
              });
              onClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erreur lors de l\'ajout du document:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de l\'ajout du document. Veuillez réessayer.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = () => {
    // TODO: Implémenter la sélection de fichier
    // Utiliser expo-document-picker ou react-native-document-picker
    Alert.alert(
      'Sélection de fichier',
      'Fonctionnalité de sélection de fichier à implémenter'
    );
  };

  const selectedCategory = DOCUMENT_CATEGORIES.filter(cat => cat.id === formData.category);

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title="Ajouter un document"
      primaryAction={{
        title: 'Ajouter le document',
        onPress: handleSave,
        loading: isLoading,
        disabled: !formData.name?.trim() || !formData.category,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
      infoBanner={{
        text: "Ajoutez vos documents importants pour les retrouver facilement. Formats supportés : PDF, Images, Documents Office, Fichiers texte",
        type: 'info'
      }}
    >
      <FormSection 
        title="Informations du document"
        description="Détails et catégorisation de votre document"
      >
        <EnhancedInput
          label="Nom du document"
          placeholder="Ex: Analyse de sol parcelle Nord 2024"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          required
          error={errors.name}
          hint="Donnez un nom descriptif pour retrouver facilement votre document"
        />
        
        <DropdownSelector
          label="Catégorie"
          placeholder="Sélectionnez une catégorie"
          items={DOCUMENT_CATEGORIES}
          selectedItems={selectedCategory}
          onSelectionChange={(items) => updateFormData('category', items[0]?.id || '')}
          required
          error={errors.category}
          hint="La catégorie aide à organiser vos documents"
          searchable={true}
          filterable={true}
        />

        <EnhancedInput
          label="Description (optionnelle)"
          placeholder="Décrivez brièvement le contenu du document..."
          value={formData.description}
          onChangeText={(value) => updateFormData('description', value)}
          multiline
          numberOfLines={3}
          hint="Ajoutez des détails pour faciliter la recherche"
        />
      </FormSection>

      <FormSection 
        title="Fichier"
        description="Sélectionnez le document à télécharger"
      >
        <View style={{
          borderWidth: 2,
          borderColor: colors.border.primary,
          borderStyle: 'dashed',
          borderRadius: 12,
          padding: spacing.xl,
          alignItems: 'center',
          backgroundColor: colors.gray[25],
        }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.primary[100],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}>
            <CloudArrowUpIcon size={32} color={colors.primary[600]} />
          </View>

          <Text variant="body" style={{ 
            color: colors.text.primary,
            fontWeight: '600',
            marginBottom: spacing.xs,
            textAlign: 'center'
          }}>
            Sélectionnez un fichier à télécharger
          </Text>

          <Text variant="caption" style={{ 
            color: colors.text.secondary,
            textAlign: 'center',
            marginBottom: spacing.lg
          }}>
            Glissez-déposez votre fichier ici ou cliquez pour parcourir
          </Text>

          <Button
            title="Parcourir les fichiers"
            variant="outline"
            onPress={handleSelectFile}
            leftIcon={<DocumentIcon size={20} color={colors.primary[600]} />}
          />

          <Text variant="caption" style={{ 
            color: colors.text.tertiary,
            marginTop: spacing.sm,
            textAlign: 'center'
          }}>
            Taille maximale : 50 MB par fichier
          </Text>
        </View>

          {/* Section 3: Aperçu (si fichier sélectionné) */}
          {formData.file && (
            <View>
              <Text variant="h3" style={{ 
                color: colors.text.primary,
                marginBottom: spacing.md,
                fontSize: 18,
                fontWeight: '600'
              }}>
                Aperçu du fichier
              </Text>

              <View style={{
                backgroundColor: colors.background.secondary,
                borderRadius: 8,
                padding: spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: colors.primary[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <DocumentIcon size={24} color={colors.primary[600]} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ 
                    color: colors.text.primary,
                    fontWeight: '600'
                  }}>
                    {/* TODO: Afficher le nom du fichier sélectionné */}
                    document-exemple.pdf
                  </Text>
                  <Text variant="caption" style={{ 
                    color: colors.text.secondary
                  }}>
                    {/* TODO: Afficher la taille du fichier */}
                    2.4 MB • PDF
                  </Text>
                </View>

                <Button
                  title="Supprimer"
                  variant="ghost"
                  size="sm"
                  onPress={() => updateFormData('file', undefined)}
                />
              </View>
            </View>
          )}
      </FormSection>
    </StandardFormModal>
  );
}


