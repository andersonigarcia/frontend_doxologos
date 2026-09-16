# 🚨 ESTEIRA 4: INCIDENT RESPONSE (Hotfix & Crises em Produção)

## 🎯 Aplicabilidade
Esta esteira é ativada em **Emergências e Incidentes de Produção** (Ex: PagerDuty). Casos de uso:
- Checkout Mercado Pago fora do ar, gerando erros de pagamento.
- Falha na emissão de salas Zoom ou disparo de E-mails transacionais (pacientes não recebem link).
- Queda geral de disponibilidade, vazamento de PII ou violação de RLS.
- Bugs graves introduzidos na última release.

---

## 🚀 Fluxo de Sobrevivência (Contenção e Resolução)

```mermaid
flowchart TD
    A["1. Platform & SRE (Contenção / Rollback)"] --> B["2. Tech Lead (Diagnóstico Silencioso)"]
    B --> C["3. Fullstack Dev (Hotfix)"]
    C --> D["4. QA (Validação do Fix)"]
    D --> E["5. Product Lead (Post-Mortem / ADR)"]
```

### **Passo 1: Contenção de Danos (Platform & Security)**
- *Ação Imediata:* Desativar a feature afetada via Feature Flag ou preparar o rollback de versão sem alterar código impulsivamente.
- O objetivo número 1 é estancar a perda financeira e de dados.

### **Passo 2: Diagnóstico Silencioso (Tech Lead)**
- *Regra de Ouro:* **Não adivinhar.** Analisar os logs (Supabase Dashboard, Hostinger, painel Mercado Pago) de forma empírica.
- Identificar a causa raiz (Root Cause) antes de qualquer proposição de código.

### **Passo 3: Desenvolvimento do Hotfix (Fullstack Dev)**
- Escrever o patch de correção focando exclusivamente em resolver a falha. Proibido introduzir novas features ou refatorações maiores neste momento (manter o pull request mínimo).

### **Passo 4: Validação Rigorosa (QA)**
- Executar `npm run squad:check` e garantir que o hotfix corrige o bug sem quebrar dependências (100% Backward Compatible).

### **Passo 5: Blameless Post-Mortem (Product Lead)**
- Documentar em `03_SQUAD_MEMORY.md`: Qual foi o impacto? Como resolvemos? Como garantimos (testes/alarmes) que nunca mais vai acontecer?
