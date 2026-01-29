# 📸 Guide de Test - Sélection Multiple d'Images

## 🎯 **Nouvelles Fonctionnalités à Tester**

### ✅ **1. Sélection Multiple d'Images**
- **Action** : Bouton "+" → "Multi-Galerie"
- **Résultat attendu** : Sélection de jusqu'à 5 images
- **Affichage** : Toutes les images dans la cartouche de pièces jointes

### ✅ **2. Affichage dans le Chat**
- **Action** : Envoyer un message avec plusieurs images
- **Résultat attendu** : 
  - Grille d'images en miniature (max 4 visibles)
  - Indicateur "+X" si plus de 4 images
  - Images en résolution réduite pour performance

### ✅ **3. Visualiseur d'Images**
- **Action** : Cliquer sur une image dans le chat
- **Résultat attendu** :
  - Modal plein écran avec l'image
  - Navigation horizontale entre images
  - Indicateur de position (1/3, 2/3, etc.)
  - Bouton fermer en haut à droite

### ✅ **4. Mélange Texte + Images**
- **Action** : Ajouter images + taper du texte + envoyer
- **Résultat attendu** : Message avec texte ET galerie d'images

## 🚀 **Étapes de Test**

### **Test 1 : Sélection Multiple Basique**
1. Ouvrir le chat
2. Appuyer sur "+"
3. Choisir "Multi-Galerie" (icône avec plusieurs images)
4. Sélectionner 3-4 images
5. ✅ Vérifier : Toutes les images apparaissent dans la cartouche
6. Appuyer sur "↗️" (bouton vert)
7. ✅ Vérifier : Message envoyé avec grille d'images

### **Test 2 : Visualiseur d'Images**
1. Cliquer sur une image dans le message envoyé
2. ✅ Vérifier : Modal s'ouvre en plein écran
3. Swiper horizontalement
4. ✅ Vérifier : Navigation entre images
5. Vérifier l'indicateur "2/4" en haut
6. Appuyer sur "✕" pour fermer

### **Test 3 : Texte + Images**
1. Appuyer sur "+" → "Multi-Galerie"
2. Sélectionner 2 images
3. Taper : "Voici mes photos de la récolte"
4. Appuyer sur "↗️"
5. ✅ Vérifier : Message avec texte ET images

### **Test 4 : Suppression de Pièces Jointes**
1. Ajouter plusieurs images à la cartouche
2. Cliquer sur "✕" sur une image
3. ✅ Vérifier : Image supprimée de la cartouche
4. Ajouter d'autres types (document, localisation)
5. ✅ Vérifier : Mélange de types dans la cartouche

### **Test 5 : Limite de Sélection**
1. Essayer de sélectionner plus de 5 images
2. ✅ Vérifier : Limitation à 5 images maximum
3. ✅ Vérifier : Message d'information si limite atteinte

## 🎨 **Design Attendu**

### **Cartouche de Pièces Jointes**
```
┌─────────────────────────────────────┐
│ [📸 Photo1] [📸 Photo2] [📄 Doc]    │
│ 3 pièces jointes - Appuyez sur ✕   │
└─────────────────────────────────────┘
```

### **Message avec Images**
```
┌─────────────────────────────────────┐
│ "Voici mes photos de la récolte"    │
│                                     │
│ [IMG1] [IMG2]                      │
│ [IMG3] [+2 ]                       │
│                               14:30 │
└─────────────────────────────────────┘
```

### **Visualiseur Plein Écran**
```
┌─────────────────────────────────────┐
│ 2/4                            [✕]  │
│                                     │
│           [IMAGE FULL SIZE]         │
│                                     │
│             ● ○ ○ ○                 │
└─────────────────────────────────────┘
```

## 🔧 **Problèmes Potentiels**

### **Si les images ne s'affichent pas :**
1. Vérifier que les politiques Supabase sont appliquées
2. Vérifier les logs de console pour erreurs d'upload
3. Tester avec des images plus petites (<2MB)

### **Si la sélection multiple ne marche pas :**
1. Vérifier les permissions de la galerie
2. Tester sur différents appareils/navigateurs
3. Vérifier la méthode `pickMultipleFromGallery`

### **Si le visualiseur ne s'ouvre pas :**
1. Vérifier les imports des composants
2. Tester le clic sur différentes zones de l'image
3. Vérifier les logs de console

## ✅ **Checklist de Validation**

- [ ] Sélection multiple fonctionne (max 5)
- [ ] Images apparaissent dans la cartouche
- [ ] Suppression d'images de la cartouche
- [ ] Envoi de messages avec images
- [ ] Affichage en grille dans le chat
- [ ] Visualiseur plein écran
- [ ] Navigation entre images
- [ ] Mélange texte + images
- [ ] Performance acceptable (pas de lag)
- [ ] Upload des images réussi

**Une fois tous les tests validés, le système de galerie multiple est opérationnel !** 🎉