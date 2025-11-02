# 🎫 Sistema de Eventos

> **Status**: ✅ Implementado  
> **Funcionalidade**: Inscrições em eventos/workshops

---

## 📋 Funcionalidades

- ✅ Criação de eventos pelo admin
- ✅ Inscrições de pacientes
- ✅ Pagamento integrado (PIX/Cartão)
- ✅ Emails de confirmação
- ✅ Controle de vagas
- ✅ Webhook Mercado Pago

---

## 🗄️ Estrutura do Banco

### Tabela: `eventos`

```sql
CREATE TABLE eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP NOT NULL,
  duracao_minutos INTEGER DEFAULT 60,
  valor DECIMAL(10,2) NOT NULL,
  vagas_totais INTEGER NOT NULL,
  vagas_disponiveis INTEGER NOT NULL,
  local TEXT,
  meeting_link TEXT,
  imagem_url TEXT,
  status TEXT DEFAULT 'ativo', -- ativo, cancelado, concluido
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tabela: `inscricoes_eventos`

```sql
CREATE TABLE inscricoes_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID REFERENCES eventos(id),
  patient_id UUID REFERENCES patients(id),
  status TEXT DEFAULT 'pendente', -- pendente, confirmado, cancelado
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 Como Usar

### Criar Evento

```javascript
const { data, error } = await supabase.from('eventos').insert({
  titulo: 'Workshop de Ansiedade',
  descricao: 'Técnicas para lidar com a ansiedade',
  data_evento: '2025-11-15T14:00:00',
  duracao_minutos: 120,
  valor: 50.00,
  vagas_totais: 30,
  vagas_disponiveis: 30,
  local: 'Online via Zoom'
});
```

### Inscrever Paciente

```javascript
// 1. Criar inscrição
const { data: inscricao } = await supabase.from('inscricoes_eventos').insert({
  evento_id: eventoId,
  patient_id: patientId,
  status: 'pendente'
}).select().single();

// 2. Redirecionar para checkout
navigate(`/checkout?inscricao_id=${inscricao.id}&type=evento&valor=${evento.valor}`);

// 3. Após pagamento aprovado → status: 'confirmado'
```

### Webhook MP (Eventos)

```typescript
// Edge Function: mp-webhook
if (payment.status === 'approved' && paymentRecord?.inscricao_id) {
  // Atualizar inscrição
  await supabase.from('inscricoes_eventos')
    .update({ 
      status: 'confirmado',
      payment_status: 'paid'
    })
    .eq('id', paymentRecord.inscricao_id);

  // Decrementar vaga
  await supabase.rpc('decrementar_vaga_evento', {
    evento_id: inscricao.evento_id
  });
}
```

---

## 📧 Emails

- **Confirmação de inscrição**: Após criar inscrição (pendente pagamento)
- **Pagamento aprovado**: Com link do Zoom (se online)
- **Lembrete**: 24h antes do evento

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
