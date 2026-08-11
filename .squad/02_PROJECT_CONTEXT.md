# CONTEXTO DO PROJETO: Clínica Mundo Azul & IIDIPO

**Visão Geral:** 
Desenvolvimento de uma plataforma de saúde (HealthTech) para gestão clínica, telemedicina e acompanhamento offline. Foco na inovação do tratamento da Neurodivergência (Mundo Azul) e no desenvolvimento integral de populações vulneráveis/originárias (IIDIPO), operando com extrema segurança (LGPD/HIPAA).

---

## ESTRATÉGIA DE NEGÓCIO E ROADMAP (Acordado no Discovery)

### [X] FASE 1: MVP Rápido (Acesso, Triagem Itinerante e Telessaúde)
*Foco: Equipar a equipe de campo (Unidade Móvel) e o especialista na base, lidando com ausência de conectividade (Offline-First).*
- **App Itinerante (PWA):** Focado no Profissional da Ponta (ACS/Enfermeiro). Offline-First via IndexedDB/ServiceWorkers. Faz cadastro com foto, anamnese e medeia teleconsulta.
- **Módulo Especialista (Web):** Prontuário Eletrônico (PEP), plano terapêutico singular (PTS) e recepção da fila de telemedicina.
- **Módulo Gestão (Web):** Dashboard Básico e RBAC.
- **Engajamento:** Alertas via SMS/WhatsApp para famílias (sem forçar o download de app nesta fase).

### [ ] FASE 2: Inteligência Territorial, Pacientes e REAC
*Foco: Dar poder à família, refinar a clínica (Máquina REAC) e entender o território.*
- **App Família/Paciente (PWA):** Carteira Digital do Neurodivergente, vídeos e checklists visuais (sem gamificação pesada).
- **Integração REAC:** Formulários otimizados no PEP para inserção manual dos parâmetros da neuromodulação REAC.
- **Gestão de Território:** Mapa georreferenciado (Inteligência territorial).

### [ ] FASE 3: Ecossistema Integral Transfronteiriço
*Foco: Impacto social, fronteiras e governança de dados globais.*
- **Portal Inclusão:** Geração de renda.
- **Transfronteiriço:** Suporte multi-idioma (Brasil, Bolívia, Paraguai).
- **Interoperabilidade Governamental:** APIs seguras para SUS (e-SUS), Educação e Assistência Social.

---

## DIRETRIZES DA FASE ATUAL [FASE 1]

- Foco absoluto no "Core Business": se não é essencial para o médico atender o paciente, não construa agora.
- Implemente o "caminho feliz" com tolerância a *Débito Técnico Consciente*.
- Testes focados no Frontend Mock e componentes críticos.
- O Protótipo (Mocks React) deve sempre preceder a modelagem real de banco de dados para evitar retrabalhos (Validação UX/Cliente).
