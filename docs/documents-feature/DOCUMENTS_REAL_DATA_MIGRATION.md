# 📊 Migration vers les Vraies Données - Système de Documents

## 🎯 Objectif

Remplacer les données de test par un système complet de gestion des documents avec base de données Supabase.

## 🗄️ Migration Base de Données

### **Nouvelle Table : `documents`**

```sql
-- Migration: 005_add_documents_table.sql
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  farm_id integer NOT NULL,
  user_id uuid NOT NULL,
  name character varying NOT NULL CHECK (char_length(name::text) >= 2 AND char_length(name::text) <= 200),
  description text,
  category character varying NOT NULL CHECK (category::text = ANY (ARRAY[
    'analyse-sol', 'certifications', 'assurance', 'contrats', 
    'recus', 'photos', 'cartes', 'manuels', 'rapports', 'autre'
  ]::text[])),
  file_name character varying NOT NULL,
  file_type character varying NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  file_path character varying NOT NULL,
  mime_type character varying,
  storage_bucket character varying DEFAULT 'documents',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE,
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
```

### **Sécurité RLS (Row Level Security)**

```sql
-- Les utilisateurs ne voient que les documents de leurs fermes
CREATE POLICY "Users can view documents from their farms" ON public.documents
  FOR SELECT USING (
    farm_id IN (
      SELECT fm.farm_id 
      FROM public.farm_members fm 
      WHERE fm.user_id = auth.uid() AND fm.is_active = true
    )
  );
```

### **Index pour Performance**

```sql
CREATE INDEX idx_documents_farm_id ON public.documents(farm_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);
```

## 🔧 Service DocumentService

### **Interface TypeScript**

```typescript
export interface Document {
  id: string;
  farm_id: number;
  user_id: string;
  name: string;
  description?: string;
  category: DocumentCategory;
  file_name: string;
  file_type: string;
  file_size: number;        // En bytes
  file_path: string;
  mime_type?: string;
  storage_bucket: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory = 
  | 'analyse-sol' | 'certifications' | 'assurance' | 'contrats' 
  | 'recus' | 'photos' | 'cartes' | 'manuels' | 'rapports' | 'autre';
```

### **Méthodes Principales**

```typescript
class DocumentService {
  // CRUD Operations
  async getDocumentsByFarm(farmId: number): Promise<Document[]>
  async createDocument(farmId: number, documentData: CreateDocumentData): Promise<Document>
  async updateDocument(documentId: string, updateData: UpdateDocumentData): Promise<Document>
  async deleteDocument(documentId: string): Promise<void>
  
  // Recherche et Filtrage
  async searchDocuments(farmId: number, searchTerm: string): Promise<Document[]>
  async getDocumentsByCategory(farmId: number, category: DocumentCategory): Promise<Document[]>
  
  // Statistiques
  async getDocumentStats(farmId: number): Promise<{
    totalDocuments: number;
    totalSizeMB: number;
    categoriesCount: number;
    byCategory: Record<string, number>;
  }>
}
```

## 📱 Mise à Jour de l'Interface

### **Chargement des Données Réelles**

```typescript
// ❌ AVANT : Données de test
const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);

// ✅ APRÈS : Données réelles
const { activeFarm } = useFarm();
const [documents, setDocuments] = useState<Document[]>([]);
const [loading, setLoading] = useState(true);

const loadDocuments = async () => {
  if (!activeFarm) return;
  
  try {
    setLoading(true);
    const documentsData = await documentService.getDocumentsByFarm(activeFarm.id);
    setDocuments(documentsData);
    
    const statsData = await documentService.getDocumentStats(activeFarm.id);
    setStats(statsData);
  } catch (error) {
    console.error('Erreur:', error);
    Alert.alert('Erreur', 'Impossible de charger les documents');
  } finally {
    setLoading(false);
  }
};
```

### **Statistiques Réelles**

```typescript
// ❌ AVANT : Calculs sur données de test
<Text>{documents.length}</Text>
<Text>{Math.round(documents.reduce((acc, doc) => acc + parseFloat(doc.fileSize), 0))}</Text>
<Text>{new Set(documents.map(doc => doc.category)).size}</Text>

// ✅ APRÈS : Statistiques depuis la base
<Text>{stats.totalDocuments}</Text>
<Text>{stats.totalSizeMB}</Text>
<Text>{stats.categoriesCount}</Text>
```

### **Suppression Réelle**

```typescript
// ❌ AVANT : Suppression locale
setDocuments(prev => prev.filter(doc => doc.id !== document.id));

// ✅ APRÈS : Suppression en base + rechargement
await documentService.deleteDocument(document.id);
await loadDocuments();
```

## 🔄 Changements d'Interface

### **Propriétés Mises à Jour**

| Propriété | Avant (Mock) | Après (Réel) |
|-----------|--------------|--------------|
| **Type fichier** | `fileType: string` | `file_type: string` |
| **Taille fichier** | `fileSize: string` | `file_size: number` (bytes) |
| **Date création** | `createdAt: string` | `created_at: string` |
| **Nom fichier** | - | `file_name: string` |
| **Chemin fichier** | `filePath?: string` | `file_path: string` |

### **Formatage des Données**

```typescript
// Formatage de la taille de fichier
const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
  } else {
    return `${Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100} MB`;
  }
};

// Usage dans l'interface
<Text>{formatFileSize(document.file_size)}</Text>
```

## 🚀 Fonctionnalités Ajoutées

### **1. Gestion Multi-Ferme**
- Documents liés à la ferme active
- Sécurité RLS automatique
- Changement de ferme = changement de documents

### **2. Recherche Avancée**
- Recherche dans nom et description
- Filtrage par catégorie
- Combinaison recherche + catégorie

### **3. Statistiques Dynamiques**
- Calcul en temps réel
- Taille totale en MB
- Nombre de catégories utilisées
- Répartition par catégorie

### **4. Sécurité**
- RLS sur toutes les opérations
- Utilisateurs voient uniquement leurs fermes
- Suppression en cascade si ferme supprimée

## 📋 Étapes de Migration

### **1. Base de Données**
```bash
# Exécuter la migration
psql -h your-host -d your-db -f supabase/Migrations/005_add_documents_table.sql
```

### **2. Code Application**
- ✅ Service DocumentService créé
- ✅ Interface DocumentsScreen mise à jour
- ✅ Chargement des données réelles
- ✅ Statistiques dynamiques

### **3. Tests**
- Tester le chargement des documents
- Vérifier les permissions RLS
- Tester la recherche et filtrage
- Valider les statistiques

## ⚠️ Points d'Attention

### **Migration Nécessaire**
```sql
-- À exécuter sur la base Supabase
\i supabase/Migrations/005_add_documents_table.sql
```

### **Stockage des Fichiers**
- Table documents = métadonnées uniquement
- Fichiers réels dans Supabase Storage
- Bucket par défaut : 'documents'

### **Permissions**
- RLS activé automatiquement
- Utilisateurs voient uniquement leurs fermes
- Propriétaires peuvent tout gérer

## ✅ Résultat Final

### **Données Réelles**
- Documents chargés depuis la base Supabase
- Statistiques calculées dynamiquement
- Sécurité multi-tenant automatique

### **Interface Cohérente**
- Même UX qu'avec les données de test
- Performance optimisée avec index
- Gestion d'erreurs robuste

### **Évolutivité**
- Structure prête pour l'upload de fichiers
- Extensible pour nouvelles catégories
- Compatible avec Supabase Storage

**Le système de documents utilise maintenant les vraies données avec une architecture complète et sécurisée !** 🎉

**Version** : 2.0  
**Dernière mise à jour** : Novembre 2024  
**Migration** : ✅ Base de données + Service + Interface


