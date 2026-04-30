import type { TabName } from '@/contexts/NavigationContext';
import type { ImageSourcePropType } from 'react-native';

export type InterfaceTourAction =
  | {
      type: 'tab';
      tab: TabName;
    }
  | {
      type: 'screen';
      tab?: TabName;
      screen: string;
      params?: Record<string, unknown>;
    }
  | {
      type: 'chat_demo';
    }
  | {
      type: 'open_chat';
    }
  | {
      type: 'chat_back';
    }
  | {
      type: 'none';
    };

export type InterfaceTourTargetId =
  | 'tour.preview.next'
  | 'header.back'
  | 'tab.bar'
  | 'tab.statistics'
  | 'tab.taches'
  | 'tab.chat'
  | 'tab.profil'
  | 'chat.list.plus'
  | 'chat.list.first-card'
  | 'chat.input.text'
  | 'chat.input.action'
  | 'chat.response.card'
  | 'tasks.card'
  | 'tasks.filters'
  | 'tasks.calendar'
  | 'tasks.new'
  | 'tasks.week.next'
  | 'tasks.day.selector'
  | 'stats.chart.selector'
  | 'stats.filter.culture'
  | 'profile.menu.profile-farm'
  | 'profile.menu.settings'
  | 'profile.menu.help'
  | 'profile.menu.notifications'
  | 'profile-farm.option.members'
  | 'settings.option.materials'
  | 'settings.option.plots'
  | 'settings.option.conversions'
  | 'settings.option.cultures'
  | 'settings.option.phytosanitary'
  | 'settings.option.recurring-tasks'
  | 'help.shortcut.interface';

export interface InterfaceTourStep {
  id: string;
  chapter: string;
  title: string;
  description: string;
  subPoints: string[];
  targetId?: InterfaceTourTargetId;
  autoAction: InterfaceTourAction;
  /** Re-activate the preview phase (full-screen + floating Suivant) when entering this step */
  previewOnEnter?: boolean;
  /** Static image shown full-screen instead of a live UI highlight */
  image?: ImageSourcePropType;
  /** Percentage-based highlight zone on the image (0-100 for each axis) */
  imageHighlight?: { top: number; left: number; width: number; height: number };
  /** Step renders as full-screen preview: no dim, no card, only floating Suivant */
  fullScreenPreview?: boolean;
}

export const INTERFACE_TOUR_STEPS: InterfaceTourStep[] = [
  // ── Chapitre 0: Introduction ──
  {
    id: 'tour-preview-next',
    chapter: 'Interface · 0',
    title: 'Bienvenue sur Thomas',
    description: "Nous allons parcourir rapidement les onglets de l'application.",
    subPoints: [],
    targetId: 'tour.preview.next',
    autoAction: { type: 'tab', tab: 'Chat' },
  },

  // ── Chapitre 1: Barre de navigation ──
  {
    id: 'tab-bar',
    chapter: 'Interface · 1',
    title: 'Barre de navigation',
    description: 'Naviguez entre les sections principales via cette barre.',
    subPoints: [],
    targetId: 'tab.bar',
    autoAction: { type: 'none' },
  },
  {
    id: 'tab-statistics',
    chapter: 'Interface · 2',
    title: 'Onglet Statistiques',
    description: 'Consultez vos chiffres et graphiques.',
    subPoints: [],
    targetId: 'tab.statistics',
    autoAction: { type: 'none' },
  },
  {
    id: 'tab-taches',
    chapter: 'Interface · 3',
    title: 'Onglet Taches',
    description: 'Retrouvez votre planning et vos actions.',
    subPoints: [],
    targetId: 'tab.taches',
    autoAction: { type: 'none' },
  },
  {
    id: 'tab-chat',
    chapter: 'Interface · 4',
    title: 'Onglet Assistant IA',
    description: 'Discutez avec Thomas pour enregistrer et suivre votre activite.',
    subPoints: [],
    targetId: 'tab.chat',
    autoAction: { type: 'none' },
  },
  {
    id: 'tab-profil',
    chapter: 'Interface · 5',
    title: 'Onglet Profil',
    description: "Gerez votre compte, vos reglages et l'aide.",
    subPoints: [],
    targetId: 'tab.profil',
    autoAction: { type: 'none' },
  },

  // ── Chapitre 2: Ecran Assistant IA ──
  {
    id: 'chat-screen',
    chapter: 'Assistant IA',
    title: 'Ecran Assistant IA',
    description: '',
    subPoints: [],
    autoAction: { type: 'tab', tab: 'Chat' },
    fullScreenPreview: true,
  },
  {
    id: 'chat-create',
    chapter: 'Assistant IA · 1',
    title: 'Creer un chat',
    description: 'Appuyez sur + pour demarrer une nouvelle conversation.',
    subPoints: [],
    targetId: 'chat.list.plus',
    autoAction: { type: 'none' },
  },
  {
    id: 'chat-open',
    chapter: 'Assistant IA · 2',
    title: 'Ouvrir un chat',
    description: 'Selectionnez une conversation pour y acceder.',
    subPoints: [],
    targetId: 'chat.list.first-card',
    autoAction: { type: 'none' },
  },

  // ── Chapitre 3: Ecran Discussion (live UI via chat onboarding) ──
  {
    id: 'discussion-screen',
    chapter: 'Discussion',
    title: 'Ecran de discussion',
    description: '',
    subPoints: [],
    autoAction: { type: 'open_chat' },
    fullScreenPreview: true,
  },
  {
    id: 'discussion-input',
    chapter: 'Discussion · 1',
    title: 'Ecrire un message',
    description: 'Saisissez votre message ici.',
    subPoints: [],
    targetId: 'chat.input.text',
    autoAction: { type: 'none' },
  },
  {
    id: 'discussion-record',
    chapter: 'Discussion · 2',
    title: 'Enregistrement vocal',
    description: 'Appuyez sur le micro pour enregistrer un message vocal.',
    subPoints: [],
    targetId: 'chat.input.action',
    autoAction: { type: 'none' },
  },
  {
    id: 'discussion-response',
    chapter: 'Discussion · 3',
    title: 'Reponses de Thomas',
    description: 'Thomas analyse votre message et affiche les taches identifiees.',
    subPoints: [],
    targetId: 'chat.response.card',
    autoAction: { type: 'none' },
  },
  {
    id: 'discussion-edit-card',
    chapter: 'Discussion · 4',
    title: 'Modifier une action',
    description: 'Appuyez sur une carte pour ouvrir le formulaire et ajuster les details.',
    subPoints: [],
    targetId: 'chat.response.card',
    autoAction: { type: 'none' },
  },
  {
    id: 'navigation-to-tasks',
    chapter: 'Navigation',
    title: 'Aller vers Taches',
    description: "Nous allons maintenant ouvrir l'onglet Taches.",
    subPoints: [],
    targetId: 'tab.taches',
    autoAction: { type: 'chat_back' },
  },

  // ── Chapitre 4: Ecran Taches ──
  {
    id: 'tasks-screen',
    chapter: 'Taches',
    title: 'Ecran Taches',
    description: '',
    subPoints: [],
    autoAction: { type: 'tab', tab: 'Taches' },
    fullScreenPreview: true,
  },
  {
    id: 'tasks-list',
    chapter: 'Taches · 1',
    title: 'Actions',
    description: 'Consultez vos actions. Appuyez sur une carte pour la modifier.',
    subPoints: [],
    targetId: 'tasks.card',
    autoAction: { type: 'none' },
  },
  {
    id: 'tasks-filters',
    chapter: 'Taches · 2',
    title: 'Filtres',
    description: 'Filtrez les actions par statut, type ou attribution.',
    subPoints: [],
    targetId: 'tasks.filters',
    autoAction: { type: 'none' },
  },
  {
    id: 'tasks-calendar',
    chapter: 'Taches · 3',
    title: 'Calendrier',
    description: 'Changez de jour ou de semaine pour parcourir votre planning.',
    subPoints: [],
    targetId: 'tasks.calendar',
    autoAction: { type: 'none' },
  },
  {
    id: 'tasks-new',
    chapter: 'Taches · 4',
    title: 'Nouvelle tache',
    description: 'Ajoutez une nouvelle tache manuellement depuis ce bouton.',
    subPoints: [],
    targetId: 'tasks.new',
    autoAction: { type: 'none' },
  },
  {
    id: 'navigation-to-profile',
    chapter: 'Navigation',
    title: 'Aller vers Profil',
    description: "Nous allons maintenant ouvrir l'onglet Profil.",
    subPoints: [],
    targetId: 'tab.profil',
    autoAction: { type: 'none' },
  },
  {
    id: 'profile-screen',
    chapter: 'Profil',
    title: 'Ecran Profil',
    description: '',
    subPoints: [],
    autoAction: { type: 'tab', tab: 'Profil' },
    fullScreenPreview: true,
  },
  {
    id: 'profile-farm-menu',
    chapter: 'Profil · 1',
    title: 'Profil et ferme',
    description: 'Accedez aux informations du profil, de la ferme et des membres.',
    subPoints: [],
    targetId: 'profile.menu.profile-farm',
    autoAction: { type: 'none' },
  },
  {
    id: 'profile-farm-screen',
    chapter: 'Profil et ferme',
    title: 'Profil et ferme',
    description:
      "C'est ici que vous modifiez les elements de la ferme et invitez des utilisateurs.",
    subPoints: [],
    autoAction: { type: 'screen', tab: 'Profil', screen: 'ProfileAndFarmSettings' },
    fullScreenPreview: true,
  },
  {
    id: 'profile-farm-members',
    chapter: 'Profil et ferme · 1',
    title: 'Gerer les membres',
    description: 'Invitez des utilisateurs et gerez les acces a la ferme.',
    subPoints: [],
    targetId: 'profile-farm.option.members',
    autoAction: { type: 'none' },
  },
  {
    id: 'profile-farm-back',
    chapter: 'Navigation',
    title: 'Retour',
    description: "Revenez a l'ecran Profil.",
    subPoints: [],
    targetId: 'header.back',
    autoAction: { type: 'none' },
  },
  {
    id: 'profile-settings-menu',
    chapter: 'Profil · 2',
    title: 'Configurer',
    description: 'Ouvrez les reglages de la ferme.',
    subPoints: [],
    targetId: 'profile.menu.settings',
    autoAction: { type: 'screen', tab: 'Profil', screen: 'Profil' },
  },
  {
    id: 'settings-screen',
    chapter: 'Configurer',
    title: 'Configurer',
    description: '',
    subPoints: [],
    autoAction: { type: 'screen', tab: 'Profil', screen: 'Settings' },
    fullScreenPreview: true,
  },
  {
    id: 'settings-materials',
    chapter: 'Configurer · 1',
    title: 'Materiel',
    description: 'Gerez le materiel utilise sur la ferme.',
    subPoints: [],
    targetId: 'settings.option.materials',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-plots',
    chapter: 'Configurer · 2',
    title: 'Parcelles',
    description: 'Gerez les parcelles et planches de culture.',
    subPoints: [],
    targetId: 'settings.option.plots',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-conversions',
    chapter: 'Configurer · 3',
    title: 'Conversions',
    description: 'Configurez vos unites et tables de conversion.',
    subPoints: [],
    targetId: 'settings.option.conversions',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-cultures',
    chapter: 'Configurer · 4',
    title: 'Liste de cultures',
    description: 'Personnalisez la liste des cultures de la ferme.',
    subPoints: [],
    targetId: 'settings.option.cultures',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-phytosanitary',
    chapter: 'Configurer · 5',
    title: 'Produits phyto',
    description: 'Gerez les produits phytosanitaires utilises.',
    subPoints: [],
    targetId: 'settings.option.phytosanitary',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-recurring-tasks',
    chapter: 'Configurer · 6',
    title: 'Taches recurrentes',
    description: 'Configurez les taches qui se repetent automatiquement.',
    subPoints: [],
    targetId: 'settings.option.recurring-tasks',
    autoAction: { type: 'none' },
  },
  {
    id: 'settings-back',
    chapter: 'Navigation',
    title: 'Retour',
    description: "Revenez a l'ecran Profil.",
    subPoints: [],
    targetId: 'header.back',
    autoAction: { type: 'none' },
  },
  {
    id: 'profile-notifications',
    chapter: 'Profil · 3',
    title: 'Notifications',
    description: 'Retrouvez ici les rappels et alertes.',
    subPoints: [],
    targetId: 'profile.menu.notifications',
    autoAction: { type: 'screen', tab: 'Profil', screen: 'Profil' },
  },
];
