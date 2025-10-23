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

### Erro: "Invalid login credentials"
- Verifique se o email está correto
- Confirme a senha (case-sensitive)
- Certifique-se de que o usuário foi criado

### Usuário não tem permissões
- Verifique se o `role` foi definido corretamente no `user_metadata`
- Para profissionais, confirme se existe entrada na tabela `professionals`

### Como redefinir senha
- Use a funcionalidade de reset de senha do Supabase
- Ou recrie o usuário através da interface