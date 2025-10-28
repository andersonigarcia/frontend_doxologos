# 🔐 Usuários para Área Restrita - Doxologos

## 📋 Como criar usuários

### Opção 1: Interface Web (Recomendada)
Acesse: **http://localhost:3001/criar-usuarios**

Esta página permite criar usuários de forma fácil através de um formulário.

### Opção 2: Usuários de Exemplo

Para facilitar os testes, você pode usar estes usuários pré-configurados:

## 👤 Usuários de Teste

### 🛡️ Administrador
- **Email:** admin@doxologos.com
- **Senha:** admin123
- **Nome:** Administrador Sistema
- **Permissões:** Acesso completo ao sistema

### 👨‍⚕️ Profissional 1
- **Email:** dr.joao@doxologos.com  
- **Senha:** prof123
- **Nome:** Dr. João Silva
- **Especialidade:** Psicologia Clínica
- **Permissões:** Gestão de agendamentos e disponibilidade

### 👩‍⚕️ Profissional 2
- **Email:** dra.maria@doxologos.com
- **Senha:** prof123  
- **Nome:** Dra. Maria Santos
- **Especialidade:** Psicologia Organizacional
- **Permissões:** Gestão de agendamentos e disponibilidade

## 🚀 Como usar

1. **Acesse a área administrativa:** http://localhost:3001/admin
2. **Faça login** com um dos usuários acima
3. **Teste as funcionalidades** específicas de cada role

## 🔧 Funcionalidades por Role

### Administrador
- ✅ Visualizar todos os agendamentos
- ✅ Gerenciar profissionais
- ✅ Criar/editar serviços
- ✅ Gerenciar eventos
- ✅ Aprovar avaliações
- ✅ Configurar disponibilidade de qualquer profissional

### Profissional
- ✅ Visualizar seus agendamentos
- ✅ Gerenciar sua disponibilidade
- ✅ Bloquear datas
- ✅ Ver avaliações recebidas
- ✅ Atualizar informações pessoais

## 📝 Notas Importantes

- Os usuários são criados no Supabase Auth
- As permissões são baseadas no campo `role` no `user_metadata`
- Profissionais também têm entrada na tabela `professionals`
- Senhas devem ter pelo menos 6 caracteres

## 🆘 Solução de Problemas

### Erro: "Credenciais inválidas" ou "Email ou senha incorretos"
- Verifique se o email está correto (sem espaços extras)
- Confirme a senha (diferencia maiúsculas de minúsculas)
- Certifique-se de que o usuário foi criado no sistema
- Após 5 tentativas falhas, aguarde alguns minutos antes de tentar novamente

### Erro: "Email já cadastrado"
- Este email já possui uma conta no sistema
- Use a funcionalidade "Esqueci minha senha" para recuperar o acesso
- Ou faça login normalmente se já possui a senha

### Erro: "Email não confirmado"
- Verifique sua caixa de entrada (e spam) para o email de confirmação
- Solicite um novo email de confirmação se necessário

### Usuário não tem permissões
- Verifique se o `role` foi definido corretamente no `user_metadata`
- Para profissionais, confirme se existe entrada na tabela `professionals`

### Como redefinir senha
- Use a funcionalidade de reset de senha do Supabase
- Ou recrie o usuário através da interface