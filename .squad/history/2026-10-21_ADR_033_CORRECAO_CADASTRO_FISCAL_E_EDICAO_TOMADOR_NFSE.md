# ADR 033 — Correção de Cadastro Fiscal e Edição de Tomador no Módulo de NFS-e

**Data:** 2026-10-21  
**Status:** Aprovado e Implementado  
**Autores:** Orquestrador Doxologos / Squad de Engenharia  
**Contexto:** Resolução de inconsistências fiscais em transações pendentes de NFS-e decorrentes de CPF/CNPJ ausente ou inválido no perfil de profissionais de psicologia.

---

## 1. Contexto & Problema

Na arquitetura fiscal da Doxologos (Opção B - intermediação de serviços), a plataforma emite NFS-e perante a Secretaria Municipal da Fazenda (BHISS Digital) tendo como **tomador do serviço o profissional de psicologia** (referente à comissão/taxa de serviço da plataforma).

Após a implementação da listagem de transações pendentes de envio (ADR 032), identificou-se que:
1. **Dados Fiscais Faltantes no Cadastro:** Diversos psicólogos cadastrados possuíam `cpf: null` e `cnpj: null` na tabela `public.professionals`, gerando registros com a flag `⚠️ CPF/CNPJ Ausente`.
2. **Impossibilidade de Emissão e Rejeição Municipal:** O botão "Emitir NFS-e" tentava submeter o lote à PBH sem documento válido do tomador, gerando inevitável erro 400/rejeição no web service municipal.
3. **Ausência de Edição na Interface:** O administrador visualizava o registro como pendente, mas não possuía nenhum mecanismo na interface para preencher ou corrigir o CPF/CNPJ ou dados do tomador antes do disparo.
4. **Retrabalho N-para-1:** Um mesmo psicólogo possui frequentemente dezenas de consultas pendentes no período. Corrigir transação por transação causaria atrito severo e ineficiência operacional.

---

## 2. Decisões de Arquitetura

1. **Função Canônica de Atualização Fiscal (`updateTomadorFiscalData`):**
   - Implementada em `src/services/nfseService.js` consumindo o serviço canônico `professionalService.updateProfessional`.
   - Sanitiza estritamente documentos removendo caracteres não numéricos e valida o tamanho (11 dígitos para CPF ou 14 dígitos para CNPJ).
   - Ao persistir no registro do profissional (`public.professionals`), atualiza atomicamente o cadastro permanente.

2. **Propagação Cascata Imediata (1-Click Fix):**
   - Como todas as transações pendentes e históricas associam-se ao `professional_id`, salvar o CPF/CNPJ no perfil do psicólogo sana simultaneamente **todas as sessões pendentes passadas, presentes e futuras** daquele profissional em uma única ação.

3. **Interface Inteligente de Correção e Validação em Tempo Real (`NfseResilienceDashboard.jsx`):**
   - **Badges Interativos:** O chip `⚠️ CPF/CNPJ Ausente` tornou-se um botão clicável com indicador visual e tooltip, abrindo diretamente o modal de correção do profissional.
   - **Ação Rápida "Corrigir":** Adicionado botão `✏️ Corrigir` na coluna de Ações de cada registro pendente.
   - **Guarda Anti-Erro no Botão "Emitir":** Clicar em "Emitir NFS-e" em um registro sem documento intercepta a chamada antes do envio à PBH, alertando o usuário e abrindo o modal com aviso orientativo.
   - **Modal Unificado com Máscaras e Seletor CPF/CNPJ:**
     - Toggle dinâmico entre CPF (11 dígitos) e CNPJ (14 dígitos).
     - Formatação automática em tempo real (`000.000.000-00` / `00.000.000/0000-00`).
     - Feedback visual em tempo real: badge verde com contador de dígitos quando válido, âmbar quando incompleto.
     - Checkbox ativado por padrão: `Salvar no cadastro permanente do profissional (Recomendado)`.
     - Duplo fluxo de ação: `Salvar no Cadastro` (apenas valida e atualiza a tabela) ou `Salvar & Emitir NFS-e Agora` (valida, salva e já dispara a emissão para a PBH).

4. **Blindagem do Envio em Lote (`Batch Emission Shield`):**
   - O botão de lote agora contabiliza e exibe apenas transações com documentos fiscais válidos: `Emitir Validadas em Lote (${pendingWithValidDoc})`.
   - Alerta visual no topo informando quantas transações requerem saneamento prévio, prevenindo rejeições massivas na prefeitura.

---

## 3. Consequências & Impactos

- **Zero Rejeições Evitáveis na PBH:** Eliminação de erros 400 por campos obrigatórios de tomador vazios.
- **Eficiência Operacional:** O administrador corrige um psicólogo e automaticamente dezenas de pendências tornam-se aptas para envio imediato.
- **Conformidade com Guardrails Arquiteturais:** Sem mutações diretas ao Supabase na UI; consumo estrito da camada canônica de serviços (`nfseService` -> `professionalService`).
- **Testes Automatizados:** 5 novos testes unitários adicionados à suíte `nfseService.test.js` (totalizando 24 testes verdes no módulo fiscal).
