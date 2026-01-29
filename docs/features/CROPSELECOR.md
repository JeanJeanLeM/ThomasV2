Fonctionnement de la liste dans CultureDropdownSelector
1. Chargement des données
Cultures (lignes 128-146) :
Au montage, chargement des cultures via cultureService
Si cultureTypeFilter est défini, seules les cultures de ce type sont chargées
Sinon, toutes les cultures de la ferme sont chargées
Variétés (lignes 148-168) :
Si allowVarieties est activé, chargement des variétés
Les variétés sont chargées pour les cultures du type sélectionné (ou toutes si "Tous types")
Une boucle charge les variétés pour chaque culture concernée
2. Construction de la liste (useMemo - lignes 171-222)
La liste est construite via un useMemo qui se recalcule quand :
cultures change
varieties change
selectedCultureType change
allowVarieties change
searchable change
searchText change
Étapes de construction :
Filtrage par type de culture (lignes 174-178) :
   let filteredCultures = cultures;   if (selectedCultureType !== 'all') {     filteredCultures = cultures.filter(c => c.type === selectedCultureType);   }
Ajout des cultures (lignes 181-189) :
Chaque culture devient un item avec :
id: culture-${culture.id}
label: culture.name
type: 'culture'
Référence à l'objet culture
Ajout des variétés (lignes 192-208) :
Si allowVarieties est activé
Filtrage par type si nécessaire
Chaque variété devient un item avec :
id: variety-${variety.id}
label: ${variety.culture?.name} - ${variety.name} (ex: "Tomate - Cerise")
type: 'variety'
Référence à l'objet variety et culture
Filtrage par recherche (lignes 210-219) :
Si searchable est activé et qu'il y a du texte
Recherche dans :
Le label de l'item
La description de la culture
La description de la variété
Tri alphabétique après filtrage
Tri final (ligne 222) :
Tri alphabétique par label si pas de recherche
3. Affichage dans l'UI (lignes 411-440)
Structure :
Filtres par type (lignes 372-409) :
Chips horizontaux pour filtrer par type ("Tous types", "Légume", etc.)
Affichés uniquement si plusieurs types sont disponibles et si cultureTypeFilter n'est pas défini
Liste des items (lignes 412-440) :
ScrollView avec maxHeight: 250
États :
Chargement : message "Chargement..."
Vide : message "Aucune culture trouvée"
Items : liste des dropdownItems
Chaque item :
TouchableOpacity cliquable
Texte avec numberOfLines={2} pour les noms longs
Appel de handleItemSelect au clic
4. Exemple de flux
Ouverture du dropdown → chargement des cultures
Sélection d'un type (ex: "Légume") → filtrage des cultures et variétés
Saisie dans le champ → filtrage par recherche en temps réel
Clic sur un item → handleItemSelect → mise à jour de selectedItem et fermeture
Points importants
Performance : useMemo évite de recalculer la liste à chaque render
Flexibilité : support des cultures et variétés, filtrage par type et recherche
UX : affichage simplifié (label uniquement), tri alphabétique, support des noms longs
La liste est dynamique et se met à jour selon les filtres et la recherche.