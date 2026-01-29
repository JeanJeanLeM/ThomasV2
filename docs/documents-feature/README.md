# 📄 Documents Feature - Système de Gestion

Documentation complète de la fonctionnalité de gestion de documents dans Thomas V2.

## 📋 Contenu

### **Système & Architecture**
- **DOCUMENTS_SYSTEM_GUIDE.md** ⭐ - Guide complet système documents
- **DOCUMENTS_DATA_STATUS.md** - Status données documents

### **UI & Composants**
- **DOCUMENTS_UNIFIED_HEADER_GUIDE.md** - Header unifié
- **DOCUMENTS_BUTTONS_TEST_GUIDE.md** - Guide tests boutons
- **DOCUMENTS_UI_IMPROVEMENTS.md** - Améliorations UI
- **DOCUMENTS_DOUBLE_HEADER_FIX.md** - Fix double header

### **Filtres & Recherche**
- **DOCUMENTS_FILTERS_REDESIGN.md** - Redesign filtres
- **DOCUMENTS_SEARCH_FILTERS_SEPARATION.md** - Séparation search/filtres

### **Migration & Debug**
- **DOCUMENTS_REAL_DATA_MIGRATION.md** - Migration données réelles
- **DOCUMENTS_DEBUG_GUIDE.md** - Guide debug documents

## 🎯 Par Où Commencer ?

1. **Vue d'ensemble** → `DOCUMENTS_SYSTEM_GUIDE.md`
2. **UI Components** → `DOCUMENTS_UNIFIED_HEADER_GUIDE.md`
3. **Filtres** → `DOCUMENTS_FILTERS_REDESIGN.md`
4. **Debug** → `DOCUMENTS_DEBUG_GUIDE.md`

## 📄 Système de Documents

### **Fonctionnalités**

**Upload & Gestion**
- ✅ Upload multiple fichiers
- ✅ Drag & drop (web)
- ✅ Preview PDF/Images
- ✅ Métadonnées automatiques
- ✅ Catégorisation par type

**Recherche & Filtres**
- ✅ Recherche full-text
- ✅ Filtres par type
- ✅ Filtres par culture
- ✅ Filtres par date
- ✅ Tri personnalisable

**Organisation**
- ✅ Types de documents (factures, notes, certificats, etc.)
- ✅ Association culture/parcelle
- ✅ Tags personnalisés
- ✅ Favoris

**Partage & Permissions**
- ✅ Partage entre membres ferme
- ✅ Permissions par rôle
- ✅ Historique modifications

### **Types de Documents**

1. **📄 Factures** - Factures fournisseurs, clients
2. **📋 Notes** - Notes techniques, observations
3. **📜 Certificats** - Bio, qualité, phytosanitaires
4. **📊 Rapports** - Analyses sol, comptabilité
5. **📝 Contrats** - Locations, ventes, achats
6. **📸 Photos** - Photos parcelles, cultures, équipements
7. **🔧 Autres** - Documents divers

### **Structure Base de Données**

```typescript
interface Document {
  id: string;
  farm_id: string;
  title: string;
  type: DocumentType;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  culture_id?: string;
  plot_id?: string;
  tags?: string[];
  description?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

## 🎨 Interface Utilisateur

### **Écran Principal**

**Header Unifié**
- Titre "Documents"
- Bouton "+" ajout document
- Barre recherche
- Icône filtres

**Liste Documents**
- Card par document
- Preview miniature
- Titre + type
- Date + taille
- Actions rapides (share, delete, favorite)

**États**
- Loading - Skeleton screens
- Empty - Message + CTA "Ajouter premier document"
- Error - Message erreur avec retry

### **Modal Upload**

```
┌─────────────────────────────────┐
│  Ajouter un document            │
├─────────────────────────────────┤
│  [Zone drag & drop]             │
│  ou                             │
│  [Bouton "Parcourir"]           │
├─────────────────────────────────┤
│  Titre: [____________]          │
│  Type:  [Dropdown___]           │
│  Culture: [Dropdown__] (opt)    │
│  Description: [______]          │
├─────────────────────────────────┤
│  [Annuler]  [Ajouter]           │
└─────────────────────────────────┘
```

### **Modal Filtres**

**Filtres Disponibles**
- Type document (multi-select)
- Culture (dropdown)
- Date création (date range)
- Taille fichier (slider)
- Favoris uniquement (toggle)

**Tri**
- Plus récent
- Plus ancien
- Alphabétique A-Z
- Alphabétique Z-A
- Taille (croissant)
- Taille (décroissant)

## 🔧 Composants Techniques

### **DocumentsList**
```typescript
<DocumentsList
  documents={documents}
  onDocumentPress={handleDocumentPress}
  onDocumentDelete={handleDelete}
  onDocumentShare={handleShare}
  onToggleFavorite={handleFavorite}
  loading={loading}
  emptyMessage="Aucun document"
/>
```

### **DocumentCard**
```typescript
<DocumentCard
  document={document}
  showPreview={true}
  showActions={true}
  onPress={handlePress}
/>
```

### **DocumentFilters**
```typescript
<DocumentFilters
  filters={filters}
  onFiltersChange={handleFiltersChange}
  availableTypes={documentTypes}
  availableCultures={cultures}
/>
```

### **DocumentUpload**
```typescript
<DocumentUpload
  onUploadSuccess={handleUploadSuccess}
  farmId={farmId}
  maxSize={10 * 1024 * 1024} // 10MB
  allowedTypes={['pdf', 'jpg', 'png']}
/>
```

## 📊 Métriques

### **Usage**
- Documents moyens par ferme : ~50-100
- Uploads par mois : ~10-20
- Recherches par session : ~3-5

### **Storage**
- Espace moyen par ferme : ~500MB
- Taille moyenne document : ~2-5MB
- Types populaires : Photos (40%), Factures (30%), Notes (20%)

## 🔗 Liens Utiles

- **Système complet** : `DOCUMENTS_SYSTEM_GUIDE.md`
- **UI Guide** : `DOCUMENTS_UNIFIED_HEADER_GUIDE.md`
- **Filtres** : `DOCUMENTS_FILTERS_REDESIGN.md`
- **Tests** : `DOCUMENTS_BUTTONS_TEST_GUIDE.md`
- **Troubleshooting** : `../troubleshooting/DOCUMENTS_TROUBLESHOOTING.md`

---

**10 documents** | Système documents, UI, filtres, migration, debug




