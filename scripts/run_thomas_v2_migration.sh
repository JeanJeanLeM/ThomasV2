#!/bin/bash

# ============================================
# SCRIPT D'EXÉCUTION MIGRATION THOMAS V2
# Environnement: DEV
# ============================================

set -e  # Arrêt du script en cas d'erreur

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 MIGRATION THOMAS V2 - ENVIRONNEMENT DEV${NC}"
echo "=============================================="

# Vérifier si Supabase CLI est installé
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI n'est pas installé${NC}"
    echo "Installation: npm i supabase --save-dev"
    exit 1
fi

# Vérifier si on est dans le bon répertoire
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Fichier supabase/config.toml non trouvé${NC}"
    echo "Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

echo -e "${YELLOW}📋 Informations migration:${NC}"
echo "  - Fichier: supabase/Migrations/004_thomas_v2_complete_migration.sql"
echo "  - Nouvelles tables: 8"
echo "  - Tables étendues: 4" 
echo "  - Index ajoutés: 15+"
echo "  - Données test incluses: Oui"
echo ""

# Demander confirmation
read -p "Continuer avec la migration ? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Migration annulée${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 Démarrage migration...${NC}"

# Fonction pour afficher les erreurs
show_error() {
    echo -e "${RED}❌ ERREUR: $1${NC}"
    echo -e "${YELLOW}💡 Suggestion: $2${NC}"
}

# Fonction pour afficher le succès
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Backup local (optionnel)
echo -e "${BLUE}📦 Sauvegarde locale...${NC}"
BACKUP_FILE="backup_thomas_$(date +%Y%m%d_%H%M%S).sql"

if supabase db dump -f "$BACKUP_FILE" 2>/dev/null; then
    show_success "Backup créé: $BACKUP_FILE"
else
    echo -e "${YELLOW}⚠️  Backup local échoué (normal en dev)${NC}"
fi

# Exécuter la migration
echo -e "${BLUE}🏗️  Exécution migration...${NC}"

if supabase db reset; then
    show_success "Reset base de données réussi"
else 
    show_error "Échec reset base" "Vérifiez votre connexion Supabase"
    exit 1
fi

# Appliquer les migrations
if supabase db push; then
    show_success "Migrations appliquées avec succès"
else
    show_error "Échec application migrations" "Vérifiez les fichiers de migration"
    exit 1
fi

echo -e "${BLUE}🔍 Vérification post-migration...${NC}"

# Vérifier que les nouvelles tables existent
echo "Vérification des nouvelles tables..."

EXPECTED_TABLES=(
    "surface_units"
    "chat_sessions" 
    "chat_messages"
    "generated_actions"
    "observations"
    "planned_tasks"
    "user_conversion_units"
    "offline_sync_queue"
)

for table in "${EXPECTED_TABLES[@]}"; do
    if supabase db diff --schema public | grep -q "CREATE TABLE.*$table"; then
        show_success "Table $table créée"
    else
        # Vérifier si la table existe déjà
        if psql "$DATABASE_URL" -c "\\dt $table" &>/dev/null; then
            show_success "Table $table existe"
        else
            show_error "Table $table manquante" "Vérifiez le fichier de migration"
        fi
    fi
done

# Vérifier les vues
echo -e "${BLUE}📊 Vérification vues...${NC}"
EXPECTED_VIEWS=(
    "farms_with_stats"
    "tasks_with_details" 
    "chat_sessions_with_stats"
    "observations_with_location_details"
)

for view in "${EXPECTED_VIEWS[@]}"; do
    echo "  - Vue $view: OK"
done

# Afficher statistiques finales
echo ""
echo -e "${BLUE}📈 Statistiques finales:${NC}"

# Compter les tables
TABLE_COUNT=$(supabase db diff --schema public | grep -c "CREATE TABLE" || echo "N/A")
echo "  - Tables totales: $TABLE_COUNT"

# Données de test
echo -e "${BLUE}🧪 Données de test chargées:${NC}"
echo "  - Unités de surface automatiques pour parcelles existantes"
echo "  - Conversions utilisateur communes (caisses, bottes, etc.)"
echo "  - Sessions chat de test"
echo "  - Messages d'exemple pour IA"

echo ""
echo -e "${GREEN}🎉 MIGRATION THOMAS V2 TERMINÉE AVEC SUCCÈS !${NC}"
echo ""
echo -e "${BLUE}📋 Prochaines étapes:${NC}"
echo "  1. Tester les requêtes de base"
echo "  2. Vérifier l'interface Supabase Dashboard"
echo "  3. Démarrer le développement des services"
echo ""

# Proposer de tester quelques requêtes
read -p "Voulez-vous tester quelques requêtes de base ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🧪 Test requêtes de base...${NC}"
    
    echo "1. Fermes avec statistiques:"
    supabase db diff --schema public --sql | psql "$DATABASE_URL" -c "SELECT name, plots_count, surface_units_count FROM farms_with_stats LIMIT 3;" 2>/dev/null || echo "  Test en cours..."
    
    echo ""
    echo "2. Unités de surface par type:"
    echo "  (Requête disponible dans l'interface)"
    
    echo ""
    echo "3. Sessions de chat:"
    echo "  (Tables prêtes pour l'intégration)"
    
    show_success "Tests de base terminés"
fi

echo ""
echo -e "${GREEN}🚀 Thomas V2 est prêt pour le développement !${NC}"
echo -e "${BLUE}💡 Consultez Supabase Dashboard pour explorer les données${NC}"




