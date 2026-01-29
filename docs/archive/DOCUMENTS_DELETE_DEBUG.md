# 🔧 Débogage Suppression Documents - Web vs Mobile

## ❌ Problème Identifié

Le bouton "Supprimer un document" ne fonctionne pas correctement sur le web.

## 🔍 Causes Possibles

### **1. Problème Alert.alert sur Web**
`Alert.alert` de React Native ne fonctionne pas de manière native sur le web.

### **2. Problème de Service**
Le service `DocumentService.deleteDocument()` peut échouer silencieusement.

### **3. Problème de Rechargement**
Les documents ne se rechargent pas après suppression.

## 🛠️ Solutions Implémentées

### **1. Utilitaire Web-Compatible**
Création de `src/utils/webAlert.ts` :

```typescript
export const showDeleteConfirm = (
  itemName: string,
  onDelete: () => void,
  onCancel?: () => void
): void => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(
      `Supprimer l'élément\n\nÊtes-vous sûr de vouloir supprimer "${itemName}" ?\n\nCette action est irréversible.`
    );
    if (confirmed) {
      onDelete();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};
```

### **2. Fonction de Suppression Mise à Jour**
```typescript
const handleDeleteDocument = (document: Document) => {
  showDeleteConfirm(
    document.name,
    async () => {
      try {
        console.log('Suppression du document:', document.id);
        
        // Suppression réelle via le service
        await documentService.deleteDocument(document.id);
        
        // Recharger les documents
        await loadDocuments();
        
        // Feedback de succès
        showSuccess(
          'Document supprimé',
          `"${document.name}" a été supprimé avec succès.`
        );
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showError(
          'Erreur',
          'Impossible de supprimer le document. Veuillez réessayer.'
        );
      }
    }
  );
};
```

### **3. Logs de Débogage Ajoutés**
Dans `DocumentService.ts` :
```typescript
async deleteDocument(documentId: string): Promise<void> {
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
    throw new Error(`Impossible de supprimer le document: ${error.message}`);
  }
  
  console.log('✅ [DocumentService] Document supprimé avec succès');
}
```

### **4. Bouton de Test Dédié**
Bouton "Test Suppr" qui teste directement la suppression du premier document.

## 🧪 Tests de Validation

### **Test 1 : Bouton Test Suppr**
1. Cliquer sur le bouton "Test Suppr" dans l'en-tête
2. Vérifier que la confirmation s'affiche (web: `window.confirm`, mobile: `Alert.alert`)
3. Confirmer la suppression
4. Vérifier les logs dans la console

### **Test 2 : Bouton Supprimer sur Document**
1. Cliquer sur l'icône poubelle d'un document
2. Vérifier la confirmation
3. Confirmer et observer le résultat

### **Test 3 : Console Logs**
Ouvrir la console du navigateur et chercher :
```
🗑️ [DocumentService] Suppression document ID: xxx-xxx-xxx
🗑️ [DocumentService] Résultat suppression: { data: [...], error: null }
✅ [DocumentService] Document supprimé avec succès
```

## 🔍 Diagnostic Étape par Étape

### **Étape 1 : Vérifier l'Affichage de la Confirmation**
```javascript
// Dans la console du navigateur
console.log('Test confirmation web');
const confirmed = window.confirm('Test de suppression\n\nConfirmer ?');
console.log('Résultat:', confirmed);
```

### **Étape 2 : Tester le Service Directement**
```javascript
// Dans la console du navigateur
import { documentService } from './src/services/DocumentService';

// Lister les documents
const docs = await documentService.getDocumentsByFarm(16);
console.log('Documents disponibles:', docs);

// Tester la suppression du premier
if (docs.length > 0) {
  await documentService.deleteDocument(docs[0].id);
  console.log('Suppression terminée');
}
```

### **Étape 3 : Vérifier la Base de Données**
```sql
-- Voir les documents actifs
SELECT id, name, is_active FROM public.documents WHERE farm_id = 16;

-- Voir les documents supprimés (soft delete)
SELECT id, name, is_active, updated_at FROM public.documents 
WHERE farm_id = 16 AND is_active = false;
```

## ⚠️ Problèmes Connus

### **Web : window.confirm Bloqué**
Certains navigateurs peuvent bloquer `window.confirm`. Solution :
```typescript
// Fallback si confirm est bloqué
if (typeof window.confirm === 'function') {
  const confirmed = window.confirm(message);
  // ...
} else {
  // Utiliser une modal custom
  console.warn('window.confirm non disponible, utiliser une modal');
}
```

### **Permissions RLS**
Si la suppression échoue, vérifier les permissions :
```sql
-- Vérifier que l'utilisateur peut modifier le document
SELECT d.*, fm.role 
FROM public.documents d
JOIN public.farm_members fm ON d.farm_id = fm.farm_id
WHERE d.id = 'DOCUMENT_ID' AND fm.user_id = auth.uid();
```

## 🎯 Résolution Attendue

Après les corrections :
1. ✅ Confirmation s'affiche sur web et mobile
2. ✅ Suppression fonctionne (soft delete)
3. ✅ Liste se recharge automatiquement
4. ✅ Message de succès s'affiche
5. ✅ Logs détaillés dans la console

## 🚀 Commandes de Test

### **Test Rapide**
1. Ouvrir l'application web
2. Aller dans Profile → Mes documents
3. Cliquer sur "Test Suppr"
4. Observer la console et l'interface

### **Test Complet**
1. Ajouter des documents de test si nécessaire
2. Tester chaque bouton de suppression
3. Vérifier que les statistiques se mettent à jour
4. Confirmer que les documents supprimés n'apparaissent plus

**La suppression devrait maintenant fonctionner sur web et mobile !** 🎉









