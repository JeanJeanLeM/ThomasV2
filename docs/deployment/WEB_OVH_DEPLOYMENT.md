# Déploiement Web OVH — Thomas V2
# Sous-domaine : mobile.thomas-app.com

Ce guide couvre l'intégralité du processus :
DNS OVH → Multisite → SSL → Upload FTP → Vérification.

---

## Prérequis

- Accès à l'espace client OVH : https://www.ovh.com/manager/
- Accès FTP au serveur OVH (identifiants dans l'email OVH de création d'hébergement)
- Node.js 18+ installé en local (pour le build)
- Repo cloné sur la branche `webappIOS`

---

## Étape 1 : Créer le sous-domaine DNS sur OVH

### 1.1 Accéder à la zone DNS

1. Connexion sur https://www.ovh.com/manager/
2. Menu gauche → **Noms de domaine** → `thomas-app.com`
3. Onglet **Zone DNS**
4. Cliquer **Ajouter une entrée**

### 1.2 Ajouter l'enregistrement

Choisir **A** (recommandé si vous connaissez l'IP de votre hébergement) :

| Champ | Valeur |
|-------|--------|
| Sous-domaine | `mobile` |
| Cible | `IP_DE_VOTRE_HEBERGEMENT_OVH` |
| TTL | 3600 (défaut) |

> Pour trouver l'IP : Menu OVH → **Hébergements** → votre hébergement → onglet **Informations générales** → **IPv4**

Alternative — **CNAME** (si OVH propose un hôte FTP) :

| Champ | Valeur |
|-------|--------|
| Sous-domaine | `mobile` |
| Cible | `votrehebergement.ovh.net` |

Cliquer **Valider**. La propagation DNS prend **entre 1 et 24 heures** (souvent 15–30 min chez OVH).

---

## Étape 2 : Configurer le Multisite OVH (associer le sous-domaine)

### 2.1 Ajouter le multisite

1. Menu OVH → **Hébergements** → votre hébergement
2. Onglet **Multisite**
3. Cliquer **Ajouter un domaine ou sous-domaine**
4. Choisir **Utiliser un domaine enregistré chez OVH** → sélectionner `thomas-app.com`
5. Cliquer **Suivant**

### 2.2 Configurer le répertoire racine

| Champ | Valeur recommandée |
|-------|-------------------|
| Domaine/sous-domaine | `mobile.thomas-app.com` |
| Répertoire racine | `mobile` (ou `thomas-app-mobile`) |
| Activer le CDN | Non (optionnel) |
| Certificat SSL | **Oui — Let's Encrypt (gratuit)** |

> Le répertoire racine est le dossier sur le serveur FTP où vous uploadez vos fichiers.
> OVH le créera dans `www/` → vous uploadez dans `www/mobile/` (ou le nom choisi).

Cliquer **Valider** puis **Confirmer**.

---

## Étape 3 : Activer le certificat SSL (HTTPS)

1. Menu OVH → **Hébergements** → votre hébergement
2. Onglet **Certificats SSL**
3. Si le certificat pour `mobile.thomas-app.com` n'est pas listé :
   - Cliquer **Commander un certificat SSL**
   - Choisir **Let's Encrypt (gratuit)**
   - Sélectionner `mobile.thomas-app.com`
   - Valider
4. L'activation prend **quelques minutes à quelques heures**.

> Une fois le SSL actif, `https://mobile.thomas-app.com` sera accessible.
> Le fichier `.htaccess` fourni dans ce projet redirige automatiquement HTTP → HTTPS.

---

## Étape 4 : Générer le build web

Depuis votre PC, sur la branche `webappIOS` :

```bash
# S'assurer d'être sur la bonne branche
git checkout webappIOS

# Créer le fichier d'environnement si pas encore fait
copy .env.web.example .env.local
# Éditer .env.local avec vos vraies clés (Notepad ou VS Code)

# Lancer le build web
npm run build:web
```

Le script :
1. Génère les fichiers statiques dans `dist/`
2. Copie automatiquement `.htaccess` dans `dist/`
3. Affiche un message de confirmation

Le dossier `dist/` contient tout ce qui doit être uploadé sur OVH.

---

## Étape 5 : Uploader les fichiers sur OVH via FTP

### Option A — FileZilla (recommandé, plus simple)

1. Télécharger **FileZilla** : https://filezilla-project.org/
2. Ouvrir le Gestionnaire de sites → **Nouveau site**

| Champ | Valeur |
|-------|--------|
| Protocole | FTP - Protocole de transfert de fichiers |
| Hôte | `ftp.votrehebergement.ovh.net` (voir espace client OVH) |
| Port | 21 |
| Mode de connexion | Demander le mot de passe |
| Identifiant | login FTP OVH |

3. Connexion
4. Dans le panneau **Serveur distant** → naviguer vers `www/mobile/` (le répertoire racine configuré à l'étape 2)
5. Dans le panneau **Ordinateur local** → naviguer vers votre dossier `dist/`
6. Sélectionner **tout le contenu de `dist/`** → glisser-déposer vers `www/mobile/`

> Important : uploader le **contenu** de `dist/`, pas le dossier `dist/` lui-même.
> Le fichier `index.html` doit être directement dans `www/mobile/`.

### Option B — OVH File Manager (Web, sans logiciel tiers)

1. Menu OVH → **Hébergements** → votre hébergement
2. Onglet **FTP - SSH** → **Ouvrir le gestionnaire de fichiers**
3. Naviguer vers `www/mobile/`
4. Uploader les fichiers de `dist/` un par un ou en ZIP puis décompresser

> Pour l'option ZIP : zipper le contenu de `dist/`, uploader le ZIP, puis décompresser sur le serveur.

---

## Étape 6 : Vérifier le déploiement

### Vérification rapide

```bash
# Tester l'accès HTTPS
curl -I https://mobile.thomas-app.com

# Résultat attendu :
# HTTP/2 200
# content-type: text/html
```

### Vérification manuelle

1. Ouvrir **https://mobile.thomas-app.com** dans Chrome ou Safari
2. Vérifier le certificat SSL (cadenas dans la barre d'adresse)
3. Tester la navigation (accueil, login, chat)
4. Tester en mode iPhone : ouvrir sur Safari iOS → vérifier le chargement

---

## Étape 7 : Configurer Supabase pour le nouveau domaine

Pour que l'authentification Supabase fonctionne sur la web app :

1. Connexion sur https://supabase.com/dashboard
2. Projet → **Authentication** → **URL Configuration**
3. Ajouter dans **Redirect URLs** :
   ```
   https://mobile.thomas-app.com
   https://mobile.thomas-app.com/**
   ```
4. **Site URL** → changer pour `https://mobile.thomas-app.com`
   (ou laisser l'URL Android si les deux doivent coexister — dans ce cas, utiliser seulement les Redirect URLs)

---

## Mise à jour du site (re-déploiement)

À chaque nouvelle version web :

```bash
git checkout webappIOS
# ... faire vos modifications ...
git add . && git commit -m "web: description du changement"
git push origin webappIOS

# Générer le nouveau build
npm run build:web

# Re-uploader dist/ sur OVH via FTP (remplacer les anciens fichiers)
```

---

## Résolution de problèmes

### Page blanche ou 404 sur les routes internes

Le fichier `.htaccess` doit être présent à la racine du répertoire OVH.
Vérifier qu'il a bien été uploadé et qu'il contient la règle `RewriteRule ^ /index.html [L]`.

### Erreur CORS sur les appels Supabase

Vérifier que l'URL de la web app est dans les Redirect URLs de Supabase (voir Étape 7).

### Certificat SSL non actif

Attendre 30 minutes à 2 heures après activation chez OVH.
Vérifier dans OVH → Hébergements → Certificats SSL que le statut est "Activé".

### Microphone ne fonctionne pas sur iOS Safari

Safari iOS exige HTTPS pour accéder au microphone. Vérifier que le certificat SSL est bien actif.
Vérifier que le header `Permissions-Policy: microphone=(self)` est bien renvoyé par le serveur.
