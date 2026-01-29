import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Screen, Card, Input, Button, Text } from '@/design-system/components';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { authService } from '@/services/auth';
import NetworkDiagnosticScreen from './NetworkDiagnosticScreen';

type AuthMode = 'signin' | 'signup';

const AuthScreens: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  // 5 taps sur le logo pour ouvrir le diagnostic
  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 5) {
      setShowDiagnostic(true);
      setTapCount(0);
    }
    
    // Reset après 2 secondes
    setTimeout(() => setTapCount(0), 2000);
  };

  const handleSignInEmail = async () => {
    resetFeedback();
    setLoading(true);
    try {
      const result = await authService.signInWithEmail(email, password);
      if (result.success) {
        setMessage('Connexion réussie. Bienvenue dans Thomas V2.');
      } else {
        // Message d'erreur précis sans détails techniques
        const errorMessage = result.error?.message ?? 'Impossible de vous connecter.';
        setError(errorMessage);
      }
    } catch (e: any) {
      // En cas d'exception, afficher un message générique
      setError('Erreur de connexion. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    resetFeedback();
    setLoading(true);
    try {
      const result = await authService.signUp(email, password, {
        firstName,
        lastName,
      });

      if (result.success) {
        setMessage(
          "Inscription réussie. Vérifiez votre email pour confirmer votre compte."
        );
      } else {
        // Message d'erreur précis sans détails techniques
        const errorMessage = result.error?.message ?? "Impossible de créer le compte.";
        setError(errorMessage);
      }
    } catch (e: any) {
      // En cas d'exception, afficher un message générique
      setError('Erreur lors de l\'inscription. Vérifiez votre réseau et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    resetFeedback();
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setMessage(
        'Un email de réinitialisation de mot de passe vient de vous être envoyé.'
      );
    } catch (e: any) {
      setError(
        e?.message ??
          'Impossible d’envoyer l’email de réinitialisation pour le moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    resetFeedback();
    setLoading(true);
    try {
      const result = await authService.signInWithGoogle();
      if (result.success) {
        setMessage(
          'Redirection vers Google… Terminez la connexion dans le navigateur.'
        );
      } else {
        setError(result.error?.message ?? 'La connexion Google a échoué.');
      }
    } catch (e: any) {
      setError(
        e?.message ??
          'Erreur inattendue pendant la tentative de connexion avec Google.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderHero = () => (
    <View style={styles.heroContainer}>


      <Text variant="h2" color={colors.text.primary} style={styles.heroTitle}>
        Thomas V2
      </Text>
      <Text variant="bodySmall" color={colors.gray[500]} align="center">
        Assistant agricole IA pour les maraîchers français.
      </Text>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { id: 'signin', label: 'Connexion' },
        { id: 'signup', label: 'Inscription' },
      ].map(tab => {
        const isActive = mode === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setMode(tab.id as AuthMode)}
            style={[styles.tab, isActive && styles.tabActive, !isActive && { backgroundColor: 'transparent' }]}
          >
            <Text
              variant="bodySmall"
              color={isActive ? colors.text.inverse : colors.gray[600]}
              weight={isActive ? 'semibold' : 'normal'}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderWelcome = () => (
    <Card
      variant="elevated"
      padding="lg"
      style={styles.welcomeCard}
    >
      <Text
        variant="h2"
        color={colors.text.inverse}
        style={styles.welcomeTitle}
      >
        Bienvenue, maraîcher.
      </Text>
      <Text
        variant="body"
        color={colors.gray[300]}
        style={{ marginBottom: spacing.lg }}
      >
        Thomas centralise votre agenda, vos observations de parcelles et vos
        essais techniques dans une interface métier sobre et efficace.
      </Text>

      <View style={{ marginBottom: spacing.lg, gap: spacing.sm }}>
        <Text variant="bodySmall" color={colors.gray[400]}>
          • Vue unifiée des tâches, observations et essais.
        </Text>
        <Text variant="bodySmall" color={colors.gray[400]}>
          • Chat IA spécialisé agriculture française.
        </Text>
        <Text variant="bodySmall" color={colors.gray[400]}>
          • Accès offline 7 jours sur les données clés.
        </Text>
      </View>

      <Button
        title="Se connecter"
        variant="primary"
        fullWidth
        onPress={() => setMode('signin')}
        style={{ marginBottom: spacing.sm }}
      />
      <Button
        title="Créer un compte"
        variant="outline"
        fullWidth
        onPress={() => setMode('signup')}
      />

      <View style={{ marginTop: spacing.lg }}>
        <Text variant="caption" color={colors.gray[500]} align="center">
          En continuant, vous acceptez les conditions d’utilisation Thomas V2.
        </Text>
      </View>
    </Card>
  );

  const renderAuthForm = () => (
    <Card
      variant="elevated"
      padding="lg"
      style={{
        borderWidth: 1,
        borderColor: colors.gray[200],
        shadowOpacity: 0.06,
      }}
    >
      {renderTabs()}

      {mode === 'signin' && (
        <>
          <Text
            variant="bodySmall"
            color={colors.gray[500]}
            style={{ marginBottom: spacing.sm }}
          >
            Se connecter avec l’un des services suivants :
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={handleGoogle}
              disabled={loading}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.gray[300],
                backgroundColor: colors.background.primary,
              }}
            >
              <Text variant="bodySmall" color={colors.gray[700]}>
                Continuer avec Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.gray[200],
                backgroundColor: colors.background.secondary,
              }}
            >
              <Text variant="bodySmall" color={colors.gray[400]}>
                Apple (bientôt)
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Email professionnel"
            placeholder="vous@ferme.fr"
            value={email}
            onChangeText={text => {
              resetFeedback();
              setEmail(text);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />
          <Input
            label="Mot de passe"
            placeholder="Votre mot de passe"
            value={password}
            onChangeText={text => {
              resetFeedback();
              setPassword(text);
            }}
            secureTextEntry
            required
          />

          <Button
            title="Se connecter"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSignInEmail}
            style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}
          />

          <Button
            title="Continuer avec Google"
            variant="outline"
            fullWidth
            onPress={handleGoogle}
            disabled={loading}
          />

          <TouchableOpacity
            onPress={handleResetPassword}
            style={{ marginTop: spacing.md }}
          >
            <Text
              variant="bodySmall"
              color={colors.primary[400]}
              align="center"
            >
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'signup' && (
        <>
          <Text
            variant="bodySmall"
            color={colors.gray[500]}
            style={{ marginBottom: spacing.sm }}
          >
            Créer un compte avec :
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              marginBottom: spacing.lg,
            }}
          >
            <TouchableOpacity
              onPress={handleGoogle}
              disabled={loading}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.gray[300],
                backgroundColor: colors.background.primary,
              }}
            >
              <Text variant="bodySmall" color={colors.gray[700]}>
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: spacing.sm,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.gray[200],
                backgroundColor: colors.background.secondary,
              }}
            >
              <Text variant="bodySmall" color={colors.gray[400]}>
                Apple (bientôt)
              </Text>
            </TouchableOpacity>
          </View>

          <Input
            label="Prénom"
            placeholder="Prénom"
            value={firstName}
            onChangeText={text => {
              resetFeedback();
              setFirstName(text);
            }}
            required
          />
          <Input
            label="Nom"
            placeholder="Nom"
            value={lastName}
            onChangeText={text => {
              resetFeedback();
              setLastName(text);
            }}
            required
          />
          <Input
            label="Email professionnel"
            placeholder="vous@ferme.fr"
            value={email}
            onChangeText={text => {
              resetFeedback();
              setEmail(text);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            required
          />
          <Input
            label="Mot de passe"
            placeholder="Au moins 8 caractères"
            value={password}
            onChangeText={text => {
              resetFeedback();
              setPassword(text);
            }}
            secureTextEntry
            required
          />

          <Button
            title="Créer le compte"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSignUp}
            style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}
          />
          <Button
            title="S’inscrire avec Google"
            variant="outline"
            fullWidth
            onPress={handleGoogle}
            disabled={loading}
          />

          <TouchableOpacity
            onPress={() => setMode('signin')}
            style={{ marginTop: spacing.md }}
          >
            <Text
              variant="bodySmall"
              color={colors.primary[400]}
              align="center"
            >
              Déjà un compte ? Se connecter
            </Text>
          </TouchableOpacity>
        </>
      )}


      {message && (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="success">{message}</Text>
        </View>
      )}

      {error && (
        <View style={{ marginTop: spacing.md }}>
          <Text variant="error">{error}</Text>
          
          {/* Bouton de diagnostic réseau visible */}
          <TouchableOpacity
            onPress={() => setShowDiagnostic(true)}
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.primary[500],
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              🔬 Lancer le diagnostic réseau
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );

  return (
    <>
      <Screen
        safeArea
        scrollable
        backgroundColor={colors.background.primary}
        statusBarStyle="dark-content"
        padding="md"
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            gap: spacing.lg,
          }}
        >
          {renderHero()}
          {mode === 'welcome' ? renderWelcome() : renderAuthForm()}
        </View>
      </Screen>

      {/* Modal de diagnostic réseau */}
      <Modal
        visible={showDiagnostic}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <NetworkDiagnosticScreen onClose={() => setShowDiagnostic(false)} />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    marginBottom: spacing.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 999,
    padding: 2,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary[600],
  },
  welcomeCard: {
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[700],
  },
  welcomeTitle: {
    marginBottom: spacing.sm,
  },
  welcomeDescription: {
    marginBottom: spacing.xl,
  },
  featuresContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureText: {
    flex: 1,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  socialButton: {
    flex: 1,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray[200],
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
});

export default AuthScreens;


