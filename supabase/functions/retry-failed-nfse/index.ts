// Supabase Edge Function (Deno) - retry-failed-nfse
// Worker assíncrono para retentativa inteligente de NFS-e com falhas recuperáveis.
// Suporta: PREFEITURA_OFFLINE, SYSTEM_ERROR, e VALIDATION_ERROR (com force=true após correção)

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
    // Parâmetros opcionais via body
    let force = false;
    let targetCategories: string[] = ['PREFEITURA_OFFLINE', 'SYSTEM_ERROR'];
    let maxRetries = 3;
    let batchLimit = 10;

    try {
      const body = await req.json();
      force = body.force === true;
      if (force) {
        // force=true: também retenta erros de validação e AUTH (após correção manual)
        targetCategories = ['PREFEITURA_OFFLINE', 'SYSTEM_ERROR', 'VALIDATION_ERROR', 'AUTH_ERROR'];
      }
      if (body.max_retries) maxRetries = parseInt(body.max_retries) || 3;
      if (body.limit) batchLimit = Math.min(parseInt(body.limit) || 10, 25); // Máx 25 por run
    } catch (_) {
      // Body ausente ou inválido — usa defaults
    }

    console.log(`🔄 retry-failed-nfse | categorias=${targetCategories.join(',')} | force=${force} | max_retries=${maxRetries}`);

    // Buscar registros elegíveis para retentativa
    const { data: recordsToRetry, error: fetchErr } = await supabase
      .from('nfse_emissions')
      .select('id, error_category, retry_count, tomador_nome, tomador_cpf_cnpj')
      .eq('status', 'error')
      .in('error_category', targetCategories)
      .lt('retry_count', maxRetries)
      .order('created_at', { ascending: true })
      .limit(batchLimit);

    if (fetchErr) {
      console.error('❌ Erro ao buscar registros para retentativa:', fetchErr);
      throw fetchErr;
    }

    if (!recordsToRetry || recordsToRetry.length === 0) {
      console.log('✅ Nenhuma NFS-e pendente para retentativa no momento.');
      return new Response(
        JSON.stringify({ message: 'Nenhuma NFS-e pendente para retentativa.', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔎 ${recordsToRetry.length} registro(s) elegíveis para retentativa.`);

    const results: Array<{ id: string; category: string; success: boolean; error?: string }> = [];

    for (const record of recordsToRetry) {
      try {
        console.log(`⚡ Retentando NFS-e ID=${record.id} (categoria: ${record.error_category}, tentativa #${(record.retry_count || 0) + 1})...`);

        const { data: resData, error: invokeErr } = await supabase.functions.invoke('emit-nfse', {
          body: { nfse_id: record.id, action: 'retry' },
        });

        if (invokeErr) {
          console.error(`❌ Falha na retentativa ID=${record.id}:`, invokeErr.message);
          results.push({ id: record.id, category: record.error_category, success: false, error: invokeErr.message });
        } else {
          const isSuccess = resData?.success === true || resData?.idempotent === true;
          console.log(`${isSuccess ? '✅' : '⚠️'} Retentativa ID=${record.id}: ${isSuccess ? 'sucesso' : 'nova falha'}`);
          results.push({ id: record.id, category: record.error_category, success: isSuccess });
        }
      } catch (err: any) {
        console.error(`❌ Exceção na retentativa ID=${record.id}:`, err);
        results.push({ id: record.id, category: record.error_category, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`📊 Retentativa concluída: ${successCount} sucesso(s), ${failCount} nova(s) falha(s).`);

    return new Response(
      JSON.stringify({
        message: `Retentativa concluída: ${successCount}/${results.length} bem-sucedidas.`,
        processed: results.length,
        success: successCount,
        failed: failCount,
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
