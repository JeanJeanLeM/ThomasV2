import React, { useState } from 'react';
import { View, Platform, Alert } from 'react-native';
import { StandardFormModal, FormSection, RowFields, FieldWrapper } from '../StandardFormModal';
import { EnhancedInput } from '../EnhancedInput';
import { Button } from '../Button';
import { Text } from '../Text';
import { colors } from '../../colors';
import { spacing } from '../../spacing';

/**
 * 🧪 MODAL DE TEST POUR VÉRIFIER LES CORRECTIONS
 * 
 * ✅ TESTE :
 * - Background gris vs champs blancs (contraste)
 * - Bordures uniques et visibles
 * - Pas de doubles bordures
 * - Focus states
 * - Différents types de champs
 */

export interface FormTestModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FormTestModal: React.FC<FormTestModalProps> = ({
  visible,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    text: 'Texte de test',
    email: 'test@exemple.com',
    number: '123',
    multiline: 'Texte multiligne\nLigne 2\nLigne 3',
    required: '',
    error: 'Champ avec erreur',
  });
  const [errors, setErrors] = useState({
    error: 'Ceci est un message d\'erreur de test',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTest = () => {
    if (Platform.OS === 'web') {
      console.log('🧪 Test des formulaires - Données:', formData);
    } else {
      Alert.alert('Test', 'Données collectées avec succès');
    }
  };

  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title="🧪 Test des Corrections de Formulaire"
      primaryAction={{
        title: 'Tester',
        onPress: handleTest,
      }}
      secondaryAction={{
        title: 'Fermer',
        onPress: onClose,
      }}
      infoBanner={{
        text: 'Ce formulaire teste les corrections : background gris, champs blancs, bordures uniques',
        type: 'info',
      }}
    >
      
      {/* Section Test des types de champs */}
      <FormSection 
        title="Test des types de champs"
        description="Vérifiez que tous les champs ont des bordures visibles et uniques"
      >
        <EnhancedInput
          label="Champ texte standard"
          placeholder="Tapez du texte..."
          value={formData.text}
          onChangeText={(value) => updateFormData('text', value)}
          hint="Ce champ doit avoir une bordure grise visible"
        />

        <EnhancedInput
          label="Email"
          placeholder="votre@email.com"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          keyboardType="email-address"
          hint="Bordure bleue au focus"
        />

        <EnhancedInput
          label="Nombre"
          placeholder="123"
          value={formData.number}
          onChangeText={(value) => updateFormData('number', value)}
          keyboardType="numeric"
          hint="Clavier numérique"
        />

        <EnhancedInput
          label="Champ obligatoire"
          placeholder="Ce champ est requis"
          value={formData.required}
          onChangeText={(value) => updateFormData('required', value)}
          required
          hint="Astérisque rouge pour indiquer le caractère obligatoire"
        />

        <EnhancedInput
          label="Champ avec erreur"
          placeholder="Ce champ a une erreur"
          value={formData.error}
          onChangeText={(value) => updateFormData('error', value)}
          error={errors.error}
          hint="Bordure rouge pour les erreurs"
        />
      </FormSection>

      {/* Section Test multiligne */}
      <FormSection 
        title="Test multiligne"
        description="Vérifiez les champs de texte étendus"
      >
        <EnhancedInput
          label="Texte multiligne"
          placeholder="Tapez plusieurs lignes..."
          value={formData.multiline}
          onChangeText={(value) => updateFormData('multiline', value)}
          multiline
          numberOfLines={4}
          hint="Zone de texte extensible avec bordures nettes"
        />
      </FormSection>

      {/* Section Test en ligne */}
      <FormSection 
        title="Test champs en ligne"
        description="Vérifiez l'alignement côte à côte"
      >
        <RowFields>
          <FieldWrapper flex={1}>
            <EnhancedInput
              label="Gauche"
              placeholder="Champ 1"
              value=""
              onChangeText={() => {}}
              hint="Champ de gauche"
            />
          </FieldWrapper>
          
          <FieldWrapper flex={2}>
            <EnhancedInput
              label="Droite (plus large)"
              placeholder="Champ 2"
              value=""
              onChangeText={() => {}}
              hint="Champ de droite"
            />
          </FieldWrapper>
        </RowFields>
      </FormSection>

      {/* Section Diagnostic visuel */}
      <FormSection 
        title="Diagnostic visuel"
        description="Points à vérifier"
      >
        <View style={{
          backgroundColor: colors.primary[50],
          padding: spacing.md,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary[600],
        }}>
          <Text variant="label" style={{ 
            color: colors.primary[700],
            marginBottom: spacing.sm,
            fontWeight: '600',
          }}>
            ✅ Points à vérifier :
          </Text>
          <Text variant="bodySmall" style={{ color: colors.primary[600] }}>
            • Background de la page : GRIS{'\n'}
            • Background des champs : BLANC{'\n'}
            • Bordures : UNE SEULE par champ{'\n'}
            • Bordures : VISIBLES (gris foncé){'\n'}
            • Focus : Bordure BLEUE{'\n'}
            • Erreur : Bordure ROUGE{'\n'}
            • Ombres : LÉGÈRES sous les champs
          </Text>
        </View>

        <View style={{
          backgroundColor: colors.semantic.error + '15',
          padding: spacing.md,
          borderRadius: 8,
          borderLeftWidth: 4,
          borderLeftColor: colors.semantic.error,
        }}>
          <Text variant="label" style={{ 
            color: colors.semantic.error,
            marginBottom: spacing.sm,
            fontWeight: '600',
          }}>
            ❌ Problèmes à éviter :
          </Text>
          <Text variant="bodySmall" style={{ color: colors.semantic.error }}>
            • Fond blanc partout (pas de contraste){'\n'}
            • Doubles bordures (native + React Native){'\n'}
            • Champs invisibles{'\n'}
            • Bordures trop claires
          </Text>
        </View>
      </FormSection>
    </StandardFormModal>
  );
};











