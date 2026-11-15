# ADR 001: Plataforma Única de Teleconsulta — Google Meet Exclusivo e Depreciação do Zoom

- **Data:** 2026-09-24
- **Status:** Aprovado e Implementado
- **Decisores:** Product Lead, Tech Lead, Fullstack Dev

---

## 1. Contexto
Historicamente, o sistema Doxologos possuía código legado prevendo integração com a API do Zoom (scripts como `testezoom.js`, edge functions de OAuth do Zoom e colunas pontuais). No entanto, o modelo operacional atual da clínica atende **exclusivamente via Google Meet**, utilizando links dinâmicos do Google Workspace ou o link pessoal permanente configurado no perfil de cada profissional (`professional.personal_meet_link`).
Além disso, a tabela `bookings` no Supabase não possui a coluna `meeting_platform`, tornando qualquer lógica condicional baseada em plataforma de reunião propensa a falhas de tipagem ou queries inválidas.

## 2. Decisão
1. **Remoção de Código Morto:** O script de teste e utilitários obsoletos do Zoom (`testezoom.js`) foram removidos do repositório.
2. **Plataforma Exclusiva:** O Google Meet é a única plataforma homologada de videochamada na interface e no backend.
3. **Resolução de Link de Sala:** A geração do link seguro e exibição ao paciente prioriza o Google Meet, com fallback para o `personal_meet_link` do profissional cadastrado.
4. **Comunicação ao Paciente:** Os textos de agendamento e a Área do Paciente foram ajustados para deixar explícito o acesso à sala do Google Meet sem dependência de instalação de softwares de terceiros.

## 3. Consequências
- Redução de complexidade no fluxo de reserva e eliminação de credenciais mortas do Zoom.
- Código mais limpo e ausência de queries que tentem acessar a coluna inexistente `meeting_platform`.
- Experiência consistente para os pacientes no navegador ou aplicativo Google Meet.
