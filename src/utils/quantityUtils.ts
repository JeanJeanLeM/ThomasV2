/**
 * Utilitaires pour la gestion des quantités dans les tâches/actions.
 * Garde-fou: quantity_type ne doit être défini que si une quantité est réellement exprimée.
 */

export interface QuantityDataLike {
  quantity?: { value?: number | null; unit?: string | null } | null;
  quantity_nature?: string | null;
  quantity_converted?: { value?: number | null; unit?: string | null } | null;
  quantity_value?: number | null;
  quantity_unit?: string | null;
}

/**
 * Vérifie si des données de quantité sont présentes.
 * Si value, unit, nature et converted sont tous null/vides, retourne false.
 */
export function hasQuantityData(data: QuantityDataLike | null | undefined): boolean {
  if (!data) return false;

  const q = data.quantity;
  const qVal = q?.value ?? data.quantity_value;
  const qUnit = q?.unit ?? data.quantity_unit;
  const qn = data.quantity_nature;
  const qc = data.quantity_converted;
  const qcVal = qc?.value;
  const qcUnit = qc?.unit;

  return !!(
    (qVal != null && qVal !== '' && !Number.isNaN(Number(qVal))) ||
    (qUnit != null && String(qUnit).trim() !== '') ||
    (qn != null && String(qn).trim() !== '') ||
    (qcVal != null && qcVal !== '' && !Number.isNaN(Number(qcVal))) ||
    (qcUnit != null && String(qcUnit).trim() !== '')
  );
}

/**
 * Retourne quantity_type uniquement si des données de quantité existent.
 * Sinon retourne null (pas de "autre" par défaut quand aucune quantité).
 */
export function sanitizeQuantityType(
  data: QuantityDataLike & { quantity_type?: string | null } | null | undefined
): string | null {
  if (!data || !hasQuantityData(data)) return null;
  const qt = data.quantity_type;
  return qt != null && String(qt).trim() !== '' ? String(qt).trim() : null;
}
