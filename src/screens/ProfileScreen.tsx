import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Text, Alert, Platform } from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { 
  UserIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  BellIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  LanguageIcon,
  InformationCircleIcon
} from '../design-system/icons';
import { Text as DSText, Avatar } from '../design-system/components';
import { ProfileEditModal, type ProfileData } from '../design-system/components/modals/ProfileEditModal';
import { supabase } from '../utils/supabase';
import { DirectSupabaseService } from '../services/DirectSupabaseService';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { authService } from '../services/auth';
import { userInvitationService } from '../services/UserInvitationService';
import { showAlert } from '../utils/webAlert';
import { getAppVersionInfo } from '../services/AppVersionService';

interface ProfileScreenProps {
  onProfileAndFarmPress?: () => void;
  onSettingsPress?: () => void;
  onAgentSettingsPress?: () => void;
  onFarmMembersPress?: () => void;
  onMyInvitationsPress?: () => void;
  onFarmEditPress?: () => void;
  onAideEtSupportPress?: () => void;
  onAProposPress?: () => void;
  onDocumentsPress?: () => void;
  onCommercePress?: () => void;
  onCommunityPress?: () => void;
  onNotificationsPress?: () => void;
  /** Ouverture du modal d’édition profil depuis la navigation (ex. écran Profil et ferme) */
  openEditProfileFromNav?: boolean;
  onClearOpenEditProfile?: () => void;
}

export default function ProfileScreen({ onProfileAndFarmPress, onSettingsPress, onAgentSettingsPress, onFarmMembersPress, onMyInvitationsPress, onFarmEditPress, onAideEtSupportPress, onAProposPress, onDocumentsPress, onCommercePress, onCommunityPress, onNotificationsPress, openEditProfileFromNav, onClearOpenEditProfile }: ProfileScreenProps) {
  const { user: authUser, signOut } = useAuth();
  const { activeFarm, updateFarm, deleteFarm, createFarm, farmData } = useFarm();
  const appVersionInfo = getAppVersionInfo();
  const [isEditProfileVisible, setIsEditProfileVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);

  // Ouvrir le modal d’édition profil quand on arrive depuis Profil et ferme
  useEffect(() => {
    if (openEditProfileFromNav) {
      setIsEditProfileVisible(true);
      onClearOpenEditProfile?.();
    }
  }, [openEditProfileFromNav, onClearOpenEditProfile]);
  
  // Farm selector hook
  
  const userMetadata = (authUser?.user_metadata || {}) as any;
  const user = {
    name: userMetadata['full_name'] || 'Utilisateur',
    email: authUser?.email || 'c.rampaer@gmail.com',
    status: 'Utilisateur',
    avatar: (userMetadata['full_name'] || 'C')?.charAt(0) || 'C'
  };

  // Préparer les données du profil pour le modal
  const getProfileData = (): ProfileData => {
    const metadata = (authUser?.user_metadata || {}) as any;
    const fullName: string = metadata['full_name'] || '';
    const derivedFirstName =
      metadata['first_name'] || (fullName ? fullName.split(' ')[0] : '');
    const derivedLastName =
      metadata['last_name'] ||
      (fullName && fullName.includes(' ')
        ? fullName.split(' ').slice(1).join(' ')
        : '');

    return {
      id: authUser?.id,
      firstName: derivedFirstName,
      lastName: derivedLastName,
      email: authUser?.email || '',
      phone: '', // TODO: charger depuis la DB si nécessaire
      profession: '', // TODO: charger depuis la DB si nécessaire
      bio: '', // TODO: charger depuis la DB si nécessaire
      avatar: user.avatar,
    };
  };

  // Calculer les statistiques basées sur les données réelles de la ferme
  const stats = useMemo(() => {
    if (!activeFarm || !farmData) {
      return { tasks: 0, hours: 0, plots: 0 };
    }

    // Filtrer les tâches du mois courant
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthTasks = farmData.tasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate.getMonth() === currentMonth && 
             taskDate.getFullYear() === currentYear;
    });

    // Calculer les heures travaillées ce mois
    const totalMinutes = thisMonthTasks
      .filter(task => task.duration_minutes && task.duration_minutes > 0)
      .reduce((sum, task) => sum + (task.duration_minutes || 0), 0);

    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Arrondi à 1 décimale

    // Compter les parcelles actives
    const activePlots = farmData.plots.filter(plot => plot.status === 'active').length;

    return {
      tasks: thisMonthTasks.length,
      hours: totalHours,
      plots: activePlots
    };
  }, [activeFarm, farmData?.tasks, farmData?.plots]);

  // Charger le nombre d'invitations
  useEffect(() => {
    const loadInvitationCount = async () => {
      if (authUser?.email) {
        try {
          const count = await userInvitationService.getInvitationCount(authUser.email);
          setInvitationCount(count);
        } catch (error) {
          console.error('Erreur lors du chargement du nombre d\'invitations:', error);
        }
      }
    };

    loadInvitationCount();
  }, [authUser?.email]);

  const handleOpenEditProfile = () => {
    setIsEditProfileVisible(true);
  };

  const handleSaveProfile = async (profileData: ProfileData) => {
    try {
      setSavingProfile(true);

      const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();

      // 1) Mettre à jour le profil d'authentification Supabase
      const { error } = await supabase.auth.updateUser({
        email: profileData.email,
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          full_name: fullName,
        },
      });

      if (error) {
        console.error('Erreur mise à jour profil:', error);
        throw new Error(error.message || 'Impossible de mettre à jour votre profil pour le moment.');
      }

      // 2) Mettre à jour le profil applicatif dans la table public.profiles
      if (authUser?.id) {
        const profilePayload = {
          id: authUser.id,
          email: profileData.email,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          full_name: fullName,
          phone: profileData.phone || null,
          profession: profileData.profession || null,
          bio: profileData.bio || null,
        };

        try {
          // Vérifier si le profil existe déjà
          const { data: existingProfile, error: fetchError } =
            await DirectSupabaseService.directSelect(
              'profiles',
              'id',
              [{ column: 'id', value: authUser.id }],
              true
            );

          if (fetchError) {
            console.error('Erreur lecture profil applicatif (Direct API):', fetchError);
          } else if (existingProfile) {
            const { error: updateError } = await DirectSupabaseService.directUpdate(
              'profiles',
              profilePayload,
              [{ column: 'id', value: authUser.id }]
            );
            if (updateError) {
              console.error('Erreur mise à jour table profiles (Direct API):', updateError);
            }
          } else {
            const { error: insertError } = await DirectSupabaseService.directInsert(
              'profiles',
              profilePayload
            );
            if (insertError) {
              console.error('Erreur création profil table profiles (Direct API):', insertError);
            }
          }
        } catch (profileError) {
          console.error('Erreur mise à jour table profiles (bloc Direct API):', profileError);
          // On logue l'erreur mais on n'empêche pas l'utilisateur de continuer si Auth est à jour
        }
      }

      Alert.alert(
        'Profil mis à jour',
        'Vos informations de profil ont bien été enregistrées.'
      );
    } catch (e: any) {
      console.error('Erreur inattendue mise à jour profil:', e);
      throw e; // Re-throw pour que le modal gère l'erreur
    } finally {
      setSavingProfile(false);
    }
  };


  const handleLogout = () => {
    console.log('🔘 [LOGOUT] handleLogout appelé');
    
    const performLogout = async () => {
      try {
        console.log('🚪 [LOGOUT] Début de la déconnexion...');
        
        // 1. Déconnexion côté contexte principal (supabase.auth + session en mémoire)
        // Cette fonction met déjà à jour l'état user/session et déclenche la navigation
        console.log('🚪 [LOGOUT] Appel signOut du contexte Auth...');
        await signOut();
        
        // 2. Nettoyage du cache offline utilisé par le service d'auth unifié
        console.log('🚪 [LOGOUT] Nettoyage du cache offline...');
        await authService.clearCache();
        
        // 3. Pour le web, recharger la page pour s'assurer que tout est réinitialisé
        if (typeof window !== 'undefined') {
          console.log('🚪 [LOGOUT] Détection environnement web - rechargement de la page...');
          // Petit délai pour s'assurer que la déconnexion est complète
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
        
        console.log('✅ [LOGOUT] Déconnexion terminée avec succès');
        // L'app redirigera automatiquement vers AuthScreens via App.tsx
        // car user devient null dans AuthContext
        
      } catch (error) {
        console.error('❌ [LOGOUT] Erreur lors de la déconnexion:', error);
        showAlert(
          'Erreur de déconnexion', 
          'Impossible de se déconnecter complètement. Veuillez fermer et rouvrir l\'application.',
          [{ text: 'OK' }]
        );
      }
    };
    
    // Utiliser showAlert qui est compatible web/mobile
    showAlert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
          onPress: () => console.log('🚪 [LOGOUT] Annulation de la déconnexion')
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: performLogout
        }
      ]
    );
  };

  const handleDocuments = () => {
    onDocumentsPress?.();
  };

  const menuItems = [
    {
      icon: <UserIcon color={colors.primary[600]} size={24} />,
      title: 'Profil et ferme',
      subtitle: 'Modifier le profil, la ferme, les membres et invitations',
      onPress: onProfileAndFarmPress || (() => console.log('Profil et ferme'))
    },
    {
      icon: <CogIcon color={colors.primary[600]} size={24} />,
      title: '🤖 Assistant IA',
      subtitle: 'Configurer la méthode d\'analyse',
      onPress: onAgentSettingsPress || (() => console.log('Assistant IA'))
    },
    {
      icon: <CogIcon color={colors.gray[600]} size={24} />,
      title: 'Configurer',
      subtitle: 'Configurer matériel, parcelles et conversions',
      onPress: onSettingsPress || (() => console.log('Configurer'))
    },
    {
      icon: <DocumentTextIcon color={colors.primary[600]} size={24} />,
      title: 'Mes documents',
      subtitle: 'Gérer vos documents et fichiers',
      onPress: handleDocuments
    },
    {
      icon: <DocumentTextIcon color={colors.semantic.success} size={24} />,
      title: 'Ventes & Achats',
      subtitle: 'Factures, clients, fournisseurs et produits',
      onPress: onCommercePress || (() => console.log('Commerce'))
    },
    {
      icon: <UsersIcon color={colors.primary[600]} size={24} />,
      title: 'Communaute',
      subtitle: 'Rejoindre ou gerer une communaute',
      onPress: onCommunityPress || (() => console.log('Communaute'))
    },
    {
      icon: <ArrowDownTrayIcon color={colors.secondary.orange} size={24} />,
      title: 'Exporter les données',
      subtitle: 'Télécharger vos données au format CSV/PDF',
      onPress: () => console.log('Exporter données')
    },
    {
      icon: <BellIcon color={colors.semantic.warning} size={24} />,
      title: 'Notifications',
      subtitle: 'Rappels et alertes',
      onPress: () => onNotificationsPress?.()
    },
    {
      icon: <LanguageIcon color={colors.secondary.purple} size={24} />,
      title: 'Langue',
      subtitle: 'Français',
      onPress: () => console.log('Langue')
    },
    {
      icon: <QuestionMarkCircleIcon color={colors.primary[600]} size={24} />,
      title: 'Aide et support',
      subtitle: 'FAQ, contact, tutoriels',
      onPress: onAideEtSupportPress || (() => console.log('Aide et support'))
    },
    {
      icon: <InformationCircleIcon color={colors.gray[600]} size={24} />,
      title: 'À propos',
      subtitle: 'Version, conditions d\'utilisation',
      onPress: onAProposPress || (() => console.log('À propos'))
    }
  ];

  return (
    <>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Header avec avatar et infos */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              <Avatar 
                initials={user.avatar}
                size="2xl"
                backgroundColor={colors.primary[600]}
                textColor={colors.text.inverse}
              />
              <View style={styles.onlineIndicator} />
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.name}
            </Text>
            <Text style={styles.userEmail}>
              {user.email}
            </Text>
            <View style={styles.userStatus}>
              <UserIcon color={colors.gray[500]} size={16} />
              <Text style={styles.statusText}>{user.status}</Text>
              <View style={styles.statusBadge} />
            </View>
          </View>
        </View>

        {/* Contenu */}
        {/* Activité récente */}
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <View style={styles.chartIcon} />
            <Text style={styles.activityTitle}>Activité récente</Text>
          </View>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.tasks}</Text>
              <Text style={styles.statLabel}>Tâches ce mois</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.hours}h</Text>
              <Text style={styles.statLabel}>Heures travaillées</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.plots}</Text>
              <Text style={styles.statLabel}>Parcelles actives</Text>
            </View>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              item.isDestructive && styles.menuItemDestructive
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              {item.icon}
            </View>
            
            <View style={styles.menuContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[
                  styles.menuTitle,
                  item.isDestructive && styles.menuTitleDestructive
                ]}>
                  {item.title}
                </Text>
                {(item as any).badge && (
                  <View style={{
                    backgroundColor: colors.semantic.error,
                    borderRadius: 10,
                    minWidth: 20,
                    height: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 8,
                  }}>
                    <Text style={{
                      color: colors.text.inverse,
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      {(item as any).badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.menuSubtitle}>
                {item.subtitle}
              </Text>
            </View>
            
            <ChevronRightIcon 
              color={item.isDestructive ? colors.semantic.error : colors.gray[400]} 
              size={20} 
            />
          </TouchableOpacity>
        ))}
        
          {/* Footer avec informations app */}
          <View style={styles.footerSection}>
            <Text style={styles.footerTitle}>Thomas - Assistant Agricole</Text>
            <Text style={styles.footerSubtitle}>{appVersionInfo.displayVersion}</Text>
            <Text style={styles.footerDescription}>
              Votre compagnon numérique pour une agriculture moderne et efficace
            </Text>
            <Text style={styles.footerCredit}>
              Développé avec ❤️ pour les agriculteurs
            </Text>
            
            {/* Bouton de déconnexion */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                console.log('🔘 [LOGOUT] Bouton pressé');
                handleLogout();
              }}
              activeOpacity={0.7}
              disabled={false}
            >
              <ArrowRightOnRectangleIcon color={colors.text.inverse} size={20} />
              <Text style={styles.logoutButtonText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fiche de modification du profil */}
      <ProfileEditModal
        visible={isEditProfileVisible}
        profile={getProfileData()}
        onClose={() => setIsEditProfileVisible(false)}
        onSave={handleSaveProfile}
        loading={savingProfile}
      />

      {/* Modal de sélection de ferme géré par SimpleNavigator */}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // Légère ombre pour l'effet "carte"
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.semantic.success,
    borderWidth: 3,
    borderColor: colors.background.secondary,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.gray[900],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.gray[600],
    marginBottom: 8,
  },
  userStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.gray[500],
  },
  statusBadge: {
    width: 20,
    height: 14,
    backgroundColor: colors.gray[300],
    borderRadius: 4,
  },
  activitySection: {
    backgroundColor: colors.background.secondary,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartIcon: {
    width: 20,
    height: 20,
    backgroundColor: colors.primary[600],
    borderRadius: 4,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: 'center',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[800],
    marginBottom: 4,
  },
  menuTitleDestructive: {
    color: colors.semantic.error,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 18,
  },
  menuItemDestructive: {
    borderColor: colors.gray[200],
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuTitleDisabled: {
    color: colors.gray[400],
  },
  footerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.lg,
    gap: spacing.sm,
    minHeight: 48,
  },
  logoutButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: 4,
  },
  footerSubtitle: {
    fontSize: 14,
    color: colors.gray[600],
    marginBottom: 12,
  },
  footerDescription: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  footerCredit: {
    fontSize: 12,
    color: colors.gray[400],
    textAlign: 'center',
  },
});
