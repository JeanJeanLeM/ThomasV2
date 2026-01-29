import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Platform } from 'react-native';
import InitializationDebug from './InitializationDebug';
import DatabaseConnectivityTest from './DatabaseConnectivityTest';
import { APIChangeDetector } from '../../utils/api-change-detector';
import { DirectSupabaseService } from '../../services/DirectSupabaseService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase';

/**
 * Bouton DevTools flottant pour accéder aux diagnostics en développement
 */
export default function DevToolsButton(): JSX.Element | null {
  const [showMenu, setShowMenu] = useState(false);
  const [activeTest, setActiveTest] = useState<'init' | 'db' | 'api' | null>(null);
  const { user } = useAuth();
  
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) return null;

  const runQuickAPITest = async () => {
    console.log('🚀 [DEV-TOOLS] Lancement test API rapide...');
    
    try {
      const apiTest = await APIChangeDetector.detectAPIChanges();
      const tableTest = await APIChangeDetector.testCriticalTables();
      
      console.log('📊 [DEV-TOOLS] Résultats API:', apiTest);
      console.log('📋 [DEV-TOOLS] Résultats Tables:', tableTest);
      
      alert(`API Test Results:\n\nAuth API: ${apiTest.authAPI.working ? 'OK' : 'KO'}\nREST API: ${apiTest.restAPI.working ? 'OK' : 'KO'}\nRPC API: ${apiTest.realtimeAPI.working ? 'OK' : 'KO'}\n\nTables:\nprofiles: ${tableTest.profiles ? 'OK' : 'KO'}\nfarms: ${tableTest.farms ? 'OK' : 'KO'}\n\nProblèmes: ${apiTest.possibleChanges.length}`);
      
    } catch (error) {
      console.error('❌ [DEV-TOOLS] Erreur test API:', error);
      alert(`Erreur Test API: ${error.message}`);
    }
  };

  if (activeTest) {
    return (
      <Modal visible={true} animationType="slide">
        <View style={styles.modal}>
          {activeTest === 'init' && <InitializationDebug />}
          {activeTest === 'db' && <DatabaseConnectivityTest />}
          
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setActiveTest(null)}
          >
            <Text style={styles.closeButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.devButton}
        onPress={() => setShowMenu(!showMenu)}
      >
        <Text style={styles.devButtonText}>🔧</Text>
      </TouchableOpacity>
      
      {showMenu && (
        <View style={styles.menu}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setActiveTest('init')}
          >
            <Text style={styles.menuText}>🔍 Debug Init</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => setActiveTest('db')}
          >
            <Text style={styles.menuText}>🗄️ Test DB</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={runQuickAPITest}
          >
            <Text style={styles.menuText}>⚡ Test API</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={async () => {
              console.log('🧪 [DEV-TOOLS] Test requêtes DIRECT...');
              
              try {
                // Récupérer l'utilisateur actuel depuis useAuth (fonctionne sur web et mobile)
                const userId = user?.id;
                
                if (!userId) {
                  alert('Utilisateur non connecté');
                  return;
                }
                
                console.log('🧪 [DEV-TOOLS] Test requêtes DIRECT pour utilisateur:', userId.substring(0, 8) + '...');
                
                // Test profil via fetch direct
                const profileResult = await DirectSupabaseService.getUserProfile(userId);
                console.log('👤 [DIRECT-TEST] Profil utilisateur:', profileResult);
                
                // Test fermes via fetch direct  
                const farmsResult = await DirectSupabaseService.getUserFarms(userId);
                console.log('🏢 [DIRECT-TEST] Fermes utilisateur:', farmsResult);
                
                // Test RPC via POST direct
                const rpcResult = await DirectSupabaseService.directRPC('get_user_farms');
                console.log('⚙️ [DIRECT-TEST] RPC get_user_farms:', rpcResult);
                
                const profileOK = !profileResult.error;
                const farmsOK = !farmsResult.error;
                const rpcOK = !rpcResult.error;
                const farmsCount = farmsResult.data?.length || 0;
                
                alert(`✅ FETCH DIRECT FONCTIONNE !\n\nProfil: ${profileOK ? '✅ OK' : '❌ KO'}\nFermes: ${farmsOK ? '✅ OK' : '❌ KO'} (${farmsCount} fermes)\nRPC: ${rpcOK ? '✅ OK' : '❌ KO'}\n\n${profileOK && farmsOK && rpcOK ? 'TOUTES LES REQUETES MARCHENT !' : 'Voir console pour erreurs'}`);
                
              } catch (error) {
                console.error('❌ [DEV-TOOLS] Exception test direct:', error);
                alert(`Erreur Test Direct: ${error.message}`);
              }
              
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuText}>🚀 Test DIRECT</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('🔄 [DEV-TOOLS] Rechargement app...');
              // window.location.reload() ne fonctionne que sur web
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.location.reload();
              } else {
                alert('Rechargement non disponible sur mobile. Veuillez redémarrer l\'app manuellement.');
              }
            }}
          >
            <Text style={styles.menuText}>🔄 Recharger App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.clear();
              setShowMenu(false);
            }}
          >
            <Text style={styles.menuText}>🧹 Clear Console</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 1000,
  },
  devButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  devButtonText: {
    fontSize: 24,
    color: 'white',
  },
  menu: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    padding: 8,
    minWidth: 150,
  },
  menuItem: {
    padding: 12,
    borderRadius: 4,
  },
  menuText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  modal: {
    flex: 1,
    backgroundColor: 'black',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 6,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
