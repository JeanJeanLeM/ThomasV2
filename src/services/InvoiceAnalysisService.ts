/**
 * Service d'analyse de factures via l'API web externe.
 * Supporte 3 modes d'entrée : texte, base64 (image), multipart (fichier).
 *
 * Base URL : EXPO_PUBLIC_API_BASE_URL (ex. https://votre-app.vercel.app)
 * Endpoint : POST /api/ai/analyze-invoice
 */

import { ENV_CLIENT } from '../utils/env';
import type { InvoiceAIOutput, InvoiceDirection } from '../types';

// ─── Paramètres communs ───────────────────────────────────────────────────────

interface BaseAnalyzeParams {
  direction?: InvoiceDirection;
  farmContext?: string;
  currentDateIso?: string;
}

// Mode A : image/PDF multipart
export interface AnalyzeFileParams extends BaseAnalyzeParams {
  mode: 'file';
  fileUri: string;
  mimeType?: string;
  fileName?: string;
}

// Mode B : texte libre
export interface AnalyzeTextParams extends BaseAnalyzeParams {
  mode: 'text';
  textContent: string;
}

// Mode C : image base64
export interface AnalyzeBase64Params extends BaseAnalyzeParams {
  mode: 'base64';
  imageBase64: string;
  mimeType: string;
}

export type AnalyzeInvoiceParams = AnalyzeFileParams | AnalyzeTextParams | AnalyzeBase64Params;

export interface AnalyzeResult {
  success: true;
  data: InvoiceAIOutput;
}

export interface AnalyzeError {
  success: false;
  error: string;
}

export type AnalyzeInvoiceResult = AnalyzeResult | AnalyzeError;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  const url = ENV_CLIENT.API_BASE_URL;
  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL non configuré. Définissez-le dans votre fichier .env.'
    );
  }
  return url.replace(/\/$/, '');
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Validation minimale de la réponse IA ────────────────────────────────────

function validateAIOutput(raw: unknown): raw is InvoiceAIOutput {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  return (
    typeof obj['original_text'] === 'string' &&
    typeof obj['confidence'] === 'number' &&
    obj['invoice'] !== null &&
    typeof obj['invoice'] === 'object' &&
    Array.isArray(obj['lines'])
  );
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class InvoiceAnalysisService {
  /**
   * Analyse un document ou texte de facture via l'API web externe.
   * Renvoie le JSON structuré InvoiceAIOutput ou une erreur typée.
   */
  static async analyze(params: AnalyzeInvoiceParams): Promise<AnalyzeInvoiceResult> {
    const baseUrl = (() => {
      try {
        return getBaseUrl();
      } catch (e: unknown) {
        return null;
      }
    })();

    if (!baseUrl) {
      return { success: false, error: 'API_BASE_URL non configurée. Contactez l\'administrateur.' };
    }

    const endpoint = `${baseUrl}/api/ai/analyze-invoice`;
    const currentDateIso = params.currentDateIso ?? getTodayIso();

    try {
      let response: Response;

      if (params.mode === 'text') {
        // Mode B : texte JSON
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text_content: params.textContent,
            direction: params.direction ?? 'incoming',
            farm_context: params.farmContext ?? '',
            current_date_iso: currentDateIso,
          }),
        });

      } else if (params.mode === 'base64') {
        // Mode C : image base64 JSON
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: params.imageBase64,
            mime_type: params.mimeType,
            direction: params.direction ?? 'incoming',
            farm_context: params.farmContext ?? '',
            current_date_iso: currentDateIso,
          }),
        });

      } else {
        // Mode A : multipart/form-data
        const formData = new FormData();
        formData.append('file', {
          uri: params.fileUri,
          type: params.mimeType ?? 'application/octet-stream',
          name: params.fileName ?? 'document',
        } as unknown as Blob);
        formData.append('direction', params.direction ?? 'incoming');
        formData.append('farm_context', params.farmContext ?? '');
        formData.append('current_date_iso', currentDateIso);

        response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return {
          success: false,
          error: `Erreur serveur ${response.status}${body ? ': ' + body.slice(0, 200) : ''}`,
        };
      }

      const json: unknown = await response.json();

      if (!validateAIOutput(json)) {
        return {
          success: false,
          error: 'Réponse inattendue du serveur (format JSON invalide).',
        };
      }

      return { success: true, data: json };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Erreur réseau : ${message}` };
    }
  }
}
