# 📋 Roteiro de Testes Exploratórios de QA — Doxologos Health-Tech
**Período de Atualizações Avaliadas:** 28 de Setembro de 2026 até 24 de Outubro de 2026  
**Versão da Plataforma:** v3.2 (Clean Analytics & Elite Operacional)  
**Público-Alvo:** Equipe de Qualidade de Software (QA / Testes)  
**Objetivo:** Permitir a execução autônoma, completa e padronizada de testes exploratórios e funcionais em todas as novidades e correções entregues no período, sem necessidade de suporte técnico ou auxílio de desenvolvedores.

---

## 🛠️ 1. Orientações Preliminares & Dados de Teste

### 1.1 Perfis de Acesso & Credenciais Necessárias
Para cobrir todos os cenários, o QA precisará de contas com os 3 perfis da plataforma:
1. **Administrador (`admin`):** Acesso total a `/admin`, `/admin/dashboard`, `/admin/pagamentos`, `/admin/usuarios`.
2. **Profissional / Psicólogo (`professional`):** Acesso a `/profissional` (Cockpit de Agenda, Prontuários, Horários) e `/faturamento-mensal`.
3. **Paciente (`patient`):** Acesso a `/area-do-paciente`, `/minhas-inscricoes` e fluxos de agendamento.
4. **Perfil Híbrido (`professional` + `patient`):** Usuário com ambos os papéis atribuídos para testar a alternância dinâmica.

*(Em ambiente de Desenvolvimento/Staging, provisione ou utilize a página temporária `/criar-usuarios`).*

---

### 1.2 Dados Oficiais de Teste — Sandbox Mercado Pago
Utilize estes dados no checkout quando testar pagamentos com cartão:

| Bandeira | Número do Cartão | Validade | CVV | Nome do Titular (Status Simulado) | CPF do Titular |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mastercard** | `5480 8328 0103 3311` | `11/30` | `123` | **`APRO Teste`** (Aprovado) | `123.456.789-09` |
| **Visa** | `4235 6477 2802 5682` | `11/30` | `123` | **`OTHE Teste`** (Recusado Geral) | `123.456.789-09` |
| **Mastercard** | `5480 8328 0103 3311` | `11/30` | `123` | **`CONT Teste`** (Em Análise / Pendente) | `123.456.789-09` |
| **Mastercard** | `5480 8328 0103 3311` | `11/30` | `123` | **`FUND Teste`** (Saldo Insuficiente) | `123.456.789-09` |

*Para testes com PIX:* Qualquer transação em Sandbox gera QR Code dinâmico e código "Copia e Cola" válido para visualização.

---

## 🧪 2. Matriz de Cenários de Teste

---

### MÓDULO 1: Agendamento, Mobile CRO & Checkout Seguro

#### Cenário 1.1 — Fluxo de Agendamento em 5 Etapas & Truncagem de Horário (Anti-Bug Postgres 22001)
* **Breve Descrição:** Novo fluxo de agendamento com ordenação inteligente de psicólogos, visualização de disponibilidade imediata ("Disponível Hoje" / "Amanhã"), deep-links e normalização estrita de horários (`HH:mm`, 5 caracteres).
* **O que será validado:**
  1. Badges e ordenação correta de profissionais disponíveis primeiro.
  2. Seleção de data e horário sem erro de schema no banco (resolução do erro 22001).
  3. Preenchimento de dados do paciente com indicador visual de força de senha.
  4. Exibição e obrigatoriedade do Termo de Consentimento (TCLE).
* **Passo a Passo para Testar:**
  1. Acesse `/agendamento` em aba anônima (ou deslogado).
  2. Na **Etapa 1 (Profissional)**, observe os profissionais listados. Verifique se os psicólogos com horários mais próximos aparecem no topo com badge verde ("Disponível Hoje") ou azul ("Disponível Amanhã").
  3. Clique em "Selecionar" em um profissional.
  4. Na **Etapa 2 (Data e Horário)**, escolha um dia disponível no calendário e selecione um horário (ex: `14:00`).
  5. Avance para a **Etapa 3 (Identificação)**. Digite nome, e-mail, WhatsApp com DDD e crie uma senha. Observe o indicador de força de senha mudando de cor conforme a complexidade.
  6. Na **Etapa 4 (Resumo & TCLE)**, marque o checkbox de concordância com os Termos e Políticas da clínica.
  7. Clique em "Ir para o Pagamento".
* **Resultado Esperado:** O agendamento é registrado no banco com status `pending_payment`, o horário é salvo com exatamente 5 dígitos (ex: `14:00`, sem segundos), e o usuário é redirecionado para a tela `/checkout` com o resumo da sessão preservado.

---

#### Cenário 1.2 — Checkout Mobile & Experiência PIX / Cartão (ADR 002 & ADR 018)
* **Breve Descrição:** Experiência de checkout otimizada para dispositivos móveis com barra sticky de ação inferior, QR Code PIX ampliado (≥ 200px) e formulário seguro de cartão.
* **O que será validado:**
  1. Exibição da barra sticky fixa no rodapé em telas mobile/reduzidas (< 768px).
  2. Geração e renderização nítida do QR Code PIX (mínimo de 200px) e funcionamento do botão "Copiar Código".
  3. Processamento de cartão com status aprovado (`APRO`), pendente (`CONT`) e recusado (`OTHE`).
  4. Redirecionamento correto para `/checkout/success`, `/checkout/pending` ou `/checkout/failure`.
* **Passo a Passo para Testar:**
  1. Abra as Ferramentas do Desenvolvedor (F12) e ative a emulação mobile (ex: iPhone 14 ou Galaxy S20).
  2. Acesse `/checkout` (com um agendamento pendente ativo).
  3. Verifique se no rodapé da tela mobile surge uma **barra fixa (sticky)** com o valor total e o botão de confirmação.
  4. Selecione a aba **PIX**:
     - Observe o QR Code exibido. Ele deve ser amplo e legível (≥ 200px).
     - Clique em "Copiar Código PIX". Um toast verde deve confirmar "Código PIX copiado!".
  5. Mude para a aba **Cartão de Crédito**:
     - Preencha com o cartão Mastercard de teste (`5480 8328 0103 3311`, validade `11/30`, CVV `123`).
     - No campo "Nome do Titular", digite `APRO Teste`.
     - Clique no botão de pagar.
* **Resultado Esperado:** A transação é processada e o usuário é encaminhado para `/checkout/success`, exibindo confirmação do agendamento, link da sala de consulta e orientações de preparo. Ao testar com `OTHE Teste`, a tela deve permanecer amigável em `/checkout/failure` com opção de tentar novamente.

---

### MÓDULO 2: Área do Paciente & Meu Acompanhamento Seguro

#### Cenário 2.1 — Portal do Paciente & Cancelamento com Regra 24h
* **Breve Descrição:** Painel de autocuidado do paciente com visualização de consultas marcadas, sala de espera e cancelamento seguro de agendamentos.
* **O que será validado:**
  1. Listagem correta de consultas futuras e passadas.
  2. Botão de cancelamento respeitando a trava de 24 horas de antecedência.
  3. Acesso à Sala de Espera da teleconsulta.
* **Passo a Passo para Testar:**
  1. Faça login como paciente em `/area-do-paciente`.
  2. Localize um agendamento futuro:
     - Se a consulta estiver marcada para **mais de 24 horas**, clique no botão "Cancelar Consulta". Confirme o modal.
     - Se a consulta estiver marcada para **menos de 24 horas**, tente cancelar.
  3. Para uma consulta do dia, clique em "Entrar na Sala de Espera".
* **Resultado Esperado:** 
  - Consultas com > 24h são canceladas com sucesso, liberando crédito na carteira ou estorno conforme política.
  - Consultas com < 24h bloqueiam o cancelamento direto ou alertam sobre a política de cancelamento tardio.
  - A rota `/sala-espera/:id` abre a sala com contagem regressiva e link Google Meet seguro.

---

#### Cenário 2.2 — Aba "Meu Acompanhamento" & Blindagem de Prontuário (LGPD / CFP)
* **Breve Descrição:** Visualização das tarefas terapêuticas de casa (`homework`) autorizadas pelo psicólogo, com blindagem absoluta de dados diagnósticos.
* **O que será validado:**
  1. O paciente visualiza APENAS as tarefas onde o psicólogo ativou o compartilhamento.
  2. Campos confidenciais de prontuário (Queixa Principal, Hipótese Diagnóstica, Anamnese) JAMAIS aparecem na tela nem na aba Network do navegador.
* **Passo a Passo para Testar:**
  1. Certifique-se de que o psicólogo realizou uma sessão de teste e preencheu o prontuário ativando *"Liberar visualização desta tarefa para o paciente"* (vide Módulo 3).
  2. Como paciente, acesse `/area-do-paciente` e clique na aba **"Meu Acompanhamento"**.
  3. Abra as Ferramentas do Desenvolvedor (F12) na aba **Network** e filtre por `patient_notes` ou requisições Supabase.
  4. Analise a tela e o JSON de resposta retornado pela API.
* **Resultado Esperado:** Na tela, o paciente visualiza uma *timeline* acolhedora contendo a data da sessão e a descrição da tarefa de casa. No JSON da requisição, campos sigilosos como `chief_complaint` e `development` vêm nulos ou ausentes (garantido por RLS no banco).

---

### MÓDULO 3: Painel do Profissional, Cockpit da Agenda & Prontuários

#### Cenário 3.1 — Cockpit da Agenda & Sincronização de Calendário (`.ics` / Google)
* **Breve Descrição:** Nova central operacional do psicólogo (`ProfessionalScheduleCockpit`) com radar 48h, atendimentos do dia, navegação rápida (Hoje/Ontem/Amanhã) e exportação de calendário.
* **O que será validado:**
  1. Carregamento correto das consultas do dia ativo com cálculo imediato de honorários a receber.
  2. Navegação entre dias (Hoje, Ontem, Amanhã).
  3. Exportação de eventos para o Google Calendar e download de arquivo `.ics` (Apple Calendar/Outlook).
* **Passo a Passo para Testar:**
  1. Faça login como profissional e acesse `/profissional`.
  2. No topo do painel, visualize o componente **"Cockpit da Agenda"**:
     - Confira se os números do dia (Total de Sessões e Previsão de Repasse) batem com os cards listados.
     - Clique nos botões "Ontem" e "Amanhã" e confira a troca dinâmica das sessões.
  3. Clique no botão de **Sincronização de Calendário** (ícone de calendário / exportar):
     - Escolha "Adicionar ao Google Agenda" (deve abrir nova aba no Google Calendar com data, horário e título pré-preenchidos).
     - Escolha "Baixar arquivo .ICS" (deve baixar o arquivo `.ics` com os compromissos).
* **Resultado Esperado:** O cockpit exibe os dados em tempo real, sem delay perceptível. O arquivo `.ics` é baixado com sucesso e abre no calendário nativo do sistema operacional.

---

#### Cenário 3.2 — Prontuário Clínico, Toggle de Sigilo & Timer de Sessão
* **Breve Descrição:** Modal de evolução clínica com cronômetro de consulta, registro S.O.A.P., triagem GAD-7 e controle de compartilhamento de tarefas (correção do erro 400).
* **O que será validado:**
  1. Abertura do modal de prontuário a partir de um agendamento do paciente.
  2. Funcionamento do timer de sessão (50 min / 45 min).
  3. Salvar prontuário sem erro 400 (validação do contrato `action: 'save'`).
  4. Toggle de liberação de tarefas de casa para o paciente.
* **Passo a Passo para Testar:**
  1. No painel `/profissional`, clique no botão **"Prontuário"** em um card de consulta.
  2. Observe o **Timer de Sessão** no topo do modal (inicia e contabiliza o tempo decorrido).
  3. Preencha os campos clínicos:
     - Queixa Principal: `"Paciente relata ansiedade situacional."`
     - Evolução / Desenvolvimento: `"Trabalhada reestruturação cognitiva."`
     - Tarefas / Dever de Casa: `"Praticar técnica de respiração diafragmática 2x ao dia."`
  4. Localize o switch/toggle: *"Liberar visualização desta tarefa para o paciente"*.
     - Ative o toggle (cor verde).
  5. Clique em **"Salvar Prontuário"**.
* **Resultado Esperado:** Um toast de sucesso confirma o salvamento. Nenhuma mensagem de erro 400 aparece no console. O histórico do paciente é atualizado imediatamente.

---

#### Cenário 3.3 — Reagendamento Rápido da Próxima Sessão (`ScheduleNextSessionModal`)
* **Breve Descrição:** Modal rápido de retenção que permite ao psicólogo já agendar o retorno do paciente ao encerrar a sessão.
* **O que será validado:**
  1. Abertura do modal de reagendamento com os dados do paciente já preenchidos.
  2. Seleção de nova data/horário respeitando a disponibilidade do psicólogo.
  3. Gravação da nova sessão no sistema.
* **Passo a Passo para Testar:**
  1. No card da consulta finalizada em `/profissional`, clique em **"Agendar Próxima Sessão"**.
  2. Escolha uma data na semana seguinte e um horário vago.
  3. Confirme o agendamento.
* **Resultado Esperado:** O novo agendamento é criado no sistema, aparecendo no radar de 48h/calendário do profissional e na lista de próximas consultas do paciente.

---

#### Cenário 3.4 — Demonstrativo de Faturamento & Exportação Carnê-Leão
* **Breve Descrição:** Tela de honorários com exportação do Livro-Caixa no formato padrão da Receita Federal (CBO 2515-10 de Psicólogo Clínico).
* **O que será validado:**
  1. Exibição correta do total de honorários e repasses por mês.
  2. Download do arquivo CSV no padrão Carnê-Leão (UTF-8 com BOM).
  3. Consulta de NFS-e emitida para o profissional.
* **Passo a Passo para Testar:**
  1. No menu do profissional, acesse `/faturamento-mensal`.
  2. Selecione o mês de referência desejado.
  3. Clique no botão **"Exportar para Carnê-Leão (Receita Federal)"**.
  4. Abra o arquivo baixado em um editor de texto ou Excel.
* **Resultado Esperado:** O arquivo é baixado no formato CSV, formatado em UTF-8 com BOM (caracteres com acento não ficam corrompidos no Excel), contendo as colunas exigidas pelo Carnê-Leão com o código CBO `2515-10`.

---

### MÓDULO 4: Autenticação Híbrida & Dual-Role RBAC (ADR 005 & ADR 012)

#### Cenário 4.1 — Alternância Dinâmica de Perfil (Profissional ↔ Paciente)
* **Breve Descrição:** Suporte a contas com duplo papel sem necessidade de logout para trocar de visão.
* **O que será validado:**
  1. O componente `UserBadge` no cabeçalho exibe o alternador de contexto para usuários com perfis múltiplos.
  2. Acesso dinâmico entre `/profissional` e `/area-do-paciente`.
  3. Redirecionamento seguro caso o usuário tente acessar uma tela sem permissão.
* **Passo a Passo para Testar:**
  1. Faça login com um usuário híbrido (que possua as roles `professional` e `patient` em `app_metadata`).
  2. Observe o badge de perfil no topo direito do header:
     - Clique no badge e selecione "Mudar para Visão de Paciente".
     - O sistema deve redirecionar para `/area-do-paciente` sem deslogar.
     - Clique novamente e selecione "Mudar para Visão de Profissional".
     - O sistema redireciona de volta para `/profissional`.
  3. Tente forçar na barra de endereços a URL `/admin`.
* **Resultado Esperado:** A alternância entre perfis de paciente e profissional ocorre em tempo real mantendo a sessão ativa. A tentativa de acessar `/admin` é bloqueada ou redirecionada amigavelmente, pois o usuário não possui a role `admin`.

---

### MÓDULO 5: Ferramentas Psicométricas & Captura de Leads com Antifraude (ADR 025)

#### Cenário 5.1 — Aplicação do Questionário GAD-7 & Cálculo de Score
* **Breve Descrição:** Central de ferramentas clínicas (`/ferramentas`, `/teste-ansiedade-gad7`) com preenchimento intuitivo e cálculo dinâmico de gravidade.
* **O que será validado:**
  1. Navegação fluida pelas 7 perguntas da escala de ansiedade GAD-7.
  2. Cálculo preciso da pontuação total (0 a 21 pontos) e classificação de risco (Mínima, Leve, Moderada, Severa).
* **Passo a Passo para Testar:**
  1. Acesse `/teste-ansiedade-gad7`.
  2. Responda a todas as 7 perguntas marcando opções variadas (ex: "Vários dias", "Mais da metade dos dias").
  3. Ao responder a última pergunta, avance para a tela de resultado/captura de lead.
* **Resultado Esperado:** O score é calculado de forma precisa, apresentando a faixa de ansiedade correspondente com linguagem acolhedora e sem promessas de cura (conformidade CFP).

---

#### Cenário 5.2 — Validação Antifraude Rigorosa no Formulário de Lead (`leadValidator.js`)
* **Breve Descrição:** Blindagem contra leads falsos, números fictícios e e-mails descartáveis, protegendo a reputação de envio de e-mails da clínica.
* **O que será validado:**
  1. Bloqueio de DDDs inexistentes na Anatel (ex: `00`, `90`).
  2. Bloqueio de números repetidos ou sequenciais (ex: `99999-9999`, `123456789`).
  3. Bloqueio de e-mails com domínios descartáveis (ex: `mailinator.com`, `tempmail.com`, `teste.com`).
  4. Bloqueio de nomes fictícios (ex: `teste`, `asdf`) e de e-mails digitados no campo nome.
  5. Aceite com sucesso apenas de dados realistas.
* **Passo a Passo para Testar:**
  1. Na tela de recebimento do relatório do teste, execute os seguintes testes negativos:
     - **Teste A (DDD Inválido):** Telefone `(00) 98888-7777` → Deve exibir: *"O DDD (00) não é válido no Brasil"*.
     - **Teste B (Número Repetido):** Telefone `(11) 99999-9999` → Deve exibir: *"Por favor, informe um número de telefone real"*.
     - **Teste C (E-mail Descartável):** E-mail `usuario@mailinator.com` ou `teste@tempmail.com` → Deve exibir erro de domínio inválido.
     - **Teste D (E-mail no Nome):** Nome `maria@gmail.com` → Deve exibir: *"Parece que você digitou um e-mail no campo nome"*.
     - **Teste E (Nome Fictício):** Nome `Teste Silva` ou `Asdasd` → Deve rejeitar solicitando nome real.
  2. Execute o **Teste Positivo**:
     - Nome: `Mariana Albuquerque`
     - E-mail: `mariana.albuquerque@gmail.com`
     - WhatsApp: `(11) 98765-4321`
  3. Clique em "Receber Relatório Completo".
* **Resultado Esperado:** Todas as tentativas com dados falsos ou inválidos são bloqueadas imediatamente com mensagens explicativas. O preenchimento com dados válidos conclui a captura com sucesso, liberando o relatório e o link direto para agendamento com especialista.

---

### MÓDULO 6: Campanha Especial & Landing Page Guia ENEM

#### Cenário 6.1 — Acesso e Conversão na Página do Guia ENEM (`/guia-enem`, `/enem`)
* **Breve Descrição:** Nova página temática voltada para acolhimento de famílias e vestibulandos com foco em controle de ansiedade pré-prova.
* **O que será validado:**
  1. Responsividade e carregamento rápido de `/guia-enem`.
  2. Formulário de solicitação do guia com validação de dados.
  3. Botão de agendamento direcionando para psicólogos especialistas com filtro contextual.
* **Passo a Passo para Testar:**
  1. Acesse `/guia-enem` (ou `/enem`).
  2. Verifique o layout visual, textos acolhedores e seções explicativas.
  3. Preencha o formulário de solicitação com nome, e-mail e WhatsApp válidos.
  4. Clique no botão de agendamento de consulta de apoio.
* **Resultado Esperado:** O formulário valida os dados corretamente, confirma o envio do material e o botão de agendamento encaminha o usuário para `/agendamento` com foco em psicólogos infantojuvenis/estudantis.

---

### MÓDULO 7: Painel Administrativo Modular & Gestão Operacional (`/admin`)

#### Cenário 7.1 — Navegação pelas 6 Abas Modulares & Gestão de Blog (Fim da Tela Branca)
* **Breve Descrição:** Arquitetura modular do painel admin em abas isoladas (`AdminBookingsTab`, `AdminEventsTab`, `AdminPaymentsTab`, `AdminProfessionalsTab`, `AdminServicesTab`, `AdminTestimonialsTab`) e consulta direta e resiliente de artigos do blog.
* **O que será validado:**
  1. Carregamento independente de cada aba sem que a falha de uma bloqueie as demais.
  2. Gestão de Artigos do Blog (`BlogManagementDashboard`) carregando a lista de artigos diretamente do banco Supabase, sem falhas de 401 ou tela branca.
* **Passo a Passo para Testar:**
  1. Faça login como `admin` e acesse `/admin`.
  2. Clique sucessivamente nas abas laterais/superiores:
     - **Agendamentos:** Verifique a tabela de agendamentos com filtros por status (`confirmed`, `pending_payment`, `cancelled`).
     - **Profissionais:** Verifique a lista de psicólogos cadastrados, status e botões de edição.
     - **Pagamentos / Ledger:** Verifique o histórico de transações financeiras.
     - **Serviços:** Verifique a lista de tipos de consultas e preços.
     - **Depoimentos:** Verifique o painel de aprovação/moderação de avaliações.
  3. Abra a aba de **Artigos do Blog**:
     - Observe a listagem de artigos.
* **Resultado Esperado:** Todas as 6 abas abrem com agilidade e fluidez. A aba de blog carrega a listagem de artigos com seus respectivos status (Publicado/Rascunho) sem travar e sem gerar erro 401 no console.

---

#### Cenário 7.2 — Central de Parâmetros Globais & Antecedência Mínima de Agendamento (`SystemSettingsManager`)
* **Breve Descrição:** Parametrização dinâmica das regras da clínica, incluindo a antecedência mínima em horas para realização de novos agendamentos (`booking_min_hours_notice`), com avaliação de impacto e gravação intencional com auditoria.
* **O que será validado:**
  1. Alteração do parâmetro "Antecedência p/ Novo Agendamento" no Bloco 2.
  2. Modal de Avaliação de Impacto detalhando os fluxos afetados e nível de risco antes de salvar.
  3. Reflexo imediato da nova regra no fluxo de agendamento em `/agendamento` (filtragem de horários e mensagem de erro).
* **Passo a Passo para Testar:**
  1. No painel `/admin`, abra a aba de **Configurações do Sistema** (`SystemSettingsManager`).
  2. No Bloco 2 (**"Políticas de Agendamento, Cancelamentos & Reagendamentos"**), localize o campo **"Antecedência p/ Novo Agendamento"** (valor padrão: `4` horas).
  3. Altere o valor para `2` (ou outro valor de teste, ex: `6`).
  4. Observe que surge o botão no topo: **"Avaliar Impacto & Gravar (1)"**.
  5. Clique no botão. No modal de impacto:
     - Confira a descrição dos fluxos afetados e nível de risco.
     - Clique em **"Confirmar e Gravar Parâmetros"**.
  6. Abra `/agendamento` em nova aba e avance até o calendário:
     - Verifique se os horários do dia refletem o novo prazo configurado.
     - Ao tentar selecionar um horário anterior ao limite, o sistema deve exibir toast atualizado: *"Consultas precisam ser agendadas com pelo menos X horas de antecedência"*.
* **Resultado Esperado:** O parâmetro é persistido no banco com log de auditoria (`ADMIN_SETTINGS_CHANGE`) e o fluxo de agendamento passa a respeitar a nova antecedência sem necessidade de deploy ou reinício do servidor.

---

### MÓDULO 8: Dashboard Estratégico & Clean Analytics (`/admin/dashboard`)

#### Cenário 8.1 — Integridade dos 4 KPIs Vitais & Seletor de Período (Zero Métricas Fictícias)
* **Breve Descrição:** Novo painel executivo com design *Clean Analytics*, eliminando deltas e porcentagens inventadas (`+12.5%`) e calculando tudo em regime de caixa via Ledger.
* **O que será validado:**
  1. Os 4 KPIs do topo (Faturamento Bruto, Consultas Confirmadas, Ticket Médio e Taxa de Ocupação) calculam valores reais a partir das transações.
  2. O seletor de período (Hoje, 7 dias, 30 dias, Mês Atual) recalcula instantaneamente os números.
  3. Exportação do relatório consolidado em CSV.
* **Passo a Passo para Testar:**
  1. Como admin, acesse `/admin/dashboard`.
  2. Alterne o seletor de período entre **"Hoje"**, **"Últimos 7 dias"** e **"Últimos 30 dias"**.
  3. Verifique se os números dos cards principais mudam coerentemente.
  4. Compare o "Ticket Médio" (deve ser exatamente o Faturamento Bruto dividido pelo número de consultas confirmadas).
  5. Clique no botão **"Exportar Relatório CSV"**.
* **Resultado Esperado:** Os dados mudam dinamicamente sem recarregar a página. O arquivo CSV é baixado com os valores correspondentes ao período filtrado. Não existe nenhum número fixo ("fake") na tela.

---

#### Cenário 8.2 — Módulo de Retenção Clínica, No-Show & Coortes (`OperationalRetentionModule`)
* **Breve Descrição:** Análise profunda da jornada do paciente, medindo abandono entre a 1ª e a 2ª consulta e monitorando pacientes inativos com estrito sigilo (Zero PII).
* **O que será validado:**
  1. Cálculo da Taxa de No-Show (Faltas).
  2. Métrica de Retenção à 2ª Sessão (pacientes que continuaram o tratamento).
  3. Lista de radar de acompanhamento exibindo apenas identificadores anônimos/iniciais para conformidade com a LGPD e o Código de Ética do CFP.
* **Passo a Passo para Testar:**
  1. Em `/admin/dashboard`, desça até o bloco **"Retenção Clínica & Prevenção de Abandono"**.
  2. Verifique o gráfico de coorte de retorno.
  3. Observe a tabela de pacientes com risco de drop-off (> 30 dias sem agendamento):
     - Verifique se nomes completos e dados de saúde sensíveis NÃO estão expostos abertamente.
* **Resultado Esperado:** O painel apresenta indicadores claros de saúde operacional clínica, sem expor dados confidenciais dos pacientes.

---

#### Cenário 8.3 — Funil de Growth & Metas Mensais (`GrowthAnalyticsModule`)
* **Breve Descrição:** Acompanhamento do funil de conversão em 5 etapas (Leads GAD-7 → Início de Agendamento → Checkout → Consulta Confirmada) e edição de metas dinâmicas.
* **O que será validado:**
  1. Exibição do funil visual de conversão com taxas de passagem entre etapas.
  2. Ajuste dinâmico de metas de faturamento e consultas.
* **Passo a Passo para Testar:**
  1. No dashboard executivo, localize a seção **"Funil de Aquisição & Metas"**.
  2. Observe a taxa de conversão entre etapas.
  3. Clique em **"Editar Metas"**, altere a meta de faturamento mensal para um novo valor e salve.
  4. Recarregue a página (F5).
* **Resultado Esperado:** A barra de progresso da meta reflete a nova porcentagem atingida e o novo valor permanece salvo (persistido em `system_settings`).

---

### MÓDULO 9: Fintech & Resiliência Fiscal (NFS-e e Reembolsos)

#### Cenário 9.1 — Resiliência de NFS-e & Edição de Documento do Tomador (Prevenção de Erro PBH)
* **Breve Descrição:** Dashboard fiscal com tratamento de erros da prefeitura e modal para correção imediata de CPF/CNPJ de psicólogos sem cadastro fiscal completo.
* **O que será validado:**
  1. Visualização de notas fiscais com status claros (Emitida, Pendente, Falha/Erro).
  2. Abertura do modal de edição cadastral em notas com pendência de CPF/CNPJ.
  3. Validação ao vivo do documento digitado.
  4. Opção de propagação em 1 clique para o cadastro permanente do psicólogo.
* **Passo a Passo para Testar:**
  1. Como admin, acesse `/admin/pagamentos` (ou aba de pagamentos do `/admin`) e localize a seção de **Resiliência NFS-e**.
  2. Identifique uma emissão com status de erro ou pendência cadastral.
  3. Clique no botão de ação **"Editar Tomador / Corrigir Documento"**.
  4. No modal:
     - Digite um CPF inválido (ex: `111.111.111-11`) → Observe o alerta de validação.
     - Digite um CPF válido ou CNPJ de teste.
     - Marque a opção: *"Salvar permanentemente no cadastro do psicólogo"*.
     - Clique em "Salvar Dados Fiscais".
* **Resultado Esperado:** Os dados fiscais da nota são saneados, o cadastro permanente do psicólogo em `professionals` é atualizado simultaneamente e a nota fica pronta para reprocessamento sem rejeição da prefeitura.

---

#### Cenário 9.2 — Fluxo Unificado de Reembolsos & Proteção Anti-Clawback (`refundService`)
* **Breve Descrição:** Processamento seguro de reembolsos com registro contábil no Ledger e bloqueio de estorno indevido contra psicólogos.
* **O que será validado:**
  1. Registro de solicitação de reembolso manual com campos de motivo e comprovante.
  2. Higienização automática do texto do motivo (bloqueio de termos clínicos no e-mail do paciente).
  3. Lançamento correto da contrapartida financeira no Livro-Razão (Ledger).
* **Passo a Passo para Testar:**
  1. Acesse o painel de Reembolsos em `/admin/pagamentos`.
  2. Clique em **"Novo Reembolso Manual"**.
  3. Selecione uma transação aprovada de teste.
  4. No campo de motivo, digite: `"Solicitação do cliente por motivo pessoal e crise de ansiedade."`
  5. Confirme o reembolso.
  6. Acesse a aba do **Ledger Financeiro** e localize a transação.
* **Resultado Esperado:** O reembolso é registrado no ledger com a conta de débito apropriada. Na notificação gerada e no log, o termo clínico `"crise de ansiedade"` é higienizado pelo sanitizador Zero-PII, substituído pelo texto padrão de cancelamento administrativo.

---

### MÓDULO 10: Landing Pages Clínicas e Canal de Doação

#### Cenário 10.1 — Validação de SEO e Carregamento das Páginas de Especialidades
* **Breve Descrição:** Conjunto de 8 páginas de especialidade clínica desenvolvidas com tags canônicas de SEO, Schema.org e conformidade ética de saúde mental.
* **O que será validado:**
  1. Abertura das rotas sem erros 404:
     - `/terapia/ansiedade`
     - `/terapia/depressao`
     - `/terapia/tdah`
     - `/terapia/casal`
     - `/terapia/burnout`
     - `/terapia/dependencia-emocional`
     - `/terapia/vicio-apostas`
     - `/terapia/abuso-espiritual`
  2. Botões de "Agendar Consulta" direcionando com filtro para o serviço correto.
* **Passo a Passo para Testar:**
  1. Abra cada uma das URLs listadas acima.
  2. Verifique se o título da aba no navegador (title tag) é condizente com a especialidade.
  3. Clique no botão de agendamento principal da página.
* **Resultado Esperado:** Todas as 8 páginas carregam com visual rico e identidade Doxologos. O clique no botão leva para `/agendamento` com o serviço da respectiva especialidade selecionado.

---

#### Cenário 10.2 — Canal Social de Doação via PIX (`/doacao`)
* **Breve Descrição:** Canal dedicado para contribuições sociais em prol do atendimento psicológico a pessoas em vulnerabilidade.
* **O que será validado:**
  1. Seleção de valores pré-definidos (R$ 30, R$ 50, R$ 100) e campo de valor customizado.
  2. Geração da chave PIX oficial da clínica.
* **Passo a Passo para Testar:**
  1. Acesse `/doacao`.
  2. Clique em um dos valores sugeridos (ex: R$ 50,00).
  3. Clique em "Apoiar com PIX".
  4. Verifique a exibição da chave PIX e botão de cópia.
* **Resultado Esperado:** A tela apresenta a chave CNPJ oficial (`35035127000120`) e QR Code legível, emitindo toast de confirmação ao copiar.

---

## 📊 3. Tabela Resumo de Rotas & Cobertura para o QA

| Módulo | Rota Principal | Perfil Exigido | Status da Feature |
| :--- | :--- | :--- | :--- |
| **Agendamento** | `/agendamento` | Público / Qualquer | Atualizado & Otimizado |
| **Checkout** | `/checkout` / `/checkout-direct` | Público | Novo Mobile CRO & Sticky Bar |
| **Pós-Checkout** | `/checkout/success` / `/checkout/pending` | Público | Novo Design & Meet Link |
| **Paciente** | `/area-do-paciente` | `patient` | Nova aba "Meu Acompanhamento" |
| **Sala de Espera** | `/sala-espera/:id` | `patient` / `professional` | Google Meet Seguro |
| **Profissional** | `/profissional` | `professional` | Novo Cockpit da Agenda & Prontuário |
| **Honorários** | `/faturamento-mensal` | `professional` | Novo Carnê-Leão CBO 2515-10 |
| **Central Testes** | `/ferramentas` e `/teste-*` | Público | Novo Antifraude `leadValidator` |
| **Guia ENEM** | `/guia-enem` / `/enem` | Público | Nova Landing Page |
| **Admin Geral** | `/admin` | `admin` | Nova Arquitetura de 6 Abas |
| **Dashboard** | `/admin/dashboard` | `admin` | Novo *Clean Analytics* & Métricas Reais |
| **Fintech / NFS-e** | `/admin/pagamentos` | `admin` | Novo Modal Tomador & Resiliência |
| **Especialidades** | `/terapia/:especialidade` | Público | 8 Novas Páginas Clínicas |
| **Doação** | `/doacao` | Público | Novo Canal PIX Solidário |

---

## 🚩 4. Guia Rápido de Troubleshooting para o QA

Se durante o teste exploratório você encontrar algum comportamento inesperado:
1. **Erro de Permissão (403 / Acesso Negado):** Verifique se está logado com a conta que possui a role adequada no `app_metadata` (`admin`, `professional` ou `patient`).
2. **Campos de Cartão Não Carregam:** Verifique se o adblocker ou bloqueador de rastreadores do navegador está desativado (o SDK do Mercado Pago exige comunicação direta).
3. **QR Code PIX em Branco:** Em ambiente local ou sandbox, verifique se a Edge Function `mp-create-preference` está respondendo ou teste no simulador `/pagamento-simulado`.
4. **Prontuário Não Salvando:** Certifique-se de que a sessão pertence ao psicólogo logado (o RLS impede psicólogos de editarem consultas de terceiros).
