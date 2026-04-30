import { isValidDecimalInput, normalizeDecimalInput, parseDecimalInput } from '../numberInput';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
  toBeUndefined: () => void;
};

describe('numberInput utilities', () => {
  describe('normalizeDecimalInput', () => {
    it('normalizes comma decimal separator', () => {
      expect(normalizeDecimalInput('1,20')).toBe('1.20');
    });

    it('trims and removes spaces', () => {
      expect(normalizeDecimalInput(' 0, 90 ')).toBe('0.90');
    });
  });

  describe('parseDecimalInput', () => {
    it('parses comma decimal values', () => {
      expect(parseDecimalInput('1,20')).toBe(1.2);
    });

    it('parses dot decimal values', () => {
      expect(parseDecimalInput('1.20')).toBe(1.2);
    });

    it('parses values smaller than one', () => {
      expect(parseDecimalInput('0,90')).toBe(0.9);
    });

    it('returns undefined for empty value', () => {
      expect(parseDecimalInput('')).toBeUndefined();
    });

    it('returns undefined for invalid values', () => {
      expect(parseDecimalInput('1,,2')).toBeUndefined();
      expect(parseDecimalInput('abc')).toBeUndefined();
    });
  });

  describe('isValidDecimalInput', () => {
    it('accepts empty and valid decimal values', () => {
      expect(isValidDecimalInput('')).toBe(true);
      expect(isValidDecimalInput('10')).toBe(true);
      expect(isValidDecimalInput('10,5')).toBe(true);
      expect(isValidDecimalInput('10.5')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(isValidDecimalInput('1..2')).toBe(false);
      expect(isValidDecimalInput('1,,2')).toBe(false);
      expect(isValidDecimalInput('m1')).toBe(false);
    });
  });
});
