// Supabase Edge Function (Deno) - emit-nfse
// Emissão de NFS-e via WebService SOAP BHISS Digital PBH (ABRASF)
// Fixes aplicados:
//   #1 - Registro SEMPRE gravado (mesmo em validation error)
//   #2/#3 - Tomador = Profissional (Opção B: licença de plataforma)
//   #4 - Idempotência correta para package_id
//   #5 - Integração SOAP real com BHISS Digital + modo sandbox explícito

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// HELPERS
// =============================================================================

function cleanDocument(doc?: string): string {
  if (!doc) return '';
  return doc.replace(/\D/g, '');
}

function classifyErrorCategory(message: string, response?: any): string {
  const msgLower = (message || '').toLowerCase();
  const respStr = JSON.stringify(response || {}).toLowerCase();

  if (
    msgLower.includes('cpf') ||
    msgLower.includes('cnpj') ||
    msgLower.includes('documento') ||
    msgLower.includes('inválido') ||
    msgLower.includes('obrigatório') ||
    respStr.includes('e10') ||
    respStr.includes('e160')
  ) return 'VALIDATION_ERROR';

  if (
    msgLower.includes('503') ||
    msgLower.includes('502') ||
    msgLower.includes('504') ||
    msgLower.includes('timeout') ||
    msgLower.includes('conexão') ||
    msgLower.includes('manutenção') ||
    respStr.includes('e180')
  ) return 'PREFEITURA_OFFLINE';

  if (
    msgLower.includes('autenticação') ||
    msgLower.includes('401') ||
    msgLower.includes('403') ||
    msgLower.includes('senha') ||
    msgLower.includes('certificado') ||
    msgLower.includes('unauthorized')
  ) return 'AUTH_ERROR';

  return 'SYSTEM_ERROR';
}

// =============================================================================
// SOAP / XML BUILDER — ABRASF BHISS Digital PBH
// =============================================================================

/**
 * Constrói o XML do RPS (Recibo Provisório de Serviço) no padrão ABRASF
 * utilizado pela Prefeitura de Belo Horizonte (BHISS Digital).
 * Código de Serviço: 04.01.01 — Serviços de Saúde Mental / Psicologia
 * Município: 3106200 (Belo Horizonte - MG)
 */
function buildRpsXml(params: {
  cnpjPrestador: string;
  imPrestador: string;
  rpsNumero: string;
  rpsSerie: string;
  dataEmissao: string;
  valorServico: number;
  aliquotaIss: number;
  itemListaServico: string;
  discriminacao: string;
  tomadorDoc: string;
  tomadorNome: string;
  tomadorEmail?: string;
}): string {
  const {
    cnpjPrestador, imPrestador, rpsNumero, rpsSerie, dataEmissao,
    valorServico, aliquotaIss, itemListaServico, discriminacao,
    tomadorDoc, tomadorNome, tomadorEmail,
  } = params;

  const isCnpj = tomadorDoc.length === 14;
  const docTag = isCnpj
    ? `<Cnpj>${tomadorDoc}</Cnpj>`
    : `<Cpf>${tomadorDoc}</Cpf>`;

  const valorFormatted = valorServico.toFixed(2);
  const valorIss = (valorServico * aliquotaIss / 100).toFixed(2);
  const aliquotaFormatted = aliquotaIss.toFixed(2);

  const contatoTag = tomadorEmail
    ? `\n          <Contato><Email>${tomadorEmail}</Email></Contato>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps Id="lote${rpsNumero}" versao="1.00">
    <NumeroLote>${rpsNumero}</NumeroLote>
    <CpfCnpj><Cnpj>${cnpjPrestador}</Cnpj></CpfCnpj>
    <InscricaoMunicipal>${imPrestador}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfRps Id="rps${rpsNumero}">
          <IdentificacaoRps>
            <Numero>${rpsNumero}</Numero>
            <Serie>${rpsSerie}</Serie>
            <Tipo>1</Tipo>
          </IdentificacaoRps>
          <DataEmissao>${dataEmissao}</DataEmissao>
          <NaturezaOperacao>1</NaturezaOperacao>
          <RegimeEspecialTributacao>6</RegimeEspecialTributacao>
          <OptanteSimplesNacional>1</OptanteSimplesNacional>
          <IncentivadorCultural>2</IncentivadorCultural>
          <Status>1</Status>
          <Servico>
            <Valores>
              <ValorServicos>${valorFormatted}</ValorServicos>
              <ValorIss>${valorIss}</ValorIss>
              <Aliquota>${aliquotaFormatted}</Aliquota>
              <DescontoIncondicionado>0.00</DescontoIncondicionado>
              <DescontoCondicionado>0.00</DescontoCondicionado>
            </Valores>
            <ItemListaServico>${itemListaServico}</ItemListaServico>
            <CodigoTributacaoMunicipio>${itemListaServico}</CodigoTributacaoMunicipio>
            <Discriminacao><![CDATA[${discriminacao}]]></Discriminacao>
            <CodigoMunicipio>3106200</CodigoMunicipio>
          </Servico>
          <Prestador>
            <CpfCnpj><Cnpj>${cnpjPrestador}</Cnpj></CpfCnpj>
            <InscricaoMunicipal>${imPrestador}</InscricaoMunicipal>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>${docTag}</CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial><![CDATA[${tomadorNome}]]></RazaoSocial>${contatoTag}
          </Tomador>
        </InfRps>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`;
}

/**
 * Encapsula o XML do RPS no envelope SOAP para o endpoint BHISS Digital PBH.
 */
function buildSoapEnvelope(rpsXml: string): string {
  const escapedXml = rpsXml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:nfse="http://ws.bhiss.digital.pbh.gov.br/">
  <soapenv:Header/>
  <soapenv:Body>
    <nfse:RecepcionarLoteRps>
      <nfse:xml>${escapedXml}</nfse:xml>
    </nfse:RecepcionarLoteRps>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Faz o parse da resposta XML do WebService BHISS Digital PBH.
 * Suporta resposta síncrona (NFS-e gerada imediatamente) e
 * assíncrona (protocolo de lote para consulta futura).
 */
function parseBhissResponse(xmlText: string): {
  success: boolean;
  nfseNumber?: string;
  verificationCode?: string;
  protocol?: string;
  errorCode?: string;
  errorMessage?: string;
} {
  // Erros retornados pela prefeitura
  const listaMsgErroMatch = xmlText.match(/<ListaMensagemRetorno[\s\S]*?<\/ListaMensagemRetorno>/);
  if (listaMsgErroMatch) {
    const errorCodeMatch = listaMsgErroMatch[0].match(/<Codigo>(.*?)<\/Codigo>/);
    const errorMsgMatch = listaMsgErroMatch[0].match(/<Descricao>(.*?)<\/Descricao>/);
    const correcaoMatch = listaMsgErroMatch[0].match(/<Correcao>(.*?)<\/Correcao>/);
    const desc = errorMsgMatch?.[1]?.trim() || 'Erro retornado pela Prefeitura';
    const correcao = correcaoMatch?.[1]?.trim();
    return {
      success: false,
      errorCode: errorCodeMatch?.[1]?.trim(),
      errorMessage: correcao ? `${desc} — Correção: ${correcao}` : desc,
    };
  }

  // NFS-e gerada com sucesso (resposta síncrona)
  const nfseMatch = xmlText.match(/<Numero>(.*?)<\/Numero>/);
  const verifyMatch = xmlText.match(/<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/);

  if (nfseMatch && verifyMatch) {
    return {
      success: true,
      nfseNumber: nfseMatch[1]?.trim(),
      verificationCode: verifyMatch[1]?.trim(),
    };
  }

  // Resposta assíncrona: protocolo de lote recebido
  const protocolMatch = xmlText.match(/<NumeroProtocolo>(.*?)<\/NumeroProtocolo>/) ||
                        xmlText.match(/<Protocolo>(.*?)<\/Protocolo>/);
  if (protocolMatch) {
    const protocol = protocolMatch[1]?.trim();
    return {
      success: true,
      protocol,
      nfseNumber: `PROTOCOL-${protocol}`,
    };
  }

  return { success: false, errorMessage: 'Resposta não reconhecida do WebService BHISS Digital PBH' };
}

/**
 * Realiza a chamada SOAP ao WebService BHISS Digital da PBH.
 * Timeout: 30 segundos.
 */
async function callBhissDigital(params: {
  endpoint: string;
  pbhUser: string;
  pbhPass: string;
  rpsXml: string;
}): Promise<{
  success: boolean;
  nfseNumber?: string;
  verificationCode?: string;
  protocol?: string;
  rawResponse?: string;
  errorCode?: string;
  errorMessage?: string;
}> {
  const { endpoint, pbhUser, pbhPass, rpsXml } = params;

  const soapBody = buildSoapEnvelope(rpsXml);
  const authHeader = 'Basic ' + btoa(`${pbhUser}:${pbhPass}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '"RecepcionarLoteRps"',
        'Authorization': authHeader,
      },
      body: soapBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    const preview = responseText.slice(0, 3000); // Limitar log

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        errorMessage: `Autenticação rejeitada pelo WebService PBH (HTTP ${response.status}). Verifique PBH_NFSE_USER e PBH_NFSE_PASS.`,
        rawResponse: preview,
      };
    }

    if (!response.ok && response.status >= 500) {
      return {
        success: false,
        errorMessage: `Prefeitura retornou erro de servidor: HTTP ${response.status} ${response.statusText}`,
        rawResponse: preview,
      };
    }

    const parsed = parseBhissResponse(responseText);
    return { ...parsed, rawResponse: preview };

  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      errorMessage: isTimeout
        ? 'Timeout (30s): WebService PBH BHISS Digital não respondeu. Verifique disponibilidade.'
        : `Falha de conexão com o WebService PBH: ${err.message}`,
    };
  }
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Credenciais BHISS Digital PBH
  const PBH_CNPJ = Deno.env.get('PBH_NFSE_CNPJ') || '35035127000120';
  const PBH_IM = Deno.env.get('PBH_NFSE_IM') || ''; // Inscrição Municipal (obrigatória em produção)
  const PBH_USER = Deno.env.get('PBH_NFSE_USER') || PBH_CNPJ;
  const PBH_PASS = Deno.env.get('PBH_NFSE_PASS');
  const PBH_ENDPOINT = Deno.env.get('PBH_NFSE_ENDPOINT') || 'https://bhissdigital.pbh.gov.br/nfse/services/nfseSOAP';
  const NFSE_ENV = Deno.env.get('PBH_NFSE_ENV') || 'sandbox'; // 'sandbox' ou 'production'

  try {
    const body = await req.json();
    const {
      nfse_id,
      booking_id,
      inscricao_id,
      package_id,
      payment_id,
      action = 'emit',
      override_data,
      manual_nfse_number,
      correction_notes,
      corrected_by,
    } = body;

    console.log(`📥 emit-nfse | action=${action} | booking=${booking_id} | package=${package_id} | inscricao=${inscricao_id} | payment=${payment_id} | nfse_id=${nfse_id}`);

    // ─── AÇÃO ESPECIAL: Resolução Manual ───────────────────────────────────────
    if (action === 'mark_manual_resolved') {
      if (!nfse_id) {
        return new Response(
          JSON.stringify({ error: 'É necessário fornecer nfse_id para resolução manual' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedManual, error: manualErr } = await supabase
        .from('nfse_emissions')
        .update({
          status: 'manual_resolved',
          error_category: 'MANUAL_RESOLVED',
          emission_mode: 'manual',
          nfse_number: manual_nfse_number || `MANUAL-${Date.now().toString().slice(-6)}`,
          correction_notes: correction_notes || 'Emitida/Resolvida manualmente pelo operador no portal da PBH.',
          corrected_by: corrected_by || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nfse_id)
        .select()
        .single();

      if (manualErr) throw manualErr;

      return new Response(
        JSON.stringify({ success: true, message: 'NFS-e marcada como resolvida manualmente.', nfse: updatedManual }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── 1. Localização de Registro Existente ──────────────────────────────────
    let existingRecord: any = null;

    if (nfse_id) {
      const { data } = await supabase
        .from('nfse_emissions').select('*').eq('id', nfse_id).maybeSingle();
      existingRecord = data;
    }

    if (!existingRecord && (booking_id || inscricao_id || package_id || payment_id)) {
      let q = supabase.from('nfse_emissions').select('*');

      // FIX #4: Idempotência por coluna correta
      if (package_id) {
        q = q.eq('package_id', package_id); // coluna package_id (adicionada na migration)
      } else if (booking_id) {
        q = q.eq('booking_id', booking_id);
      } else if (inscricao_id) {
        q = q.eq('inscricao_id', inscricao_id);
      } else if (payment_id) {
        q = q.eq('payment_id', payment_id);
      }

      const { data: existingRecords } = await q;
      existingRecord = existingRecords?.find((r: any) => r.status === 'issued')
                    || existingRecords?.[0];
    }

    // Idempotência: já emitida com sucesso e não é retry explícito
    if (existingRecord && existingRecord.status === 'issued' && action !== 'retry' && action !== 'update_and_retry') {
      console.log(`ℹ️ Idempotência: NFS-e já emitida (Nº ${existingRecord.nfse_number}). Retornando registro.`);
      return new Response(
        JSON.stringify({ message: 'NFS-e já emitida anteriormente', idempotent: true, nfse: existingRecord }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── 2. Resolução de Dados — Tomador = Profissional (Opção B) ──────────────
    let amount = override_data?.valor_servico ? parseFloat(override_data.valor_servico) : 0;
    let tomadorNome = override_data?.tomador_nome || '';
    let tomadorEmail = override_data?.tomador_email || '';
    let tomadorDocument = cleanDocument(override_data?.tomador_cpf_cnpj);
    let discriminacao = override_data?.discriminacao || '';

    const targetBookingId = booking_id || existingRecord?.booking_id || null;
    const targetInscricaoId = inscricao_id || existingRecord?.inscricao_id || null;
    const targetPaymentId = payment_id || existingRecord?.payment_id || null;
    const targetPackageId = package_id || existingRecord?.package_id || null;

    // Busca dados da transação se não vieram via override
    if (!tomadorNome || !tomadorDocument || amount <= 0) {
      if (targetPackageId) {
        // Pacote de Sessões — Tomador = Profissional do pacote
        const { data: pkg } = await supabase
          .from('packages')
          .select('*, professional:professionals(name, cpf, cnpj, email)')
          .eq('id', targetPackageId)
          .maybeSingle();

        if (pkg) {
          if (amount <= 0) {
            const gross = pkg.gross_amount || 0;
            const repasse = pkg.professional_repasse_total || (gross * 0.60);
            amount = gross > 0 ? (gross - repasse) : 0;
            if (amount <= 0) amount = 30 * (pkg.total_sessions || 1);
          }
          if (!tomadorNome) tomadorNome = pkg.professional?.name || '';
          if (!tomadorEmail) tomadorEmail = pkg.professional?.email || '';
          if (!tomadorDocument) {
            tomadorDocument = cleanDocument(pkg.professional?.cnpj)
                           || cleanDocument(pkg.professional?.cpf);
          }
          if (!discriminacao) {
            discriminacao = `Licença de uso da plataforma Doxologos Psicologia — pacote de ${pkg.total_sessions || 1} sessão(ões). Item de serviço: 04.01 (Saúde Mental/Psicologia). Código BHISS PBH: 04.01.01.`;
          }
        }
      } else if (targetBookingId) {
        // Agendamento Individual — Tomador = Profissional da consulta
        const { data: booking } = await supabase
          .from('bookings')
          .select(`
            id, valor_consulta, valor_repasse_profissional,
            patient_name, booking_date,
            professional:professionals(name, cpf, cnpj, email)
          `)
          .eq('id', targetBookingId)
          .maybeSingle();

        if (booking) {
          if (amount <= 0) {
            const valorConsulta = booking.valor_consulta || 0;
            const repasse = booking.valor_repasse_profissional || (valorConsulta * 0.60);
            amount = valorConsulta > 0 ? (valorConsulta - repasse) : 0;
            if (amount <= 0) amount = 30;
          }
          if (!tomadorNome) tomadorNome = booking.professional?.name || '';
          if (!tomadorEmail) tomadorEmail = booking.professional?.email || '';
          if (!tomadorDocument) {
            tomadorDocument = cleanDocument(booking.professional?.cnpj)
                           || cleanDocument(booking.professional?.cpf);
          }
          if (!discriminacao) {
            discriminacao = `Licença de uso da plataforma Doxologos Psicologia — atendimento em ${booking.booking_date || ''}. Item de serviço: 04.01. Código BHISS PBH: 04.01.01.`;
          }
        }
      } else if (targetInscricaoId) {
        // Inscrição em Evento — Tomador = Profissional organizador do evento
        const { data: inscricao } = await supabase
          .from('inscricoes_eventos')
          .select(`
            id, patient_name,
            eventos(titulo, valor, platform_fee_type, platform_fee_value,
                    professional:professionals(name, cpf, cnpj, email))
          `)
          .eq('id', targetInscricaoId)
          .maybeSingle();

        if (inscricao) {
          const evento = inscricao.eventos;
          if (amount <= 0 && evento) {
            if (evento.platform_fee_type === 'percentage') {
              amount = evento.valor * (evento.platform_fee_value / 100);
            } else if (evento.platform_fee_type === 'fixed') {
              amount = evento.platform_fee_value;
            } else {
              amount = evento.valor * 0.10;
            }
            if (amount <= 0) amount = 10;
          }
          const prof = evento?.professional;
          if (!tomadorNome) tomadorNome = prof?.name || '';
          if (!tomadorEmail) tomadorEmail = prof?.email || '';
          if (!tomadorDocument) {
            tomadorDocument = cleanDocument(prof?.cnpj) || cleanDocument(prof?.cpf);
          }
          if (!discriminacao) {
            discriminacao = `Licença de uso da plataforma Doxologos para evento "${evento?.titulo || 'Workshop de Saúde Mental'}". Item de serviço: 04.01. Código BHISS PBH: 04.01.01.`;
          }
        }
      }
    }

    const currentRetryCount = (existingRecord?.retry_count || 0)
      + (action === 'retry' || action === 'update_and_retry' ? 1 : 0);

    // ─── 3. Validação ──────────────────────────────────────────────────────────
    let validationFailed = false;
    let validationErrorMessage = '';

    if (!tomadorDocument || (tomadorDocument.length !== 11 && tomadorDocument.length !== 14)) {
      validationFailed = true;
      validationErrorMessage = `CPF/CNPJ do profissional (tomador) inválido ou ausente: "${tomadorDocument || 'não informado'}". O profissional precisa ter CPF (11 dígitos) ou CNPJ (14 dígitos) cadastrado.`;
    } else if (amount <= 0) {
      validationFailed = true;
      validationErrorMessage = 'Valor do serviço (taxa de plataforma) deve ser maior que zero.';
    } else if (!tomadorNome) {
      validationFailed = true;
      validationErrorMessage = 'Nome do profissional (tomador) não pôde ser identificado.';
    }

    // ─── 4. FIX #1 — Registro SEMPRE gravado antes de retornar erro ────────────
    const baseRecord: any = {
      booking_id: targetBookingId,
      inscricao_id: targetInscricaoId,
      payment_id: targetPaymentId,
      package_id: targetPackageId,
      prestador_cnpj: PBH_CNPJ,
      tomador_cpf_cnpj: tomadorDocument || null,
      tomador_nome: tomadorNome || 'Profissional Não Identificado',
      tomador_email: tomadorEmail || null,
      valor_servico: amount > 0 ? amount : 0,
      aliquota_iss: 2.00,
      codigo_servico_bh: '04.01.01',
      discriminacao: discriminacao || 'Licença de uso da plataforma Doxologos Psicologia.',
      retry_count: currentRetryCount,
      last_retry_at: new Date().toISOString(),
      correction_notes: correction_notes || existingRecord?.correction_notes || null,
      corrected_by: corrected_by || existingRecord?.corrected_by || null,
      updated_at: new Date().toISOString(),
    };

    if (validationFailed) {
      console.warn(`⚠️ Validação NFS-e falhou: ${validationErrorMessage}`);

      const errorRecord = {
        ...baseRecord,
        status: 'error',
        error_category: 'VALIDATION_ERROR',
        error_message: validationErrorMessage,
        emission_mode: NFSE_ENV,
      };

      let savedRecord: any = null;

      if (existingRecord?.id) {
        const { data, error: updateErr } = await supabase
          .from('nfse_emissions').update(errorRecord).eq('id', existingRecord.id).select().single();
        if (updateErr) console.error('❌ Erro ao atualizar registro de erro:', updateErr);
        savedRecord = data;
      } else {
        const { data, error: insertErr } = await supabase
          .from('nfse_emissions').insert(errorRecord).select().single();
        if (insertErr) {
          console.error('❌ Erro ao inserir registro de erro de validação:', insertErr);
        }
        savedRecord = data;
      }

      console.log(`📋 Registro de erro gravado: id=${savedRecord?.id || 'falha'}`);

      return new Response(
        JSON.stringify({ error: validationErrorMessage, error_category: 'VALIDATION_ERROR', nfse: savedRecord }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── 5. Criar/atualizar com status 'processing' ANTES da chamada à PBH ────
    let activeNfseId = existingRecord?.id;
    const processingRecord = { ...baseRecord, status: 'processing', emission_mode: NFSE_ENV };

    if (activeNfseId) {
      await supabase.from('nfse_emissions').update(processingRecord).eq('id', activeNfseId);
    } else {
      const { data: created, error: insertErr } = await supabase
        .from('nfse_emissions').insert(processingRecord).select().single();
      if (insertErr) throw insertErr;
      activeNfseId = created.id;
    }

    console.log(`🧾 Processando NFS-e para ${tomadorNome} (${tomadorDocument}) — R$ ${amount.toFixed(2)} | id=${activeNfseId}`);

    // ─── 6. FIX #5 — Integração SOAP real com BHISS Digital PBH ────────────────
    let nfseNumber = '';
    let verificationCode = '';
    let xmlUrl = '';
    let pdfUrl = '';
    let rawResponse: any = {};
    let isSuccess = false;
    let errorMessage = '';
    let emissionMode = NFSE_ENV;

    const isSandbox = !PBH_PASS || NFSE_ENV !== 'production';

    if (isSandbox) {
      // ── Modo Sandbox ── Simulação local (sem chamada HTTP ao BHISS)
      console.warn('⚠️ [SANDBOX] Simulando emissão NFS-e. Configure PBH_NFSE_PASS e PBH_NFSE_ENV=production para emissão real.');
      emissionMode = 'sandbox';

      const sandboxNumber = `SANDBOX-${Date.now().toString().slice(-8)}`;
      const sandboxCode = `SBX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      nfseNumber = sandboxNumber;
      verificationCode = sandboxCode;
      pdfUrl = `https://bhissdigital.pbh.gov.br/nfse/sandbox/preview?num=${sandboxNumber}&cnpj=${PBH_CNPJ}`;
      xmlUrl = `https://bhissdigital.pbh.gov.br/nfse/sandbox/xml?num=${sandboxNumber}`;
      rawResponse = {
        environment: 'sandbox',
        warning: 'Emissão simulada — configure PBH_NFSE_ENV=production para emitir NFS-e reais no BHISS Digital PBH',
        tomadorDocument,
        amount,
      };
      isSuccess = true;

    } else {
      // ── Modo Produção ── Chamada real ao WebService BHISS Digital PBH
      emissionMode = 'production';
      console.log(`📡 [PRODUÇÃO] Conectando ao BHISS Digital PBH: ${PBH_ENDPOINT}`);

      if (!PBH_IM) {
        console.warn('⚠️ PBH_NFSE_IM (Inscrição Municipal) não configurada. Configure a variável de ambiente para evitar rejeição pela Prefeitura.');
      }

      // Número do RPS baseado em timestamp (deve ser sequencial em produção real)
      const rpsNumero = Date.now().toString().slice(-8);
      const rpsSerie = '1';
      const dataEmissao = new Date().toISOString().replace('Z', '').split('.')[0]; // Formato: 2026-09-02T21:00:00

      try {
        const rpsXml = buildRpsXml({
          cnpjPrestador: PBH_CNPJ,
          imPrestador: PBH_IM,
          rpsNumero,
          rpsSerie,
          dataEmissao,
          valorServico: amount,
          aliquotaIss: 2.00,
          itemListaServico: '0401',
          discriminacao,
          tomadorDoc: tomadorDocument,
          tomadorNome,
          tomadorEmail: tomadorEmail || '',
        });

        console.log(`📄 RPS construído: Número=${rpsNumero}, Série=${rpsSerie}, Valor=R$${amount.toFixed(2)}`);

        const bhissResult = await callBhissDigital({
          endpoint: PBH_ENDPOINT,
          pbhUser: PBH_USER,
          pbhPass: PBH_PASS!,
          rpsXml,
        });

        rawResponse = {
          rpsNumero,
          responsePreview: bhissResult.rawResponse,
          errorCode: bhissResult.errorCode,
          protocol: bhissResult.protocol,
        };

        if (bhissResult.success) {
          isSuccess = true;
          nfseNumber = bhissResult.nfseNumber || `PROT-${bhissResult.protocol}`;
          verificationCode = bhissResult.verificationCode || '';
          pdfUrl = `https://bhissdigital.pbh.gov.br/nfse/visualizarNota.jsf?numNota=${nfseNumber}&codVerificacao=${verificationCode}&cnpj=${PBH_CNPJ}`;
          xmlUrl = `https://bhissdigital.pbh.gov.br/nfse/downloadXML.jsf?numNota=${nfseNumber}&cnpj=${PBH_CNPJ}`;
          console.log(`✅ BHISS Digital PBH confirmou emissão da NFS-e #${nfseNumber}`);
        } else {
          isSuccess = false;
          errorMessage = bhissResult.errorMessage || 'Falha na comunicação com o WebService PBH';
          console.error(`❌ BHISS Digital rejeitou: código=${bhissResult.errorCode} | ${errorMessage}`);
        }

      } catch (wsError: any) {
        console.error('❌ Exceção ao chamar WebService PBH:', wsError);
        isSuccess = false;
        errorMessage = wsError.message || 'Falha de comunicação com o WebService da Prefeitura de Belo Horizonte.';
      }
    }

    // ─── 7. Atualização Final no Banco ─────────────────────────────────────────
    const finalErrorCategory = isSuccess ? null : classifyErrorCategory(errorMessage, rawResponse);

    const { data: updatedNfse, error: updateError } = await supabase
      .from('nfse_emissions')
      .update({
        status: isSuccess ? 'issued' : 'error',
        emission_mode: emissionMode,
        error_category: finalErrorCategory,
        error_message: isSuccess ? null : errorMessage,
        nfse_number: isSuccess ? nfseNumber : null,
        verification_code: isSuccess ? verificationCode : null,
        pdf_url: isSuccess ? pdfUrl : null,
        xml_url: isSuccess ? xmlUrl : null,
        raw_response: rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeNfseId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erro ao atualizar status final da NFS-e no banco:', updateError);
    }

    if (isSuccess) {
      console.log(`✅ NFS-e #${nfseNumber} processada com sucesso para ${tomadorNome} [${emissionMode}]`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Nota Fiscal Eletrônica emitida com sucesso [modo: ${emissionMode}]`,
          nfse: updatedNfse,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          error_category: finalErrorCategory,
          nfse: updatedNfse,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('❌ Exceção geral ao processar emissão de NFS-e:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Erro interno ao emitir NFS-e' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
