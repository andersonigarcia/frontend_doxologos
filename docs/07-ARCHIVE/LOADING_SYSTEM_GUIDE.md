# Sistema Global de Loading - Guia de Uso

## 📚 Visão Geral

Sistema reutilizável de loading states que fornece feedback visual consistente em todo o aplicativo, previne operações duplicadas e melhora a experiência do usuário.

## 🎯 Componentes Disponíveis

### 1. Hook `useLoadingState`
Gerencia estados de loading para operações gerais.

### 2. Hook `useItemLoadingState`  
Gerencia loading por ID de item (ideal para listas CRUD).

### 3. Componente `LoadingOverlay`
Overlay visual com spinner e mensagem.

### 4. Componente `LoadingButton`
Botão com estado de loading integrado.

### 5. Componente `LoadingSpinner`
Spinner inline simples.

### 6. Componente `LoadingInput`
Input/Select com spinner lateral.

### 7. Componente `LoadingCard`
Card com overlay de loading.

---

## 🚀 Exemplos de Uso

### Exemplo 1: Operação Simples com Loading

```jsx
import { useLoadingState } from '@/hooks/useLoadingState';
import { LoadingButton } from '@/components/LoadingOverlay';

function MyComponent() {
    const { isLoading, withLoading } = useLoadingState();
    
    const handleSave = async () => {
        await withLoading('saveData', async () => {
            const response = await api.saveData(data);
            toast({ title: 'Dados salvos!' });
        });
    };
    
    return (
        <LoadingButton
            isLoading={isLoading('saveData')}
            loadingText="Salvando..."
            onClick={handleSave}
            className="btn-primary"
        >
            Salvar
        </LoadingButton>
    );
}
```

### Exemplo 2: Lista com Loading por Item

```jsx
import { useItemLoadingState } from '@/hooks/useLoadingState';
import { LoadingOverlay } from '@/components/LoadingOverlay';

function ItemList({ items }) {
    const { isItemLoading, withItemLoading } = useItemLoadingState();
    
    const handleDelete = async (itemId) => {
        await withItemLoading('delete', itemId, async () => {
            await api.deleteItem(itemId);
            toast({ title: 'Item deletado!' });
        });
    };
    
    return (
        <div>
            {items.map(item => (
                <div key={item.id} className="relative">
                    <LoadingOverlay 
                        isLoading={isItemLoading('delete', item.id)}
                        message="Deletando..."
                    >
                        <div className="item-content">
                            <h3>{item.name}</h3>
                            <button 
                                onClick={() => handleDelete(item.id)}
                                disabled={isItemLoading('delete', item.id)}
                            >
                                Deletar
                            </button>
                        </div>
                    </LoadingOverlay>
                </div>
            ))}
        </div>
    );
}
```

### Exemplo 3: Select/Dropdown com Loading

```jsx
import { useLoadingState } from '@/hooks/useLoadingState';
import { LoadingInput } from '@/components/LoadingOverlay';

function StatusSelector({ booking }) {
    const { isLoading, withLoading } = useLoadingState();
    
    const handleStatusChange = async (newStatus) => {
        await withLoading('changeStatus', async () => {
            await api.updateStatus(booking.id, newStatus);
        });
    };
    
    return (
        <LoadingInput isLoading={isLoading('changeStatus')}>
            <select 
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isLoading('changeStatus')}
            >
                <option value="pending">Pendente</option>
                <option value="approved">Aprovado</option>
            </select>
        </LoadingInput>
    );
}
```

### Exemplo 4: Card Completo com Loading

```jsx
import { useLoadingState } from '@/hooks/useLoadingState';
import { LoadingCard, LoadingButton } from '@/components/LoadingOverlay';

function DataCard() {
    const { isLoading, withLoading } = useLoadingState();
    
    const handleRefresh = async () => {
        await withLoading('refresh', async () => {
            await fetchData();
        });
    };
    
    return (
        <LoadingCard 
            isLoading={isLoading('refresh')} 
            message="Carregando dados..."
            className="p-6 bg-white rounded-lg shadow"
        >
            <h2>Meus Dados</h2>
            <p>Conteúdo do card...</p>
            
            <LoadingButton
                isLoading={isLoading('refresh')}
                loadingText="Atualizando..."
                onClick={handleRefresh}
            >
                Atualizar
            </LoadingButton>
        </LoadingCard>
    );
}
```

### Exemplo 5: Múltiplas Operações Simultâneas

```jsx
import { useLoadingState } from '@/hooks/useLoadingState';

function MultiOperationComponent() {
    const { isLoading, withLoading, isAnyLoading } = useLoadingState();
    
    const handleSave = async () => {
        await withLoading('save', async () => {
            await api.save();
        });
    };
    
    const handleDelete = async () => {
        await withLoading('delete', async () => {
            await api.delete();
        });
    };
    
    return (
        <div>
            <button 
                onClick={handleSave}
                disabled={isAnyLoading()} // Desabilita se QUALQUER operação estiver rodando
            >
                {isLoading('save') ? 'Salvando...' : 'Salvar'}
            </button>
            
            <button 
                onClick={handleDelete}
                disabled={isAnyLoading()}
            >
                {isLoading('delete') ? 'Deletando...' : 'Deletar'}
            </button>
        </div>
    );
}
```

---

## 🎨 Customização de Estilos

### Spinner com Cores Personalizadas

```jsx
<LoadingSpinner size="md" className="text-blue-500" />
```

### LoadingButton Personalizado

```jsx
<LoadingButton
    isLoading={isLoading('save')}
    loadingText="Processando..."
    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full"
>
    Salvar Dados
</LoadingButton>
```

### Overlay em Tela Cheia

```jsx
<LoadingOverlay 
    isLoading={isLoading('bigOperation')}
    message="Processando dados..."
    position="fixed"
    fullScreen={true}
    size="lg"
/>
```

---

## ⚡ Boas Práticas

### ✅ DO's

```jsx
// ✅ Use keys descritivas
await withLoading('saveUserProfile', async () => { ... });

// ✅ Sempre aguarde o resultado
await withItemLoading('delete', itemId, async () => { ... });

// ✅ Desabilite inputs durante loading
<button disabled={isAnyLoading()}>Submit</button>

// ✅ Forneça mensagens claras
<LoadingOverlay message="Salvando alterações..." />

// ✅ Use LoadingButton para ações principais
<LoadingButton isLoading={...} loadingText="Salvando...">
```

### ❌ DON'Ts

```jsx
// ❌ Não use keys genéricas
await withLoading('loading', async () => { ... }); // Ruim

// ❌ Não esqueça de aguardar
withLoading('save', async () => { ... }); // Falta await

// ❌ Não use setState manual
setIsLoading(true); // Use os hooks fornecidos

// ❌ Não esquece de desabilitar elementos
<button onClick={handleSave}>Save</button> // Falta disabled

// ❌ Não omita mensagens em operações longas
<LoadingOverlay isLoading={true} /> // Falta message
```

---

## 🔧 API Completa

### useLoadingState

| Método | Descrição | Exemplo |
|--------|-----------|---------|
| `startLoading(key, id?)` | Inicia loading | `startLoading('save', userId)` |
| `stopLoading(key)` | Para loading | `stopLoading('save')` |
| `isLoading(key)` | Verifica se está em loading | `isLoading('save')` |
| `isAnyLoading()` | Verifica se há qualquer loading | `isAnyLoading()` |
| `withLoading(key, fn, id?)` | Wrapper automático | `await withLoading('save', fn)` |
| `stopAllLoading()` | Para todos os loadings | `stopAllLoading()` |

### useItemLoadingState

| Método | Descrição | Exemplo |
|--------|-----------|---------|
| `startItemLoading(op, id)` | Inicia loading do item | `startItemLoading('delete', '123')` |
| `stopItemLoading(op, id)` | Para loading do item | `stopItemLoading('delete', '123')` |
| `isItemLoading(op, id)` | Verifica loading do item | `isItemLoading('delete', '123')` |
| `isAnyItemLoading()` | Verifica se há item em loading | `isAnyItemLoading()` |
| `withItemLoading(op, id, fn)` | Wrapper automático | `await withItemLoading('delete', id, fn)` |

### Componentes

#### LoadingOverlay Props
```typescript
{
  isLoading: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  position?: 'absolute' | 'fixed';
  fullScreen?: boolean;
  children?: ReactNode;
}
```

#### LoadingButton Props
```typescript
{
  isLoading: boolean;
  loadingText?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}
```

---

## 📝 Checklist de Implementação

Ao adicionar loading em uma nova página:

- [ ] Importar hooks necessários
- [ ] Importar componentes de Loading
- [ ] Substituir estados manuais por `useLoadingState`
- [ ] Envolver operações assíncronas com `withLoading`
- [ ] Adicionar `LoadingOverlay` em cards/containers
- [ ] Usar `LoadingButton` em ações principais
- [ ] Desabilitar inputs durante operações (`isAnyLoading()`)
- [ ] Adicionar mensagens descritivas nos overlays
- [ ] Testar prevenção de cliques múltiplos
- [ ] Verificar feedback visual em todas operações

---

## 🎯 Páginas para Implementar

### Alta Prioridade
- [ ] **BookingPage** - Criação de agendamentos
- [ ] **LoginPage** - Login e cadastro
- [ ] **AdminPage** - Outras abas (serviços, profissionais, eventos)

### Média Prioridade
- [ ] Formulários de contato
- [ ] Páginas de perfil de usuário
- [ ] Configurações do sistema

### Baixa Prioridade
- [ ] Páginas estáticas com operações ocasionais

---

## 💡 Dicas de Performance

1. **Use `withLoading`** ao invés de `start/stop` manual - previne esquecimento do cleanup
2. **Keys únicas** para operações diferentes - permite loading paralelo controlado
3. **`isAnyLoading()`** para desabilitar toda a UI durante operações críticas
4. **Memoização** de callbacks que usam loading states
5. **Cleanup automático** - os hooks já gerenciam isso no unmount

---

## 🐛 Troubleshooting

### Loading não para
- Verifique se está usando `await` corretamente
- Confirme que não há erro não capturado (use try/catch)
- Use `stopAllLoading()` em useEffect cleanup se necessário

### Múltiplos loadings ao mesmo tempo
- Use keys diferentes para operações paralelas
- Use `isAnyLoading()` para prevenir isso se necessário
- Considere usar `useItemLoadingState` para operações em lista

### Loading não aparece
- Verifique se o componente está renderizando
- Confirme que a key está correta
- Veja se há CSS sobrescrevendo z-index

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Revise esta documentação
2. Veja exemplos na `AdminPage.jsx`
3. Consulte o código fonte dos hooks e componentes

**Happy coding! 🚀**
