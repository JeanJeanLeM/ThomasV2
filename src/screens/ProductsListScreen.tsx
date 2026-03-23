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
  DropdownSelector,
  StandardFormModal,
  FormSection,
  RowFields,
  FieldWrapper,
  EnhancedInput,
} from '../design-system/components';
import type { DropdownItem } from '../design-system/components/DropdownSelector';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import { ProductService } from '../services/ProductService';
import { cultureService } from '../services/CultureService';
import { userCulturePreferencesService } from '../services/UserCulturePreferencesService';
import type { Product, Culture } from '../types';

interface ProductsListScreenProps {
  navigation: { goBack: () => void };
}

const DEFAULT_VAT = 5.5;
const SALES_CHANNELS: DropdownItem[] = [
  { id: 'vente_directe', label: 'Vente directe' },
  { id: 'marche', label: 'Marché' },
  { id: 'amap', label: 'AMAP' },
  { id: 'grossiste', label: 'Grossiste' },
  { id: 'restauration', label: 'Restauration' },
  { id: 'magasin', label: 'Magasin' },
  { id: 'autre', label: 'Autre' },
];
const PRICE_UNITS: DropdownItem[] = [
  { id: 'kg', label: 'kg' },
  { id: 'g', label: 'g' },
  { id: 'piece', label: 'pièce' },
  { id: 'botte', label: 'botte' },
  { id: 'caisse', label: 'caisse' },
  { id: 'panier', label: 'panier' },
  { id: 'l', label: 'L' },
  { id: 'ml', label: 'mL' },
];

export default function ProductsListScreen({ navigation }: ProductsListScreenProps) {
  const { activeFarm } = useFarm();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cultures, setCultures] = useState<Culture[]>([]);
  const [preferredCultureIds, setPreferredCultureIds] = useState<number[]>([]);
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
  const [selectedCulture, setSelectedCulture] = useState<DropdownItem[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<DropdownItem[]>([]);
  const [selectedPriceUnit, setSelectedPriceUnit] = useState<DropdownItem[]>([]);
  const [salesPercentage, setSalesPercentage] = useState('0');
  const [isYearRound, setIsYearRound] = useState(true);
  const [weekStart, setWeekStart] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [saleNotes, setSaleNotes] = useState('');

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
    const loadCultures = async () => {
      if (!activeFarm?.farm_id) return;
      try {
        const [allCultures, preferences] = await Promise.all([
          cultureService.getCultures(activeFarm.farm_id),
          user?.id
            ? userCulturePreferencesService.getUserPreferences(user.id, activeFarm.farm_id)
            : Promise.resolve(null),
        ]);
        setCultures(allCultures);
        setPreferredCultureIds(preferences?.cultureIds ?? []);
      } catch (e) {
        console.error('[ProductsList] cultures load error:', e);
        setPreferredCultureIds([]);
      }
    };

    loadCultures();
  }, [activeFarm?.farm_id, user?.id]);

  const cultureItems = useMemo<DropdownItem[]>(() => {
    const preferredSet = new Set(preferredCultureIds);
    const preferred = cultures.filter((c) => preferredSet.has(c.id));
    const others = cultures.filter((c) => !preferredSet.has(c.id));

    return [
      { id: 'all', label: 'Toutes les cultures' },
      ...preferred.map((c) => ({ id: String(c.id), label: c.name })),
      ...others.map((c) => ({ id: String(c.id), label: c.name })),
    ];
  }, [cultures, preferredCultureIds]);

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
    setSelectedCulture([{ id: 'all', label: 'Toutes les cultures' }]);
    setSelectedChannel([]);
    setSelectedPriceUnit([]);
    setSalesPercentage('0');
    setIsYearRound(true);
    setWeekStart('');
    setWeekEnd('');
    setSaleNotes('');
    setShowForm(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormUnit(product.unit || '');
    setFormPrice(product.default_price_ht != null ? String(product.default_price_ht) : '');
    setFormVat(product.default_vat_rate != null ? String(product.default_vat_rate) : String(DEFAULT_VAT));
    if (product.culture_id != null) {
      const foundCulture = cultures.find((c) => c.id === product.culture_id);
      if (foundCulture) setSelectedCulture([{ id: String(foundCulture.id), label: foundCulture.name }]);
      else setSelectedCulture([{ id: String(product.culture_id), label: `Culture #${product.culture_id}` }]);
    } else {
      setSelectedCulture([{ id: 'all', label: 'Toutes les cultures' }]);
    }
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
    const salesPctNum = salesPercentage.trim() ? parseFloat(salesPercentage.replace(',', '.')) : 0;
    const weekStartNum = weekStart.trim() ? parseInt(weekStart, 10) : null;
    const weekEndNum = weekEnd.trim() ? parseInt(weekEnd, 10) : null;
    const selectedCultureId =
      selectedCulture.length > 0 && selectedCulture[0].id !== 'all'
        ? parseInt(selectedCulture[0].id, 10)
        : null;

    if (priceNum != null && (isNaN(priceNum) || priceNum < 0)) {
      Alert.alert('Prix invalide', 'Saisissez un prix HT valide.');
      return;
    }
    if (isNaN(vatNum) || vatNum < 0 || vatNum > 100) {
      Alert.alert('TVA invalide', 'Saisissez un taux de TVA entre 0 et 100.');
      return;
    }
    if (!editingProduct && (priceNum == null || isNaN(priceNum) || priceNum <= 0)) {
      Alert.alert('Prix requis', 'Le prix de vente doit être supérieur à 0.');
      return;
    }
    if (!editingProduct && selectedChannel.length === 0) {
      Alert.alert('Canal requis', 'Sélectionnez un canal de vente.');
      return;
    }
    if (!editingProduct && selectedPriceUnit.length === 0) {
      Alert.alert('Unité de prix requise', 'Sélectionnez une unité de prix.');
      return;
    }
    if (isNaN(salesPctNum) || salesPctNum < 0 || salesPctNum > 100) {
      Alert.alert('Pourcentage invalide', 'Saisissez une valeur entre 0 et 100.');
      return;
    }
    if (!isYearRound) {
      if (weekStartNum == null || weekEndNum == null || isNaN(weekStartNum) || isNaN(weekEndNum)) {
        Alert.alert('Période invalide', 'Renseignez les semaines de début et de fin (1 à 53).');
        return;
      }
      if (weekStartNum < 1 || weekStartNum > 53 || weekEndNum < 1 || weekEndNum > 53) {
        Alert.alert('Période invalide', 'Les semaines doivent être comprises entre 1 et 53.');
        return;
      }
    }

    setSubmitLoading(true);
    try {
      if (editingProduct) {
        const ok = await ProductService.updateProduct(editingProduct.id, {
          culture_id: selectedCultureId,
          name,
          unit,
          default_price_ht: priceNum,
          default_vat_rate: vatNum,
        });
        if (ok) {
          setProducts((prev) =>
            prev.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    culture_id: selectedCultureId,
                    name,
                    unit,
                    default_price_ht: priceNum,
                    default_vat_rate: vatNum,
                  }
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
          culture_id: selectedCultureId,
          name,
          unit,
          default_price_ht: priceNum,
          default_vat_rate: vatNum,
          listing_status: 'listed',
        });
        if (result?.id) {
          const priceCreated = await ProductService.createProductSalePrice({
            product_id: result.id,
            farm_id: activeFarm.farm_id,
            canal_de_vente: selectedChannel[0].id,
            prix: priceNum ?? 0,
            unite_prix: selectedPriceUnit[0].id,
            pourcentage_vente: salesPctNum,
            valid_week_start: isYearRound ? null : weekStartNum,
            valid_week_end: isYearRound ? null : weekEndNum,
            notes: saleNotes.trim() ? saleNotes.trim() : null,
          });

          if (!priceCreated) {
            Alert.alert(
              'Prix non créé',
              'Le produit a été créé mais le prix de vente initial a échoué. Vérifiez la table product_sale_prices.'
            );
          }

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
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              leftIcon={<SearchIcon color={colors.gray[400]} size={18} />}
            />
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
        <FormSection title="Identité produit" description="1) Culture 2) Produit 3) Unité produit">
          <DropdownSelector
            label="Culture"
            placeholder="Sélectionner une culture"
            items={cultureItems}
            selectedItems={selectedCulture}
            onSelectionChange={setSelectedCulture}
            searchable
            filterable={false}
          />
          <EnhancedInput
            label="Nom du produit"
            value={formName}
            onChangeText={setFormName}
            placeholder="ex. Blé, Engrais N-P-K..."
            required
          />
          <EnhancedInput
            label="Unité produit"
            value={formUnit}
            onChangeText={setFormUnit}
            placeholder="ex. kg, L, t, u..."
          />
        </FormSection>
        {!editingProduct && (
          <FormSection title="Conditions de vente" description="3) Prix 4) Unités 5) TVA 6) Canal 7) % du canal">
            <EnhancedInput
              label="Prix de vente (€)"
              value={formPrice}
              onChangeText={setFormPrice}
              placeholder="0,00"
              keyboardType="decimal-pad"
              required
            />
            <RowFields>
              <FieldWrapper flex={1}>
                <DropdownSelector
                  label="Unité de prix"
                  placeholder="Sélectionner une unité"
                  items={PRICE_UNITS}
                  selectedItems={selectedPriceUnit}
                  onSelectionChange={setSelectedPriceUnit}
                  searchable={false}
                  filterable={false}
                  required
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
            <DropdownSelector
              label="Canal de vente"
              placeholder="Sélectionner un canal"
              items={SALES_CHANNELS}
              selectedItems={selectedChannel}
              onSelectionChange={setSelectedChannel}
              searchable={false}
              filterable={false}
              required
            />
            <EnhancedInput
              label="% des ventes par canal"
              value={salesPercentage}
              onChangeText={setSalesPercentage}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          </FormSection>
        )}
        {editingProduct && (
          <FormSection title="Tarification" description="Prix et TVA par défaut du produit">
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
        )}
        {!editingProduct && (
          <FormSection title="Validité & notes" description="8) Toute l'année / début-fin 9) Notes">
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsYearRound((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, isYearRound && styles.checkboxChecked]}>
                {isYearRound && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text variant="body" style={styles.checkboxLabel}>
                Toute l'année
              </Text>
            </TouchableOpacity>
            {!isYearRound && (
              <RowFields>
                <FieldWrapper flex={1}>
                  <EnhancedInput
                    label="Semaine début"
                    value={weekStart}
                    onChangeText={setWeekStart}
                    placeholder="1 à 53"
                    keyboardType="number-pad"
                  />
                </FieldWrapper>
                <FieldWrapper flex={1}>
                  <EnhancedInput
                    label="Semaine fin"
                    value={weekEnd}
                    onChangeText={setWeekEnd}
                    placeholder="1 à 53"
                    keyboardType="number-pad"
                  />
                </FieldWrapper>
              </RowFields>
            )}
            <EnhancedInput
              label="Notes"
              value={saleNotes}
              onChangeText={setSaleNotes}
              placeholder="Notes supplémentaires..."
              multiline
            />
          </FormSection>
        )}
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  checkboxChecked: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  checkboxTick: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    color: colors.text.primary,
  },
});
