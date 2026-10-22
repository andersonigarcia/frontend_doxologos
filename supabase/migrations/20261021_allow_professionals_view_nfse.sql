-- =====================================================================
-- MIGRATION: Permitir que Profissionais visualizem NFS-e de suas consultas
-- Data: 2026-10-21
-- Contexto: Gated Execution - Correção de Visibilidade do Faturamento do Psicólogo
-- =====================================================================

DROP POLICY IF EXISTS "Profissionais podem visualizar suas próprias NFS-e" ON public.nfse_emissions;

CREATE POLICY "Profissionais podem visualizar suas próprias NFS-e"
    ON public.nfse_emissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.professionals p ON p.id = b.professional_id
            WHERE b.id = nfse_emissions.booking_id
            AND p.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.inscricoes_eventos ie
            JOIN public.eventos ev ON ev.id = ie.evento_id
            JOIN public.professionals p ON p.id = ev.professional_id
            WHERE ie.id = nfse_emissions.inscricao_id
            AND p.user_id = auth.uid()
        )
    );

COMMENT ON POLICY "Profissionais podem visualizar suas próprias NFS-e" ON public.nfse_emissions IS
'Permite que profissionais autenticados visualizem emissões fiscais vinculadas aos seus agendamentos e eventos na tela de Faturamento Mensal.';
