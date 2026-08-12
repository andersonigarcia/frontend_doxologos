# 🧠 Squad Multiagente - Cérebro do Projeto

Esta pasta (`.squad/`) funciona como o "cérebro externo" e a memória persistente da Inteligência Artificial que atua como seu Squad de Desenvolvimento.

## Como utilizar

Sempre que iniciar uma **nova sessão de chat** com a IA, forneça os arquivos abaixo na seguinte ordem (ou faça o upload desta pasta inteira, caso a ferramenta permita):

1. **`01_SQUAD_SYSTEM_PROMPT.md`**: A "Constituição" do Squad. Contém os papéis, a stack tecnológica e as regras absolutas. Nunca mude esse arquivo a menos que a stack ou os papéis mudem estruturalmente.
2. **`02_PROJECT_CONTEXT.md`**: O estado atual do projeto. Aqui você define se a IA deve agir rápido (MVP) ou com rigor (Robusto/Escala). Atualize este arquivo conforme o projeto evolui.
3. **`03_SQUAD_MEMORY.md`**: O diário de bordo. A própria IA sugerirá atualizações para este arquivo sempre que um novo padrão for definido, garantindo que ela não repita erros no futuro.

Consulte o arquivo **`PROMPT_TEMPLATES.md`** para ver exemplos práticos de como "conversar" com o Squad no dia a dia.

## 📚 Documentação Técnica Aprofundada
Para guias técnicos detalhados de deploy, troubleshooting, variáveis de ambiente, integrações de pagamento e acessibilidade, consulte a pasta [`docs/`](../docs/README.md).
