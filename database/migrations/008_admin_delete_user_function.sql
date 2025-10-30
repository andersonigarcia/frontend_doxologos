-- Função para deletar usuário com CASCADE (apenas admin)
-- Execute este SQL no Supabase Dashboard > SQL Editor

CREATE OR REPLACE FUNCTION public.admin_delete_user(user_id_to_delete uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- A verificação de admin é feita na Edge Function
  -- Esta função apenas executa o delete com privilégios elevados
  
  -- 1. Deletar inscrições em eventos do usuário
  DELETE FROM public.inscricoes_eventos WHERE user_id = user_id_to_delete;
  
  -- 2. Deletar da tabela professionals (se for profissional)
  DELETE FROM public.professionals WHERE id = user_id_to_delete;
  
  -- 3. Deletar de auth.users (isso vai fazer CASCADE para outras tabelas relacionadas)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  -- Verificar se deletou
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Usuário deletado com sucesso'
  );
END;
$$;

-- Garantir que a função pode ser executada por usuários autenticados
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
