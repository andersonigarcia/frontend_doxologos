-- =====================================================
-- Função RPC: check_email_exists
-- Verifica se um email existe na tabela auth.users
-- =====================================================

-- Criar a função
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_count INTEGER;
BEGIN
  -- Normalizar email (lowercase e trim)
  email_to_check := LOWER(TRIM(email_to_check));
  
  -- Verificar se email existe na tabela auth.users
  SELECT COUNT(*)
  INTO email_count
  FROM auth.users
  WHERE LOWER(email) = email_to_check;
  
  -- Retornar true se existe, false se não existe
  RETURN email_count > 0;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.check_email_exists(TEXT) IS 
'Verifica se um email existe na tabela auth.users. Retorna true se existe, false caso contrário.';

-- Conceder permissão para usuários anônimos (necessário para o fluxo de agendamento)
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;

-- =====================================================
-- Testes
-- =====================================================

-- Teste 1: Email que existe (substitua por um email real do seu banco)
-- SELECT check_email_exists('usuario@exemplo.com');
-- Esperado: true

-- Teste 2: Email que não existe
-- SELECT check_email_exists('naoexiste@exemplo.com');
-- Esperado: false

-- Teste 3: Email com maiúsculas (deve normalizar)
-- SELECT check_email_exists('USUARIO@EXEMPLO.COM');
-- Esperado: true (se o email existir)

-- Teste 4: Email com espaços (deve fazer trim)
-- SELECT check_email_exists('  usuario@exemplo.com  ');
-- Esperado: true (se o email existir)
