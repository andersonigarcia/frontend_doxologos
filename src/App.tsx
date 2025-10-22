import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Loading } from '@/components/common/Loading';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import './App.css';

function App() {
  const { user, loading } = useAuth();

  logger.info('App rendered', { user: user?.id, loading });

  if (loading) {
    return <Loading message="Carregando aplicação..." size="large" />;
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <header className="app-header">
          <h1>Doxologos</h1>
          <p>Plataforma Robusta e à Prova de Falhas</p>
        </header>

        <main className="app-main">
          {user ? (
            <div className="user-section">
              <h2>Bem-vindo!</h2>
              <p>Usuário: {user.email}</p>
              <p className="success-message">
                ✓ Aplicação configurada com:
              </p>
              <ul className="feature-list">
                <li>✓ React 18 + TypeScript</li>
                <li>✓ Supabase Integration</li>
                <li>✓ Error Boundary</li>
                <li>✓ Retry Logic</li>
                <li>✓ Input Validation (Zod)</li>
                <li>✓ Logging System</li>
                <li>✓ Comprehensive Testing</li>
                <li>✓ Path Aliases</li>
                <li>✓ ESLint + Prettier</li>
              </ul>
            </div>
          ) : (
            <div className="info-section">
              <h2>Aplicação Configurada!</h2>
              <p className="success-message">
                ✓ Projeto pronto para produção com as seguintes melhorias:
              </p>
              <ul className="feature-list">
                <li>✓ React 18 + TypeScript para type safety</li>
                <li>✓ Supabase configurado com validação de variáveis</li>
                <li>✓ Error Boundary para captura de erros</li>
                <li>✓ Retry logic com backoff exponencial</li>
                <li>✓ Validação de entrada com Zod</li>
                <li>✓ Sistema de logging robusto</li>
                <li>✓ Testes abrangentes com Vitest</li>
                <li>✓ Path aliases (@/) configurados</li>
                <li>✓ ESLint e Prettier configurados</li>
                <li>✓ Tratamento de timeout para APIs</li>
              </ul>
              <div className="next-steps">
                <h3>Próximos Passos:</h3>
                <ol>
                  <li>Configure as variáveis de ambiente (.env)</li>
                  <li>Execute `npm test` para rodar os testes</li>
                  <li>Execute `npm run build` para build de produção</li>
                  <li>Implemente suas funcionalidades usando os serviços</li>
                </ol>
              </div>
            </div>
          )}
        </main>

        <footer className="app-footer">
          <p>
            Ambiente: {import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}
          </p>
        </footer>
      </div>
    </ErrorBoundary>
  );
}

export default App;
