# Guide d'utilisation du DatePicker

Le composant `DatePicker` est un sélecteur de date mobile-first conçu pour remplacer tous les champs de date textuels dans l'application Thomas V2.

## 🎯 Objectifs

- **Mobile-first** : Interface tactile optimisée pour mobile
- **Web-compatible** : Utilise l'input HTML natif sur web pour les tests
- **Cohérence** : Interface uniforme dans tous les formulaires
- **Accessibilité** : Labels, hints, et gestion d'erreurs intégrés

## 📱 Comportement par plateforme

### Mobile (iOS/Android)
- Modal plein écran avec sélecteurs tactiles
- Colonnes séparées pour jour, mois, année
- Aperçu de la date sélectionnée
- Boutons Annuler/Confirmer

### Web (pour tests)
- Input HTML `type="date"` natif
- Intégration avec le calendrier du navigateur
- Même API que la version mobile

## 🔧 Utilisation de base

```tsx
import { DatePicker } from '../design-system/components';

const [selectedDate, setSelectedDate] = useState<Date | undefined>();

<DatePicker
  label="Date de la tâche"
  value={selectedDate}
  onChange={setSelectedDate}
  placeholder="Sélectionner une date"
  required
/>
```

## 📋 Props disponibles

| Prop | Type | Défaut | Description |
|------|------|--------|-------------|
| `label` | `string` | - | Label du champ |
| `value` | `Date` | - | Date sélectionnée |
| `onChange` | `(date: Date) => void` | - | Callback de changement |
| `placeholder` | `string` | "Sélectionner une date" | Texte placeholder |
| `required` | `boolean` | `false` | Champ obligatoire |
| `disabled` | `boolean` | `false` | Champ désactivé |
| `minDate` | `Date` | - | Date minimum |
| `maxDate` | `Date` | - | Date maximum |
| `error` | `string` | - | Message d'erreur |
| `hint` | `string` | - | Texte d'aide |
| `style` | `ViewStyle` | - | Styles personnalisés |

## 💡 Exemples d'utilisation

### Date de naissance (contrainte passé)
```tsx
<DatePicker
  label="Date de naissance"
  value={birthDate}
  onChange={setBirthDate}
  maxDate={new Date()} // Pas de date future
  minDate={new Date(1900, 0, 1)} // Pas avant 1900
  required
/>
```

### Événement futur (contrainte futur)
```tsx
<DatePicker
  label="Date d'événement"
  value={eventDate}
  onChange={setEventDate}
  minDate={new Date()} // Seulement dates futures
  error={eventDate && eventDate < new Date() ? "Date doit être future" : undefined}
/>
```

### Date d'achat (avec hint)
```tsx
<DatePicker
  label="Date d'achat"
  value={purchaseDate}
  onChange={setPurchaseDate}
  hint="Date d'acquisition du matériel"
/>
```

## 🔄 Migration depuis EnhancedInput

### Avant (EnhancedInput)
```tsx
const [formData, setFormData] = useState({
  date: new Date(),
  // ...
});

const formatDateForInput = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const parseInputDate = (dateString: string) => {
  return new Date(dateString + 'T12:00:00');
};

<EnhancedInput
  label="Date"
  value={formData.date ? formatDateForInput(formData.date) : ''}
  onChangeText={(value) => updateFormData('date', parseInputDate(value))}
  placeholder="YYYY-MM-DD"
/>
```

### Après (DatePicker)
```tsx
const [formData, setFormData] = useState({
  date: new Date(),
  // ...
});

<DatePicker
  label="Date"
  value={formData.date}
  onChange={(date) => updateFormData('date', date)}
  placeholder="Sélectionner une date"
  required
/>
```

## ✅ Formulaires migrés

- ✅ `TaskEditModal` - Date de la tâche
- ✅ `ObservationEditModal` - Date d'observation  
- ✅ `MaterialsSettingsScreen` - Date d'achat du matériel

## 🎨 Personnalisation

Le DatePicker utilise automatiquement :
- Les couleurs du design system (`colors.primary`, `colors.error`, etc.)
- L'espacement cohérent (`spacing`)
- La typographie standardisée (`Text` variants)
- Les icônes du système (`CalendarIcon`, `ChevronDownIcon`)

## 🧪 Tests

Pour tester le DatePicker :

1. **Sur web** : Utilisez l'émulation mobile dans les DevTools
2. **Sur mobile** : Testez sur device ou simulateur
3. **Exemple intégré** : Importez `DatePickerExample` pour voir tous les cas d'usage

```tsx
import { DatePickerExample } from '../design-system/components';

// Dans votre écran de test
<DatePickerExample />
```

## 🔍 Débogage

Le DatePicker inclut des logs de débogage en mode développement :
- Ouverture/fermeture du modal
- Validation des contraintes min/max
- Changements de valeur

## 📝 Bonnes pratiques

1. **Toujours utiliser `Date`** : Ne pas convertir en string
2. **Gérer `undefined`** : La valeur peut être undefined initialement
3. **Contraintes logiques** : Utilisez `minDate`/`maxDate` pour la validation
4. **Messages d'erreur** : Utilisez la prop `error` pour la validation
5. **Hints utiles** : Expliquez le contexte avec `hint`

## 🚀 Évolutions futures

- Support des plages de dates
- Sélection de l'heure intégrée
- Présets rapides (Aujourd'hui, Demain, etc.)
- Localisation multi-langues
