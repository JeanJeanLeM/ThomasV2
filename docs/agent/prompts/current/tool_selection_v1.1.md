# 🤖 tool_selection v1.1

**Version** : 1.1  
**Statut** : ✅ Actif  
**Date** : 24/11/2025  
**Longueur** : 548 caractères

---

## 📋 **Contenu du Prompt**

Analyse ce message agricole et identifie quels tools utiliser:

Message: "{{user_message}}"

Tools disponibles: {{available_tools}}

Structure de réponse JSON pour chat_analyzed_actions:
{
  "action_type": "task_done|task_planned|observation|harvest|help",
  "action_data": {
    // Données spécifiques selon le type d'action
    "title": "string",
    "action": "string", 
    "crop": "string",
    "plot_reference": "string"
    // Autres champs selon le type
  },
  "confidence": 0.95,
  "reasoning": "Pourquoi cette action"
}

---

## 📊 **Métadonnées**

- **ID** : 004f0b2f-4b81-4075-b646-009458aa5980
- **Créé le** : 2025-11-24T07:14:51.382005+01:00
- **Mis à jour le** : 2025-11-24T07:25:44.189382+01:00
- **Exemples** : Oui
- **Metadata** : {
  "created_by": "system",
  "description": "Sélection des tools selon le message"
}

---

**📁 Emplacement** : `docs/agent/prompts/current/`  
**🔄 Export** : 07/01/2026 10:20:56  
**📊 Statut** : ✅ Actif