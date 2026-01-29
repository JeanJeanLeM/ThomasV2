import { supabase } from '../utils/supabase';
import type { Container, ContainerType, ContainerMaterial, CultureCategory } from '../types';

export class ContainerService {
  // Récupérer tous les contenants (globaux + personnalisés de la ferme)
  async getContainers(farmId?: number): Promise<Container[]> {
    try {
      let query = supabase
        .from('containers')
        .select('*')
        .order('name', { ascending: true });

      // Si farmId fourni, inclure les contenants personnalisés de cette ferme
      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        // Sinon, seulement les contenants globaux
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapContainerFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des contenants:', error);
      throw new Error('Impossible de récupérer les contenants');
    }
  }

  // Récupérer les contenants par catégorie
  async getContainersByCategory(category: CultureCategory, farmId?: number): Promise<Container[]> {
    try {
      let query = supabase
        .from('containers')
        .select('*')
        .eq('category', category)
        .order('name', { ascending: true });

      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapContainerFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des contenants par catégorie:', error);
      throw new Error('Impossible de récupérer les contenants');
    }
  }

  // Récupérer les contenants par type
  async getContainersByType(type: ContainerType, farmId?: number): Promise<Container[]> {
    try {
      let query = supabase
        .from('containers')
        .select('*')
        .eq('type', type)
        .order('name', { ascending: true });

      if (farmId) {
        query = query.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        query = query.is('farm_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map((item) => this.mapContainerFromDB(item)) || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des contenants par type:', error);
      throw new Error('Impossible de récupérer les contenants');
    }
  }

  // Créer un nouveau contenant personnalisé
  async createContainer(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container> {
    try {
      const { data, error } = await supabase
        .from('containers')
        .insert([{
          name: container.name,
          category: container.category,
          type: container.type,
          description: container.description,
          typical_capacity_kg: container.typicalCapacityKg,
          typical_capacity_l: container.typicalCapacityL,
          material: container.material,
          dimensions_cm: container.dimensionsCm,
          color: container.color,
          slugs: container.slugs,
          is_custom: container.isCustom,
          farm_id: container.farmId,
        }])
        .select()
        .single();

      if (error) throw error;

      return this.mapContainerFromDB(data);
    } catch (error) {
      console.error('Erreur lors de la création du contenant:', error);
      throw new Error('Impossible de créer le contenant');
    }
  }

  // Rechercher des contenants avec slugs
  async searchContainers(query: string, farmId?: number, category?: CultureCategory): Promise<Container[]> {
    try {
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
      
      let supabaseQuery = supabase
        .from('containers')
        .select('*');

      // Filtrage par ferme
      if (farmId) {
        supabaseQuery = supabaseQuery.or(`farm_id.is.null,farm_id.eq.${farmId}`);
      } else {
        supabaseQuery = supabaseQuery.is('farm_id', null);
      }

      // Filtrage par catégorie si spécifiée
      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }

      const { data, error } = await supabaseQuery;

      if (error) throw error;

      if (!data) return [];

      // Filtrage côté client pour la recherche dans les slugs et le nom
      const filtered = data.filter(container => {
        const searchableText = [
          container.name,
          container.description,
          container.type,
          container.material,
          ...(container.slugs || [])
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });

      return filtered.map((item) => this.mapContainerFromDB(item)).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Erreur lors de la recherche de contenants:', error);
      throw new Error('Impossible de rechercher les contenants');
    }
  }

  // Utilitaire de mapping
  private mapContainerFromDB(data: any): Container {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      type: data.type,
      description: data.description,
      typicalCapacityKg: data.typical_capacity_kg,
      typicalCapacityL: data.typical_capacity_l,
      material: data.material,
      dimensionsCm: data.dimensions_cm,
      color: data.color,
      slugs: data.slugs || [],
      isCustom: data.is_custom,
      farmId: data.farm_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // Obtenir les types de contenants avec leurs labels
  getContainerTypes(): Array<{ value: ContainerType; label: string; icon: string }> {
    return [
      { value: 'caisse', label: 'Caisses', icon: '📦' },
      { value: 'panier', label: 'Paniers', icon: '🧺' },
      { value: 'sac', label: 'Sacs', icon: '🎒' },
      { value: 'seau', label: 'Seaux', icon: '🪣' },
      { value: 'bidon', label: 'Bidons', icon: '🛢️' },
      { value: 'brouette', label: 'Brouettes', icon: '🛒' },
      { value: 'pulverisateur', label: 'Pulvérisateurs', icon: '💨' },
      { value: 'epandeur', label: 'Épandeurs', icon: '🚜' },
      { value: 'autre', label: 'Autres', icon: '📋' },
    ];
  }

  // Obtenir les matériaux avec leurs labels
  getContainerMaterials(): Array<{ value: ContainerMaterial; label: string }> {
    return [
      { value: 'plastique', label: 'Plastique' },
      { value: 'bois', label: 'Bois' },
      { value: 'metal', label: 'Métal' },
      { value: 'carton', label: 'Carton' },
      { value: 'jute', label: 'Jute' },
      { value: 'osier', label: 'Osier' },
      { value: 'papier', label: 'Papier' },
      { value: 'autre', label: 'Autre' },
    ];
  }

  // Générer des slugs automatiquement pour un contenant
  generateSlugs(name: string, type: ContainerType, material?: ContainerMaterial): string[] {
    const slugs = new Set<string>();
    
    // Ajouter le nom en minuscules
    slugs.add(name.toLowerCase());
    
    // Ajouter les mots du nom
    name.toLowerCase().split(/\s+/).forEach(word => {
      if (word.length > 2) slugs.add(word);
    });
    
    // Ajouter le type
    slugs.add(type);
    
    // Ajouter le matériau
    if (material) slugs.add(material);
    
    // Ajouter des synonymes courants
    const synonyms: Record<string, string[]> = {
      'caisse': ['bac', 'cagette', 'boite'],
      'panier': ['corbeille', 'vannerie'],
      'sac': ['poche', 'sachet'],
      'seau': ['sceau', 'récipient'],
      'bidon': ['jerrycan', 'container'],
      'brouette': ['diable', 'transport'],
      'pulverisateur': ['atomiseur', 'vaporisateur'],
      'epandeur': ['distributeur', 'semoir'],
    };
    
    if (synonyms[type]) {
      synonyms[type].forEach(synonym => slugs.add(synonym));
    }
    
    return Array.from(slugs);
  }
}

export const containerService = new ContainerService();

