/**
 * Service de gestion des couleurs pour les graphiques statistiques
 * Fournit des palettes de couleurs cohérentes pour tous les types de graphiques
 */

export class ChartColorService {
  // Palette de couleurs générique pour les graphiques
  private static readonly COLOR_PALETTE = [
    '#10B981', // green
    '#3B82F6', // blue
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#6366F1', // indigo
    '#14B8A6', // teal
    '#A855F7', // violet
  ];

  // Couleurs pour les catégories de tâches (existant)
  private static readonly CATEGORY_COLORS: Record<string, string> = {
    'production': '#10B981', // green
    'marketing': '#3B82F6', // blue
    'administratif': '#F59E0B', // amber
    'general': '#6B7280', // gray
  };

  // Cache pour les couleurs de cultures
  private static cultureColorCache: Map<string, string> = new Map();
  private static plotColorCache: Map<number, string> = new Map();

  /**
   * Obtenir une couleur pour une catégorie de tâche
   */
  static getCategoryColor(category: string): string {
    return this.CATEGORY_COLORS[category] || this.CATEGORY_COLORS['general'];
  }

  /**
   * Obtenir une couleur pour une culture
   * Essaie d'abord de récupérer depuis la base de données, sinon utilise la palette
   */
  static getCultureColor(cultureName: string, cultureColorFromDB?: string | null): string {
    if (cultureColorFromDB) {
      return cultureColorFromDB;
    }

    // Utiliser le cache si disponible
    if (this.cultureColorCache.has(cultureName)) {
      return this.cultureColorCache.get(cultureName)!;
    }

    // Générer une couleur basée sur le hash du nom
    const color = this.getColorFromString(cultureName);
    this.cultureColorCache.set(cultureName, color);
    return color;
  }

  /**
   * Obtenir une couleur pour une parcelle
   */
  static getPlotColor(plotId: number): string {
    if (this.plotColorCache.has(plotId)) {
      return this.plotColorCache.get(plotId)!;
    }

    const color = this.COLOR_PALETTE[plotId % this.COLOR_PALETTE.length];
    this.plotColorCache.set(plotId, color);
    return color;
  }

  /**
   * Obtenir la palette de couleurs complète
   */
  static getColorPalette(): string[] {
    return [...this.COLOR_PALETTE];
  }

  /**
   * Générer une couleur déterministe à partir d'une chaîne
   * Utilise un hash simple pour toujours retourner la même couleur pour le même nom
   */
  private static getColorFromString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % this.COLOR_PALETTE.length;
    return this.COLOR_PALETTE[index];
  }

  /**
   * Réinitialiser les caches (utile pour les tests ou le rafraîchissement)
   */
  static clearCaches(): void {
    this.cultureColorCache.clear();
    this.plotColorCache.clear();
  }
}
