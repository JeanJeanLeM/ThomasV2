import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFarm, useFarmPlots, useFarmMaterials, useFarmTasks, useFarmCultures } from '../contexts/FarmContext';

/**
 * Exemple d'utilisation des données métier de la ferme active
 * Montre comment utiliser le cache des parcelles, matériels, cultures et tâches
 */
export default function FarmDataUsageExample(): JSX.Element {
  // Accès au contexte principal
  const { activeFarm, farmData, refreshFarmData, invalidateFarmData } = useFarm();
  
  // Hooks spécialisés pour données spécifiques
  const { plots } = useFarmPlots();
  const { materials } = useFarmMaterials();
  const { tasks } = useFarmTasks();
  const { cultures } = useFarmCultures();

  const handleRefresh = async () => {
    await refreshFarmData();
  };

  const handleInvalidatePlots = async () => {
    await invalidateFarmData(['plots']);
  };

  if (!activeFarm) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Aucune ferme active</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={farmData.loading} 
          onRefresh={handleRefresh}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 Données de {activeFarm.farm_name}</Text>
        <Text style={styles.subtitle}>
          Dernière mise à jour: {farmData.lastUpdated?.toLocaleTimeString() || 'Jamais'}
        </Text>
      </View>

      {/* Parcelles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🌱 Parcelles ({plots.length})</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleInvalidatePlots}
          >
            <Text style={styles.actionButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </View>
        
        {plots.length > 0 ? (
          plots.slice(0, 3).map((plot) => (
            <View key={plot.id} style={styles.item}>
              <Text style={styles.itemTitle}>{plot.name}</Text>
              <Text style={styles.itemSubtitle}>
                {plot.type} • {plot.area} {plot.unit}
              </Text>
              {plot.surfaceUnits && plot.surfaceUnits.length > 0 && (
                <Text style={styles.itemDetail}>
                  {plot.surfaceUnits.length} unité(s) de surface
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune parcelle trouvée</Text>
        )}
        
        {plots.length > 3 && (
          <Text style={styles.moreText}>... et {plots.length - 3} autres</Text>
        )}
      </View>

      {/* Matériels */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🔧 Matériels ({materials.length})</Text>
        </View>
        
        {materials.length > 0 ? (
          materials.slice(0, 3).map((material) => (
            <View key={material.id} style={styles.item}>
              <Text style={styles.itemTitle}>{material.name}</Text>
              <Text style={styles.itemSubtitle}>
                {material.category}
                {material.brand && ` • ${material.brand}`}
                {material.model && ` ${material.model}`}
              </Text>
              {material.cost && (
                <Text style={styles.itemDetail}>
                  Coût: {material.cost}€
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucun matériel trouvé</Text>
        )}
        
        {materials.length > 3 && (
          <Text style={styles.moreText}>... et {materials.length - 3} autres</Text>
        )}
      </View>

      {/* Tâches */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📝 Tâches de la semaine ({tasks.length})</Text>
        </View>
        
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <View key={task.id} style={styles.item}>
              <View style={styles.taskHeader}>
                <Text style={styles.itemTitle}>{task.title}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(task.status) }
                ]}>
                  <Text style={styles.statusText}>{task.status}</Text>
                </View>
              </View>
              <Text style={styles.itemSubtitle}>
                {new Date(task.date).toLocaleDateString()} • {task.type} • {task.priority}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune tâche cette semaine</Text>
        )}
      </View>

      {/* Cultures */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🌾 Cultures ({cultures.length})</Text>
        </View>
        
        {cultures.length > 0 ? (
          cultures.slice(0, 3).map((culture) => (
            <View key={culture.id} style={styles.item}>
              <Text style={styles.itemTitle}>{culture.name}</Text>
              <Text style={styles.itemSubtitle}>
                {culture.type} • {culture.category}
              </Text>
              {culture.description && (
                <Text style={styles.itemDetail}>{culture.description}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune culture trouvée</Text>
        )}
        
        {cultures.length > 3 && (
          <Text style={styles.moreText}>... et {cultures.length - 3} autres</Text>
        )}
      </View>

      {/* Actions globales */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.refreshButton]}
          onPress={handleRefresh}
          disabled={farmData.loading}
        >
          <Text style={styles.buttonText}>
            {farmData.loading ? 'Actualisation...' : '🔄 Actualiser tout'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.invalidateButton]}
          onPress={() => invalidateFarmData()}
        >
          <Text style={styles.buttonText}>🗑️ Vider le cache</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Fonction utilitaire pour les couleurs de statut
function getStatusColor(status: string): string {
  switch (status) {
    case 'en_attente': return '#f59e0b';
    case 'en_cours': return '#3b82f6';
    case 'terminee': return '#10b981';
    default: return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 12,
    color: '#9ca3af',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  moreText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
  },
  invalidateButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
