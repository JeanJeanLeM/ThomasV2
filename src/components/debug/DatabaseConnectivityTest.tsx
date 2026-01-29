import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SupabaseDiagnostics } from '../../utils/supabase-diagnostics';
import { supabase } from '../../utils/supabase';

/**
 * Composant de test de connectivité Database en temps réel
 */
export default function DatabaseConnectivityTest(): JSX.Element {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    setTestResults(null);
    
    try {
      console.log('🔍 [DB-TEST] Lancement tests connectivité...');
      
      // Test complet
      const results = await SupabaseDiagnostics.runFullDiagnostic();
      
      // Test méthodes alternatives
      await SupabaseDiagnostics.testConnectivityMethods();
      
      // Test spécifique table profiles
      const profileTest = await testProfilesAccess();
      
      setTestResults({
        ...results,
        profilesAccess: profileTest,
        timestamp: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error('❌ [DB-TEST] Erreur tests:', error);
      setTestResults({
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testProfilesAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return { working: false, error: 'Pas de session utilisateur' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, latest_active_farm_id')
        .eq('id', session.user.id)
        .single();

      return {
        working: !error,
        data: data ? { hasProfile: true, hasFarmId: !!data.latest_active_farm_id } : null,
        error: error?.message
      };
      
    } catch (error) {
      return { working: false, error: error.message };
    }
  };

  const renderResult = (label: string, result: any) => {
    if (!result) return null;
    
    const isWorking = result.working;
    const color = isWorking ? '#10b981' : '#ef4444';
    
    return (
      <View style={[styles.resultItem, { borderLeftColor: color }]}>
        <Text style={[styles.resultLabel, { color }]}>
          {isWorking ? '✅' : '❌'} {label}
        </Text>
        {result.latency && (
          <Text style={styles.resultDetail}>Latence: {result.latency}ms</Text>
        )}
        {result.error && (
          <Text style={[styles.resultDetail, styles.errorText]}>
            Erreur: {result.error}
          </Text>
        )}
        {result.data && (
          <Text style={styles.resultDetail}>
            Données: {JSON.stringify(result.data)}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Test Connectivité Database</Text>
      
      <TouchableOpacity
        style={[styles.testButton, { opacity: loading ? 0.6 : 1 }]}
        onPress={runTests}
        disabled={loading}
      >
        <Text style={styles.testButtonText}>
          {loading ? 'Tests en cours...' : '🚀 Lancer Tests Complets'}
        </Text>
      </TouchableOpacity>
      
      {testResults && (
        <ScrollView style={styles.results}>
          <Text style={styles.resultsTitle}>
            📊 Résultats ({testResults.timestamp})
          </Text>
          
          {testResults.error ? (
            <Text style={styles.errorText}>❌ Erreur globale: {testResults.error}</Text>
          ) : (
            <>
              {renderResult('API Auth', testResults.auth)}
              {renderResult('API Database', testResults.database)}
              {renderResult('RPC Functions', testResults.rpc)}
              {renderResult('Accès Table Profiles', testResults.profilesAccess)}
            </>
          )}
          
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsTitle}>🛠️ Actions Recommandées:</Text>
            
            {!testResults.database?.working && (
              <Text style={styles.actionItem}>
                • Vérifier firewall/proxy d'entreprise
              </Text>
            )}
            
            {testResults.auth?.working && !testResults.database?.working && (
              <Text style={styles.actionItem}>
                • API Auth OK mais Database KO = Problème réseau spécifique
              </Text>
            )}
            
            {!testResults.profilesAccess?.working && (
              <Text style={styles.actionItem}>
                • Vérifier permissions RLS table profiles
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultDetail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  errorText: {
    color: '#ef4444',
  },
  actionsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  actionItem: {
    fontSize: 14,
    color: '#ffa500',
    marginBottom: 6,
  },
});
