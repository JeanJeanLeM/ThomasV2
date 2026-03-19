/**
 * Service d'appel a l'API SIRENE via l'edge function insee-sirene-lookup.
 * Permet de pre-remplir les donnees entreprise a partir d'un SIRET.
 */

import { supabase } from '../utils/supabase';

export interface SireneLookupResult {
  siren: string;
  siret: string;
  company_name: string;
  address: string;
  postal_code: string;
  city: string;
  vat_number: string;
}

export class SireneService {
  /**
   * Recherche les informations d'un etablissement par SIRET (14 chiffres).
   * Appelle l'edge function insee-sirene-lookup qui interroge data.siren-api.fr.
   */
  static async lookupBySiret(siret: string): Promise<SireneLookupResult> {
    const siretClean = siret.replace(/\s/g, '').replace(/\D/g, '');

    if (siretClean.length !== 14) {
      throw new Error('Le SIRET doit contenir 14 chiffres.');
    }

    console.log('[SireneService] Looking up SIRET:', siretClean);

    const { data, error } = await supabase.functions.invoke(
      'insee-sirene-lookup',
      { body: { siret: siretClean } },
    );

    if (error) {
      // Supabase FunctionsHttpError: extract the real error message from the response body
      const errorMessage = await SireneService.extractErrorMessage(error);
      console.error('[SireneService] Error:', errorMessage);
      throw new Error(errorMessage);
    }

    // data is already parsed JSON when invoke succeeds
    const result = data as SireneLookupResult | { error: string } | null;

    if (!result) {
      throw new Error('Reponse vide du service SIRENE.');
    }

    if (typeof (result as any).error === 'string') {
      const msg = (result as { error: string }).error;
      console.error('[SireneService] API error:', msg);
      throw new Error(msg);
    }

    console.log('[SireneService] Success:', (result as SireneLookupResult).company_name);
    return result as SireneLookupResult;
  }

  /**
   * Extract a human-readable error message from Supabase FunctionsHttpError.
   * The edge function returns JSON {error: "..."} in the body.
   */
  private static async extractErrorMessage(error: any): Promise<string> {
    // Try to read the response body from error.context (Response object)
    try {
      const response = error?.context;
      if (response && typeof response.json === 'function') {
        const body = await response.json();
        if (body?.error && typeof body.error === 'string') {
          return body.error;
        }
      }
    } catch (_) {
      // json() might fail if already consumed; try text()
      try {
        const response = error?.context;
        if (response && typeof response.text === 'function') {
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (parsed?.error) return parsed.error;
            } catch (_) {
              return text.slice(0, 200);
            }
          }
        }
      } catch (_) {
        // ignore
      }
    }

    // Fallback to error.message
    if (error?.message) {
      // Replace generic Supabase message with something useful
      if (error.message.includes('non-2xx')) {
        return 'Le service de recherche SIRET a rencontre une erreur. Reessayez.';
      }
      return error.message;
    }

    return 'Erreur inconnue lors de la recherche SIRET.';
  }
}
