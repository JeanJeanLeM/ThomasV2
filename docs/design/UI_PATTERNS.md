# Patterns UI - Thomas V2

Guide des patterns UI standards pour une expérience cohérente dans toute l'application.

---

## 📱 Layout Standard Écran

### Structure de Base

```typescript
import { Screen, Text, Button } from '@/design-system/components';
import { ScrollView, View, StyleSheet } from 'react-native';
import { colors, spacing } from '@/design-system';

export default function MyScreen() {
  return (
    <Screen backgroundColor={colors.background.primary}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="h2">Titre Principal</Text>
            <Text variant="caption" color={colors.gray[600]}>
              Sous-titre ou contexte
            </Text>
          </View>
          <Button
            title="Action"
            variant="primary"
            size="sm"
            onPress={handleAction}
          />
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          {/* Votre contenu ici */}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
});
```

---

## 📋 Formulaire Standard

### Formulaire Simple

```typescript
import { Card, Input, Button, Text } from '@/design-system/components';
import { useState } from 'react';

export function SimpleForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    // Validation et soumission
  };

  return (
    <Card padding="lg">
      <Text variant="h3" style={{ marginBottom: spacing.lg }}>
        Informations de Contact
      </Text>

      <Input
        label="Nom complet"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        error={errors.name}
        placeholder="Jean Dupont"
        style={{ marginBottom: spacing.md }}
      />

      <Input
        label="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        error={errors.email}
        placeholder="jean@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        style={{ marginBottom: spacing.md }}
      />

      <Input
        label="Téléphone"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        error={errors.phone}
        placeholder="06 12 34 56 78"
        keyboardType="phone-pad"
        style={{ marginBottom: spacing.xl }}
      />

      <Button
        title="Enregistrer"
        variant="primary"
        fullWidth
        onPress={handleSubmit}
      />
    </Card>
  );
}
```

### Formulaire avec Sections

```typescript
<ScrollView>
  <Card padding="lg" style={{ marginBottom: spacing.md }}>
    <Text variant="h4" style={{ marginBottom: spacing.md }}>
      Informations Personnelles
    </Text>
    <Input label="Nom" {...} />
    <Input label="Prénom" {...} />
  </Card>

  <Card padding="lg" style={{ marginBottom: spacing.md }}>
    <Text variant="h4" style={{ marginBottom: spacing.md }}>
      Adresse
    </Text>
    <Input label="Rue" {...} />
    <Input label="Code Postal" {...} />
    <Input label="Ville" {...} />
  </Card>

  <Button title="Enregistrer" fullWidth variant="primary" />
</ScrollView>
```

---

## 📝 Liste avec Cards

### Liste Simple

```typescript
import { Card, Text, Avatar } from '@/design-system/components';

export function ItemList({ items }) {
  return (
    <ScrollView>
      {items.map(item => (
        <Card
          key={item.id}
          onPress={() => handleItemPress(item)}
          style={styles.listItem}
        >
          <View style={styles.itemContent}>
            <Avatar
              initials={item.initials}
              size="md"
            />
            <View style={styles.itemDetails}>
              <Text variant="h4">{item.title}</Text>
              <Text variant="caption" color={colors.gray[600]}>
                {item.subtitle}
              </Text>
            </View>
            <ChevronRightIcon color={colors.gray[400]} size={20} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  listItem: {
    marginBottom: spacing.md,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
});
```

### Liste avec Actions

```typescript
<Card>
  <View style={styles.cardContent}>
    <View style={styles.cardInfo}>
      <Text variant="h4">{item.title}</Text>
      <Text variant="caption">{item.description}</Text>
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity onPress={handleEdit}>
        <PencilIcon color={colors.primary[600]} size={20} />
      </TouchableOpacity>
      <TouchableOpacity onPress={handleDelete}>
        <TrashIcon color={colors.semantic.error} size={20} />
      </TouchableOpacity>
    </View>
  </View>
</Card>
```

---

## 💬 Modal Standard

### Modal Simple

```typescript
import { Modal, Button, Text } from '@/design-system/components';

export function ConfirmModal({ visible, onClose, onConfirm, title, message }) {
  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={title}
    >
      <Text variant="body" style={{ marginBottom: spacing.lg }}>
        {message}
      </Text>

      <View style={styles.modalActions}>
        <Button
          title="Annuler"
          variant="secondary"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <Button
          title="Confirmer"
          variant="primary"
          onPress={onConfirm}
          style={{ flex: 1, marginLeft: spacing.sm }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
```

### Modal avec Formulaire

```typescript
<Modal
  visible={isModalVisible}
  onClose={handleClose}
  title="Créer un élément"
>
  <Input
    label="Nom"
    value={name}
    onChangeText={setName}
    style={{ marginBottom: spacing.md }}
  />

  <Input
    label="Description"
    value={description}
    onChangeText={setDescription}
    multiline
    numberOfLines={4}
    style={{ marginBottom: spacing.lg }}
  />

  <Button
    title="Créer"
    variant="primary"
    fullWidth
    onPress={handleCreate}
  />
</Modal>
```

---

## 🔄 États de Chargement

### Avec Skeleton

```typescript
import { SkeletonList, EmptyState } from '@/design-system/components';

export function DataList({ loading, data }) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonList count={5} variant="card" itemHeight={120} />
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<DocumentIcon size={48} color={colors.gray[400]} />}
        title="Aucun résultat"
        description="Aucune donnée disponible pour le moment"
        action={{
          label: "Créer un élément",
          onPress: handleCreate,
          variant: "primary"
        }}
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={item => item.id}
    />
  );
}
```

---

## 🔍 Recherche et Filtres

### Barre de Recherche

```typescript
import { Input, SearchIcon } from '@/design-system';

<View style={styles.searchContainer}>
  <Input
    placeholder="Rechercher..."
    value={searchQuery}
    onChangeText={setSearchQuery}
    leftIcon={<SearchIcon color={colors.gray[400]} size={20} />}
  />
</View>

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
```

### Filtres avec Chips

```typescript
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.filtersScroll}
>
  {filters.map(filter => (
    <TouchableOpacity
      key={filter.id}
      onPress={() => handleFilterToggle(filter.id)}
      style={[
        styles.filterChip,
        activeFilter === filter.id && styles.filterChipActive
      ]}
    >
      <Text
        variant="bodySmall"
        color={activeFilter === filter.id ? colors.text.inverse : colors.gray[700]}
        weight="semibold"
      >
        {filter.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

const styles = StyleSheet.create({
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  filterChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
});
```

---

## 📊 Stats Header

### Card de Statistiques

```typescript
<Card style={styles.statsCard}>
  <View style={styles.statsHeader}>
    <ChartBarIcon color={colors.primary[600]} size={24} />
    <Text variant="h4">Statistiques</Text>
  </View>

  <View style={styles.statsRow}>
    <View style={styles.statItem}>
      <Text style={textStyles.statNumber}>24</Text>
      <Text variant="caption" color={colors.gray[600]}>
        Tâches
      </Text>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statItem}>
      <Text style={textStyles.statNumber}>5</Text>
      <Text variant="caption" color={colors.gray[600]}>
        Parcelles
      </Text>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statItem}>
      <Text style={textStyles.statNumber}>12</Text>
      <Text variant="caption" color={colors.gray[600]}>
        Alertes
      </Text>
    </View>
  </View>
</Card>

const styles = StyleSheet.create({
  statsCard: {
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
  },
});
```

---

## 🎯 Call to Action (CTA)

### CTA Simple

```typescript
<Card style={styles.ctaCard}>
  <Text variant="h3" style={{ marginBottom: spacing.sm }}>
    Commencez maintenant
  </Text>
  <Text variant="body" color={colors.gray[600]} style={{ marginBottom: spacing.lg }}>
    Créez votre première tâche pour démarrer
  </Text>
  <Button
    title="Créer une tâche"
    variant="primary"
    leftIcon={<PlusIcon color={colors.text.inverse} />}
    onPress={handleCreateTask}
  />
</Card>
```

### CTA avec Image/Icône

```typescript
<Card style={styles.ctaBanner}>
  <View style={styles.ctaIcon}>
    <RocketLaunchIcon size={48} color={colors.primary[600]} />
  </View>
  <View style={styles.ctaContent}>
    <Text variant="h4">Nouveau !</Text>
    <Text variant="caption">Essayez notre nouvelle fonctionnalité</Text>
  </View>
  <Button title="Découvrir" variant="primary" size="sm" />
</Card>

const styles = StyleSheet.create({
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  ctaIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flex: 1,
  },
});
```

---

## ✅ Validation et Erreurs

### Validation Inline

```typescript
<Input
  label="Email"
  value={email}
  onChangeText={handleEmailChange}
  error={emailError}
  placeholder="votre@email.com"
/>

// Fonction de validation
const handleEmailChange = (text) => {
  setEmail(text);
  if (text && !isValidEmail(text)) {
    setEmailError('Email invalide');
  } else {
    setEmailError('');
  }
};
```

### Message d'Erreur Global

```typescript
{error && (
  <View style={styles.errorContainer}>
    <ExclamationCircleIcon color={colors.semantic.error} size={20} />
    <Text variant="bodySmall" color={colors.semantic.error}>
      {error}
    </Text>
  </View>
)}

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.semantic.error + '10',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.semantic.error,
    marginBottom: spacing.md,
  },
});
```

---

## 🔄 Pull to Refresh

```typescript
import { RefreshControl } from 'react-native';

<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary[600]}
      colors={[colors.primary[600]]}
    />
  }
>
  {/* Contenu */}
</ScrollView>
```

---

## 📱 Responsive Mobile-First

### Adaptation Tablette

```typescript
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const isTablet = screenWidth >= 768;

return (
  <View style={[
    styles.container,
    isTablet && styles.containerTablet
  ]}>
    {/* Contenu */}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    padding: spacing.md,
  },
  containerTablet: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
```

---

## 🎨 Best Practices

### ✅ DO
- Utiliser les composants du design system
- Créer des StyleSheet pour tous les styles
- Utiliser les tokens (colors, spacing, typography)
- Minimum 48x48px pour touch targets
- Labels visibles sur tous les inputs
- Loading states avec Skeleton
- Empty states avec EmptyState component

### ❌ DON'T
- Styles inline (sauf conditions dynamiques)
- Couleurs hardcodées (#fff, #000, etc.)
- Magic numbers pour fontSize
- Custom icons au lieu du design system
- ActivityIndicator au lieu de Skeleton
- Oublier les états loading/empty/error

---

**Made with 💚 for French Farmers**

