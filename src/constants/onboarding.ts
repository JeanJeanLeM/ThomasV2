// Données du tutoriel d'onboarding Thomas
// Textes et images à remplacer dans les versions futures

export interface OnboardingSubPoint {
  id: string;
  text: string;
  /** Emoji affiché à la place du bullet point quand renseigné */
  icon?: string;
  /** Label de badge affiché en surbrillance (ex. "Recommandé") */
  badge?: string;
}

export interface OnboardingStep {
  id: string;
  chapter: string;
  title: string;
  description: string;
  subPoints: OnboardingSubPoint[];
  // Remplacer par require('../assets/onboarding/xxx.png') quand les images seront disponibles
  imagePlaceholderIcon: string;
  imageBackgroundColor: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // ─── Chapitre 1 · 1/7 ─ Les façons d'envoyer un message ───────────────────
  {
    id: 'chat-send',
    chapter: 'Chat · 1.1',
    title: 'Envoyer un message',
    description:
      'Thomas comprend 4 façons de lui parler. Choisissez celle qui vous convient le mieux.',
    subPoints: [
      {
        id: 'send-4',
        icon: '📋',
        text: 'Formulaire — remplissez les champs un par un pour plus de précision',
      },
      {
        id: 'send-1',
        icon: '✍️',
        text: 'Message écrit — tapez votre demande librement dans la zone de saisie',
      },
      {
        id: 'send-2',
        icon: '🎙️',
        text: 'Message vocal — maintenez le micro pour enregistrer une note audio',
      },
      {
        id: 'send-3',
        icon: '🗣️',
        text: 'Dictée en temps réel — parlez et votre texte apparaît instantanément',
        badge: 'Recommandé',
      },
    ],
    imagePlaceholderIcon: '💬',
    imageBackgroundColor: '#f0fdf4',
  },

  // ─── Chapitre 1 · 2/7 ─ Les champs d'une tâche ────────────────────────────
  {
    id: 'chat-task-fields',
    chapter: 'Chat · 1.2',
    title: 'Ce que Thomas identifie',
    description:
      'Quand vous décrivez une tâche, Thomas extrait automatiquement ses composants.',
    subPoints: [
      {
        id: 'task-1',
        icon: '⭐',
        text: 'Obligatoires : action (ex. traitement), culture (ex. tomate), durée',
      },
      {
        id: 'task-2',
        icon: '📍',
        text: 'Optionnels : parcelle, sous-parcelle (planche, zone…), matériel utilisé',
      },
    ],
    imagePlaceholderIcon: '🧠',
    imageBackgroundColor: '#f0fdf4',
  },

  // ─── Chapitre 1 · 3/7 ─ Le champ Quantité ────────────────────────────────
  {
    id: 'chat-quantity',
    chapter: 'Chat · 1.3',
    title: 'Le champ Quantité',
    description:
      'Précisez ce qui a été mis en œuvre : une nature, une valeur et une unité.',
    subPoints: [
      {
        id: 'qty-1',
        icon: '🌿',
        text: 'Quoi — la nature : semence, engrais, phyto, récolte, eau…',
      },
      {
        id: 'qty-2',
        icon: '🔢',
        text: 'Combien — la valeur numérique (ex. 25)',
      },
      {
        id: 'qty-3',
        icon: '📐',
        text: 'Unité — universelle (kg, L, t) ou personnalisée (big-bag, palette…)',
      },
    ],
    imagePlaceholderIcon: '📦',
    imageBackgroundColor: '#fefce8',
  },

  // ─── Chapitre 1 · 4/7 ─ Intent Observation ───────────────────────────────
  {
    id: 'chat-observation',
    chapter: 'Chat · 1.4',
    title: 'Faire une observation',
    description:
      'Signalez ce que vous constatez sur le terrain. Thomas horodate et localise chaque note.',
    subPoints: [
      {
        id: 'obs-1',
        icon: '🔍',
        text: 'Anomalie, maladie, ravageur, stress hydrique, stade végétatif…',
      },
      {
        id: 'obs-2',
        icon: '📌',
        text: 'Rattachée à une parcelle ou une culture précise',
      },
      {
        id: 'obs-3',
        icon: '📅',
        text: 'Retrouvez l\'historique complet de vos observations à tout moment',
      },
    ],
    imagePlaceholderIcon: '🔍',
    imageBackgroundColor: '#fefce8',
  },

  // ─── Chapitre 1 · 5/7 ─ Intent Vente / Commerce ──────────────────────────
  {
    id: 'chat-vente',
    chapter: 'Chat · 1.5',
    title: 'Ventes & achats',
    description:
      'Gérez votre activité commerciale directement depuis le chat ou la section dédiée.',
    subPoints: [
      {
        id: 'vente-1',
        icon: '🧾',
        text: 'Créer une facture ou un bon de livraison en dictant les informations',
      },
      {
        id: 'vente-2',
        icon: '🌾',
        text: 'Enregistrer une vente de récolte ou un achat d\'intrants',
      },
      {
        id: 'vente-3',
        icon: '👥',
        text: 'Gérer vos clients, fournisseurs et vos informations vendeur',
      },
    ],
    imagePlaceholderIcon: '💰',
    imageBackgroundColor: '#f0fdf4',
  },

  // ─── Chapitre 1 · 6/7 ─ Intent Aide ─────────────────────────────────────
  {
    id: 'chat-aide',
    chapter: 'Chat · 1.6',
    title: 'Demander de l\'aide',
    description:
      'Posez à Thomas n\'importe quelle question sur l\'utilisation de l\'application.',
    subPoints: [
      {
        id: 'aide-1',
        icon: '🗺️',
        text: '"Comment ajouter une nouvelle parcelle ?"',
      },
      {
        id: 'aide-2',
        icon: '📋',
        text: '"Comment modifier une tâche déjà enregistrée ?"',
      },
      {
        id: 'aide-3',
        icon: '🔍',
        text: '"Où trouver mes observations de la semaine dernière ?"',
      },
    ],
    imagePlaceholderIcon: '❓',
    imageBackgroundColor: '#eff6ff',
  },

  // ─── Chapitre 2 ─ Configurer votre exploitation ──────────────────────────
  {
    id: 'parametrage',
    chapter: 'Chapitre 2',
    title: 'Configurer votre exploitation',
    description:
      'Renseignez parcelles, matériels et conversions quand vous le souhaitez — depuis les menus ou directement via le chat.',
    subPoints: [
      {
        id: 'param-1',
        icon: '🗺️',
        text: 'Parcelles : nom, superficie, type de sol, sous-parcelles',
      },
      {
        id: 'param-2',
        icon: '🚜',
        text: 'Matériels : tracteurs, outils, pulvérisateurs…',
      },
      {
        id: 'param-3',
        icon: '📐',
        text: 'Conversions d\'unités personnalisées (big-bag, palette, tine…)',
      },
      {
        id: 'param-4',
        icon: '👉',
        text: 'Thomas vous guide vers le bon écran si besoin',
      },
    ],
    imagePlaceholderIcon: '⚙️',
    imageBackgroundColor: '#eff6ff',
  },

  // ─── Chapitre 3 ─ Profil ──────────────────────────────────────────────────
  {
    id: 'profil',
    chapter: 'Chapitre 3',
    title: 'Gérer votre profil',
    description:
      'Votre compte, vos fermes et vos collaborateurs, tout au même endroit.',
    subPoints: [
      {
        id: 'profil-1',
        icon: '👤',
        text: 'Modifiez vos informations personnelles (nom, email, téléphone)',
      },
      {
        id: 'profil-2',
        icon: '🏡',
        text: 'Créez plusieurs fermes et basculez entre elles en un tap',
      },
      {
        id: 'profil-3',
        icon: '🤝',
        text: 'Invitez des collaborateurs par email pour partager la gestion',
      },
      {
        id: 'profil-4',
        icon: '🎓',
        text: 'Relancez ce tutoriel à tout moment depuis Aide et support',
      },
    ],
    imagePlaceholderIcon: '👤',
    imageBackgroundColor: '#faf5ff',
  },
];

// Chapitres de la FAQ avec leurs sous-points
export interface FaqSubPoint {
  id: string;
  question: string;
  answer: string;
}

export interface FaqChapter {
  id: string;
  title: string;
  icon: string;
  subPoints: FaqSubPoint[];
}

export const FAQ_CHAPTERS: FaqChapter[] = [
  {
    id: 'faq-chat',
    title: 'Fonctionnement du chat',
    icon: '💬',
    subPoints: [
      {
        id: 'faq-chat-1',
        question: 'Comment parler à Thomas ?',
        answer:
          'Tapez votre message dans le champ de saisie ou appuyez sur le micro pour dicter. Thomas répond en langage naturel.',
      },
      {
        id: 'faq-chat-2',
        question: 'Thomas peut-il créer des tâches automatiquement ?',
        answer:
          'Oui. Dites par exemple "Ajoute une tâche de désherbage sur la parcelle nord demain matin" et Thomas crée la tâche.',
      },
      {
        id: 'faq-chat-3',
        question: 'Comment retrouver une ancienne conversation ?',
        answer:
          'Sur l\'onglet "Assistant IA", la liste de vos conversations passées s\'affiche. Appuyez sur l\'une d\'elles pour la rouvrir.',
      },
      {
        id: 'faq-chat-4',
        question: 'Thomas fonctionne-t-il sans connexion ?',
        answer:
          'Les messages envoyés hors ligne sont mis en file d\'attente et envoyés automatiquement dès que la connexion est rétablie.',
      },
    ],
  },
  {
    id: 'faq-parametrage',
    title: 'Paramétrage',
    icon: '⚙️',
    subPoints: [
      {
        id: 'faq-param-1',
        question: 'Comment ajouter une parcelle ?',
        answer:
          'Depuis "Profil > Configurer > Gestion des parcelles", appuyez sur "+ Nouvelle parcelle" et renseignez le nom et la superficie.',
      },
      {
        id: 'faq-param-2',
        question: 'Comment ajouter du matériel ?',
        answer:
          'Dans "Configurer > Gestion du matériel", utilisez le bouton "+" pour déclarer tracteurs, pulvérisateurs et autres équipements.',
      },
      {
        id: 'faq-param-3',
        question: 'Peut-on configurer plusieurs fermes ?',
        answer:
          'Oui. Vous pouvez créer et basculer entre plusieurs fermes depuis le sélecteur de ferme en haut de l\'écran.',
      },
      {
        id: 'faq-param-4',
        question: 'Comment modifier les unités de conversion ?',
        answer:
          'Dans "Configurer > Conversions", vous pouvez personnaliser les ratios utilisés par Thomas lors des calculs.',
      },
    ],
  },
  {
    id: 'faq-profil',
    title: 'Gestion du profil',
    icon: '👤',
    subPoints: [
      {
        id: 'faq-profil-1',
        question: 'Comment modifier mes informations personnelles ?',
        answer:
          'Depuis l\'onglet "Profil", appuyez sur "Profil et ferme" puis sur votre nom pour ouvrir l\'éditeur de profil.',
      },
      {
        id: 'faq-profil-2',
        question: 'Comment inviter un collaborateur ?',
        answer:
          'Dans "Profil et ferme > Membres de la ferme", utilisez l\'option d\'invitation par email pour ajouter un collaborateur.',
      },
      {
        id: 'faq-profil-3',
        question: 'Comment changer de ferme active ?',
        answer:
          'Appuyez sur le nom de la ferme dans l\'en-tête de l\'application pour ouvrir le sélecteur et basculer sur une autre ferme.',
      },
      {
        id: 'faq-profil-4',
        question: 'Comment se déconnecter ?',
        answer:
          'Faites défiler l\'onglet "Profil" jusqu\'en bas et appuyez sur le bouton "Déconnexion".',
      },
    ],
  },
];
