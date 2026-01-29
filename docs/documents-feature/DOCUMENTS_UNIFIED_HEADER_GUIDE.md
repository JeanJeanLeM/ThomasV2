# 🎯 Refonte avec UnifiedHeader - Écran des Documents

## 📋 Modifications Apportées

### 1. **Remplacement du Header**
- **Supprimé** : Header simple personnalisé
- **Ajouté** : `UnifiedHeader` standardisé de l'application
- **Conformité** : Cohérence avec tous les autres écrans

```typescript
// ✅ NOUVEAU : UnifiedHeader standardisé
<UnifiedHeader
  title="Documents"
  onBack={onBack}
  onFarmSelector={onFarmSelector}
  showBackButton={!!onBack}
/>
```

### 2. **Réorganisation de la Page**
- **Structure** : Inspirée du MaterialsScreen (screenshot de référence)
- **Hiérarchie** : UnifiedHeader → Titre section → Stats → Filtres → Liste
- **ScrollView** : Container principal scrollable

### 3. **Nouvelle Organisation**

```
📱 UnifiedHeader ("Documents")
├── 🔙 Bouton retour (si onBack fourni)
├── 🏢 Sélecteur de ferme (toujours présent)
└── 📄 Titre centré

📜 ScrollView Principal
├── 📝 "Mes Documents" + [Test] [+] (Titre de section)
├── 📊 Aperçu de vos documents (Statistiques)
├── 🔍 Filtres (Recherche + Cartouches)
└── 📋 Liste des documents
```

## 🏗️ Structure Technique

### **Header Unifié**
```typescript
interface DocumentsScreenProps {
  onBack?: () => void;           // Navigation retour
  onFarmSelector?: () => void;   // Sélecteur de ferme
}

// Utilisation dans SimpleNavigator
<DocumentsScreen 
  onBack={handleBack}
  onFarmSelector={handleFarmSelector}
/>
```

### **Container Principal**
```typescript
return (
  <View style={styles.container}>
    {/* Header unifié */}
    <UnifiedHeader
      title="Documents"
      onBack={onBack}
      onFarmSelector={onFarmSelector}
      showBackButton={!!onBack}
    />

    {/* Contenu scrollable */}
    <ScrollView style={styles.scrollContainer}>
      {/* Titre de section */}
      <View style={styles.sectionHeader}>
        <Text variant="h2">Mes Documents</Text>
        <View style={styles.sectionActions}>
          <TouchableOpacity>Test</TouchableOpacity>
          <TouchableOpacity>+</TouchableOpacity>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.summaryCard}>...</View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>...</View>

      {/* Liste */}
      <View style={styles.documentsList}>...</View>
    </ScrollView>
  </View>
);
```

## 🎨 Comparaison avec MaterialsScreen

### **Structure Similaire**
| Élément | MaterialsScreen | DocumentsScreen |
|---------|----------------|-----------------|
| **Header** | UnifiedHeader "Matériel" | UnifiedHeader "Documents" |
| **Titre Section** | "Gestion du matériel" + [+] | "Mes Documents" + [Test] [+] |
| **Stats** | "Aperçu de vos données" | "Aperçu de vos documents" |
| **Filtres** | Cartouches (Tous, Actifs, Inactifs) | Cartouches (Catégories) |
| **Liste** | Liste des matériels | Liste des documents |

### **Cohérence Visuelle**
- **Header** : Même hauteur, même style, même comportement
- **Espacement** : `paddingTop: spacing.lg` pour le titre de section
- **Boutons** : Même style pour les boutons d'action
- **Scroll** : Même comportement de défilement

## 🔧 Avantages de la Refonte

### **1. Cohérence de l'Application**
- **Header standardisé** : Même expérience sur tous les écrans
- **Navigation uniforme** : Bouton retour et sélecteur de ferme cohérents
- **Design system** : Respect des composants standardisés

### **2. Fonctionnalités Intégrées**
- **Sélecteur de ferme** : Accès direct depuis l'écran documents
- **Navigation** : Bouton retour fonctionnel
- **Responsive** : Header adaptatif selon la taille d'écran

### **3. Maintenance Simplifiée**
- **Composant réutilisé** : UnifiedHeader maintenu centralement
- **Moins de code** : Suppression du header personnalisé
- **Cohérence** : Modifications automatiques sur tous les écrans

### **4. UX Améliorée**
- **Familiarité** : Interface identique aux autres écrans
- **Accessibilité** : Standards respectés dans UnifiedHeader
- **Performance** : Composant optimisé

## 📱 Comportement du Header

### **Bouton Retour**
- **Affiché** : Si `onBack` est fourni
- **Style** : Cercle gris avec flèche
- **Action** : Navigation vers l'écran précédent

### **Titre Centré**
- **Position** : Centrage absolu parfait
- **Texte** : "Documents" (titre de l'écran)
- **Style** : 18px, semi-bold, couleur primaire

### **Sélecteur de Ferme**
- **Toujours présent** : Accès constant
- **Style** : Cercle vert avec icône ferme
- **Action** : Ouverture du sélecteur de ferme

## 🎯 Props et Navigation

### **Interface Props**
```typescript
interface DocumentsScreenProps {
  onBack?: () => void;           // Optionnel - si fourni, bouton retour affiché
  onFarmSelector?: () => void;   // Optionnel - gestion du sélecteur de ferme
}
```

### **Intégration SimpleNavigator**
```typescript
// Navigation mise à jour
{!['FarmEdit', 'FarmList'].includes(currentScreen) && (
  <UnifiedHeader ... />  // Header affiché pour Documents maintenant
)}

// Props passées à DocumentsScreen
<DocumentsScreen 
  onBack={handleBack}              // Navigation retour
  onFarmSelector={handleFarmSelector}  // Sélecteur de ferme
/>
```

## 📐 Styles Mis à Jour

### **Container Principal**
```typescript
scrollContainer: {
  flex: 1,  // Prend tout l'espace disponible sous le header
}
```

### **Titre de Section**
```typescript
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg,        // Espace du haut comme MaterialsScreen
  paddingBottom: spacing.md,
}
```

### **Liste des Documents**
```typescript
documentsList: {
  paddingHorizontal: spacing.lg,  // Plus de flex: 1, juste padding
}
```

## ✅ Checklist de Conformité

### **Header**
- [x] **UnifiedHeader** utilisé au lieu du header personnalisé
- [x] **Titre "Documents"** dans le header
- [x] **Bouton retour** conditionnel (si onBack fourni)
- [x] **Sélecteur de ferme** toujours présent

### **Structure**
- [x] **ScrollView principal** pour tout le contenu
- [x] **Titre de section** au-dessus des statistiques
- [x] **Organisation** similaire à MaterialsScreen
- [x] **Espacement** cohérent avec les autres écrans

### **Navigation**
- [x] **Props onBack** gérée correctement
- [x] **Props onFarmSelector** passée depuis SimpleNavigator
- [x] **Header unifié** réactivé dans SimpleNavigator
- [x] **Bouton retour** fonctionnel

### **Design**
- [x] **Cohérence visuelle** avec MaterialsScreen
- [x] **Espacement standardisé** selon le design system
- [x] **Boutons d'action** conservés dans le titre de section
- [x] **Scroll fluide** sur tout le contenu

---

## 🚀 Résultat Final

### **Interface Cohérente**
L'écran des documents a maintenant exactement la même structure et le même comportement que les autres écrans de l'application, notamment MaterialsScreen.

### **Navigation Intégrée**
- Header unifié avec navigation retour
- Sélecteur de ferme accessible
- Titre de section avec actions
- Scroll fluide du contenu

### **Maintenance Facilitée**
- Composant UnifiedHeader réutilisé
- Structure standardisée
- Code plus maintenable
- Cohérence automatique

**L'écran des documents est maintenant parfaitement intégré dans l'architecture de l'application !** 🎉

**Version** : 1.4  
**Dernière mise à jour** : Novembre 2024  
**Conformité** : ✅ UnifiedHeader + Structure MaterialsScreen


