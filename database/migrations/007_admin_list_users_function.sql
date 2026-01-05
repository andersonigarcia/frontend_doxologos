-- Função para listar todos os usuários (apenas admin)
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- A verificação de admin é feita na Edge Function
  -- Esta função apenas busca os dados com privilégios elevados
  
  -- Buscar todos os usuários
  SELECT json_agg(
    json_build_object(
      'id', id,
      'email', email,
      'created_at', created_at,
      'last_sign_in_at', last_sign_in_at,
      'email_confirmed_at', email_confirmed_at,
      'user_metadata', raw_user_meta_data
    ) ORDER BY created_at DESC
  )
  INTO result
  FROM auth.users;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
