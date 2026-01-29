import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AuthScreens from './src/screens/AuthScreens';
import LoadingScreen from './src/screens/LoadingScreen';
import FarmSelectionScreen from './src/screens/FarmSelectionScreen';
import NewSimpleNavigator from './src/navigation/NewSimpleNavigator';
import InitializationDebug from './src/components/debug/InitializationDebug';
import DatabaseConnectivityTest from './src/components/debug/DatabaseConnectivityTest';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { FarmProvider, useFarm } from './src/contexts/FarmContext';
import { NavigationProvider } from './src/contexts/NavigationContext';
import { useWebInputStyles } from './src/design-system/hooks/useWebInputStyles';
import { UnifiedInitService, type UnifiedInitResult } from './src/services/UnifiedInitService';
import { colors } from './src/design-system/colors';

/**
 * Contenu principal de l'app une fois tout initialisé
 */
function AppMainContent(): JSX.Element {
  const { error, needsSetup, refreshFarms } = useFarm();
  const [showDebug, setShowDebug] = useState(false);
  const [showDbTest, setShowDbTest] = useState(false);
  
  // Appliquer les styles web pour corriger les inputs
  useWebInputStyles();

  // Plus de mode mock - on veut la vraie connectivité !
  const isDev = process.env.NODE_ENV === 'development';
  let tapCount = 0;
  
  const handleDebugTap = () => {
    if (!isDev) return;
    
    tapCount++;
    if (tapCount >= 3) {
      setShowDebug(true);
      tapCount = 0;
    } else if (tapCount === 5) {
      // 5 taps = DB connectivity test
      setShowDbTest(true);
      tapCount = 0;
    }
    
    // Reset tap count après 2s
    setTimeout(() => { tapCount = 0; }, 2000);
  };

  // Mode debug activé
  if (showDebug) {
    return (
      <View style={{ flex: 1 }}>
        <InitializationDebug />
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            backgroundColor: '#FF3B30',
            padding: 10,
            borderRadius: 5,
          }}
          onPress={() => setShowDebug(false)}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Fermer Debug</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Mode test DB activé
  if (showDbTest) {
    return (
      <View style={{ flex: 1 }}>
        <DatabaseConnectivityTest />
        <TouchableOpacity 
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            backgroundColor: '#FF3B30',
            padding: 10,
            borderRadius: 5,
          }}
          onPress={() => setShowDbTest(false)}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Fermer Test DB</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Plus de loading screen ici - déjà géré en amont par UnifiedInitService
  // Le loading ne devrait plus être true si initialisé avec données pré-chargées

  // Erreur de chargement des fermes
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Erreur de chargement</Text>
        <Text style={styles.errorText}>{error}</Text>
        
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#16a34a' }]}
            onPress={refreshFarms}
          >
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
          
          {isDev && (
            <TouchableOpacity 
              style={[styles.button, { backgroundColor: '#f59e0b' }]}
              onPress={() => setShowDbTest(true)}
            >
              <Text style={styles.buttonText}>Test DB</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Setup requis (première ferme) - Afficher l'écran de sélection au lieu de création obligatoire
  if (needsSetup) {
    return <FarmSelectionScreen />;
  }

  // Tout est prêt, afficher l'app principale
  return (
    <NavigationProvider>
      <NewSimpleNavigator />
    </NavigationProvider>
  );
}

/**
 * Contenu de l'app avec gestion de l'authentification
 */
function AppContent(): JSX.Element {
  const { user, session } = useAuth();
  const [initState, setInitState] = useState<{
    loading: boolean;
    progress: number;
    step: string;
    result: UnifiedInitResult | null;
  }>({
    loading: true,
    progress: 0,
    step: 'Initialisation...',
    result: null,
  });
  
  // Appliquer les styles web pour corriger les inputs
  useWebInputStyles();

  // Référence pour éviter les initialisations multiples simultanées
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Initialisation unifiée au démarrage uniquement
  useEffect(() => {
    // Ne lancer qu'une seule fois au démarrage
    if (hasInitializedRef.current) {
      console.log('✅ [APP] Initialisation déjà effectuée, skip...');
      return;
    }

    hasInitializedRef.current = true;

    const initialize = async () => {
      if (isInitializingRef.current) {
        console.log('⏸️ [APP] Initialisation déjà en cours, skip...');
        return;
      }

      isInitializingRef.current = true;

      try {
        console.log('🔄 [APP] Démarrage initialisation unifiée...', {
          hasUser: !!user,
          userId: user?.id?.substring(0, 8) + '...',
        });
        
        const result = await UnifiedInitService.initialize((progress) => {
          console.log('📊 [APP] Progression:', progress.progress + '%', progress.step);
          setInitState((prev) => ({
            ...prev,
            progress: progress.progress,
            step: progress.step,
          }));
        });

        console.log('✅ [APP] Initialisation terminée:', {
          hasUser: !!result.user,
          hasFarms: result.farms.length > 0,
        });
        
        setInitState({
          loading: false,
          progress: 100,
          step: 'Terminé',
          result,
        });
      } catch (error) {
        console.error('❌ [APP] Erreur initialisation unifiée:', error);
        setInitState({
          loading: false,
          progress: 100,
          step: 'Erreur',
          result: null,
        });
      } finally {
        isInitializingRef.current = false;
      }
    };

    initialize();
  }, []); // Initialisation unique au démarrage

  // Écouter les changements d'authentification après l'initialisation
  useEffect(() => {
    // Si l'initialisation n'est pas terminée, ne rien faire
    if (!hasInitializedRef.current || initState.loading) {
      return;
    }

    // Si l'utilisateur se déconnecte, réinitialiser l'état pour rediriger vers AuthScreens
    if (!user && !session && initState.result?.user) {
      console.log('🚪 [APP] Utilisateur déconnecté, réinitialisation de l\'état...');
      setInitState({
        loading: false,
        progress: 100,
        step: 'Terminé',
        result: null,
      });
      return;
    }

    // Si l'utilisateur se connecte après l'initialisation
    if (user && session && !initState.result?.user) {
      console.log('🔄 [APP] Utilisateur connecté après initialisation, relance...');
      
      const reinitialize = async () => {
        if (isInitializingRef.current) {
          return;
        }

        isInitializingRef.current = true;

        try {
          setInitState((prev) => ({
            ...prev,
            loading: true,
            progress: 0,
            step: 'Chargement...',
          }));

          const result = await UnifiedInitService.initialize((progress) => {
            console.log('📊 [APP] Progression:', progress.progress + '%', progress.step);
            setInitState((prev) => ({
              ...prev,
              progress: progress.progress,
              step: progress.step,
            }));
          });

          console.log('✅ [APP] Ré-initialisation terminée:', {
            hasUser: !!result.user,
            hasFarms: result.farms.length > 0,
          });

          setInitState({
            loading: false,
            progress: 100,
            step: 'Terminé',
            result,
          });
        } catch (error) {
          console.error('❌ [APP] Erreur ré-initialisation:', error);
          setInitState({
            loading: false,
            progress: 100,
            step: 'Erreur',
            result: null,
          });
        } finally {
          isInitializingRef.current = false;
        }
      };

      reinitialize();
    }
  }, [user?.id, session?.access_token, initState.loading, initState.result?.user]);

  // Affichage du loading unifié
  if (initState.loading) {
    return (
      <LoadingScreen
        currentStep={initState.step}
        progress={initState.progress}
        onLoadingComplete={() => {}}
      />
    );
  }

  // Pas d'utilisateur connecté
  if (!initState.result || !initState.result.user) {
    return <AuthScreens />;
  }

  // Utilisateur connecté, initialiser FarmProvider avec les données pré-chargées
  // Note: AuthProvider est déjà fourni par App, on utilise juste useAuth() pour écouter les changements
  return (
    <FarmProvider
      initialFarms={initState.result.farms}
      initialActiveFarm={initState.result.activeFarm}
      initialNeedsSetup={initState.result.needsSetup}
    >
      <AppMainContent />
    </FarmProvider>
  );
}

/**
 * Composant racine de l'application
 * Architecture simple : SafeAreaProvider → AuthProvider → AppContent
 */
export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 32,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    backgroundColor: '#16a34a',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});