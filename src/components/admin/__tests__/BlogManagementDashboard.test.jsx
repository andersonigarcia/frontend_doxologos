import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlogManagementDashboard } from '../BlogManagementDashboard';

const mockArticles = [
  {
    id: 'art-1',
    slug: 'lideranca-eclesiastica',
    title: 'Liderança eclesiástica para além da aparência',
    description: 'Reflexões sobre cuidado pastoral',
    published_at: '2026-10-10T12:00:00Z',
    status: 'published',
    cover_image_url: 'https://example.com/cover1.jpg'
  },
  {
    id: 'art-2',
    slug: 'o-choro-do-algoritmo',
    title: 'O choro que o algoritmo compra',
    description: 'Saúde mental e redes sociais',
    published_at: '2026-10-12T15:00:00Z',
    status: 'draft',
    cover_image_url: null
  }
];

const mockUpdate = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });
const mockDelete = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

jest.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: jest.fn((table) => {
      if (table === 'artigos') {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockArticles, error: null })
          }),
          update: (...args) => mockUpdate(...args),
          delete: (...args) => mockDelete(...args)
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      };
    }),
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: { stats: { novos: 1, atualizados: 0 } }, error: null })
    }
  }
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('BlogManagementDashboard (Gestão do Blog & Substack)', () => {
  it('deve renderizar o cabeçalho no padrão Card Claro Premium Doxologos', async () => {
    render(<BlogManagementDashboard />);

    expect(screen.getByText('Gestão do Blog & Substack')).toBeInTheDocument();
    expect(screen.getByText(/Substack RSS Feed/)).toBeInTheDocument();
    expect(screen.getByText('Sincronizar Substack')).toBeInTheDocument();
  });

  it('deve carregar e listar os artigos retornados do Supabase', async () => {
    render(<BlogManagementDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Liderança eclesiástica para além da aparência').length).toBeGreaterThan(0);
      expect(screen.getAllByText('O choro que o algoritmo compra').length).toBeGreaterThan(0);
    });
  });

  it('deve filtrar artigos pela busca de texto', async () => {
    render(<BlogManagementDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Liderança eclesiástica para além da aparência').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Buscar artigo por título ou tema/i);
    fireEvent.change(searchInput, { target: { value: 'algoritmo' } });

    expect(screen.queryByText('Liderança eclesiástica para além da aparência')).not.toBeInTheDocument();
    expect(screen.getAllByText('O choro que o algoritmo compra').length).toBeGreaterThan(0);
  });

  it('deve filtrar artigos por status (Visíveis vs Ocultos)', async () => {
    render(<BlogManagementDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Visíveis \(1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Ocultos \(1\)/)).toBeInTheDocument();
    });

    // Clicar em Ocultos
    fireEvent.click(screen.getByText(/Ocultos \(1\)/));
    expect(screen.queryByText('Liderança eclesiástica para além da aparência')).not.toBeInTheDocument();
    expect(screen.getAllByText('O choro que o algoritmo compra').length).toBeGreaterThan(0);
  });
});
