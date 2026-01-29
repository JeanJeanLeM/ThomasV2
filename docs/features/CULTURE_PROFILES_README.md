# Guide : Mise à jour des Profils de Cultures

## Processus simple

### 1. Éditer le fichier Markdown

Ouvrez `docs/features/CULTURE_PROFILES.md` et remplissez les listes pour chaque profil.

**Format :**
- Un nom de culture par ligne
- Les noms doivent correspondre **exactement** aux noms dans la base de données
- Vous pouvez mettre les cultures dans n'importe quel ordre

**Exemple :**
```markdown
### Maraîchage

```
Tomate
Courgette
Salade
Carotte
Basilic
```
```

### 2. Mettre à jour le script SQL

Une fois le fichier `.md` rempli, mettez à jour le script `scripts/update_culture_profiles.sql` :

1. Ouvrez `scripts/update_culture_profiles.sql`
2. Pour chaque profil, remplacez le tableau `ARRAY[...]` par la liste des noms de cultures du fichier `.md`
3. Exécutez le script dans Supabase

**Exemple de transformation :**

Fichier `.md` :
```
Tomate
Courgette
Salade
```

Script SQL :
```sql
SELECT get_culture_ids_by_names(ARRAY[
  'Tomate', 'Courgette', 'Salade'
]) INTO result;
```

### 3. Exécuter la migration

Exécutez le script SQL dans Supabase pour mettre à jour la fonction `get_profile_culture_ids`.

## Alternative : Script automatique (optionnel)

Si vous préférez, je peux créer un script Node.js qui :
1. Lit le fichier `.md`
2. Génère automatiquement le script SQL
3. Vous n'avez qu'à exécuter le SQL généré

Souhaitez-vous que je crée ce script automatique ?
