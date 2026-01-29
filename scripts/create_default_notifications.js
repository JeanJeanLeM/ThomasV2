#!/usr/bin/env node

/**
 * Script utilitaire pour créer les notifications par défaut
 * Usage: node scripts/create_default_notifications.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key needed for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDefaultNotifications() {
  console.log('🔔 Création des notifications par défaut...\n');

  try {
    // Get all active farms with their owners
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('id, name, owner_id')
      .eq('is_active', true);

    if (farmsError) {
      throw farmsError;
    }

    if (!farms || farms.length === 0) {
      console.log('ℹ️  Aucune ferme active trouvée');
      return;
    }

    console.log(`📊 ${farms.length} ferme(s) active(s) trouvée(s)\n`);

    let created = 0;
    let errors = 0;
    let skipped = 0;

    // Process each farm
    for (const farm of farms) {
      try {
        console.log(`🏠 Traitement ferme: ${farm.name} (ID: ${farm.id})`);

        // Check if user exists in auth.users
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(farm.owner_id);
        
        if (userError || !user) {
          console.log(`   ❌ Propriétaire introuvable (${farm.owner_id})`);
          errors++;
          continue;
        }

        console.log(`   👤 Propriétaire: ${user.user?.email || 'Email non disponible'}`);

        // Check if default notification already exists
        const { data: existingNotification, error: checkError } = await supabase
          .from('notifications')
          .select('id, title')
          .eq('farm_id', farm.id)
          .eq('user_id', farm.owner_id)
          .eq('notification_type', 'task_reminder')
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          console.log(`   ❌ Erreur vérification: ${checkError.message}`);
          errors++;
          continue;
        }

        if (existingNotification) {
          console.log(`   ⏭️  Notification existe déjà: "${existingNotification.title}"`);
          skipped++;
          continue;
        }

        // Create default notification
        const defaultNotificationData = {
          farm_id: farm.id,
          user_id: farm.owner_id,
          title: 'Rappel tâches quotidiennes',
          message: 'N\'oubliez pas d\'ajouter vos tâches réalisées via le chat Thomas !',
          reminder_time: '18:00:00',
          selected_days: [1, 2, 3, 4, 5], // Monday to Friday
          notification_type: 'task_reminder',
          metadata: { 
            is_default: true, 
            auto_created: true, 
            created_by_script: true,
            created_at_script: new Date().toISOString()
          }
        };

        const { data: newNotification, error: createError } = await supabase
          .from('notifications')
          .insert(defaultNotificationData)
          .select('id, title')
          .single();

        if (createError) {
          console.log(`   ❌ Erreur création: ${createError.message}`);
          errors++;
        } else {
          console.log(`   ✅ Notification créée: "${newNotification.title}" (ID: ${newNotification.id})`);
          created++;
        }

      } catch (error) {
        console.log(`   ❌ Exception: ${error.message}`);
        errors++;
      }

      console.log(''); // Empty line for readability
    }

    // Summary
    console.log('📊 RÉSUMÉ:');
    console.log(`   ✅ Créées: ${created}`);
    console.log(`   ⏭️  Ignorées (existantes): ${skipped}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    console.log(`   📊 Total traité: ${farms.length}`);

    if (created > 0) {
      console.log('\n🎉 Notifications par défaut créées avec succès !');
    } else if (skipped === farms.length) {
      console.log('\n✅ Toutes les notifications par défaut existent déjà.');
    } else {
      console.log('\n⚠️  Certaines notifications n\'ont pas pu être créées. Vérifiez les erreurs ci-dessus.');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
    process.exit(1);
  }
}

// Run the script
createDefaultNotifications()
  .then(() => {
    console.log('\n🏁 Script terminé.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  });













