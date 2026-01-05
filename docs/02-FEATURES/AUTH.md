# 🔐 Autenticação e Recuperação de Senha

> **Status**: ✅ Implementado  
> **Provider**: Supabase Auth

---

## 📋 Funcionalidades

- ✅ Login com email/senha
- ✅ Registro de novos usuários
- ✅ Recuperação de senha
- ✅ Verificação de email
- ✅ Proteção de rotas
- ✅ Roles (admin/paciente/profissional)

---

## 🔧 Configuração

### Supabase Auth Settings

1. Acesse: https://supabase.com/dashboard/project/ppwjtvzrhvjinsutrjwk/auth/users
2. Configurar Site URL: `https://novo.doxologos.com.br`
3. Adicionar Redirect URLs:
   - `https://novo.doxologos.com.br/reset-password`
   - `https://novo.doxologos.com.br/area-do-paciente`

---

## 💻 Como Usar

### Registro

```javascript
import { supabase } from '@/lib/supabaseClient';

const signup = async (email, password, userData) => {
  // 1. Criar usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: userData.name,
        phone: userData.phone
      }
    }
  });

  if (authError) throw authError;

  // 2. Criar registro na tabela patients
  const { error: patientError } = await supabase.from('patients').insert({
    id: authData.user.id, // Mesmo ID do auth.users
    name: userData.name,
    email: email,
    phone: userData.phone,
    cpf: userData.cpf
  });

  if (patientError) throw patientError;

  return authData;
};
```

### Login

```javascript
const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  // Redirecionar baseado no role
  const role = data.user.user_metadata.role || 'patient';
  if (role === 'admin') {
    navigate('/admin/dashboard');
  } else {
    navigate('/area-do-paciente');
  }

  return data;
};
```

### Logout

```javascript
const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  navigate('/login');
};
```

### Recuperação de Senha

#### **1. Solicitar Reset**

```javascript
const requestPasswordReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });

  if (error) throw error;

  // Supabase envia email automaticamente
  alert('Email de recuperação enviado! Verifique sua caixa de entrada.');
};
```

#### **2. Página de Reset (`/reset-password`)**

```javascript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há token de reset na URL
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Token válido, permitir reset
      }
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      alert('Senha alterada com sucesso!');
      navigate('/login');
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleReset}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Nova senha"
        minLength={6}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Alterando...' : 'Alterar Senha'}
      </button>
    </form>
  );
};
```

### Proteção de Rotas

```javascript
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Verificar role se necessário
  if (requiredRole && user.user_metadata.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

// Uso em App.jsx
<Route path="/admin/*" element={
  <ProtectedRoute requiredRole="admin">
    <AdminDashboard />
  </ProtectedRoute>
} />
```

### Obter Usuário Atual

```javascript
const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Ou via hook
import { useEffect, useState } from 'react';

const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user };
};
```

---

## 📧 Email Templates

Supabase envia emails automaticamente para:

- **Confirmação de cadastro**: Verificar email
- **Recuperação de senha**: Link de reset (válido por 1h)

### Customizar Templates

1. Acesse: Auth → Email Templates
2. Editar HTML dos templates
3. Variáveis disponíveis:
   - `{{ .ConfirmationURL }}`
   - `{{ .Token }}`
   - `{{ .Email }}`
   - `{{ .SiteURL }}`

---

## 🔐 Segurança

### Row Level Security (RLS)

```sql
-- Pacientes só veem seus próprios dados
CREATE POLICY "Patients can view own data"
ON patients FOR SELECT
USING (auth.uid() = id);

-- Pacientes podem atualizar seus dados
CREATE POLICY "Patients can update own data"
ON patients FOR UPDATE
USING (auth.uid() = id);

-- Apenas admins podem ver todos
CREATE POLICY "Admins can view all"
ON patients FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

### Validação de Senha

```javascript
const validatePassword = (password) => {
  if (password.length < 6) {
    return 'Senha deve ter no mínimo 6 caracteres';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Senha deve conter ao menos uma letra maiúscula';
  }
  if (!/[0-9]/.test(password)) {
    return 'Senha deve conter ao menos um número';
  }
  return null; // Válida
};
```

---

## 🔧 Troubleshooting

### Email de reset não chega

**Verificar:**
1. Configuração SMTP no Supabase
2. Pasta de SPAM
3. Redirect URL configurado

### Token de reset inválido

**Causa:** Token expirou (1h)

**Solução:** Solicitar novo reset

### Usuário não consegue fazer login

**Verificar:**
1. Email confirmado (`email_confirmed_at` na tabela `auth.users`)
2. Senha correta
3. Conta não está desabilitada

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
