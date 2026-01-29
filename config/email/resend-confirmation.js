// Script pour renvoyer l'email de confirmation
// Exécuter avec: node resend-confirmation.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kvwzbofifqqytyfertkh.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2d3pib2ZpZnFxeXR5ZmVydGtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTQ0NzQsImV4cCI6MjA1MTEzMDQ3NH0.qOKONPJVMmBqrKNOGFqSdHKAYGLMKnmQOBJCNfhvNxM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resendConfirmation() {
  try {
    console.log('📧 Renvoi de l\'email de confirmation...');
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: 'test.thomas.v2@gmail.com'
    });

    if (error) {
      console.error('❌ Erreur:', error.message);
      return;
    }

    console.log('✅ Email de confirmation renvoyé !');
    console.log('📬 Vérifiez votre boîte email : test.thomas.v2@gmail.com');
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

resendConfirmation();


