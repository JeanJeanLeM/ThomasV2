const DECIMAL_PATTERN = /^\d+(?:[.,]\d+)?$/;

export const normalizeDecimalInput = (value: string): string => {
  return value.trim().replace(/\s+/g, '').replace(',', '.');
};

export const isValidDecimalInput = (value: string): boolean => {
  const normalized = normalizeDecimalInput(value);
  if (!normalized) return true;
  return DECIMAL_PATTERN.test(normalized);
};

export const parseDecimalInput = (value: string): number | undefined => {
  const normalized = normalizeDecimalInput(value);
  if (!normalized || !DECIMAL_PATTERN.test(normalized)) {
    return undefined;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};
