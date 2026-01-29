import React, { useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFarm } from '../contexts/FarmContext';

/**
 * Écran de création de la première ferme
 * Affiché quand needsSetup = true
 */
export default function FarmSetupScreen(): JSX.Element {
  const { createFirstFarm, loading, error } = useFarm();
  const [farmData, setFarmData] = useState({
    name: '',
    description: '',
    farm_type: 'autre' as const
  });

  const handleCreateFarm = async () => {
    if (!farmData.name.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour votre ferme');
      return;
    }
    
    try {
      await createFirstFarm({
        name: farmData.name.trim(),
        description: farmData.description.trim() || 'Ma première ferme créée avec Thomas',
        farm_type: farmData.farm_type
      });
    } catch (err) {
      console.error('Erreur création ferme:', err);
    }
  };

  const farmTypes = [
    { value: 'maraichage', label: 'Maraîchage' },
    { value: 'arboriculture', label: 'Arboriculture' },
    { value: 'grandes_cultures', label: 'Grandes cultures' },
    { value: 'mixte', label: 'Mixte' },
    { value: 'autre', label: 'Autre' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌱 Bienvenue dans Thomas V2</Text>
        <Text style={styles.subtitle}>Créons votre première ferme pour commencer</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
        </View>
      )}
      
      <View style={styles.form}>
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Nom de votre ferme *</Text>
          <TextInput
            style={styles.input}
            value={farmData.name}
            onChangeText={(text) => setFarmData(prev => ({ ...prev, name: text }))}
            placeholder="Ex: Ferme du Soleil Levant"
            placeholderTextColor="#9ca3af"
            editable={!loading}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={farmData.description}
            onChangeText={(text) => setFarmData(prev => ({ ...prev, description: text }))}
            placeholder="Décrivez votre ferme en quelques mots..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            editable={!loading}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Type de ferme</Text>
          <View style={styles.typeSelector}>
            {farmTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeOption,
                  farmData.farm_type === type.value && styles.typeOptionSelected
                ]}
                onPress={() => setFarmData(prev => ({ ...prev, farm_type: type.value as any }))}
                disabled={loading}
              >
                <Text style={[
                  styles.typeOptionText,
                  farmData.farm_type === type.value && styles.typeOptionTextSelected
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.createButton,
            { 
              backgroundColor: farmData.name.trim() && !loading ? '#16a34a' : '#9ca3af',
              opacity: loading ? 0.7 : 1
            }
          ]}
          onPress={handleCreateFarm}
          disabled={!farmData.name.trim() || loading}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Création en cours...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>🚀 Créer ma ferme</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#65a30d',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginBottom: 24,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#374151',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  typeOptionSelected: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeOptionTextSelected: {
    color: 'white',
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 40,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
