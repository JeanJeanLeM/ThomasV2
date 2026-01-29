// Script de test pour vérifier les conversions
// À exécuter dans la console du navigateur sur l'app

console.log('🧪 Test des conversions - Début');

// Simuler la création d'une conversion pour tester
const testConversion = {
  containerName: 'caisse',
  cropName: 'tomates',
  conversionValue: 10,
  conversionUnit: 'kg',
  description: 'Test de conversion'
};

console.log('📝 Données de test:', testConversion);

// Instructions pour l'utilisateur
console.log(`
📋 Instructions de test:

1. Ouvrir l'écran des conversions
2. Cliquer sur "Ajouter une conversion"
3. Remplir le formulaire avec:
   - Contenant: ${testConversion.containerName}
   - Culture: ${testConversion.cropName}
   - Valeur: ${testConversion.conversionValue}
   - Unité: ${testConversion.conversionUnit}
4. Sauvegarder
5. Vérifier que la conversion apparaît dans la liste
6. Retourner aux paramètres et vérifier que le compteur "Conversions" a augmenté

🔍 Vérifications attendues:
- La conversion est sauvegardée en base de données
- Elle apparaît dans la liste des conversions
- Le compteur dans "Aperçu de vos données" se met à jour
- Les logs dans la console montrent les opérations
`);