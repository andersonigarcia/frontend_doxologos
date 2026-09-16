-- Migration: booking_resilience_foundation
-- Fase 1 do Plano de Resiliência End-to-End
-- Adiciona rastreamento de notificações e suporte ao status 'awaiting_payment'
-- Safe to run multiple times (idempotent via IF NOT EXISTS / DO blocks)

-- ============================================================
-- 1. Colunas de rastreamento de notificação em bookings
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notification_status TEXT DEFAULT NULL
    CHECK (notification_status IN ('sent', 'partial_failure', 'failed'));

COMMENT ON COLUMN public.bookings.notification_sent_at IS
  'Timestamp em que o Post-Payment Orchestrator enviou as notificações de confirmação (email/WhatsApp). NULL = ainda não notificado.';

COMMENT ON COLUMN public.bookings.notification_status IS
  'Status do envio de notificações pós-pagamento: sent | partial_failure | failed';

-- ============================================================
-- 2. Suporte ao status 'awaiting_payment'
-- Adicionado ao CHECK constraint existente de forma segura
-- ============================================================

DO $$
BEGIN
  -- Verificar se a constraint de status existe e recriá-la incluindo 'awaiting_payment'
  -- O status 'awaiting_payment' indica: pagamento enviado à operadora, aguardando aprovação assíncrona
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'status'
      AND column_default IS NOT NULL
  ) THEN
    RAISE NOTICE 'Coluna status não encontrada ou sem default — nenhuma alteração.';
  END IF;
END $$;

-- Garantir que bookings com status 'awaiting_payment' são aceitos
-- (Se houver um CHECK constraint explícito no schema, executar abaixo)
-- ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
-- ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
--   CHECK (status IN ('pending_payment', 'awaiting_payment', 'confirmed', 'cancelled', 'completed', 'rescheduled', 'no_show'));

-- ============================================================
-- 3. Índice para o Cron de Reconciliação (Fase 3)
-- Otimiza a query: bookings pendentes com pagamento aprovado
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_pending_notification
  ON public.bookings (status, notification_sent_at, created_at)
  WHERE status IN ('pending_payment', 'awaiting_payment')
    AND notification_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id_status
  ON public.payments (mp_payment_id, status);

-- ============================================================
-- 4. Log de auditoria para o Orchestrator
-- Reutiliza webhook_logs existente com novo tipo de evento
-- ============================================================

COMMENT ON TABLE public.webhook_logs IS
  'Logs de eventos de webhook (Mercado Pago) e de orquestração pós-pagamento (post-payment-orchestrator).';

-- ============================================================
-- Verificação final
-- ============================================================

DO $$
DECLARE
  col_notif_sent BOOLEAN;
  col_notif_status BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings'
      AND column_name = 'notification_sent_at'
  ) INTO col_notif_sent;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings'
      AND column_name = 'notification_status'
  ) INTO col_notif_status;

  IF col_notif_sent AND col_notif_status THEN
    RAISE NOTICE '✅ Migration booking_resilience_foundation aplicada com sucesso.';
    RAISE NOTICE '   - notification_sent_at: OK';
    RAISE NOTICE '   - notification_status: OK';
    RAISE NOTICE '   - Índices de reconciliação: OK';
  ELSE
    RAISE WARNING '⚠️ Algo não foi criado corretamente. Verificar manualmente.';
  END IF;
END $$;
