type CultureFilterItem = {
  type: 'culture' | 'variety';
  culture?: { name: string };
  variety?: { name: string };
};

export function buildPlantNameSet(plantNames: string[]): Set<string> {
  return new Set(plantNames.map((p) => p.trim().toLowerCase()).filter(Boolean));
}

/**
 * Indique si un item du dropdown culture correspond à au moins une entrée `plants` des tâches
 * (nom de culture ou "Culture - Variété").
 */
export function cultureDropdownItemMatchesPlants(
  item: CultureFilterItem,
  plantSet: Set<string>
): boolean {
  if (plantSet.size === 0) return true;
  if (item.type === 'culture' && item.culture) {
    const cn = item.culture.name.trim().toLowerCase();
    if (plantSet.has(cn)) return true;
    for (const p of plantSet) {
      if (p.startsWith(`${cn} - `)) return true;
    }
    return false;
  }
  if (item.type === 'variety' && item.variety && item.culture) {
    const label = `${item.culture.name} - ${item.variety.name}`.trim().toLowerCase();
    return plantSet.has(label);
  }
  return false;
}
