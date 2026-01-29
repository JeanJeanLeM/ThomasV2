import { Platform } from 'react-native';
import { useEffect } from 'react';

/**
 * 🔥 HOOK CRITIQUE POUR SUPPRIMER LES DOUBLES BORDURES
 * 
 * Injecte du CSS global ultra-agressif pour supprimer TOUTES
 * les bordures des éléments input/textarea sur web.
 */
export const useWebInputStyles = () => {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const styleId = 'thomas-input-reset';
    
    // Supprimer l'ancien style s'il existe
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    
    // Créer un nouvel élément style
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.setAttribute('type', 'text/css');
    
    // CSS ULTRA-AGRESSIF avec sélecteurs très spécifiques
    styleElement.innerHTML = `
      /* ================================================
         THOMAS V2 - RESET TOTAL DES INPUTS
         Priorité maximale avec !important partout
         ================================================ */
      
      /* Reset global de TOUS les inputs */
      input, textarea, select,
      input[type], textarea[type],
      input[class], textarea[class],
      *[data-focusable] input,
      *[data-focusable] textarea {
        border: 0 !important;
        border-width: 0 !important;
        border-style: none !important;
        border-color: transparent !important;
        border-radius: 0 !important;
        outline: 0 !important;
        outline-width: 0 !important;
        outline-style: none !important;
        outline-color: transparent !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
        background-color: transparent !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
      
      /* Focus state - toujours aucune bordure */
      input:focus, textarea:focus, select:focus,
      input:active, textarea:active, select:active,
      input:focus-visible, textarea:focus-visible {
        border: 0 !important;
        outline: 0 !important;
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
      }
      
      /* Hover state */
      input:hover, textarea:hover {
        border: 0 !important;
        outline: 0 !important;
      }
      
      /* Placeholder */
      input::placeholder, textarea::placeholder {
        opacity: 1 !important;
      }
      
      /* Suppression des décorations de navigateur */
      input::-webkit-outer-spin-button,
      input::-webkit-inner-spin-button,
      input::-webkit-search-decoration,
      input::-webkit-search-cancel-button,
      input::-webkit-search-results-button,
      input::-webkit-search-results-decoration,
      input::-ms-clear,
      input::-ms-reveal {
        -webkit-appearance: none !important;
        appearance: none !important;
        display: none !important;
        margin: 0 !important;
      }
      
      /* Textarea spécifique */
      textarea {
        resize: none !important;
      }
    `;
    
    // Insérer en PREMIER dans le head pour priorité maximale
    const head = document.head || document.getElementsByTagName('head')[0];
    head.insertBefore(styleElement, head.firstChild);
    
    // Cleanup
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);
};