# Guide de Migration des Formulaires - Thomas V2

## 🎯 Objectif

Ce guide explique comment migrer les formulaires existants vers le **nouveau système unifié** qui résout les problèmes de :
- ✅ Doubles bordures sur web
- ✅ Backgrounds invisibles 
- ✅ Styles incohérents entre formulaires
- ✅ Expérience utilisateur frustrante

## 🚨 PROBLÈMES IDENTIFIÉS

### Problème 1 : Incohérence architecturale
- **ConversionModal** : Utilise `TextInput` direct avec `getWebInputStyle()`
- **ProfileEditModal** : Utilise le composant `Input` du design system
- **Autres modals** : Mélange des deux approches

### Problème 2 : Double bordure sur web
- CSS supprime les bordures natives (`border: none !important`)
- React Native applique ses propres bordures
- **Résultat** : Bordure visible + zone de clic invisible

### Problème 3 : Backgrounds invisibles
- Certains formulaires héritent du background de la page
- **Résultat** : Champs blancs sur fond blanc = invisibles

## ✅ SOLUTION UNIFIÉE

### Nouveaux Composants

#### 1. `StandardFormModal`
```typescript
import { StandardFormModal, FormSection, RowFields, FieldWrapper } from '../design-system/components';

<StandardFormModal
  visible={visible}
  onClose={onClose}
  title="Titre du Formulaire"
  primaryAction={{
    title: 'Sauvegarder',
    onPress: handleSave,
    loading: isLoading,
  }}
  secondaryAction={{
    title: 'Annuler',
    onPress: onClose,
  }}
  infoBanner={{
    text: "Information contextuelle",
    type: 'info', // 'info' | 'warning' | 'success'
  }}
>
  {/* Contenu du formulaire */}
</StandardFormModal>
```

#### 2. `EnhancedInput`
```typescript
import { EnhancedInput } from '../design-system/components';

<EnhancedInput
  label="Nom du champ"
  placeholder="Exemple"
  value={formData.field}
  onChangeText={(value) => updateFormData('field', value)}
  required
  error={errors.field}
  hint="Information d'aide"
/>
```

#### 3. Helpers d'organisation
```typescript
<FormSection title="Section" description="Description optionnelle">
  <EnhancedInput />
  <RowFields>
    <FieldWrapper flex={1}>
      <EnhancedInput />
    </FieldWrapper>
    <FieldWrapper flex={2}>
      <EnhancedInput />
    </FieldWrapper>
  </RowFields>
</FormSection>
```

## 🔄 ÉTAPES DE MIGRATION

### Étape 1 : Identifier le type de formulaire

#### Type A : Modal avec TextInput direct (ConversionModal)
```typescript
// ❌ AVANT
<Modal visible={visible} animationType="slide">
  <TextInput style={getWebInputStyle(styles.input)} />
</Modal>

// ✅ APRÈS
<StandardFormModal visible={visible}>
  <EnhancedInput />
</StandardFormModal>
```

#### Type B : Modal avec composant Input (ProfileEditModal)
```typescript
// ❌ AVANT
<Modal visible={visible} size="fullscreen">
  <Input />
</Modal>

// ✅ APRÈS
<StandardFormModal visible={visible}>
  <EnhancedInput />
</StandardFormModal>
```

### Étape 2 : Remplacer le container

#### Avant (Modal personnalisé)
```typescript
<Modal
  visible={visible}
  animationType="slide"
  presentationStyle="pageSheet"
>
  <KeyboardAvoidingView style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Titre</Text>
      <TouchableOpacity onPress={onClose}>
        <XIcon />
      </TouchableOpacity>
    </View>
    <ScrollView style={styles.content}>
      {/* Contenu */}
    </ScrollView>
    <View style={styles.footer}>
      <Button title="Annuler" onPress={onClose} />
      <Button title="Sauvegarder" onPress={handleSave} />
    </View>
  </KeyboardAvoidingView>
</Modal>
```

#### Après (StandardFormModal)
```typescript
<StandardFormModal
  visible={visible}
  onClose={onClose}
  title="Titre"
  primaryAction={{
    title: 'Sauvegarder',
    onPress: handleSave,
    loading: isLoading,
  }}
  secondaryAction={{
    title: 'Annuler',
    onPress: onClose,
  }}
>
  {/* Contenu simplifié */}
</StandardFormModal>
```

### Étape 3 : Remplacer les inputs

#### TextInput direct → EnhancedInput
```typescript
// ❌ AVANT
<Text style={styles.label}>Nom</Text>
<TextInput
  style={getWebInputStyle(styles.input)}
  placeholder="Saisissez le nom"
  value={formData.name}
  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
/>

// ✅ APRÈS
<EnhancedInput
  label="Nom"
  placeholder="Saisissez le nom"
  value={formData.name}
  onChangeText={(value) => updateFormData('name', value)}
  required
/>
```

#### Input existant → EnhancedInput
```typescript
// ❌ AVANT
<Input
  label="Nom"
  placeholder="Saisissez le nom"
  value={formData.name}
  onChangeText={(value) => updateFormData('name', value)}
  required
/>

// ✅ APRÈS
<EnhancedInput
  label="Nom"
  placeholder="Saisissez le nom"
  value={formData.name}
  onChangeText={(value) => updateFormData('name', value)}
  required
/>
```

### Étape 4 : Organiser en sections

```typescript
// ✅ ORGANISATION RECOMMANDÉE
<StandardFormModal>
  <FormSection 
    title="Informations principales"
    description="Renseignez les données de base"
  >
    <EnhancedInput label="Nom" />
    <EnhancedInput label="Email" />
  </FormSection>

  <FormSection title="Adresse">
    <EnhancedInput label="Rue" />
    <RowFields>
      <FieldWrapper flex={1}>
        <EnhancedInput label="Code postal" />
      </FieldWrapper>
      <FieldWrapper flex={2}>
        <EnhancedInput label="Ville" />
      </FieldWrapper>
    </RowFields>
  </FormSection>
</StandardFormModal>
```

## 📋 CHECKLIST DE MIGRATION

### ✅ Structure
- [ ] Remplacer `Modal` par `StandardFormModal`
- [ ] Supprimer le header personnalisé
- [ ] Supprimer les boutons footer personnalisés
- [ ] Utiliser `primaryAction` et `secondaryAction`

### ✅ Inputs
- [ ] Remplacer `TextInput` par `EnhancedInput`
- [ ] Remplacer `Input` par `EnhancedInput`
- [ ] Supprimer les appels à `getWebInputStyle()`
- [ ] Supprimer les styles personnalisés d'input

### ✅ Organisation
- [ ] Organiser en `FormSection`
- [ ] Utiliser `RowFields` pour les champs côte à côte
- [ ] Ajouter une `infoBanner` si modification
- [ ] Vérifier les `hint` et `error` sur les champs

### ✅ Validation
- [ ] Tester sur web (Chrome)
- [ ] Vérifier les bordures visibles
- [ ] Vérifier les backgrounds blancs
- [ ] Tester la navigation clavier
- [ ] Tester les états focus/error

## 🎯 FORMULAIRES À MIGRER

### Priorité 1 (Problèmes critiques)
1. **ConversionModal** - Double bordure + TextInput direct
2. **CreateItemModal** - Utilise encore `size="lg"`
3. **Tous les formulaires avec TextInput direct**

### Priorité 2 (Amélioration UX)
1. **ProfileEditModal** - Déjà fullscreen, juste remplacer Input
2. **FarmEditModal** - Déjà fullscreen, juste remplacer Input
3. **EditMemberModal** - Déjà fullscreen, juste remplacer Input

### Priorité 3 (Nouveaux formulaires)
1. Formulaires de parcelles
2. Formulaires de matériel
3. Autres formulaires futurs

## 🔧 EXEMPLE COMPLET DE MIGRATION

### Avant (ConversionModal)
```typescript
export const ConversionModal: React.FC<Props> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="slide">
      <KeyboardAvoidingView style={styles.container}>
        <View style={styles.header}>
          <Text variant="h2" style={styles.headerTitle}>Ajouter une conversion</Text>
          <TouchableOpacity onPress={onClose}>
            <XIcon color={colors.text.secondary} size={24} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text variant="body" weight="medium" style={styles.label}>Nom</Text>
            <TextInput
              style={getWebInputStyle(styles.input)}
              placeholder="ex: Caisse plastique de tomates"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />
          </View>
        </ScrollView>
        
        <View style={styles.footer}>
          <Button title="Annuler" variant="outline" onPress={onClose} />
          <Button title="Créer" onPress={handleSave} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
```

### Après (ConversionModal migré)
```typescript
export const ConversionModal: React.FC<Props> = ({ visible, onClose }) => {
  return (
    <StandardFormModal
      visible={visible}
      onClose={onClose}
      title="Ajouter une conversion"
      primaryAction={{
        title: 'Créer',
        onPress: handleSave,
        loading: isLoading,
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
    >
      <FormSection title="Informations de base">
        <EnhancedInput
          label="Nom de la conversion"
          placeholder="ex: Caisse plastique de tomates"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          required
          error={errors.name}
          hint="Le nom se génère automatiquement, mais vous pouvez le personnaliser"
        />
      </FormSection>
    </StandardFormModal>
  );
};
```

## 🚨 RÈGLES CRITIQUES

### TOUJOURS
1. **Utiliser `StandardFormModal`** pour tous les formulaires
2. **Utiliser `EnhancedInput`** au lieu de Input ou TextInput
3. **Organiser en `FormSection`** pour la lisibilité
4. **Tester sur web** avant de valider

### JAMAIS
1. **Ne pas utiliser `Modal` avec `size="lg"` ou `size="md"`** pour les formulaires
2. **Ne pas utiliser `TextInput` direct** dans les formulaires
3. **Ne pas appeler `getWebInputStyle()`** - c'est géré automatiquement
4. **Ne pas créer de header/footer personnalisés** - utiliser les actions du Modal

---

**Version** : 1.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : Analyse des problèmes de bordures et backgrounds sur web











