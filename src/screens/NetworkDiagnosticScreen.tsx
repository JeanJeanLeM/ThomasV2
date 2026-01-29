/**
 * Écran de diagnostic réseau Android
 * Accessible via triple-tap en dev ou menu Debug
 * Capture les erreurs détaillées et aide au diagnostic
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Clipboard,
  Alert,
  Platform,
} from 'react-native';
import { supabase, SUPABASE_CONFIG } from '@/utils/supabase';
import { ENV_CLIENT } from '@/utils/env';
import { Ionicons } from '@expo/vector-icons';

interface DiagnosticTest {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  details?: string;
  duration?: number;
  error?: any;
}

export default function NetworkDiagnosticScreen({ onClose }: { onClose?: () => void }) {
  const [tests, setTests] = useState<DiagnosticTest[]>([]);
  const [running, setRunning] = useState(false);
  const [fullLog, setFullLog] = useState<string[]>([]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
    }[type];
    const log = `[${timestamp}] ${emoji} ${message}`;
    console.log(log);
    setFullLog(prev => [...prev, log]);
  };

  const updateTest = (id: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev =>
      prev.map(test => (test.id === id ? { ...test, ...updates } : test))
    );
  };

  const runDiagnostics = async () => {
    setRunning(true);
    setFullLog([]);
    addLog('🚀 Démarrage des diagnostics réseau Android', 'info');

    // Initialiser les tests
    const initialTests: DiagnosticTest[] = [
      { id: 'config', name: '📋 Configuration', status: 'pending' },
      { id: 'env', name: '🔑 Variables d\'environnement', status: 'pending' },
      { id: 'network', name: '🌐 Connectivité réseau', status: 'pending' },
      { id: 'supabase-ping', name: '🔌 Ping Supabase', status: 'pending' },
      { id: 'supabase-auth', name: '🔐 Endpoint Auth', status: 'pending' },
      { id: 'supabase-db', name: '💾 Endpoint Database', status: 'pending' },
    ];
    setTests(initialTests);

    // Test 1: Configuration
    await runTest('config', async () => {
      addLog('Test 1: Vérification configuration...', 'info');
      
      const config = {
        platform: Platform.OS,
        version: Platform.Version,
        supabaseUrl: SUPABASE_CONFIG.url,
        anonKeyPrefix: SUPABASE_CONFIG.anonKey?.substring(0, 30) + '...',
      };

      addLog(`Platform: ${config.platform} ${config.version}`, 'info');
      addLog(`Supabase URL: ${config.supabaseUrl}`, 'info');
      
      if (!config.supabaseUrl || config.supabaseUrl.includes('your-project')) {
        throw new Error('URL Supabase non configurée');
      }
      
      if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey.includes('your-anon-key')) {
        throw new Error('Clé Supabase non configurée');
      }

      return {
        message: 'Configuration OK',
        details: JSON.stringify(config, null, 2),
      };
    });

    // Test 2: Variables d'environnement
    await runTest('env', async () => {
      addLog('Test 2: Vérification variables d\'environnement...', 'info');
      
      const envVars = {
        SUPABASE_URL: ENV_CLIENT.SUPABASE_URL,
        SUPABASE_ANON_KEY: ENV_CLIENT.SUPABASE_ANON_KEY?.substring(0, 30) + '...',
        OPENAI_MODEL: ENV_CLIENT.OPENAI_MODEL,
        isWeb: typeof window !== 'undefined',
      };

      addLog(`Variables chargées: ${Object.keys(envVars).length}`, 'info');

      // Vérifier si les variables sont compilées dans l'APK
      if (!ENV_CLIENT.SUPABASE_URL) {
        throw new Error('❌ CRITIQUE: SUPABASE_URL non chargée dans l\'APK !');
      }

      if (!ENV_CLIENT.SUPABASE_ANON_KEY) {
        throw new Error('❌ CRITIQUE: SUPABASE_ANON_KEY non chargée dans l\'APK !');
      }

      return {
        message: 'Variables d\'environnement OK',
        details: JSON.stringify(envVars, null, 2),
      };
    });

    // Test 3: Connectivité réseau basique
    await runTest('network', async () => {
      addLog('Test 3: Test connectivité réseau...', 'info');
      
      try {
        // Test avec fetch natif (pas Supabase)
        const startTime = Date.now();
        const response = await fetch('https://www.google.com', {
          method: 'HEAD',
          timeout: 10000,
        } as any);
        const duration = Date.now() - startTime;

        addLog(`Connexion Internet OK (${duration}ms)`, 'success');

        return {
          message: `Internet accessible (${duration}ms)`,
          details: `Status: ${response.status}\nHeaders: ${response.headers.get('date')}`,
        };
      } catch (error: any) {
        addLog(`Erreur réseau basique: ${error.message}`, 'error');
        throw new Error(
          `Pas d'accès Internet: ${error.message}\n` +
          `Code: ${error.code || 'N/A'}\n` +
          `Type: ${error.name || 'N/A'}`
        );
      }
    });

    // Test 4: Ping Supabase
    await runTest('supabase-ping', async () => {
      addLog('Test 4: Ping Supabase...', 'info');
      
      try {
        const startTime = Date.now();
        const url = `${ENV_CLIENT.SUPABASE_URL}/auth/v1/health`;
        addLog(`Tentative de connexion à: ${url}`, 'info');
        
        const response = await fetch(url, {
          method: 'GET',
          timeout: 15000,
        } as any);
        const duration = Date.now() - startTime;

        addLog(`Supabase accessible (${duration}ms)`, 'success');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.text();
        
        return {
          message: `Supabase accessible (${duration}ms)`,
          details: `URL: ${url}\nStatus: ${response.status}\nResponse: ${data}`,
        };
      } catch (error: any) {
        addLog(`❌ Erreur ping Supabase: ${error.message}`, 'error');
        throw new Error(
          `Impossible de contacter Supabase:\n` +
          `URL: ${ENV_CLIENT.SUPABASE_URL}\n` +
          `Erreur: ${error.message}\n` +
          `Code: ${error.code || 'N/A'}\n` +
          `Type: ${error.name || 'N/A'}\n\n` +
          `Causes possibles:\n` +
          `1. Permissions Android manquantes (INTERNET)\n` +
          `2. Firewall/proxy bloque Supabase\n` +
          `3. Certificat SSL invalide\n` +
          `4. URL Supabase incorrecte`
        );
      }
    });

    // Test 5: Auth endpoint
    await runTest('supabase-auth', async () => {
      addLog('Test 5: Test endpoint Auth...', 'info');
      
      try {
        const startTime = Date.now();
        const { data, error } = await supabase.auth.getSession();
        const duration = Date.now() - startTime;

        if (error) {
          // Si c'est une erreur d'auth normale (pas de session), c'est OK
          if (error.message.includes('session') || error.message.includes('No session')) {
            addLog(`Endpoint Auth OK (${duration}ms) - Pas de session`, 'success');
            return {
              message: `Endpoint Auth accessible (${duration}ms)`,
              details: `Session: Aucune (normal)\nErreur: ${error.message}`,
            };
          }
          throw error;
        }

        addLog(`Endpoint Auth OK (${duration}ms)`, 'success');

        return {
          message: `Endpoint Auth OK (${duration}ms)`,
          details: `Session: ${data.session ? 'Existante' : 'Aucune'}`,
        };
      } catch (error: any) {
        addLog(`❌ Erreur Auth endpoint: ${error.message}`, 'error');
        throw new Error(
          `Endpoint Auth échoue:\n` +
          `Erreur: ${error.message}\n` +
          `Code: ${error.code || error.status || 'N/A'}\n` +
          `Détails: ${JSON.stringify(error.details || {})}\n\n` +
          `Si "Network request failed":\n` +
          `→ Permissions Android manquantes\n` +
          `→ Firewall bloque les requêtes\n` +
          `→ Variables d'environnement non compilées`
        );
      }
    });

    // Test 6: Database endpoint
    await runTest('supabase-db', async () => {
      addLog('Test 6: Test endpoint Database...', 'info');
      
      try {
        const startTime = Date.now();
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        const duration = Date.now() - startTime;

        // RLS error est OK - ça prouve que le réseau fonctionne
        if (error && (error.message.includes('permission') || error.message.includes('policy'))) {
          addLog(`Endpoint DB OK (${duration}ms) - RLS actif`, 'success');
          return {
            message: `Endpoint Database OK (${duration}ms)`,
            details: `Erreur RLS (normal): ${error.message}`,
          };
        }

        if (error) {
          throw error;
        }

        addLog(`Endpoint DB OK (${duration}ms)`, 'success');

        return {
          message: `Endpoint Database OK (${duration}ms)`,
          details: `Résultats: ${data?.length || 0} lignes`,
        };
      } catch (error: any) {
        addLog(`❌ Erreur Database endpoint: ${error.message}`, 'error');
        throw new Error(
          `Endpoint Database échoue:\n` +
          `Erreur: ${error.message}\n` +
          `Code: ${error.code || 'N/A'}\n` +
          `Hint: ${error.hint || 'N/A'}`
        );
      }
    });

    setRunning(false);
    addLog('🏁 Diagnostics terminés', 'success');
  };

  const runTest = async (
    id: string,
    testFn: () => Promise<{ message: string; details?: string }>
  ) => {
    updateTest(id, { status: 'running' });
    const startTime = Date.now();

    try {
      const result = await testFn();
      const duration = Date.now() - startTime;

      updateTest(id, {
        status: 'success',
        message: result.message,
        details: result.details,
        duration,
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMessage = error.message || String(error);
      const errorDetails = JSON.stringify(error, null, 2);

      updateTest(id, {
        status: 'error',
        message: errorMessage,
        details: errorDetails,
        duration,
        error,
      });

      addLog(`Test ${id} échoué: ${errorMessage}`, 'error');
    }
  };

  const copyLogsToClipboard = () => {
    const summary = tests
      .map(
        test =>
          `${test.name}: ${test.status.toUpperCase()}\n` +
          `  Message: ${test.message || 'N/A'}\n` +
          `  Durée: ${test.duration || 0}ms\n` +
          (test.details ? `  Détails: ${test.details}\n` : '')
      )
      .join('\n');

    const fullReport =
      `=== DIAGNOSTIC RÉSEAU ANDROID ===\n` +
      `Date: ${new Date().toLocaleString()}\n` +
      `Platform: ${Platform.OS} ${Platform.Version}\n\n` +
      `=== RÉSUMÉ DES TESTS ===\n${summary}\n\n` +
      `=== LOGS COMPLETS ===\n${fullLog.join('\n')}`;

    Clipboard.setString(fullReport);
    Alert.alert('✅ Copié', 'Rapport copié dans le presse-papier');
  };

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="#22c55e" />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color="#ef4444" />;
      case 'warning':
        return <Ionicons name="warning" size={24} color="#f59e0b" />;
      case 'running':
        return <ActivityIndicator size="small" color="#3b82f6" />;
      case 'pending':
        return <Ionicons name="ellipse-outline" size={24} color="#9ca3af" />;
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🔬 Diagnostic Réseau</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Tests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tests de connectivité</Text>
          {tests.map(test => (
            <View key={test.id} style={styles.testItem}>
              <View style={styles.testHeader}>
                {getStatusIcon(test.status)}
                <Text style={styles.testName}>{test.name}</Text>
                {test.duration && (
                  <Text style={styles.testDuration}>{test.duration}ms</Text>
                )}
              </View>
              {test.message && (
                <Text
                  style={[
                    styles.testMessage,
                    test.status === 'error' && styles.errorMessage,
                  ]}
                >
                  {test.message}
                </Text>
              )}
              {test.details && (
                <Text style={styles.testDetails}>{test.details}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs détaillés</Text>
          <View style={styles.logContainer}>
            {fullLog.map((log, index) => (
              <Text key={index} style={styles.logLine}>
                {log}
              </Text>
            ))}
          </View>
        </View>

        {/* Résumé */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Réussis:</Text>
              <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                {tests.filter(t => t.status === 'success').length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Échoués:</Text>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                {tests.filter(t => t.status === 'error').length}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avertissements:</Text>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                {tests.filter(t => t.status === 'warning').length}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={runDiagnostics}
          disabled={running}
        >
          {running ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.buttonText}>Relancer</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={copyLogsToClipboard}
        >
          <Ionicons name="copy-outline" size={20} color="#374151" />
          <Text style={[styles.buttonText, { color: '#374151' }]}>
            Copier rapport
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  testItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  testDuration: {
    fontSize: 12,
    color: '#6b7280',
  },
  testMessage: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 32,
    marginBottom: 4,
  },
  errorMessage: {
    color: '#ef4444',
  },
  testDetails: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 32,
    fontFamily: 'monospace',
  },
  logContainer: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    maxHeight: 300,
  },
  logLine: {
    fontSize: 11,
    color: '#e5e7eb',
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});




