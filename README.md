# Doxologos Frontend

Frontend robusto e à prova de falhas para a plataforma Doxologos, construído com React, TypeScript e Supabase.

## 🚀 Características

Este projeto foi desenvolvido seguindo as melhores práticas de desenvolvimento frontend, com foco em:

- **Robustez**: Sistema de tratamento de erros em múltiplas camadas
- **Confiabilidade**: Retry logic com backoff exponencial
- **Segurança**: Validação de entrada com Zod
- **Manutenibilidade**: TypeScript para type safety
- **Testabilidade**: Cobertura completa de testes com Vitest
- **Observabilidade**: Sistema de logging integrado

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta Supabase (para configuração)

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/andersonigarcia/frontend_doxologos.git
cd frontend_doxologos
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` com suas credenciais Supabase:
```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

## 🚀 Desenvolvimento

Execute o servidor de desenvolvimento:
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## 🧪 Testes

Execute os testes:
```bash
npm test
```

Execute os testes com cobertura:
```bash
npm run test:coverage
```

Execute os testes com UI interativa:
```bash
npm run test:ui
```

## 🏗️ Build

Crie um build de produção:
```bash
npm run build
```

Visualize o build de produção localmente:
```bash
npm run preview
```

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run preview` - Visualiza build de produção
- `npm run lint` - Executa o linter
- `npm run format` - Formata o código com Prettier
- `npm test` - Executa os testes
- `npm run test:ui` - Executa testes com interface visual
- `npm run test:coverage` - Executa testes com relatório de cobertura

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes React
│   ├── auth/           # Componentes de autenticação
│   └── common/         # Componentes reutilizáveis
├── hooks/              # Custom React hooks
├── lib/                # Bibliotecas e utilitários
│   ├── api/           # Lógica de retry e timeout
│   ├── errors/        # Classes de erro customizadas
│   ├── logger/        # Sistema de logging
│   ├── supabase/      # Cliente Supabase
│   └── validation/    # Schemas de validação Zod
├── services/           # Serviços de negócio
├── test/              # Configuração de testes
└── types/             # Tipos TypeScript globais
```

## 🔐 Segurança

### Validação de Entrada
Todas as entradas de usuário são validadas usando Zod schemas antes do processamento.

### Tratamento de Erros
- Error Boundary para captura de erros em componentes
- Classes de erro customizadas para diferentes cenários
- Logging centralizado de erros

### Variáveis de Ambiente
Todas as configurações sensíveis devem estar em variáveis de ambiente, nunca no código.

## 🔄 Retry Logic

O sistema implementa retry logic automático para operações de rede:
- Máximo de 3 tentativas por padrão (configurável)
- Backoff exponencial entre tentativas
- Timeout configurável para todas as operações

## 📊 Logging

Sistema de logging integrado que:
- Registra todas as operações importantes
- Mantém histórico de logs em memória
- Filtra logs baseado no ambiente (dev/prod)
- Pode ser estendido para enviar logs para serviços externos

## 🧪 Testes

O projeto inclui testes abrangentes para:
- Componentes React
- Hooks customizados
- Utilitários e funções helper
- Serviços de negócio
- Validação de schemas

Cobertura de testes atual: A ser medida com `npm run test:coverage`

## 🎨 Estilização

O projeto usa CSS puro com:
- Design responsivo
- Variáveis CSS para temas
- Convenções de nomenclatura consistentes

## 🌐 Supabase Integration

Integração completa com Supabase para:
- Autenticação (sign in, sign up, sign out)
- Gerenciamento de sessão
- Refresh automático de tokens
- Health checks de conexão

## 📚 Recursos de Aprendizado

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
- [Vitest Documentation](https://vitest.dev)

## 🤝 Contribuindo

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto é propriedade privada.

## 👥 Autores

- Anderson Garcia - [andersonigarcia](https://github.com/andersonigarcia)

## 🙏 Agradecimentos

Projeto desenvolvido com foco em qualidade, robustez e melhores práticas de desenvolvimento frontend.
