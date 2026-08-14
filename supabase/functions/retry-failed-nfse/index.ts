// Supabase Edge Function (Deno) - retry-failed-nfse
// Worker assíncrono para retentativa inteligente de NFS-e que falharam por instabilidade da prefeitura

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔄 Iniciando rotina de retentativa assíncrona de NFS-e pendentes/offline...');

    // Buscar até 10 registros de erros temporários de infraestrutura que ainda não excederam 3 retentativas
    const { data: recordsToRetry, error: fetchErr } = await supabase
      .from('nfse_emissions')
      .select('*')
      .eq('status', 'error')
      .eq('error_category', 'PREFEITURA_OFFLINE')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchErr) {
      console.error('❌ Erro ao buscar registros para retentativa:', fetchErr);
      throw fetchErr;
    }

    if (!recordsToRetry || recordsToRetry.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma NFS-e pendente para retentativa assíncrona no momento.', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔎 Encontrados ${recordsToRetry.length} registros para tentar re-emissão...`);

    const results = [];

    for (const record of recordsToRetry) {
      try {
        console.log(`⚡ Retentando envio da NFS-e ID ${record.id} (Tentativa #${(record.retry_count || 0) + 1})...`);

        const { data: resData, error: invokeErr } = await supabase.functions.invoke('emit-nfse', {
          body: {
            nfse_id: record.id,
            action: 'retry',
          },
        });

        if (invokeErr) {
          results.push({ id: record.id, success: false, error: invokeErr.message });
        } else {
          results.push({ id: record.id, success: true, response: resData });
        }
      } catch (err: any) {
        console.error(`❌ Falha na retentativa para NFS-e ID ${record.id}:`, err);
        results.push({ id: record.id, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processadas ${results.length} retentativas de NFS-e com sucesso.`,
        processed: results.length,
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('❌ Exceção na Edge Function retry-failed-nfse:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro ao processar retentativas' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
