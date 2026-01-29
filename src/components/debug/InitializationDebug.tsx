import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFarm } from '../../contexts/FarmContext';
import { supabase } from '../../utils/supabase';
import { APIChangeDetector } from '../../utils/api-change-detector';

/**
 * Composant de debug pour diagnostiquer les problèmes d'initialisation
 * À utiliser temporairement pour identifier les blocages
 */
export default function InitializationDebug(): JSX.Element {
  const { user, loading: authLoading, clearCorruptedSession } = useAuth();
  const { farms, activeFarm, loading: farmLoading, error, needsSetup, refreshFarms } = useFarm();
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  // Tests de diagnostic
  const runDiagnostics = async () => {
    console.log('🔍 [DEBUG] Démarrage diagnostics...');
    const results: Record<string, string> = {};

    try {
      // Test 1: Connexion Supabase
      console.log('🔍 [DEBUG] Test connexion Supabase...');
      const { error: connectionError } = await supabase.from('farms').select('count').limit(1);
      results.supabase = connectionError ? `❌ ${connectionError.message}` : '✅ OK';

      // Test 2: Session utilisateur
      console.log('🔍 [DEBUG] Test session utilisateur...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      results.session = session ? `✅ Connecté: ${session.user?.email}` : `❌ ${sessionError?.message || 'Pas de session'}`;

      // Test 3: Profil utilisateur
      if (user) {
        console.log('🔍 [DEBUG] Test profil utilisateur...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        results.profile = profile 
          ? `✅ Profil trouvé, ferme active: ${profile.latest_active_farm_id || 'aucune'}`
          : `❌ ${profileError?.message || 'Profil non trouvé'}`;
      }

      // Test 4: Fonction get_user_farms
      if (user) {
        console.log('🔍 [DEBUG] Test fonction get_user_farms...');
        const { data: userFarms, error: farmsError } = await supabase.rpc('get_user_farms');
        results.get_user_farms = userFarms 
          ? `✅ ${userFarms.length} ferme(s) trouvée(s)`
          : `❌ ${farmsError?.message || 'Erreur RPC'}`;
      }

      // Test 5: Fermes directes
      if (user) {
        console.log('🔍 [DEBUG] Test requête fermes directe...');
        const { data: directFarms, error: directError } = await supabase
          .from('farms')
          .select('*')
          .eq('owner_id', user.id);
        
        results.direct_farms = directFarms 
          ? `✅ ${directFarms.length} ferme(s) en propriété directe`
          : `❌ ${directError?.message || 'Erreur requête directe'}`;
      }

    } catch (error) {
      console.error('❌ [DEBUG] Erreur diagnostics:', error);
      results.diagnostics = `❌ Erreur: ${error instanceof Error ? error.message : 'Inconnue'}`;
    }

    setTestResults(results);
    console.log('✅ [DEBUG] Diagnostics terminés:', results);
  };

  // Collecte d'infos de debug
  useEffect(() => {
    const info = {
      // États d'authentification
      auth: {
        user: user ? { id: user.id, email: user.email } : null,
        loading: authLoading,
      },
      
      // États des fermes
      farms: {
        count: farms.length,
        activeFarm: activeFarm ? { id: activeFarm.farm_id, name: activeFarm.farm_name } : null,
        loading: farmLoading,
        error,
        needsSetup,
      },
      
      // États généraux
      environment: {
        nodeEnv: process.env.NODE_ENV,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      },
      
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setDebugInfo(info);
  }, [user, authLoading, farms, activeFarm, farmLoading, error, needsSetup]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Debug Initialisation</Text>
      
      {/* États actuels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 États actuels</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo, null, 2)}</Text>
      </View>

      {/* Tests de diagnostic */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Tests de diagnostic</Text>
        
        <TouchableOpacity style={styles.button} onPress={runDiagnostics}>
          <Text style={styles.buttonText}>Lancer diagnostics</Text>
        </TouchableOpacity>
        
        {Object.keys(testResults).length > 0 && (
          <View style={styles.results}>
            {Object.entries(testResults).map(([test, result]) => (
              <Text key={test} style={styles.testResult}>
                <Text style={styles.testName}>{test}:</Text> {result}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Actions de debug */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠️ Actions de debug</Text>
        
        <TouchableOpacity 
          style={[styles.button, styles.refreshButton]} 
          onPress={refreshFarms}
          disabled={farmLoading}
        >
          <Text style={styles.buttonText}>
            {farmLoading ? 'Rechargement...' : 'Recharger fermes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearCorruptedSession}
        >
          <Text style={styles.buttonText}>Nettoyer session</Text>
        </TouchableOpacity>
      </View>

      {/* Logs récents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Instructions</Text>
        <Text style={styles.instructions}>
          1. Vérifiez la console développeur pour les logs détaillés{'\n'}
          2. Lancez les diagnostics pour identifier le problème{'\n'}
          3. Si blocage, essayez "Nettoyer session"{'\n'}
          4. Si profil manquant, relancez l'app{'\n'}
          5. Vérifiez que les migrations DB sont appliquées
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#a0a0a0',
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  refreshButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  results: {
    marginTop: 12,
  },
  testResult: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  testName: {
    fontWeight: '600',
    color: '#007AFF',
  },
  instructions: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
});
