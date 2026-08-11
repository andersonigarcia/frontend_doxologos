# 💬 MODELOS DE PROMPTS PARA O DIA A DIA

Utilize os modelos abaixo (copiando e colando no chat) para interagir com o Squad e extrair o melhor resultado em diferentes momentos do projeto.

---

### 1. Kickoff Rápido (Discovery e Protótipo)
**Use quando quiser criar a interface primeiro para aprovação com o cliente/stakeholders.**

> "Squad, precisamos da funcionalidade de **[Agendamento de Consultas]**. 
> Requisitos: O paciente deve ver os horários livres, escolher um e reservar. 
> Pulemos direto para a **Etapa 2 (Protótipo Navegável)**. Crie o componente React visual usando Mocks de dados (sem conectar em API real por enquanto) para que eu mostre ao cliente hoje à tarde para aprovação."

---

### 2. Kickoff Completo (Backend e Integração)
**Use quando o protótipo for aprovado e for a hora de escrever código pesado de backend.**

> "O Protótipo do **[Agendamento de Consultas]** foi aprovado pelo cliente!
> Vamos seguir com as **Etapas 3 e 4**. Backend Specialist, construa as rotas no FastAPI. Frontend Specialist, remova os Mocks do protótipo e conecte com os endpoints reais criados."

---

### 3. Refatoração para Transição de Fase (MVP -> Tração)
**Use quando trocar a Fase do `02_PROJECT_CONTEXT.md`.**

> "Squad, mudamos para a Fase 2 (Tração). Revise o código atual do módulo **[Nome do Módulo/Arquivo]**. 
> O Arquiteto e o Backend Specialist devem apontar onde estão os pontos fracos atuais, adicionar validações Pydantic mais restritas e aplicar tratamento de exceções adequado para essa nova fase de estabilidade."

---

### 4. Foco em Resolução de Bugs Específicos
**Use para investigar um erro sem perder o foco na segurança.**

> "Backend Specialist e DevOps, estou recebendo o erro **[COLE O LOG DO ERRO AQUI]** ao tentar fazer o deploy/executar a rota X. 
> Analisem a causa raiz baseada na nossa stack atual (FastAPI + PostgreSQL). Forneçam a solução de código focando em resiliência e me digam se isso gera algum impacto de segurança."

---

### 5. Code Review (Revisão de Código)
**Use antes de aceitar um Pull Request ou fazer commit de código grande.**

> "Tech Lead e SRE, façam um Code Review rígido do código abaixo. 
> Busquem por falhas de performance, falta de tipagem, possíveis vulnerabilidades de segurança e verifiquem se está aderente ao Clean Code e aos padrões da nossa `03_SQUAD_MEMORY.md`. 
> [COLE O CÓDIGO AQUI]"

---

### 6. Gatilho de Auto-Refinamento (Forçando a atualização da Memória)
**Use após tomarem uma boa decisão juntos.**

> "Excelente solução, Squad. Tech Lead, execute a **Etapa 6** do nosso processo. Escreva e salve a atualização no arquivo `03_SQUAD_MEMORY.md` registrando essa decisão arquitetural que acabamos de tomar sobre **[Tema da Decisão]**."
