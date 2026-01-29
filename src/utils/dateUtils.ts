/**
 * Utilitaires pour la gestion des dates ISO (YYYY-MM-DD)
 * Évite les problèmes de timezone lors du parsing de dates ISO strings
 */

/**
 * Parse une date ISO string (YYYY-MM-DD) en Date object sans problème de timezone
 * @param dateString Date au format ISO (YYYY-MM-DD)
 * @returns Date object ou null si invalide
 */
export function parseISODate(dateString: string | undefined | null): Date | null {
  if (!dateString) return null;
  
  // Si c'est déjà un objet Date
  if (dateString instanceof Date) {
    return isNaN(dateString.getTime()) ? null : dateString;
  }
  
  // Vérifier le format ISO (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }
  
  // Parser manuellement pour éviter les problèmes de timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  // Vérifier que la date est valide
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  
  return date;
}

/**
 * Formate une date en string ISO (YYYY-MM-DD)
 * @param date Date object ou string ISO
 * @returns String au format YYYY-MM-DD ou undefined
 */
export function formatToISODate(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined;
  
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // Si c'est déjà au format ISO, le retourner tel quel
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // Sinon, parser
    const parsed = parseISODate(date);
    if (!parsed) return undefined;
    dateObj = parsed;
  } else {
    return undefined;
  }
  
  // Formater en YYYY-MM-DD (utiliser les valeurs locales, pas UTC)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formate une date pour l'affichage en français (DD/MM/YYYY)
 * @param date Date object ou string ISO
 * @returns String formatée ou null
 */
export function formatDateForDisplay(date: Date | string | undefined | null): string | null {
  const dateObj = date instanceof Date ? date : parseISODate(date as string);
  if (!dateObj) return null;
  
  return dateObj.toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}
