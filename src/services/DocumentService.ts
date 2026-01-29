import { supabase } from '../utils/supabase';

export interface Document {
  id: string;
  farm_id: number;
  user_id: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  mime_type?: string;
  storage_bucket: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory = 
  | 'analyse-sol'
  | 'certifications'
  | 'assurance'
  | 'contrats'
  | 'recus'
  | 'photos'
  | 'cartes'
  | 'manuels'
  | 'rapports'
  | 'autre';

export interface CreateDocumentData {
  name: string;
  description?: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  mime_type?: string;
}

export interface UpdateDocumentData {
  name?: string;
  description?: string;
  category?: DocumentCategory;
}

class DocumentService {
  /**
   * Récupère tous les documents d'une ferme
   */
  async getDocumentsByFarm(farmId: number): Promise<Document[]> {
    try {
      // Vérification de l'ID de ferme
      if (!farmId || farmId === undefined || farmId === null) {
        console.warn('ID de ferme invalide:', farmId);
        return [];
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des documents:', error);
        throw new Error(`Impossible de récupérer les documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getDocumentsByFarm:', error);
      throw error;
    }
  }

  /**
   * Récupère les documents d'un utilisateur pour une ferme
   */
  async getUserDocuments(farmId: number, userId?: string): Promise<Document[]> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des documents utilisateur:', error);
        throw new Error(`Impossible de récupérer les documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getUserDocuments:', error);
      throw error;
    }
  }

  /**
   * Crée un nouveau document
   */
  async createDocument(farmId: number, documentData: CreateDocumentData): Promise<Document> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          farm_id: farmId,
          user_id: user.id,
          ...documentData,
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création du document:', error);
        throw new Error(`Impossible de créer le document: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erreur service createDocument:', error);
      throw error;
    }
  }

  /**
   * Met à jour un document
   */
  async updateDocument(documentId: string, updateData: UpdateDocumentData): Promise<Document> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour du document:', error);
        throw new Error(`Impossible de mettre à jour le document: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erreur service updateDocument:', error);
      throw error;
    }
  }

  /**
   * Supprime un document (soft delete)
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      console.log('🗑️ [DocumentService] Suppression document ID:', documentId);
      
      const { data, error } = await supabase
        .from('documents')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .select();

      console.log('🗑️ [DocumentService] Résultat suppression:', { data, error });

      if (error) {
        console.error('❌ [DocumentService] Erreur lors de la suppression du document:', error);
        throw new Error(`Impossible de supprimer le document: ${error.message}`);
      }

      console.log('✅ [DocumentService] Document supprimé avec succès');
    } catch (error) {
      console.error('❌ [DocumentService] Erreur service deleteDocument:', error);
      throw error;
    }
  }

  /**
   * Supprime définitivement un document et son fichier
   */
  async permanentDeleteDocument(documentId: string): Promise<void> {
    try {
      // Récupérer les infos du document pour supprimer le fichier
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path, storage_bucket')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération du document:', fetchError);
        throw new Error(`Document introuvable: ${fetchError.message}`);
      }

      // Supprimer le fichier du storage
      if (document.file_path) {
        const { error: storageError } = await supabase.storage
          .from(document.storage_bucket)
          .remove([document.file_path]);

        if (storageError) {
          console.warn('Erreur lors de la suppression du fichier:', storageError);
          // Ne pas bloquer la suppression de l'enregistrement
        }
      }

      // Supprimer l'enregistrement de la base
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        console.error('Erreur lors de la suppression du document:', deleteError);
        throw new Error(`Impossible de supprimer le document: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('Erreur service permanentDeleteDocument:', error);
      throw error;
    }
  }

  /**
   * Récupère les statistiques des documents
   */
  async getDocumentStats(farmId: number): Promise<{
    totalDocuments: number;
    totalSizeMB: number;
    categoriesCount: number;
    byCategory: Record<string, number>;
  }> {
    try {
      // Vérification de l'ID de ferme
      if (!farmId || farmId === undefined || farmId === null) {
        console.warn('ID de ferme invalide pour les stats:', farmId);
        return {
          totalDocuments: 0,
          totalSizeMB: 0,
          categoriesCount: 0,
          byCategory: {},
        };
      }

      const { data, error } = await supabase
        .from('documents')
        .select('category, file_size')
        .eq('farm_id', farmId)
        .eq('is_active', true);

      if (error) {
        console.error('Erreur lors de la récupération des stats:', error);
        throw new Error(`Impossible de récupérer les statistiques: ${error.message}`);
      }

      const documents = data || [];
      const totalSizeBytes = documents.reduce((sum, doc) => sum + doc.file_size, 0);
      const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;
      
      const byCategory: Record<string, number> = {};
      documents.forEach(doc => {
        byCategory[doc.category] = (byCategory[doc.category] || 0) + 1;
      });

      return {
        totalDocuments: documents.length,
        totalSizeMB,
        categoriesCount: Object.keys(byCategory).length,
        byCategory,
      };
    } catch (error) {
      console.error('Erreur service getDocumentStats:', error);
      throw error;
    }
  }

  /**
   * Recherche des documents par nom ou description
   */
  async searchDocuments(farmId: number, searchTerm: string): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la recherche:', error);
        throw new Error(`Impossible de rechercher les documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service searchDocuments:', error);
      throw error;
    }
  }

  /**
   * Filtre les documents par catégorie
   */
  async getDocumentsByCategory(farmId: number, category: DocumentCategory): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('farm_id', farmId)
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du filtrage par catégorie:', error);
        throw new Error(`Impossible de filtrer les documents: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Erreur service getDocumentsByCategory:', error);
      throw error;
    }
  }
}

export const documentService = new DocumentService();


