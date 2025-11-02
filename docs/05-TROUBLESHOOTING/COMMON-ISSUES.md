# 🔧 Problemas Comuns

> **Guia rápido de solução de problemas**

---

## 🚫 Build / Desenvolvimento

### Erro: "Cannot find module"

**Causa:** Dependência não instalada ou node_modules corrompido

**Solução:**
```powershell
# Limpar e reinstalar
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Erro: "Port 3000 already in use"

**Solução:**
```powershell
# Encontrar processo
netstat -ano | findstr :3000

# Matar processo (substituir PID)
taskkill /PID <PID> /F

# Ou mudar porta
npm run dev -- --port 3001
```

### Build muito lento

**Solução:**
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
```

---

## 🔐 Autenticação

### "Session expired" constantemente

**Causa:** Token expirado ou configuração incorreta

**Solução:**
```javascript
// Refresh session automaticamente
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        console.log('Session refreshed');
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

### Não consegue fazer login

**Verificar:**
1. Email confirmado (`email_confirmed_at` em `auth.users`)
2. Senha correta
3. RLS habilitado na tabela
4. Console do browser (F12) para erros

---

## 🗄️ Banco de Dados

### "permission denied for table"

**Causa:** Row Level Security bloqueando acesso

**Solução:**
```sql
-- Ver policies existentes
SELECT * FROM pg_policies WHERE tablename = 'bookings';

-- Adicionar policy de leitura
CREATE POLICY "Allow read for authenticated users"
ON bookings FOR SELECT
USING (auth.role() = 'authenticated');
```

### Query muito lenta

**Solução:**
```sql
-- Criar índice
CREATE INDEX idx_bookings_patient_id ON bookings(patient_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- Verificar explain
EXPLAIN ANALYZE SELECT * FROM bookings WHERE patient_id = 'uuid';
```

---

## 🌐 Deploy

### Assets não carregam (404)

**Causa:** Base path incorreto

**Solução:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/novo/', // ⚠️ Para Hostinger
});
```

### CSS não aplicado

**Verificar:**
1. Build gerado (`npm run build`)
2. `.htaccess` configurado
3. MIME types corretos

**Solução .htaccess:**
```apache
<IfModule mod_mime.c>
  AddType text/css .css
  AddType application/javascript .js
</IfModule>
```

---

## 📱 UI / UX

### Componente não atualiza

**Causa:** Estado não atualizado corretamente

**Solução:**
```javascript
// ❌ Errado (mutação direta)
state.push(newItem);

// ✅ Correto (novo objeto)
setState([...state, newItem]);
```

### Scroll travado

**Solução:**
```css
/* Verificar overflow */
body {
  overflow-x: hidden;
  overflow-y: auto;
}
```

---

## 🔄 Performance

### Página carrega devagar

**Checklist:**
- [ ] Imagens otimizadas (WebP, lazy loading)
- [ ] Code splitting habilitado
- [ ] Cache configurado
- [ ] Gzip habilitado

**Solução:**
```javascript
// Lazy loading de componentes
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

<Suspense fallback={<Loading />}>
  <AdminDashboard />
</Suspense>
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
