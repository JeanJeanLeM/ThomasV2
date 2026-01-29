import { SupabaseClient } from '@supabase/supabase-js';
import { FarmContext } from '../types/AgentTypes';
import type { PhytosanitaryProduct } from '../../types';
import { UserPhytosanitaryPreferencesService } from '../../UserPhytosanitaryPreferencesService';
import { PhytosanitaryProductService } from '../../PhytosanitaryProductService';

/**
 * Service de matching intelligent des produits phytosanitaires
 * Support expressions naturelles françaises avec fuzzy matching
 * 
 * Stratégie de matching multi-niveaux:
 * 1. Match exact (nom complet, insensible à la casse)
 * 2. Match partiel (nom contient le terme ou vice versa)
 * 3. Match fuzzy (similarité de chaîne avec seuil)
 */
export class PhytosanitaryMatchingService {
  private matchingCache = new Map<string, PhytosanitaryProduct | null>();
  private readonly CONFIDENCE_THRESHOLD = 0.6;
  private readonly FUZZY_THRESHOLD = 0.7;

  constructor(private supabase: SupabaseClient) {}

  /**
   * Matching principal d'un nom de produit mentionné dans le texte
   * Retourne le produit complet avec AMM si match trouvé
   */
  async matchProduct(
    productName: string,
    farmContext: FarmContext
  ): Promise<PhytosanitaryProduct | null> {
    if (!productName || !productName.trim()) {
      return null;
    }

    const cacheKey = `${farmContext.id}_${productName.toLowerCase().trim()}`;
    
    // Vérifier cache pour performance
    if (this.matchingCache.has(cacheKey)) {
      return this.matchingCache.get(cacheKey)!;
    }

    console.log('🌿 [PhytoMatching] Matching produit:', productName);

    try {
      // 1. Charger les produits de l'utilisateur
      const userProducts = await this.loadUserProducts(farmContext);
      
      if (userProducts.length === 0) {
        console.log('⚠️ [PhytoMatching] Aucun produit utilisateur trouvé');
        this.matchingCache.set(cacheKey, null);
        return null;
      }

      // 2. Normaliser le nom recherché
      const normalizedSearch = this.normalizeString(productName);

      // 3. Stratégie de matching multi-niveaux
      let match: PhytosanitaryProduct | null = null;

      // Niveau 1: Match exact (insensible à la casse)
      match = this.exactMatch(normalizedSearch, userProducts);
      if (match) {
        console.log('✅ [PhytoMatching] Match exact trouvé:', match.name);
        this.matchingCache.set(cacheKey, match);
        return match;
      }

      // Niveau 2: Match partiel (nom contient le terme ou vice versa)
      match = this.partialMatch(normalizedSearch, userProducts);
      if (match) {
        console.log('✅ [PhytoMatching] Match partiel trouvé:', match.name);
        this.matchingCache.set(cacheKey, match);
        return match;
      }

      // Niveau 3: Match fuzzy (similarité de chaîne)
      match = this.fuzzyMatch(normalizedSearch, userProducts);
      if (match) {
        console.log('✅ [PhytoMatching] Match fuzzy trouvé:', match.name);
        this.matchingCache.set(cacheKey, match);
        return match;
      }

      console.log('❌ [PhytoMatching] Aucun match trouvé pour:', productName);
      this.matchingCache.set(cacheKey, null);
      return null;

    } catch (error) {
      console.error('❌ [PhytoMatching] Erreur lors du matching:', error);
      this.matchingCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Charger les produits phytosanitaires de l'utilisateur
   */
  private async loadUserProducts(farmContext: FarmContext): Promise<PhytosanitaryProduct[]> {
    try {
      // Si les noms sont déjà dans le contexte, charger les produits complets
      if (farmContext.phytosanitary_products && farmContext.phytosanitary_products.length > 0) {
        const products: PhytosanitaryProduct[] = [];
        
        // Pour chaque nom dans le contexte, faire une recherche
        // (plus efficace que de charger tous les produits)
        for (const productName of farmContext.phytosanitary_products) {
          try {
            const searchResults = await PhytosanitaryProductService.searchProducts(
              productName,
              {},
              farmContext.id
            );
            
            // Prendre le premier résultat qui correspond exactement au nom
            const exactMatch = searchResults.find(p => 
              this.normalizeString(p.name) === this.normalizeString(productName)
            );
            
            if (exactMatch) {
              products.push(exactMatch);
            } else if (searchResults.length > 0) {
              // Fallback sur le premier résultat si pas de match exact
              products.push(searchResults[0]);
            }
          } catch (error) {
            console.warn(`⚠️ [PhytoMatching] Erreur recherche produit "${productName}":`, error);
          }
        }
        
        console.log(`🌿 [PhytoMatching] ${products.length} produits chargés depuis contexte`);
        return products;
      }

      // Si pas de produits dans le contexte, retourner liste vide
      console.log('⚠️ [PhytoMatching] Aucun produit dans le contexte');
      return [];
    } catch (error) {
      console.error('❌ [PhytoMatching] Erreur chargement produits:', error);
      return [];
    }
  }

  /**
   * Match exact (nom complet, insensible à la casse)
   */
  private exactMatch(
    searchTerm: string,
    products: PhytosanitaryProduct[]
  ): PhytosanitaryProduct | null {
    return products.find(p => 
      this.normalizeString(p.name) === searchTerm
    ) || null;
  }

  /**
   * Match partiel (nom contient le terme ou vice versa)
   */
  private partialMatch(
    searchTerm: string,
    products: PhytosanitaryProduct[]
  ): PhytosanitaryProduct | null {
    // Chercher si le nom du produit contient le terme recherché
    const containsMatch = products.find(p => {
      const normalizedName = this.normalizeString(p.name);
      return normalizedName.includes(searchTerm) || searchTerm.includes(normalizedName);
    });

    if (containsMatch) {
      return containsMatch;
    }

    // Chercher par mots-clés (si le terme est un mot du nom)
    const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 2);
    if (searchWords.length > 0) {
      return products.find(p => {
        const normalizedName = this.normalizeString(p.name);
        return searchWords.some(word => normalizedName.includes(word));
      }) || null;
    }

    return null;
  }

  /**
   * Match fuzzy (similarité de chaîne avec seuil)
   */
  private fuzzyMatch(
    searchTerm: string,
    products: PhytosanitaryProduct[]
  ): PhytosanitaryProduct | null {
    let bestMatch: PhytosanitaryProduct | null = null;
    let bestScore = 0;

    for (const product of products) {
      const normalizedName = this.normalizeString(product.name);
      const similarity = this.calculateSimilarity(searchTerm, normalizedName);
      
      if (similarity > bestScore && similarity >= this.FUZZY_THRESHOLD) {
        bestScore = similarity;
        bestMatch = product;
      }
    }

    return bestMatch;
  }

  /**
   * Calcul de similarité entre deux chaînes (algorithme simple)
   * Retourne un score entre 0 et 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    // Calcul basé sur la longueur de la sous-chaîne commune
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    // Si la chaîne courte est contenue dans la longue, score élevé
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Calcul de similarité par caractères communs
    let matches = 0;
    const maxLength = Math.max(str1.length, str2.length);
    
    for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }

    // Bonus si les premiers caractères correspondent
    const prefixMatch = this.getCommonPrefixLength(str1, str2);
    const prefixBonus = prefixMatch / maxLength * 0.3;

    return (matches / maxLength) * 0.7 + prefixBonus;
  }

  /**
   * Longueur du préfixe commun entre deux chaînes
   */
  private getCommonPrefixLength(str1: string, str2: string): number {
    let length = 0;
    const minLength = Math.min(str1.length, str2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (str1[i] === str2[i]) {
        length++;
      } else {
        break;
      }
    }
    
    return length;
  }

  /**
   * Normalisation d'une chaîne pour le matching
   * - Minuscules
   * - Suppression accents (basique)
   * - Trim
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, ' ') // Remplacer ponctuation par espaces
      .replace(/\s+/g, ' ') // Normaliser espaces multiples
      .trim();
  }

  /**
   * Invalider le cache (utile après modifications de produits)
   */
  invalidateCache(): void {
    this.matchingCache.clear();
    console.log('🗑️ [PhytoMatching] Cache invalidé');
  }
}
