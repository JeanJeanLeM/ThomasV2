# 📄 Documents System Troubleshooting Guide

## 📋 Overview

This comprehensive guide consolidates all documents system debugging and troubleshooting information. The Thomas V2 documents system uses Supabase with soft delete functionality and supports file uploads across web and mobile platforms.

---

## 🔴 ISSUE 1: Foreign Key Constraint Errors

### **Problem**
```
ERROR: 23503: insert or update on table "documents" violates foreign key constraint "documents_farm_id_fkey"
DETAIL: Key (farm_id)=(1) is not present in table "farms". 16 exists
```

### **Root Cause**
Attempting to insert documents with non-existent `farm_id` (1) when valid farm ID is 16.

### **Solutions**

#### **Option 1: Use Correct Farm ID (Recommended)**
```sql
-- Execute with existing farm ID (16)
\i supabase/seeds/003_test_documents_simple.sql;
```

#### **Option 2: Check Existing Data First**
```sql
-- See available farms
SELECT id, name, owner_id, is_active
FROM public.farms
WHERE is_active = true
ORDER BY id;

-- See farm members
SELECT fm.farm_id, f.name, fm.user_id, au.email, fm.role
FROM public.farm_members fm
JOIN public.farms f ON fm.farm_id = f.id
JOIN auth.users au ON fm.user_id = au.id
WHERE fm.is_active = true;
```

#### **Option 3: Manual Verification**
```sql
-- Check which farms exist
SELECT id, name FROM public.farms WHERE is_active = true LIMIT 1;

-- Check users
SELECT id, email FROM auth.users LIMIT 1;

-- Insert test document with correct IDs
INSERT INTO public.documents (
  farm_id, user_id, name, category,
  file_name, file_type, file_size, file_path
) VALUES (
  16, -- Use existing farm ID
  'USER_ID_HERE',
  'Document de Test',
  'autre',
  'test.pdf',
  'pdf',
  1024,
  'documents/test.pdf'
);
```

### **Validation**
```sql
-- Count documents by farm
SELECT
  farm_id,
  COUNT(*) as nb_documents,
  ROUND(SUM(file_size)::numeric / (1024*1024), 2) as taille_mb
FROM public.documents
WHERE is_active = true
GROUP BY farm_id;

-- Check categories
SELECT category, COUNT(*)
FROM public.documents
WHERE is_active = true
GROUP BY category;
```

---

## 🟠 ISSUE 2: Web vs Mobile Delete Functionality

### **Problem**
Delete button doesn't work correctly on web (works on mobile).

### **Root Cause**
React Native's `Alert.alert` doesn't work natively on web browsers.

### **Solution Implemented**

#### **Web-Compatible Alert Utility**
Created `src/utils/webAlert.ts`:
```typescript
export const showDeleteConfirm = (
  itemName: string,
  onDelete: () => void,
  onCancel?: () => void
): void => {
  if (Platform.OS === 'web') {
    // Use native window.confirm on web
    const confirmed = window.confirm(
      `Supprimer l'élément\n\nÊtes-vous sûr de vouloir supprimer "${itemName}" ?\n\nCette action est irréversible.`
    );
    if (confirmed) {
      onDelete();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // Use native Alert.alert on mobile
    Alert.alert(title, message, buttons);
  }
};
```

#### **Updated Delete Function**
```typescript
const handleDeleteDocument = (document: Document) => {
  showDeleteConfirm(
    document.name,
    async () => {
      try {
        console.log('Suppression du document:', document.id);

        // Actual deletion via service
        await documentService.deleteDocument(document.id);

        // Reload documents
        await loadDocuments();

        // Success feedback
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

#### **Enhanced Service Logging**
In `DocumentService.ts`:
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

### **Testing Protocols**

#### **Test 1: Delete via Document Button**
1. Click trash icon on a document
2. ✅ Confirmation displays (web: confirm, mobile: Alert)
3. ✅ Confirm deletion
4. ✅ Document disappears from list
5. ✅ Success message displays
6. ✅ Statistics update

#### **Test 2: Test Delete Button**
1. Click "Test Suppr" in header
2. ✅ Automatically deletes first document
3. ✅ Detailed logs in console

#### **Test 3: Error Handling**
1. Try to delete non-existent document
2. ✅ Appropriate error message
3. ✅ Interface remains stable

#### **Expected Console Logs**
```
Suppression du document: 550e8400-e29b-41d4-a716-446655440000
🗑️ [DocumentService] Suppression document ID: 550e8400-e29b-41d4-a716-446655440000
🗑️ [DocumentService] Résultat suppression: { data: [...], error: null }
✅ [DocumentService] Document supprimé avec succès
Chargement des documents pour la ferme: 16
✅ [FARM-CONTEXT] Documents rechargés
```

---

## 🟡 ISSUE 3: General Debugging Steps

### **Step-by-Step Diagnostic Process**

#### **Step 1: Verify Confirmation Display**
```javascript
// In browser console
console.log('Test confirmation web');
const confirmed = window.confirm('Test de suppression\n\nConfirmer ?');
console.log('Résultat:', confirmed);
```

#### **Step 2: Test Service Directly**
```javascript
// In browser console
import { documentService } from './src/services/DocumentService';

// List documents
const docs = await documentService.getDocumentsByFarm(16);
console.log('Documents disponibles:', docs);

// Test delete first document
if (docs.length > 0) {
  await documentService.deleteDocument(docs[0].id);
  console.log('Suppression terminée');
}
```

#### **Step 3: Verify Database State**
```sql
-- View active documents
SELECT id, name, is_active FROM public.documents WHERE farm_id = 16;

-- View soft-deleted documents
SELECT id, name, is_active, updated_at FROM public.documents
WHERE farm_id = 16 AND is_active = false;
```

### **Known Issues & Workarounds**

#### **Web: window.confirm Blocked**
Some browsers block `window.confirm`. Workaround:
```typescript
// Fallback if confirm is blocked
if (typeof window.confirm === 'function') {
  const confirmed = window.confirm(message);
  // ...
} else {
  // Use custom modal
  console.warn('window.confirm non disponible, utiliser une modal');
}
```

#### **RLS Permissions**
If deletion fails, check permissions:
```sql
-- Verify user can modify document
SELECT d.*, fm.role
FROM public.documents d
JOIN public.farm_members fm ON d.farm_id = fm.farm_id
WHERE d.id = 'DOCUMENT_ID' AND fm.user_id = auth.uid();
```

---

## 🧪 **Complete Testing Workflow**

### **Quick Test**
1. Open web app
2. Go to Profile → Mes documents
3. Click "Test Suppr"
4. Observe console and interface

### **Full Test Suite**
1. Add test documents if needed
2. Test each delete button
3. Verify statistics update
4. Confirm deleted documents don't appear

### **Cross-Platform Validation**
- ✅ **Web**: Uses `window.confirm`
- ✅ **Mobile**: Uses `Alert.alert`
- ✅ **Fallback**: Handles unavailable APIs

---

## 📊 **System Architecture**

### **Soft Delete Implementation**
- Documents are marked `is_active: false` instead of deleted
- Preserves data integrity and audit trail
- Automatic filtering in queries

### **File Storage**
- Files stored in Supabase Storage
- Metadata in `documents` table
- Support for various file types (PDF, images, etc.)

### **Multi-Platform Compatibility**
- Web: Native browser APIs
- Mobile: React Native components
- Unified service layer

---

## 🎯 **Expected Results After Fixes**

### **Before (Problems)**
- ❌ Foreign key constraint errors
- ❌ Delete button unresponsive on web
- ❌ No user feedback
- ❌ No debugging logs
- ❌ Interface not responsive

### **After (Solutions)**
- ✅ Foreign key constraints respected
- ✅ Delete works on web and mobile
- ✅ Confirmation before deletion
- ✅ Success/error messages
- ✅ Detailed logging for debugging
- ✅ Automatic list refresh
- ✅ Real-time statistics updates

---

## 🚀 **Available Utility Functions**

```typescript
// Delete confirmation
showDeleteConfirm(itemName, onDelete, onCancel)

// Success/error messages
showSuccess(title, message)
showError(title, message)

// Generic alert (platform-aware)
showAlert(title, message, buttons)
```

---

## 🔧 **Maintenance & Monitoring**

### **Performance Metrics**
- Deletion response time <500ms
- Automatic list refresh
- Statistics accuracy
- Error rate tracking

### **Debug Commands**
```javascript
// Test confirmation dialog
window.confirm('Test confirmation')

// Check service availability
documentService.getDocumentsByFarm(16)

// Verify database state
// Use SQL queries above
```

### **Common Support Scenarios**
1. **Delete not working**: Check platform-specific alert implementation
2. **Foreign key errors**: Verify farm_id exists in farms table
3. **Permission issues**: Check RLS policies and user roles
4. **File not found**: Verify storage bucket and file paths

**Documents system is now fully functional across web and mobile platforms!** 🎉📄✨
