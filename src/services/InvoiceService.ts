/**
 * Service de gestion des factures
 * Interface avec les tables invoices et invoice_lines
 */

import { DirectSupabaseService } from './DirectSupabaseService';
import { supabase } from '../utils/supabase';
import type { Invoice, InvoiceLine } from '../types';

export interface InvoiceFilters {
  direction?: 'outgoing' | 'incoming';
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface InvoiceLineInput {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  line_order?: number;
  notes?: string | null;
}

export interface CreateInvoiceInput {
  farm_id: number;
  user_id: string;
  direction: 'outgoing' | 'incoming';
  customer_id?: string;
  supplier_id?: string;
  document_type?: 'invoice' | 'delivery_note' | 'invoice_with_delivery';
  invoice_date?: string;
  delivery_date?: string | null;
  delivery_location?: string | null;
  payment_due_date?: string | null;
  status?: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string | null;
  lines: InvoiceLineInput[];
}

export class InvoiceService {
  static async getInvoices(
    farmId: number,
    filters: InvoiceFilters = {}
  ): Promise<{ data: Invoice[]; count?: number }> {
    const conditions: { column: string; value: any }[] = [{ column: 'farm_id', value: farmId }];
    if (filters.direction) conditions.push({ column: 'direction', value: filters.direction });
    if (filters.status) conditions.push({ column: 'status', value: filters.status });
    if (filters.fromDate) conditions.push({ column: 'invoice_date', value: filters.fromDate, operator: 'gte' });
    if (filters.toDate) conditions.push({ column: 'invoice_date', value: filters.toDate, operator: 'lte' });

    const { data, error } = await DirectSupabaseService.directSelect(
      'invoices',
      '*',
      conditions
    );

    if (error) {
      console.error('[InvoiceService] getInvoices error:', error);
      return { data: [] };
    }

    let invoices = (data ?? []) as Invoice[];
    invoices = invoices.sort(
      (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
    );

    if (filters.limit) {
      const offset = filters.offset ?? 0;
      invoices = invoices.slice(offset, offset + filters.limit);
    }

    return { data: invoices };
  }

  static async getInvoiceById(id: string): Promise<{ invoice: Invoice | null; lines: InvoiceLine[] }> {
    const { data: invData, error: invError } = await DirectSupabaseService.directSelect(
      'invoices',
      '*',
      [{ column: 'id', value: id }],
      true
    );
    if (invError || !invData) {
      return { invoice: null, lines: [] };
    }

    const { data: linesData, error: linesError } = await DirectSupabaseService.directSelect(
      'invoice_lines',
      '*',
      [{ column: 'invoice_id', value: id }]
    );

    const lines = (linesError ? [] : linesData ?? []) as InvoiceLine[];
    lines.sort((a, b) => a.line_order - b.line_order);

    return { invoice: invData as Invoice, lines };
  }

  static async createInvoice(input: CreateInvoiceInput): Promise<Invoice | null> {
    const { data: invData, error: invError } = await DirectSupabaseService.directInsert(
      'invoices',
      {
        farm_id: input.farm_id,
        user_id: input.user_id,
        direction: input.direction,
        customer_id: input.direction === 'outgoing' ? input.customer_id : null,
        supplier_id: input.direction === 'incoming' ? input.supplier_id : null,
        document_type: input.document_type ?? 'invoice',
        invoice_date: input.invoice_date ?? new Date().toISOString().slice(0, 10),
        delivery_date: input.delivery_date ?? null,
        delivery_location: input.delivery_location ?? null,
        payment_due_date: input.payment_due_date ?? null,
        status: input.status ?? 'sent',
        notes: input.notes ?? null,
      }
    );

    if (invError || !invData) {
      console.error('[InvoiceService] createInvoice error:', invError);
      return null;
    }

    const invoiceId = invData.id;

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      const { error: lineError } = await DirectSupabaseService.directInsert('invoice_lines', {
        invoice_id: invoiceId,
        product_id: line.product_id ?? null,
        product_name: line.product_name,
        quantity: line.quantity,
        unit: line.unit,
        unit_price_ht: line.unit_price_ht,
        vat_rate: line.vat_rate,
        line_order: line.line_order ?? i,
        notes: line.notes ?? null,
      });
      if (lineError) {
        console.error('[InvoiceService] createInvoice line error:', lineError);
      }
    }

    const { invoice } = await this.getInvoiceById(invoiceId);
    return invoice;
  }

  static async updateInvoice(id: string, input: Omit<CreateInvoiceInput, 'farm_id' | 'user_id'>): Promise<Invoice | null> {
    const { error: invError } = await DirectSupabaseService.directUpdate(
      'invoices',
      {
        direction: input.direction,
        document_type: input.document_type ?? 'invoice',
        customer_id: input.direction === 'outgoing' ? input.customer_id ?? null : null,
        supplier_id: input.direction === 'incoming' ? input.supplier_id ?? null : null,
        invoice_date: input.invoice_date ?? new Date().toISOString().slice(0, 10),
        delivery_date: input.delivery_date ?? null,
        delivery_location: input.delivery_location ?? null,
        payment_due_date: input.payment_due_date ?? null,
        status: input.status ?? 'sent',
        notes: input.notes ?? null,
      },
      [{ column: 'id', value: id }]
    );

    if (invError) {
      console.error('[InvoiceService] updateInvoice error:', invError);
      return null;
    }

    // Remplacer toutes les lignes
    await DirectSupabaseService.directDelete('invoice_lines', [{ column: 'invoice_id', value: id }]);

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      // total_ht / total_vat / total_ttc sont des colonnes GENERATED — ne pas les inclure
      const { error: lineError } = await DirectSupabaseService.directInsert('invoice_lines', {
        invoice_id: id,
        product_id: line.product_id ?? null,
        product_name: line.product_name,
        quantity: line.quantity,
        unit: line.unit,
        unit_price_ht: line.unit_price_ht,
        vat_rate: line.vat_rate,
        line_order: line.line_order ?? i,
        notes: line.notes ?? null,
      });
      if (lineError) console.error('[InvoiceService] updateInvoice line error:', lineError);
    }

    const { invoice } = await this.getInvoiceById(id);
    return invoice;
  }

  static async updateInvoiceStatus(id: string, status: 'draft' | 'sent' | 'paid' | 'cancelled'): Promise<boolean> {
    const { error } = await DirectSupabaseService.directUpdate(
      'invoices',
      { status },
      [{ column: 'id', value: id }]
    );
    if (error) {
      console.error('[InvoiceService] updateInvoiceStatus error:', error);
      return false;
    }
    return true;
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    return this.updateInvoiceStatus(id, 'cancelled');
  }

  /** Charge les lignes pour un ensemble de factures en une seule requête */
  static async getLinesBatch(invoiceIds: string[]): Promise<Record<string, InvoiceLine[]>> {
    if (!invoiceIds.length) return {};
    const { data, error } = await supabase
      .from('invoice_lines')
      .select('*')
      .in('invoice_id', invoiceIds);
    if (error || !data) return {};
    const map: Record<string, InvoiceLine[]> = {};
    for (const line of data as InvoiceLine[]) {
      if (!map[line.invoice_id]) map[line.invoice_id] = [];
      map[line.invoice_id].push(line);
    }
    return map;
  }
}
