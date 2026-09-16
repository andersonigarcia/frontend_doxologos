-- =================================================================================
-- Configuração do PG_CRON para Supabase Edge Functions (Lembretes)
-- =================================================================================
-- Certifique-se de habilitar a extensão pg_cron e a extensão pg_net 
-- no seu banco de dados Supabase antes de rodar este script.
-- 
-- Você precisará substituir a URL_DO_SEU_PROJETO pelo domínio da sua Supabase
-- e a SUA_ANON_KEY pela anon key pública do seu projeto.
-- =================================================================================

-- 1. Habilitar extensões necessárias (se ainda não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. CRON JOB: Lembrete de 24 horas e Resumo do Profissional
-- Frequência: Todos os dias às 06:00 da manhã (UTC)
SELECT cron.schedule(
  'lembretes-24h',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url:='https://URL_DO_SEU_PROJETO.supabase.co/functions/v1/send-24h-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb
    );
  $$
);

-- 3. CRON JOB: Lembrete de 2 horas (Profissional e Paciente)
-- Frequência: A cada 15 minutos
SELECT cron.schedule(
  'lembretes-2h',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url:='https://URL_DO_SEU_PROJETO.supabase.co/functions/v1/send-2h-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb
    );
  $$
);

-- 4. CRON JOB: Retentativa Automática de NFS-e com Falhas Recuperáveis
-- Frequência: A cada 30 minutos
-- Categorias: PREFEITURA_OFFLINE e SYSTEM_ERROR (falhas temporárias do WebService PBH)
-- Máx. 10 registros por execução | Máx. 3 tentativas por registro
SELECT cron.schedule(
  'retry-failed-nfse',
  '*/30 * * * *',
  $$
    SELECT net.http_post(
      url:='https://URL_DO_SEU_PROJETO.supabase.co/functions/v1/retry-failed-nfse',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
      body:='{"limit": 10, "max_retries": 3}'::jsonb
    );
  $$
);

-- 5. CRON JOB: Reconciliação de Pagamentos Pendentes (Safety Net)
-- Frequência: A cada 10 minutos
-- Detecta bookings em pending_payment/awaiting_payment com pagamento aprovado no MP
-- Controlado por variável de ambiente RECONCILIATION_CRON=true na Edge Function
-- ATIVAR: após deploy da função reconcile-pending-bookings e configuração das env vars
SELECT cron.schedule(
  'reconcile-pending-bookings',
  '*/10 * * * *',
  $$
    SELECT net.http_post(
      url:='https://URL_DO_SEU_PROJETO.supabase.co/functions/v1/reconcile-pending-bookings',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb
    );
  $$
);

-- =================================================================================
-- GERENCIAMENTO: cancelar cron jobs se necessário
-- =================================================================================
-- SELECT cron.unschedule('lembretes-24h');
-- SELECT cron.unschedule('lembretes-2h');
-- SELECT cron.unschedule('retry-failed-nfse');
-- SELECT cron.unschedule('reconcile-pending-bookings');  -- safety net
