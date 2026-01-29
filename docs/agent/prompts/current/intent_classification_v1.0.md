# 🤖 intent_classification v1.0

**Version** : 1.0  
**Statut** : ✅ Actif  
**Date** : 24/11/2025  
**Longueur** : 554 caractères

---

## 📋 **Contenu du Prompt**

Classifie l'intention de ce message agricole:

Message: "{{user_message}}"

Intentions possibles:
- observation_creation: Constat terrain, problème observé
- task_done: Tâche déjà réalisée, travail effectué
- task_planned: Tâche à planifier, travail futur
- harvest: Récolte avec quantités
- help: Demande d'aide sur l'application
- management: Gestion parcelles/matériel/conversions

Réponds en JSON:
{
  "intent": "observation_creation",
  "confidence": 0.9,
  "reasoning": "L'utilisateur décrit un problème observé sur ses cultures"
}

---

## 📊 **Métadonnées**

- **ID** : a8351f9b-8f9a-46a0-bcbe-5cad31a37a0e
- **Créé le** : 2025-11-24T07:14:51.382005+01:00
- **Mis à jour le** : 2025-11-24T07:14:51.382005+01:00
- **Exemples** : Oui
- **Metadata** : {
  "created_by": "system",
  "description": "Classification d'intention des messages"
}

---

**📁 Emplacement** : `docs/agent/prompts/current/`  
**🔄 Export** : 07/01/2026 09:41:49  
**📊 Statut** : ✅ Actif