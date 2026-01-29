# Guide de Style des Formulaires - Thomas V2

## 📋 Vue d'ensemble

Ce document définit les standards de style et de structure pour tous les formulaires de l'application Thomas V2. **TOUS LES FORMULAIRES DOIVENT ÊTRE EN PLEIN ÉCRAN (FULLSCREEN)** et non des modales centrées, basé sur l'implémentation du formulaire de modification de ferme.

## 🎨 Principes de Design

### 🚨 RÈGLE FONDAMENTALE : FORMULAIRES PLEIN ÉCRAN
- **OBLIGATOIRE** : Tous les formulaires doivent utiliser `size="fullscreen"` 
- **INTERDIT** : Les modales centrées (`size="lg"`, `size="md"`) pour les formulaires
- **COMPORTEMENT** : Le formulaire occupe tout l'écran comme une page d'application
- **NAVIGATION** : Header avec bouton retour, boutons sticky en bas

### Cohérence Visuelle
- **Espacement uniforme** : Utilisation systématique du système `spacing`
- **Couleurs cohérentes** : Respect de la palette `colors` du design system
- **Typographie standardisée** : Application des `textStyles` définis

### UX/UI Best Practices
- **Bordures simples** : Éviter les effets de double bordure
- **États visuels clairs** : Focus, erreur, disabled
- **Accessibilité** : Labels obligatoires, contrastes suffisants

## 🏗️ Structure des Formulaires

### 1. Layout Principal - FORMULAIRE PLEIN ÉCRAN

```typescript
// ✅ CORRECT : Formulaire fullscreen avec Modal
<Modal
  visible={visible}
  onClose={onClose}
  title="Titre du Formulaire"
  size="fullscreen"  // 🚨 OBLIGATOIRE : TOUJOURS fullscreen
  primaryAction={{
    title: 'Sauvegarder',
    onPress: handleSave,
    loading: loading,
  }}
  secondaryAction={{
    title: 'Annuler',
    onPress: onClose,
  }}
>
  <ScrollView showsVerticalScrollIndicator={false}>
    <View style={{ gap: spacing.lg }}>
      {/* Sections du formulaire */}
    </View>
  </ScrollView>
</Modal>

// ❌ INTERDIT : Modal centrée
<Modal size="lg">  // ❌ NE PAS UTILISER
<Modal size="md">  // ❌ NE PAS UTILISER
```

### 2. Sections du Formulaire

```typescript
<View style={{ gap: spacing.lg }}>
  {/* Badge informatif (si modification) */}
  <InfoBadge />
  
  {/* Section 1 */}
  <FormSection title="Informations générales">
    <Input />
    <DropdownSelector />
  </FormSection>
  
  {/* Section 2 */}
  <FormSection title="Localisation">
    <Input />
    <RowFields />
  </FormSection>
</View>
```

## 🧩 Composants Standards

### Input Component

#### Propriétés Obligatoires
```typescript
<Input
  label="Nom du champ"           // Toujours présent
  placeholder="Exemple de saisie" // Guide utilisateur
  value={formData.field}          // Valeur contrôlée
  onChangeText={updateField}      // Handler de mise à jour
/>
```

#### Propriétés Optionnelles
```typescript
<Input
  required                        // Champ obligatoire (*)
  hint="Information complémentaire" // Aide contextuelle
  error="Message d'erreur"        // État d'erreur
  disabled                        // État désactivé
  multiline                       // Zone de texte
  numberOfLines={3}               // Hauteur multiline
  keyboardType="numeric"          // Type de clavier
/>
```

#### Styles Techniques
- **Bordure unique** : `borderWidth: 1` sur le container uniquement
- **Pas de bordure native** : `borderWidth: 0` sur le TextInput
- **Outline supprimé** : `outlineStyle: 'none'` pour le web
- **Background adaptatif** : Blanc normal, gris si disabled

### DropdownSelector Component

```typescript
<DropdownSelector
  label="Type de sélection"
  placeholder="Sélectionnez une option"
  items={OPTIONS_ARRAY}
  selectedItems={selectedValues}
  onSelectionChange={handleSelection}
/>
```

### Champs en Ligne (Row Fields)

```typescript
<View style={{ flexDirection: 'row', gap: spacing.md }}>
  <View style={{ flex: 1 }}>
    <Input
      label="Code postal"
      containerStyle={{ marginBottom: 0 }}
    />
  </View>
  <View style={{ flex: 2 }}>
    <Input
      label="Ville"
      containerStyle={{ marginBottom: 0 }}
    />
  </View>
</View>
```

## 🎯 Sections de Formulaire

### Section Standard

```typescript
<View>
  <Text variant="h3" color={colors.text.primary} style={{ marginBottom: spacing.md }}>
    Titre de la Section
  </Text>
  
  {/* Champs de la section */}
  <Input />
  <DropdownSelector />
  <Input />
</View>
```

### Badge Informatif

```typescript
<View style={{ 
  backgroundColor: colors.primary[50], 
  padding: spacing.md, 
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.primary[200],
}}>
  <Text variant="body" color={colors.primary[700]} weight="semibold">
    Information contextuelle
  </Text>
</View>
```

## 🔘 Boutons et Actions

### Boutons Sticky (Recommandé)

```typescript
<View style={{
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: colors.background.primary,
  borderTopWidth: 1,
  borderTopColor: colors.border.primary,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.md + 10, // Espace réduit pour navigation
  shadowColor: colors.gray[900],
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 8,
}}>
  <View style={{ flexDirection: 'row', gap: spacing.md }}>
    <Button
      title="Annuler"
      variant="outline"
      onPress={handleCancel}
      style={{ flex: 1 }}
    />
    
    <Button
      title="Sauvegarder"
      variant="primary"
      onPress={handleSave}
      loading={isLoading}
      disabled={!isFormValid}
      style={{ flex: 1 }}
    />
  </View>
</View>
```

### Bouton de Suppression

```typescript
<View style={{ 
  marginTop: spacing.xl, 
  paddingTop: spacing.lg, 
  borderTopWidth: 1, 
  borderTopColor: colors.border.primary 
}}>
  <Button
    title="Supprimer"
    variant="danger"
    onPress={handleDelete}
  />
</View>
```

## 📐 Espacements Standards

### Système d'Espacement
- **`spacing.xs`** : 4px - Espacement minimal
- **`spacing.sm`** : 8px - Entre label et input
- **`spacing.md`** : 16px - Entre champs, padding standard
- **`spacing.lg`** : 24px - Entre sections, padding container
- **`spacing.xl`** : 32px - Séparations importantes

### Application Pratique
```typescript
// Container principal
padding: spacing.lg                    // 24px

// Entre sections
gap: spacing.lg                        // 24px

// Entre champs d'une section
marginBottom: spacing.md (par défaut)  // 16px

// Entre label et input
marginBottom: spacing.sm               // 8px

// Champs en ligne
gap: spacing.md                        // 16px

// Boutons sticky - dimensions optimisées
paddingHorizontal: spacing.lg          // 24px
paddingTop: spacing.md                 // 16px
paddingBottom: spacing.md + 10         // 26px (16px + 10px navigation)

// ScrollView - espace réservé pour sticky
paddingBottom: 80                      // 80px (hauteur sticky optimisée)
```

## 🎨 Couleurs et États

### États des Champs

#### Normal
```typescript
backgroundColor: colors.background.primary  // Blanc
borderColor: colors.border.primary         // Gris clair
```

#### Focus
```typescript
borderColor: colors.border.focus           // Bleu
```

#### Erreur
```typescript
borderColor: colors.border.error           // Rouge
backgroundColor: colors.background.primary  // Reste blanc
```

#### Disabled
```typescript
backgroundColor: colors.gray[50]           // Gris très clair
borderColor: colors.border.primary         // Gris normal
color: colors.text.tertiary               // Texte gris
```

### Couleurs de Texte
- **Labels** : `colors.text.secondary`
- **Input text** : `colors.text.primary`
- **Placeholder** : `colors.text.tertiary`
- **Erreur** : `colors.text.error`
- **Hint** : `colors.text.secondary`

## ✅ Validation et Gestion d'État

### Structure de FormData

```typescript
interface FormData {
  // Champs obligatoires
  name: string;
  
  // Champs optionnels
  description?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  region?: string;
  country: string; // Valeur par défaut
  total_area?: string;
  field_type?: string;
}
```

### Validation

```typescript
const validateForm = () => {
  const errors: Record<string, string> = {};
  
  // Validation obligatoire
  if (!formData.name.trim()) {
    errors.name = 'Ce champ est obligatoire';
  }
  
  // Validation longueur
  if (formData.name.length < 2 || formData.name.length > 100) {
    errors.name = 'Entre 2 et 100 caractères';
  }
  
  return errors;
};
```

### Gestion des États

```typescript
const [formData, setFormData] = useState<FormData>(initialData);
const [isLoading, setIsLoading] = useState(false);
const [errors, setErrors] = useState<Record<string, string>>({});

const updateFormData = (field: keyof FormData, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  // Nettoyer l'erreur si corrigée
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }
};
```

## 📱 Responsive Design

### Champs en Ligne
```typescript
// Mobile : Stack vertical
<View style={{ gap: spacing.md }}>
  <Input label="Code postal" />
  <Input label="Ville" />
</View>

// Desktop : Ligne horizontale
<View style={{ flexDirection: 'row', gap: spacing.md }}>
  <View style={{ flex: 1 }}>
    <Input label="Code postal" />
  </View>
  <View style={{ flex: 2 }}>
    <Input label="Ville" />
  </View>
</View>
```

## 🔧 Exemple Complet : Formulaire Type PLEIN ÉCRAN

```typescript
// ✅ MODÈLE STANDARD : Formulaire fullscreen avec Modal
export const StandardFormModal: React.FC<Props> = ({ visible, onClose }) => {
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Logique de sauvegarde
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Titre du Formulaire"
      size="fullscreen"  // 🚨 OBLIGATOIRE
      primaryAction={{
        title: 'Sauvegarder',
        onPress: handleSave,
        loading: isLoading,
        disabled: !formData.name?.trim(),
      }}
      secondaryAction={{
        title: 'Annuler',
        onPress: onClose,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg }}>
          
          {/* Badge informatif */}
          <View style={{
            backgroundColor: colors.primary[50],
            borderRadius: 8,
            padding: spacing.md,
            borderLeftWidth: 4,
            borderLeftColor: colors.primary[600],
          }}>
            <Text variant="body" style={{ 
              color: colors.primary[700],
              fontWeight: '600'
            }}>
              Information contextuelle
            </Text>
          </View>

          {/* Section 1 */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Informations principales
            </Text>
            
            <Input
              label="Nom"
              placeholder="Saisissez le nom"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              required
            />
            
            <DropdownSelector
              label="Type"
              placeholder="Sélectionnez un type"
              items={TYPE_OPTIONS}
              selectedItems={TYPE_OPTIONS.filter(t => t.id === formData.type)}
              onSelectionChange={(items) => updateFormData('type', items[0]?.id)}
            />
          </View>

          {/* Section 2 */}
          <View>
            <Text variant="h3" style={{ 
              color: colors.text.primary,
              marginBottom: spacing.md,
              fontSize: 18,
              fontWeight: '600'
            }}>
              Localisation
            </Text>
            
            <Input
              label="Adresse"
              placeholder="Adresse complète"
              value={formData.address}
              onChangeText={(value) => updateFormData('address', value)}
            />
            
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Code postal"
                  placeholder="Ex: 69420"
                  value={formData.postal_code}
                  onChangeText={(value) => updateFormData('postal_code', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 2 }}>
                <Input
                  label="Ville"
                  placeholder="Ex: Condrieu"
                  value={formData.city}
                  onChangeText={(value) => updateFormData('city', value)}
                />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
};

// 🚨 RAPPEL : Les boutons sont automatiquement gérés par le composant Modal
// avec primaryAction et secondaryAction - PAS de boutons manuels !
```

## 📋 Checklist de Conformité

### 🚨 OBLIGATOIRE : Format Plein Écran
- [ ] **Modal avec `size="fullscreen"`** - REQUIS
- [ ] **Pas de modal centrée** (`size="lg"`, `size="md"`) - INTERDIT
- [ ] **Boutons gérés par Modal** (`primaryAction`, `secondaryAction`) - REQUIS
- [ ] **Header automatique** avec titre et bouton fermeture - INCLUS

### ✅ Structure
- [ ] Layout principal avec ScrollView dans Modal
- [ ] Sections avec titres h3 (fontSize: 18, fontWeight: '600')
- [ ] Espacement `gap: spacing.lg` entre sections
- [ ] Badge informatif en haut si modification

### ✅ Champs
- [ ] Labels obligatoires sur tous les inputs
- [ ] Placeholders informatifs
- [ ] Gestion des états (focus, error, disabled)
- [ ] Pas de double bordure
- [ ] Validation appropriée

### ✅ Boutons (Automatiques via Modal)
- [ ] `primaryAction` pour l'action principale (Sauvegarder)
- [ ] `secondaryAction` pour l'annulation
- [ ] États loading/disabled gérés dans primaryAction
- [ ] Boutons sticky automatiquement en bas

### ✅ Accessibilité
- [ ] Contrastes suffisants
- [ ] Labels associés aux champs
- [ ] Messages d'erreur clairs
- [ ] Navigation clavier possible

---

## 🚨 RÉSUMÉ DES RÈGLES CRITIQUES

### FORMULAIRES = PLEIN ÉCRAN OBLIGATOIRE
1. **TOUJOURS** utiliser `<Modal size="fullscreen">`
2. **JAMAIS** de modal centrée pour les formulaires
3. **TOUJOURS** `primaryAction` et `secondaryAction` pour les boutons
4. **TOUJOURS** des sections organisées avec titres h3
5. **TOUJOURS** une bannière informative si modification

### STRUCTURE TYPE
```typescript
<Modal size="fullscreen" primaryAction={{...}} secondaryAction={{...}}>
  <ScrollView>
    <View style={{ gap: spacing.lg }}>
      <InfoBadge />
      <Section title="Titre">
        <Input />
      </Section>
    </View>
  </ScrollView>
</Modal>
```

---

**Version** : 2.0  
**Dernière mise à jour** : Novembre 2024  
**Basé sur** : ProfileEditModal et FarmEditModal fullscreen implementations
