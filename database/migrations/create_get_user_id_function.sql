-- Função RPC para buscar user_id pelo email
-- Execute este SQL no Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    found_user_id UUID;
BEGIN
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
    
    RETURN found_user_id;
END;
$$;

-- Garantir que a função pode ser chamada publicamente
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_id_by_email(TEXT) TO authenticated;
