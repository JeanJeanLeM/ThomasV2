# 📦 Configuration Manuelle du Bucket Photos - Supabase

## 🎯 Création du Bucket Photos

### 1. **Créer le Bucket**

Dans **Supabase Dashboard > Storage > Create bucket** :

```
✅ Bucket name: photos
❌ Public bucket: NON (désactivé pour sécurité)
✅ File size limit: 10 MB
✅ Allowed MIME types: image/jpeg,image/png,image/webp,image/gif
```

### 2. **Créer les Politiques RLS**

Allez dans **Storage > Policies** et créez ces 3 politiques :

#### **Politique 1: Upload des Photos**
```
Nom: Users can upload photos to their farm
Opération: INSERT
Target roles: authenticated
```

**Expression SQL** :
```sql
EXISTS (
  SELECT 1 FROM farm_members fm
  WHERE fm.user_id = auth.uid()
  AND fm.farm_id::text = (string_to_array(name, '/'))[2]
  AND fm.is_active = true
)
```

#### **Politique 2: Lecture des Photos**
```
Nom: Users can view photos from their farms
Opération: SELECT  
Target roles: authenticated
```

**Expression SQL** :
```sql
EXISTS (
  SELECT 1 FROM farm_members fm
  WHERE fm.user_id = auth.uid()
  AND fm.farm_id::text = (string_to_array(name, '/'))[2]
  AND fm.is_active = true
)
```

#### **Politique 3: Suppression des Photos**
```
Nom: Users can delete their own photos or farm photos if manager
Opération: DELETE
Target roles: authenticated
```

**Expression SQL** :
```sql
(
  (string_to_array(name, '/'))[3] LIKE '%' || auth.uid()::text || '%'
  OR
  EXISTS (
    SELECT 1 FROM farm_members fm
    WHERE fm.user_id = auth.uid()
    AND fm.farm_id::text = (string_to_array(name, '/'))[2]
    AND fm.role IN ('owner', 'manager')
    AND fm.is_active = true
  )
)
```

### 3. **Vérification**

Dans l'**éditeur SQL**, exécutez :

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'photos';

-- Vérifier les politiques
SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%photos%';
```

Vous devriez voir :
- ✅ 1 bucket nommé "photos"
- ✅ 3 politiques avec les noms correspondants

### 4. **Structure des Chemins**

Les photos seront organisées ainsi :
```
photos/
├── chat/
│   └── {farm_id}/
│       └── {timestamp}_{filename}
├── tasks/
│   └── {farm_id}/
│       └── {timestamp}_{filename}
└── observations/
    └── {farm_id}/
        └── {timestamp}_{filename}
```

**Exemple** : `photos/tasks/123/1703123456789_image_001.jpg`

### 5. **Test de Fonctionnement**

Une fois configuré, testez avec l'application :
1. Ouvrir une conversation
2. Bouton "+" → "Tâche"
3. Section "Photos" → "📷 Appareil Photo"
4. Prendre une photo
5. Sauvegarder la tâche
6. ✅ Vérifier l'upload dans Storage > photos

---

## 🚨 Dépannage

### Erreur "Permission denied"
- ✅ Vérifier que l'utilisateur est membre d'une ferme
- ✅ Vérifier les politiques RLS
- ✅ Tester avec un utilisateur owner/manager

### Photos ne s'uploadent pas
- ✅ Vérifier la taille < 10MB
- ✅ Vérifier le format (jpeg, png, webp, gif)
- ✅ Vérifier la connexion réseau

### Bucket introuvable
- ✅ Vérifier l'orthographe exacte : "photos"
- ✅ Vérifier que le bucket n'est pas public
- ✅ Recréer le bucket si nécessaire

---

## ✅ Checklist Finale

- [ ] Bucket "photos" créé (privé, 10MB, images seulement)
- [ ] 3 politiques RLS créées et actives
- [ ] Test SQL de vérification réussi
- [ ] Test d'upload depuis l'application réussi

**Une fois cette checklist complète, le système de photos est opérationnel !** 📷✨