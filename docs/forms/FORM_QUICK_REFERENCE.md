# Référence Rapide - Formulaires Thomas V2

## 🚀 Quick Start

### Modal de Formulaire
```tsx
import { StandardFormModal, FormSection } from '../design-system/components/StandardFormModal';
import { EnhancedInput } from '../design-system/components/EnhancedInput';

<StandardFormModal
  visible={visible}
  onClose={onClose}
  title="Titre"
  primaryAction={{ title: "Sauvegarder", onPress: handleSave }}
>
  <FormSection title="Section">
    <EnhancedInput label="Champ" value={value} onChangeText={setValue} />
  </FormSection>
</StandardFormModal>
```

### Écran de Formulaire
```tsx
import { FormScreen, FormSection } from '../design-system/components/FormScreen';

<FormScreen
  title="Titre"
  onBack={onBack}
  primaryAction={{ title: "Sauvegarder", onPress: handleSave }}
>
  <FormSection title="Section">
    <EnhancedInput label="Champ" />
  </FormSection>
</FormScreen>
```

## 📋 Composants Disponibles

### StandardFormModal
**Usage**: Modaux de formulaire fullscreen
```tsx
interface StandardFormModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction?: ButtonProps;
  secondaryAction?: ButtonProps;
  infoBanner?: {
    text: string;
    type: 'info' | 'warning' | 'success' | 'error';
  };
}
```

### FormScreen
**Usage**: Écrans de formulaire full-page
```tsx
interface FormScreenProps {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  primaryAction?: ButtonProps;
  secondaryAction?: ButtonProps;
  infoBanner?: {
    text: string;
    type: 'info' | 'warning' | 'success' | 'error';
  };
}
```

### EnhancedInput
**Usage**: Tous les champs de saisie
```tsx
interface EnhancedInputProps {
  label: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  disabled?: boolean;
}
```

### FormSection
**Usage**: Organiser le contenu en sections
```tsx
interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}
```

### RowFields & FieldWrapper
**Usage**: Champs en ligne (responsive)
```tsx
<RowFields>
  <FieldWrapper>
    <EnhancedInput label="Champ 1" />
  </FieldWrapper>
  <FieldWrapper>
    <EnhancedInput label="Champ 2" />
  </FieldWrapper>
</RowFields>
```

## 🎨 Patterns Courants

### Formulaire avec Validation
```tsx
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});

const updateField = (field, value) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};

<EnhancedInput
  label="Nom"
  value={formData.name}
  onChangeText={(value) => updateField('name', value)}
  required
  error={errors.name}
/>
```

### Champs Conditionnels
```tsx
<FormSection title="Informations">
  <EnhancedInput label="Type" />
  
  {formData.type === 'autre' && (
    <EnhancedInput 
      label="Précisez"
      placeholder="Décrivez le type personnalisé"
    />
  )}
</FormSection>
```

### Actions avec États
```tsx
<StandardFormModal
  primaryAction={{
    title: isLoading ? "Sauvegarde..." : "Sauvegarder",
    onPress: handleSave,
    loading: isLoading,
    disabled: !isValid || isLoading
  }}
  secondaryAction={{
    title: "Annuler",
    onPress: onClose
  }}
>
```

### Bannière d'Information
```tsx
<StandardFormModal
  infoBanner={{
    text: "Les modifications seront sauvegardées automatiquement",
    type: "info" // "info" | "warning" | "success" | "error"
  }}
>
```

## 🔧 Cas d'Usage Spécifiques

### Upload de Fichier
```tsx
<FormSection title="Document">
  <EnhancedInput label="Nom du document" />
  
  <PhotoPicker
    onImageSelected={handleFileSelect}
    selectedImage={selectedFile}
  />
</FormSection>
```

### Sélecteurs et Dropdowns
```tsx
<FormSection title="Catégorie">
  <DropdownSelector
    label="Type"
    items={categories}
    selectedItems={selectedCategory}
    onSelectionChange={setSelectedCategory}
  />
</FormSection>
```

### Champs Numériques
```tsx
<RowFields>
  <FieldWrapper>
    <EnhancedInput
      label="Longueur (m)"
      keyboardType="numeric"
      placeholder="Ex: 10.5"
    />
  </FieldWrapper>
  <FieldWrapper>
    <EnhancedInput
      label="Largeur (m)"
      keyboardType="numeric"
      placeholder="Ex: 5.2"
    />
  </FieldWrapper>
</RowFields>
```

### Champs Multilignes
```tsx
<EnhancedInput
  label="Description"
  multiline
  numberOfLines={4}
  placeholder="Décrivez en détail..."
  hint="Maximum 500 caractères"
/>
```

## ⚠️ Bonnes Pratiques

### ✅ À Faire
- Toujours utiliser `StandardFormModal` pour les modaux
- Utiliser `FormScreen` pour les écrans full-page
- Organiser le contenu avec `FormSection`
- Utiliser `EnhancedInput` pour tous les champs
- Ajouter des `hint` pour guider l'utilisateur
- Marquer les champs obligatoires avec `required`
- Gérer les états de chargement dans les actions

### ❌ À Éviter
- Ne pas utiliser `Modal` directement
- Ne pas utiliser `Input` ou `TextInput`
- Ne pas créer de headers personnalisés
- Ne pas utiliser `size="lg"` ou autres tailles
- Ne pas oublier la validation des erreurs
- Ne pas omettre les `label` sur les champs

## 🎯 Exemples par Type de Formulaire

### Formulaire Simple (Contact)
```tsx
<StandardFormModal title="Nouveau contact">
  <FormSection title="Informations">
    <EnhancedInput label="Nom" required />
    <EnhancedInput label="Email" keyboardType="email-address" />
    <EnhancedInput label="Téléphone" keyboardType="phone-pad" />
  </FormSection>
</StandardFormModal>
```

### Formulaire Complexe (Produit)
```tsx
<StandardFormModal 
  title="Nouveau produit"
  infoBanner={{ text: "Tous les champs * sont obligatoires", type: "info" }}
>
  <FormSection title="Informations générales">
    <EnhancedInput label="Nom du produit" required />
    <DropdownSelector label="Catégorie" />
    
    <RowFields>
      <FieldWrapper>
        <EnhancedInput label="Prix (€)" keyboardType="numeric" />
      </FieldWrapper>
      <FieldWrapper>
        <EnhancedInput label="Stock" keyboardType="numeric" />
      </FieldWrapper>
    </RowFields>
  </FormSection>
  
  <FormSection title="Description">
    <EnhancedInput
      label="Description détaillée"
      multiline
      numberOfLines={4}
    />
  </FormSection>
  
  <FormSection title="Images">
    <PhotoPicker onImageSelected={handleImage} />
  </FormSection>
</StandardFormModal>
```

### Écran de Paramètres
```tsx
<FormScreen
  title="Paramètres"
  onBack={goBack}
  primaryAction={{ title: "Sauvegarder", onPress: handleSave }}
>
  <FormSection title="Profil">
    <EnhancedInput label="Nom d'utilisateur" />
    <EnhancedInput label="Email" keyboardType="email-address" />
  </FormSection>
  
  <FormSection title="Préférences">
    <Switch label="Notifications push" />
    <Switch label="Mode sombre" />
  </FormSection>
</FormScreen>
```

## 📱 Optimisations Mobile

### Clavier Adaptatif
```tsx
// Automatique avec keyboardType
<EnhancedInput keyboardType="email-address" /> // Clavier email
<EnhancedInput keyboardType="numeric" />       // Clavier numérique
<EnhancedInput keyboardType="phone-pad" />     // Clavier téléphone
```

### Touch Targets
```tsx
// Automatiquement optimisé (44px minimum)
// Espacement suffisant entre les éléments
```

### Scroll et Navigation
```tsx
// Automatique avec StandardFormModal et FormScreen
// KeyboardAvoidingView intégré
// Scroll fluide garanti
```

## 🌐 Compatibilité Web

### Styles Cross-Browser
```tsx
// Automatiquement géré par les composants
// Styles forcés pour cohérence
// Suppression des styles natifs
```

### Performance
```tsx
// Optimisations intégrées :
// - Bundle splitting
// - Lazy loading
// - Styles optimisés
```

## 🧪 Tests

### Tests Unitaires
```tsx
import { render, fireEvent } from '@testing-library/react-native';

test('should update field value', () => {
  const onChangeText = jest.fn();
  const { getByDisplayValue } = render(
    <EnhancedInput label="Test" onChangeText={onChangeText} />
  );
  
  fireEvent.changeText(getByDisplayValue(''), 'new value');
  expect(onChangeText).toHaveBeenCalledWith('new value');
});
```

### Tests d'Intégration
```tsx
test('should save form data', async () => {
  const onSave = jest.fn();
  const { getByText } = render(
    <StandardFormModal
      visible={true}
      primaryAction={{ title: "Sauvegarder", onPress: onSave }}
    >
      <FormSection title="Test">
        <EnhancedInput label="Nom" />
      </FormSection>
    </StandardFormModal>
  );
  
  fireEvent.press(getByText('Sauvegarder'));
  expect(onSave).toHaveBeenCalled();
});
```

## 📚 Ressources

### Documentation Complète
- `FORM_MIGRATION_COMPLETE_GUIDE.md` - Guide détaillé
- `docs/FORM_STYLE_GUIDE.md` - Guide de style
- `docs/DESIGN_SYSTEM_GUIDE.md` - Design system

### Composants de Référence
- `src/design-system/components/StandardFormModal.tsx`
- `src/design-system/components/FormScreen.tsx`
- `src/design-system/components/EnhancedInput.tsx`

### Exemples Complets
- `src/design-system/components/modals/TaskEditModal.tsx`
- `src/design-system/components/modals/PlotFormModal.tsx`
- `src/screens/CreateNotificationScreen.tsx`

---

**💡 Conseil**: Commencez toujours par copier un exemple existant et l'adapter à vos besoins !
