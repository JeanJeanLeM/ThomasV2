/**
 * Service d'ingestion de factures analysées par l'IA.
 * Miroir du service web invoiceIngestionService.ts.
 *
 * Flux :
 *  1. Résoudre/créer supplier ou customer
 *  2. Créer la facture (invoices)
 *  3. Créer les lignes (invoice_lines)
 *  4. Pour direction=incoming :
 *     - is_charge=true → charges_fixes
 *     - is_semence=true → semences
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import type { InvoiceAIOutput, InvoiceIngestPayload } from '../types';

export interface IngestResult {
  success: boolean;
  invoiceId?: string;
  invoiceNumber?: string;
  linesCreated: number;
  chargesCreated: number;
  semencesCreated: number;
  error?: string;
}

export class InvoiceIngestionService {
  // ── 1. Résoudre ou créer le tiers ────────────────────────────────────────

  private static async resolveSupplier(
    farmId: number,
    userId: string,
    supplierName: string
  ): Promise<string | null> {
    if (!supplierName?.trim()) return null;

    const { data: existing } = await DirectSupabaseService.directSelect(
      'suppliers',
      'id',
      [
        { column: 'farm_id', value: farmId },
        { column: 'company_name', value: supplierName.trim(), operator: 'ilike' },
      ],
      true
    );
    if (existing?.id) return existing.id as string;

    const { data: created } = await DirectSupabaseService.directInsert('suppliers', {
      farm_id: farmId,
      user_id: userId,
      company_name: supplierName.trim(),
    });
    return created?.id ?? null;
  }

  private static async resolveCustomer(
    farmId: number,
    userId: string,
    customerName: string
  ): Promise<string | null> {
    if (!customerName?.trim()) return null;

    const { data: existing } = await DirectSupabaseService.directSelect(
      'customers',
      'id',
      [
        { column: 'farm_id', value: farmId },
        { column: 'company_name', value: customerName.trim(), operator: 'ilike' },
      ],
      true
    );
    if (existing?.id) return existing.id as string;

    const { data: created } = await DirectSupabaseService.directInsert('customers', {
      farm_id: farmId,
      user_id: userId,
      company_name: customerName.trim(),
    });
    return created?.id ?? null;
  }

  // ── 2. Créer l'entrée dans charges_fixes ─────────────────────────────────

  private static async insertChargeFix(
    farmId: number,
    invoiceLineId: string,
    line: InvoiceAIOutput['lines'][number],
    aiInvoice: InvoiceAIOutput['invoice'],
    source: 'message' | 'invoice_scan'
  ): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('charges_fixes', {
      farm_id: farmId,
      nom_produit: line.product_name,
      categorie: line.charge_category ?? 'autre',
      prix_achat: line.unit_price_ht * line.quantity,
      prix_unitaire: line.unit_price_ht,
      quantite_achetee: line.quantity,
      unite_achat: line.unit,
      quantite_par_conditionnement: line.quantity_per_package ?? null,
      unite_base: line.base_unit ?? null,
      fournisseur: aiInvoice.supplier_name ?? null,
      date_achat: aiInvoice.invoice_date ?? new Date().toISOString().slice(0, 10),
      source,
      facture_analysee: true,
      invoice_line_id: invoiceLineId,
    });
    if (error) {
      console.error('[InvoiceIngestion] insertChargeFix error:', error);
      return false;
    }
    return true;
  }

  // ── 3. Créer l'entrée dans semences ──────────────────────────────────────

  private static async insertSemence(
    farmId: number,
    invoiceLineId: string,
    line: InvoiceAIOutput['lines'][number],
    aiInvoice: InvoiceAIOutput['invoice']
  ): Promise<boolean> {
    const { error } = await DirectSupabaseService.directInsert('semences', {
      farm_id: farmId,
      culture: line.culture ?? line.product_name,
      variete: line.variete ?? null,
      prix: line.unit_price_ht,
      unite_prix: line.unit,
      graines_par_sachet: line.graines_par_sachet ?? null,
      quantite_stock: line.quantity,
      unite_stock: line.unit,
      pmg: line.pmg ?? null,
      fournisseur: aiInvoice.supplier_name ?? null,
      lot_numero: line.lot_numero ?? null,
      date_peremption: line.date_peremption ?? null,
      facture_analysee: true,
      invoice_line_id: invoiceLineId,
    });
    if (error) {
      console.error('[InvoiceIngestion] insertSemence error:', error);
      return false;
    }
    return true;
  }

  // ── 4. Point d'entrée principal ───────────────────────────────────────────

  static async ingestInvoice(payload: InvoiceIngestPayload): Promise<IngestResult> {
    const { farmId, userId, aiOutput, source, existingInvoiceId } = payload;
    const { invoice: ai, lines } = aiOutput;

    let chargesCreated = 0;
    let semencesCreated = 0;

    try {
      // 1. Tiers
      const supplierId =
        ai.direction === 'incoming' && ai.supplier_name
          ? await this.resolveSupplier(farmId, userId, ai.supplier_name)
          : null;

      const customerId =
        ai.direction === 'outgoing' && ai.customer_name
          ? await this.resolveCustomer(farmId, userId, ai.customer_name)
          : null;

      // 2. Facture
      let invoiceId: string;

      if (existingInvoiceId) {
        invoiceId = existingInvoiceId;
        await DirectSupabaseService.directUpdate(
          'invoices',
          {
            direction: ai.direction,
            invoice_number: ai.invoice_number ?? null,
            invoice_date: ai.invoice_date ?? new Date().toISOString().slice(0, 10),
            delivery_date: ai.delivery_date ?? null,
            payment_due_date: ai.payment_due_date ?? null,
            supplier_id: supplierId,
            customer_id: customerId,
            notes: ai.notes ?? null,
          },
          [{ column: 'id', value: existingInvoiceId }]
        );

        await DirectSupabaseService.directDelete('invoice_lines', [
          { column: 'invoice_id', value: existingInvoiceId },
        ]);
      } else {
        const totalHt = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);
        const totalVat = lines.reduce(
          (s, l) => s + l.quantity * l.unit_price_ht * (l.vat_rate / 100),
          0
        );

        const { data: invData, error: invError } = await DirectSupabaseService.directInsert(
          'invoices',
          {
            farm_id: farmId,
            user_id: userId,
            direction: ai.direction,
            invoice_number: ai.invoice_number ?? null,
            document_type: 'invoice',
            invoice_date: ai.invoice_date ?? new Date().toISOString().slice(0, 10),
            delivery_date: ai.delivery_date ?? null,
            payment_due_date: ai.payment_due_date ?? null,
            status: 'draft',
            supplier_id: supplierId,
            customer_id: customerId,
            total_ht: totalHt,
            total_vat: totalVat,
            total_ttc: totalHt + totalVat,
            notes: ai.notes ?? null,
          }
        );

        if (invError || !invData?.id) {
          return { success: false, linesCreated: 0, chargesCreated: 0, semencesCreated: 0, error: 'Erreur création facture' };
        }

        invoiceId = invData.id as string;
      }

      // 3. Lignes
      let linesCreated = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const totalHt = line.quantity * line.unit_price_ht;
        const totalVat = totalHt * (line.vat_rate / 100);

        const { data: lineData, error: lineError } = await DirectSupabaseService.directInsert(
          'invoice_lines',
          {
            invoice_id: invoiceId,
            product_name: line.product_name,
            quantity: line.quantity,
            unit: line.unit,
            unit_price_ht: line.unit_price_ht,
            vat_rate: line.vat_rate,
            total_ht: totalHt,
            total_vat: totalVat,
            total_ttc: totalHt + totalVat,
            line_order: i,
            notes: line.notes ?? null,
          }
        );

        if (lineError) {
          console.error('[InvoiceIngestion] line insert error:', lineError);
          continue;
        }
        linesCreated++;

        const lineId = lineData?.id as string | undefined;

        // 4. Ingestion consommables + semences (incoming uniquement)
        if (ai.direction === 'incoming' && lineId) {
          if (line.is_semence) {
            const ok = await this.insertSemence(farmId, lineId, line, ai);
            if (ok) semencesCreated++;
          }
          if (line.is_charge) {
            const ok = await this.insertChargeFix(farmId, lineId, line, ai, source);
            if (ok) chargesCreated++;
          }
        }
      }

      // 5. Recalculer totaux si mise à jour
      if (existingInvoiceId) {
        const totalHt = lines.reduce((s, l) => s + l.quantity * l.unit_price_ht, 0);
        const totalVat = lines.reduce(
          (s, l) => s + l.quantity * l.unit_price_ht * (l.vat_rate / 100),
          0
        );
        await DirectSupabaseService.directUpdate(
          'invoices',
          { total_ht: totalHt, total_vat: totalVat, total_ttc: totalHt + totalVat },
          [{ column: 'id', value: existingInvoiceId }]
        );
      }

      const invoiceNumber = ai.invoice_number ?? invoiceId.slice(0, 8);
      return { success: true, invoiceId, invoiceNumber, linesCreated, chargesCreated, semencesCreated };

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[InvoiceIngestion] ingestInvoice error:', err);
      return { success: false, linesCreated: 0, chargesCreated: 0, semencesCreated: 0, error: message };
    }
  }
}
