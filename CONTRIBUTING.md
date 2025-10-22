# Guia de Contribuição

Obrigado por considerar contribuir para o Doxologos Frontend!

## Código de Conduta

Seja respeitoso e profissional em todas as interações.

## Como Contribuir

### Reportando Bugs

1. Verifique se o bug já foi reportado nas Issues
2. Crie uma nova Issue com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs atual
   - Screenshots (se aplicável)
   - Informações do ambiente

### Sugerindo Melhorias

1. Descreva claramente a melhoria proposta
2. Explique por que seria útil
3. Forneça exemplos de uso se possível

### Pull Requests

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/MinhaFeature`)
3. Faça suas alterações seguindo os padrões do projeto
4. Adicione testes para novas funcionalidades
5. Garanta que todos os testes passam (`npm test`)
6. Execute o linter (`npm run lint`)
7. Formate o código (`npm run format`)
8. Commit suas mudanças com mensagens claras
9. Push para sua branch
10. Abra um Pull Request

## Padrões de Código

### TypeScript

- Use tipos explícitos sempre que possível
- Evite `any` - use `unknown` se necessário
- Documente funções complexas com JSDoc

### React

- Use componentes funcionais
- Use hooks para gerenciar estado
- Mantenha componentes pequenos e focados
- Use Error Boundaries para componentes que podem falhar

### Testes

- Escreva testes para novas funcionalidades
- Mantenha cobertura de testes acima de 80%
- Use nomes descritivos para testes
- Teste casos de erro e edge cases

### Commits

Use mensagens de commit claras e descritivas:

```
feat: adiciona nova funcionalidade X
fix: corrige bug Y
docs: atualiza documentação Z
test: adiciona testes para W
refactor: refatora componente V
style: ajusta formatação
chore: atualiza dependências
```

## Estrutura do Projeto

Organize seu código seguindo a estrutura existente:

```
src/
├── components/     # Componentes React
├── hooks/          # Custom hooks
├── lib/            # Utilitários e bibliotecas
├── services/       # Serviços de negócio
└── test/           # Configuração de testes
```

## Checklist para PRs

- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Todos os testes passam
- [ ] Linter não reporta erros
- [ ] Documentação foi atualizada (se necessário)
- [ ] Commit messages são claras
- [ ] PR tem descrição detalhada

## Perguntas?

Abra uma Issue para discussão!
