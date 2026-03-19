import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '../design-system/colors';
import { spacing } from '../design-system/spacing';
import { SproutIcon, PlusIcon, PencilIcon, SearchIcon } from '../design-system/icons';
import {
  Text,
  Button,
  Input,
  StandardFormModal,
  FormSection,
  RowFields,
  FieldWrapper,
  EnhancedInput,
} from '../design-system/components';
import { useFarm } from '../contexts/FarmContext';
import { ProductService } from '../services/ProductService';
import type { Product } from '../types';

interface ProductsListScreenProps {
  navigation: { goBack: () => void };
}

const DEFAULT_VAT = 5.5;

export default function ProductsListScreen({ navigation }: ProductsListScreenProps) {
  const { activeFarm } = useFarm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formName, setFormName] = useState('');
  const [formUnit, setFormUnit] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formVat, setFormVat] = useState(String(DEFAULT_VAT));

  const loadProducts = async (isRefresh = false) => {
    if (!activeFarm?.farm_id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await ProductService.getProducts(activeFarm.farm_id);
      setProducts(list);
    } catch (e) {
      console.error('[ProductsList] load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [activeFarm?.farm_id]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.unit || '').toLowerCase().includes(q));
  }, [products, searchQuery]);

  const openCreate = () => {
    setEditingProduct(null);
    setFormName('');
    setFormUnit('');
    setFormPrice('');
    setFormVat(String(DEFAULT_VAT));
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormUnit(product.unit || '');
    setFormPrice(product.default_price_ht != null ? String(product.default_price_ht) : '');
    setFormVat(product.default_vat_rate != null ? String(product.default_vat_rate) : String(DEFAULT_VAT));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async () => {
    const name = formName.trim();
    if (!name) {
      Alert.alert('Champ requis', 'Le nom du produit est obligatoire.');
      return;
    }
    const unit = formUnit.trim() || 'u';
    const priceNum = formPrice.trim() ? parseFloat(formPrice.replace(',', '.')) : null;
    const vatNum = formVat.trim() ? parseFloat(formVat.replace(',', '.')) : DEFAULT_VAT;
    if (priceNum != null && (isNaN(priceNum) || priceNum < 0)) {
      Alert.alert('Prix invalide', 'Saisissez un prix HT valide.');
      return;
    }
    if (isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
      Alert.alert('TVA invalide', 'Saisissez un taux de TVA entre 0 et 100.');
      return;
    }

    setSubmitLoading(true);
    try {
      if (editingProduct) {
        const ok = await ProductService.updateProduct(editingProduct.id, {
          name,
          unit,
          default_price_ht: priceNum,
          default_vat_rate: vatNum,
        });
        if (ok) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? { ...p, name, unit, default_price_ht: priceNum, default_vat_rate: vatNum }
                : p
            )
          );
          closeForm();
        } else {
          Alert.alert('Erreur', 'Impossible de modifier le produit.');
        }
      } else {
        if (!activeFarm?.farm_id) {
          Alert.alert('Erreur', 'Aucune ferme active.');
          setSubmitLoading(false);
          return;
        }
        const result = await ProductService.createProduct({
          farm_id: activeFarm.farm_id,
          name,
          unit,
          default_price_ht: priceNum,
          default_vat_rate: vatNum,
        });
        if (result?.id) {
          const list = await ProductService.getProducts(activeFarm.farm_id);
          setProducts(list);
          closeForm();
        } else {
          Alert.alert('Erreur', 'Impossible de créer le produit.');
        }
      }
    } catch (e) {
      console.error('[ProductsList] submit error:', e);
      Alert.alert('Erreur', 'Une erreur est survenue.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatPrice = (value: number | null | undefined) =>
    value != null ? `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '–';

  if (loading && products.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadProducts(true)}
            colors={[colors.primary[600]]}
            tintColor={colors.primary[600]}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text variant="h2" style={styles.title}>
                Produits & Prix
              </Text>
              <Text variant="body" style={styles.subtitle}>
                {products.length} produit{products.length !== 1 ? 's' : ''} enregistré{products.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={openCreate}>
              <PlusIcon color="white" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <SearchIcon color={colors.gray[400]} size={20} style={styles.searchIcon} />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                containerStyle={styles.searchInput}
              />
            </View>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyCard}>
              <SproutIcon color={colors.gray[400]} size={40} />
              <Text variant="h3" style={styles.emptyTitle}>
                {products.length === 0 ? 'Aucun produit' : 'Aucun résultat'}
              </Text>
              <Text variant="body" style={styles.emptySubtitle}>
                {products.length === 0
                  ? 'Ajoutez des produits et des tarifs pour les utiliser sur vos factures.'
                  : 'Modifiez votre recherche.'}
              </Text>
              {products.length === 0 && (
                <Button title="Ajouter un produit" onPress={openCreate} style={styles.emptyButton} />
              )}
            </View>
          ) : (
            <View style={styles.list}>
              {filteredProducts.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.card}
                  onPress={() => openEdit(product)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.cardIcon}>
                      <SproutIcon color={colors.semantic.warning} size={22} />
                    </View>
                    <View style={styles.cardBody}>
                      <Text variant="h4" style={styles.cardTitle}>
                        {product.name}
                      </Text>
                      <Text variant="caption" style={styles.cardMeta}>
                        {product.unit} · {formatPrice(product.default_price_ht)} HT · TVA {product.default_vat_rate ?? DEFAULT_VAT} %
                      </Text>
                    </View>
                  </View>
                  <PencilIcon color={colors.gray[400]} size={18} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <StandardFormModal
        visible={showForm}
        onClose={closeForm}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        primaryAction={{
          title: editingProduct ? 'Enregistrer' : 'Créer',
          onPress: handleSubmit,
          loading: submitLoading,
          disabled: !formName.trim(),
        }}
        secondaryAction={{ title: 'Annuler', onPress: closeForm }}
      >
        <FormSection title="Informations" description="Nom et unité du produit">
          <EnhancedInput
            label="Nom du produit"
            value={formName}
            onChangeText={setFormName}
            placeholder="ex. Blé, Engrais N-P-K..."
            required
          />
          <EnhancedInput
            label="Unité"
            value={formUnit}
            onChangeText={setFormUnit}
            placeholder="ex. kg, L, t, u..."
          />
        </FormSection>
        <FormSection title="Tarification" description="Prix par défaut pour les factures">
          <RowFields>
            <FieldWrapper flex={1}>
              <EnhancedInput
                label="Prix HT (€)"
                value={formPrice}
                onChangeText={setFormPrice}
                placeholder="0,00"
                keyboardType="decimal-pad"
              />
            </FieldWrapper>
            <FieldWrapper flex={1}>
              <EnhancedInput
                label="TVA (%)"
                value={formVat}
                onChangeText={setFormVat}
                placeholder="5,5"
                keyboardType="decimal-pad"
              />
            </FieldWrapper>
          </RowFields>
        </FormSection>
      </StandardFormModal>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  scrollContainer: { flex: 1 },
  content: { padding: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: { color: colors.text.primary },
  subtitle: { color: colors.text.secondary, marginTop: spacing.xs },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: { marginBottom: spacing.md },
  searchInputWrap: { position: 'relative' },
  searchIcon: { position: 'absolute', left: 12, top: 14, zIndex: 1 },
  searchInput: { paddingLeft: 40 },
  emptyCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: { color: colors.text.primary, marginTop: spacing.md },
  emptySubtitle: { color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  emptyButton: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.semantic.warning,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardBody: { flex: 1 },
  cardTitle: { color: colors.text.primary },
  cardMeta: { color: colors.text.secondary, marginTop: 2 },
});
