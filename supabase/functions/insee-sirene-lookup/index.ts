// Edge Function: Lookup SIRET via data.siren-api.fr
// Returns normalized company data for customers/suppliers.
//
// Secret requis (un des deux) :
// - SIREN_API_CLIENT_SECRET : cle API data.siren-api.fr
// - INSEE_ACCESS_TOKEN : meme cle (alias)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function calculateVatNumber(siren: string): string {
  const sirenNum = parseInt(siren.replace(/\D/g, ''), 10);
  const key = (12 + 3 * (sirenNum % 97)) % 97;
  return `FR${key.toString().padStart(2, '0')}${siren}`;
}

/** Parse EtablissementResponse from data.siren-api.fr */
function parseResponse(data: any): Record<string, string> {
  const etab = data?.etablissement ?? data;
  const ul = etab?.unite_legale ?? {};

  const numero = (etab?.numero_voie ?? '').toString().trim();
  const typeVoie = (etab?.type_voie ?? '').toString().trim();
  const libelleVoie = (etab?.libelle_voie ?? '').toString().trim();
  const address = [numero, typeVoie, libelleVoie].filter(Boolean).join(' ').trim();

  const companyName =
    (etab?.denomination_usuelle ?? ul?.denomination ?? '').toString().trim() || 'Entreprise';

  const siren = (etab?.siren ?? ul?.siren ?? '').toString();
  const siret = (etab?.siret ?? '').toString();

  return {
    siren,
    siret,
    company_name: companyName,
    address,
    postal_code: (etab?.code_postal ?? '').toString(),
    city: (etab?.libelle_commune ?? '').toString(),
    vat_number: siren ? calculateVatNumber(siren) : '',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Methode POST requise' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let siret: string;
    try {
      const body = await req.json();
      siret = body?.siret;
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: 'Body JSON invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!siret || typeof siret !== 'string') {
      return new Response(
        JSON.stringify({ error: 'siret requis (chaine de 14 chiffres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const siretClean = siret.replace(/\s/g, '').replace(/\D/g, '');

    if (siretClean.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'SIRET invalide (14 chiffres attendus)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Cle API : SIREN_API_CLIENT_SECRET ou INSEE_ACCESS_TOKEN
    const clientSecret = (
      Deno.env.get('SIREN_API_CLIENT_SECRET') ??
      Deno.env.get('INSEE_ACCESS_TOKEN') ??
      ''
    ).trim();

    if (!clientSecret) {
      return new Response(
        JSON.stringify({
          error:
            'Aucune cle API configuree. Definir le secret Supabase SIREN_API_CLIENT_SECRET ou INSEE_ACCESS_TOKEN avec la cle de data.siren-api.fr.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[SIRENE] Calling data.siren-api.fr for SIRET', siretClean);

    const apiRes = await fetch(
      `https://data.siren-api.fr/v3/etablissements/${siretClean}`,
      {
        method: 'GET',
        headers: {
          'X-Client-Secret': clientSecret,
          'Accept': 'application/json',
        },
      },
    );

    if (apiRes.ok) {
      const apiData = await apiRes.json();
      // DEBUG: log full raw response
      console.log('[SIRENE] RAW response:', JSON.stringify(apiData).slice(0, 1500));

      // data.siren-api.fr renvoie HTTP 200 avec {code, message} pour les erreurs
      if (apiData?.code !== undefined && apiData?.message && !apiData?.etablissement) {
        const apiCode = Number(apiData.code);
        console.error('[SIRENE] API error in body:', apiCode, apiData.message);

        if (apiCode === 404) {
          return new Response(
            JSON.stringify({ error: `Ce SIRET (${siretClean}) n'existe pas dans la base SIRENE. Verifiez le numero et reessayez.` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        if (apiCode === 401 || apiCode === 403) {
          return new Response(
            JSON.stringify({ error: 'Cle API SIRENE invalide ou expiree. Contactez l\'administrateur.' }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        return new Response(
          JSON.stringify({ error: `Erreur du service SIRENE (${apiCode}): ${apiData.message}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const result = parseResponse(apiData);
      console.log('[SIRENE] PARSED:', JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Erreurs specifiques
    const errBody = await apiRes.text();
    console.error('[SIRENE] data.siren-api.fr', apiRes.status, errBody?.slice(0, 300));

    if (apiRes.status === 404) {
      return new Response(
        JSON.stringify({ error: 'SIRET non trouve dans la base SIRENE' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (apiRes.status === 401 || apiRes.status === 403) {
      return new Response(
        JSON.stringify({
          error: `Cle API invalide (${apiRes.status}). Verifiez le secret SIREN_API_CLIENT_SECRET ou INSEE_ACCESS_TOKEN.`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ error: `data.siren-api.fr: erreur ${apiRes.status}` }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[SIRENE] Error:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
