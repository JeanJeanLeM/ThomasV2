import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import SupabaseTestScreen from './src/screens/SupabaseTestScreen';

export default function App(): JSX.Element {
  const [showTests, setShowTests] = useState(false);

  if (showTests) {
    return (
      <View style={{ flex: 1 }}>
        <SupabaseTestScreen />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setShowTests(false)}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thomas V2</Text>
      <Text style={styles.subtitle}>Assistant Agricole IA</Text>
      <Text style={styles.description}>
        Application mobile française pour maraîchers avec chatbot IA intégré
      </Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>🏗️ État Configuration</Text>
        <Text style={styles.statusItem}>✅ Étape 1.1: Projet Base - Complété</Text>
        <Text style={styles.statusItem}>✅ Étape 1.2: Supabase - Complété</Text>
      </View>

      <TouchableOpacity 
        style={styles.testButton}
        onPress={() => setShowTests(true)}
      >
        <Text style={styles.testButtonText}>🧪 Tester Configuration Supabase</Text>
      </TouchableOpacity>

      <StatusBar style='auto' />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  statusContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statusItem: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 1000,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
