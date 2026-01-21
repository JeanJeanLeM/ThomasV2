# 🌱 Thomas V2 - Assistant Agricole IA

Application de suivi d'activité pour les agriculteurs basé sur l'IA et les messages vocaux.

Application mobile française pour maraîchers avec chatbot IA intégré, développée avec React Native/Expo et TypeScript.

## 🚀 Setup Développeur

### Prérequis

- **Node.js** >= 18.0.0
- **npm** ou **yarn**
- **Expo CLI** : `npm install -g @expo/cli`
- **Git**

### Installation

1. **Cloner et installer les dépendances**

```bash
git clone <repository-url>
cd MobileV2Thomas
npm install
```

2. **Configuration environnement**

```bash
# Copier le template d'environnement
cp env.example .env

# Éditer .env avec vos clés API
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_OPENAI_API_KEY
```

3. **Lancer l'application**

```bash
# Démarrer le serveur de développement
npm start

# Ou pour des plateformes spécifiques
npm run android  # Android
npm run ios      # iOS (macOS requis)
npm run web      # Web
```

## 🏗️ Architecture du Projet

```
src/
├── components/     # Composants réutilisables
├── screens/       # Écrans de navigation
├── services/      # Logique métier et API
├── hooks/         # Custom hooks React
├── utils/         # Utilitaires génériques
├── types/         # Définitions TypeScript
└── constants/     # Constantes application
```

## 🛠️ Scripts Disponibles

```bash
npm start          # Démarrer Expo
npm run lint       # Vérifier le code avec ESLint
npm run lint:fix   # Corriger automatiquement les erreurs
npm run format     # Formater avec Prettier
npm run type-check # Vérifier les types TypeScript
```

## 🎨 Design System

Le projet utilise un design system basé sur :

- **Couleurs** : Palette verte agriculture avec codes couleur définis
- **Typography** : Inter pour le texte, tailles standardisées
- **Spacing** : Système d'espacement cohérent (4px, 8px, 16px...)
- **Components** : Composants de base réutilisables

Voir `src/constants/index.ts` pour les tokens de design.

## 🔧 Configuration TypeScript

- **Mode strict** activé avec toutes les vérifications
- **Alias de chemins** configurés (@/, @/components, @/services...)
- **Import automatique** des types Expo et React Native

## 📱 Technologies

- **Framework** : Expo SDK 50+ / React Native
- **Language** : TypeScript 5+ (mode strict)
- **Styling** : StyleSheet natif + tokens design
- **Navigation** : React Navigation
- **Backend** : Supabase (PostgreSQL + Auth + Storage)
- **IA** : OpenAI GPT-4o-mini
- **Code Quality** : ESLint + Prettier + Husky

## 🎯 Critères d'Acceptation Techniques

- ✅ `expo start` démarre sans erreur
- ✅ TypeScript strict mode (0 erreur)
- ✅ ESLint + Prettier configurés
- ✅ Structure dossiers respectée
- ✅ Git hooks pré-commit fonctionnels
- ✅ Variables environnement template

## 🔍 Debugging

1. **Problèmes Expo** : Vérifier que Expo CLI est installé globalement
2. **Erreurs TypeScript** : Vérifier `tsconfig.json` et imports
3. **Problèmes ESLint** : Vérifier `.eslintrc.js` et packages installés
4. **Variables environnement** : S'assurer que `.env` existe avec les bonnes clés

## 📞 Support

- **Documentation** : Voir `/docs` pour spécifications complètes
- **Issues TypeScript** : Vérifier configuration strict mode
- **Performance** : Monitoring avec Expo DevTools

---

**Version** : 1.0.0  
**License** : Propriétaire  
**Équipe** : Thomas V2 Development Team
