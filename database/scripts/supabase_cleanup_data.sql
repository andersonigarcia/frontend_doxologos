-- Reset application data while keeping the administrator account.
-- Execute this script in the Supabase SQL editor using a service role.
-- It removes business records from the public schema and purges auth rows for
-- every user except adm@doxologos.com.br.

BEGIN;

DO $cleanup$
DECLARE
    v_admin_id uuid;
    v_table text;
    v_fk record;
    v_admin_email constant text := 'adm@doxologos.com.br';
    v_public_tables constant text[] := ARRAY[
        'payment_refund_notifications',
        'payment_refund_audit_log',
        'payment_refunds',
        'financial_credits',
        'booking_reschedule_history',
        'payments',
        'inscricoes_eventos',
        'bookings',
        'eventos'
        --'reviews',        
        --'availability',
        --'blocked_dates',        
        --'services',
        --'professionals',
    ];
BEGIN
    SELECT id INTO v_admin_id
    FROM auth.users
    WHERE lower(email) = lower(v_admin_email)
    ORDER BY created_at
    LIMIT 1;

    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Admin user % not found in auth.users', v_admin_email;
    END IF;

    FOREACH v_table IN ARRAY v_public_tables LOOP
        IF EXISTS (
            SELECT 1
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename = v_table
        ) THEN
            EXECUTE format('DELETE FROM public.%I;', v_table);
        END IF;
    END LOOP;

    FOR v_fk IN
        SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
    LOOP
        EXECUTE format(
            'DELETE FROM public.%I WHERE %I <> %L;',
            v_fk.table_name,
            v_fk.column_name,
            v_admin_id
        );
    END LOOP;

    IF to_regclass('auth.identities') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.identities WHERE user_id <> %L;', v_admin_id);
    END IF;

    IF to_regclass('auth.mfa_amr_claims') IS NOT NULL AND to_regclass('auth.sessions') IS NOT NULL THEN
        EXECUTE format(
            'DELETE FROM auth.mfa_amr_claims WHERE session_id IN (
                SELECT id FROM auth.sessions WHERE user_id <> %L
            );',
            v_admin_id
        );
    END IF;

    IF to_regclass('auth.mfa_challenges') IS NOT NULL AND to_regclass('auth.mfa_factors') IS NOT NULL THEN
        EXECUTE format(
            'DELETE FROM auth.mfa_challenges WHERE factor_id IN (
                SELECT id FROM auth.mfa_factors WHERE user_id <> %L
            );',
            v_admin_id
        );
    END IF;

    IF to_regclass('auth.mfa_sessions') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.mfa_sessions WHERE user_id <> %L;', v_admin_id);
    END IF;

    IF to_regclass('auth.sessions') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.sessions WHERE user_id <> %L;', v_admin_id);
    END IF;

    IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.refresh_tokens WHERE user_id <> %L;', v_admin_id);
    END IF;

    IF to_regclass('auth.mfa_factors_totp') IS NOT NULL AND to_regclass('auth.mfa_factors') IS NOT NULL THEN
        EXECUTE format(
            'DELETE FROM auth.mfa_factors_totp WHERE factor_id IN (
                SELECT id FROM auth.mfa_factors WHERE user_id <> %L
            );',
            v_admin_id
        );
    END IF;

    IF to_regclass('auth.mfa_factors') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.mfa_factors WHERE user_id <> %L;', v_admin_id);
    END IF;

    IF to_regclass('auth.one_time_tokens') IS NOT NULL THEN
        EXECUTE format('DELETE FROM auth.one_time_tokens WHERE user_id <> %L;', v_admin_id);
    END IF;

    DELETE FROM auth.users
    WHERE id <> v_admin_id;

    RAISE NOTICE 'Cleanup completed. Admin user preserved with id %', v_admin_id;
END;
$cleanup$ LANGUAGE plpgsql;

COMMIT;
