import React, { useState, useEffect, useMemo } from 'react';
import {
    Newspaper,
    Search,
    Eye,
    EyeOff,
    Trash2,
    RefreshCw,
    ExternalLink,
    Sparkles,
    AlertCircle,
    Calendar,
    CheckCircle2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/customSupabaseClient';

export const BlogManagementDashboard = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'published', 'draft'
    const [syncing, setSyncing] = useState(false);
    const { toast } = useToast();

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    useEffect(() => {
        fetchArticles();
    }, []);

    // Edge function auxiliar (fallback para casos de restrição estrita de RLS)
    const callAdminEdgeFunction = async (body) => {
        const { data, error } = await supabase.functions.invoke('admin-update-article', {
            body: body
        });

        if (error) {
            console.warn('[BlogMgmt] Edge function error:', error);
            let errorMsg = 'Erro na operação administrativa';
            try {
                if (error.context && typeof error.context.json === 'function') {
                    const errorJson = await error.context.json();
                    errorMsg = errorJson.details ? `${errorJson.error} - ${errorJson.details}` : (errorJson.error || error.message);
                } else {
                    errorMsg = error.message || 'Erro ao chamar função de gestão de artigos';
                }
            } catch (e) {
                errorMsg = error.message;
            }
            throw new Error(errorMsg);
        }

        return data;
    };

    // Carregamento resiliente: prioriza consulta direta ao banco e usa Edge Function como fallback
    const fetchArticles = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            // 1. Consulta direta à tabela artigos (padrão canônico do Supabase)
            const { data, error } = await supabase
                .from('artigos')
                .select('*')
                .order('published_at', { ascending: false });

            if (!error && Array.isArray(data)) {
                setArticles(data);
                return;
            }

            // 2. Se a consulta direta retornar erro de RLS, tentar via Edge Function com service_role
            console.warn('[BlogMgmt] Consulta direta falhou, acionando Edge Function:', error?.message);
            const response = await callAdminEdgeFunction({ action: 'list' });
            setArticles(response?.articles || []);
        } catch (error) {
            console.error('Erro ao buscar artigos do blog:', error);
            setFetchError(error.message || 'Não foi possível carregar os artigos do blog.');
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar artigos',
                description: error.message || 'Não foi possível carregar os artigos do blog.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            toast({
                title: 'Sincronizando com o Substack...',
                description: 'Buscando publicações recentes no feed RSS oficial.'
            });

            const { data, error } = await supabase.functions.invoke('sync-substack-manual', {
                body: { substackUrl: 'https://doxologosoficial.substack.com/feed' }
            });

            if (error) {
                let errorMsg = 'Falha ao sincronizar com o feed do Substack';
                if (error.context && typeof error.context.json === 'function') {
                    const errorJson = await error.context.json();
                    errorMsg = errorJson.error || error.message;
                } else {
                    errorMsg = error.message;
                }
                throw new Error(errorMsg);
            }

            toast({
                title: 'Sincronização concluída com sucesso!',
                description: `Novos: ${data?.stats?.novos || 0} | Atualizados: ${data?.stats?.atualizados || 0}`
            });

            // Recarregar a lista atualizada
            fetchArticles();
        } catch (e) {
            console.error('Erro na sincronização:', e);
            toast({
                variant: 'destructive',
                title: 'Erro na Sincronização',
                description: e.message || 'Falha ao buscar publicações do Substack.'
            });
        } finally {
            setSyncing(false);
        }
    };

    const toggleVisibility = async (article) => {
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        try {
            // 1. Tentar atualização direta no Supabase
            const { error: directError } = await supabase
                .from('artigos')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', article.id);

            // 2. Se houver erro de RLS, tentar via Edge Function
            if (directError) {
                console.warn('[BlogMgmt] Update direto bloqueado por RLS, tentando Edge Function...');
                await callAdminEdgeFunction({
                    action: 'update_status',
                    article_id: article.id,
                    status: newStatus
                });
            }

            toast({
                title: 'Status atualizado com sucesso',
                description: `O artigo "${article.title}" agora está ${newStatus === 'published' ? 'visível para o público' : 'oculto (rascunho)'}.`
            });

            setArticles(prev => prev.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao alterar visibilidade',
                description: error.message || 'Não foi possível alterar o status do artigo.'
            });
        }
    };

    const handleDelete = (article) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Artigo da Plataforma',
            message: `Tem certeza que deseja excluir o artigo "${article.title}"? Esta ação removerá a publicação do site Doxologos (o post original permanecerá preservado no Substack).`,
            onConfirm: async () => {
                try {
                    // 1. Tentar exclusão direta
                    const { error: directError } = await supabase
                        .from('artigos')
                        .delete()
                        .eq('id', article.id);

                    // 2. Fallback via Edge Function
                    if (directError) {
                        console.warn('[BlogMgmt] Delete direto bloqueado por RLS, tentando Edge Function...');
                        await callAdminEdgeFunction({
                            action: 'delete',
                            article_id: article.id
                        });
                    }

                    toast({
                        title: 'Artigo removido',
                        description: 'O artigo foi removido da plataforma com sucesso.'
                    });

                    setArticles(prev => prev.filter(a => a.id !== article.id));
                } catch (error) {
                    console.error('Erro ao excluir artigo:', error);
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao excluir artigo',
                        description: error.message || 'Não foi possível excluir o artigo.'
                    });
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Filtros combinados de pesquisa e status
    const filteredArticles = useMemo(() => {
        return articles.filter(a => {
            const matchesSearch = !searchTerm ||
                a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || a.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [articles, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = articles.length;
        const published = articles.filter(a => a.status === 'published').length;
        const drafts = total - published;
        return { total, published, drafts };
    }, [articles]);

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* CABEÇALHO DO BLOG - CARD CLARO PREMIUM DOXOLOGOS */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200/80 shadow-xs text-slate-900 font-sans">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200/80 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                                Gestão de Conteúdo & SEO
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Substack RSS Feed • Publicações Oficiais
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Gestão do Blog & Substack
                        </h1>
                        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                            Sincronização automatizada da newsletter Doxologos via RSS, curadoria de visibilidade e indexação para atração orgânica de pacientes.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Button
                            size="sm"
                            onClick={fetchArticles}
                            variant="outline"
                            disabled={loading}
                            className="flex-1 sm:flex-initial border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 sm:h-9 bg-white shadow-2xs gap-1.5 touch-manipulation"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar Lista
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-10 sm:h-9 gap-1.5 shadow-xs touch-manipulation"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Substack'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* SELETOR DE STATUS, BUSCA E CONTADORES */}
            <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-4 font-sans">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Input de Busca */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar artigo por título ou tema..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200/80 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900 transition-all"
                        />
                    </div>

                    {/* Chips de Filtro de Status sem scrollbar visível */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todos ({stats.total})
                        </button>
                        <button
                            onClick={() => setStatusFilter('published')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                statusFilter === 'published'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Visíveis ({stats.published})
                        </button>
                        <button
                            onClick={() => setStatusFilter('draft')}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all touch-manipulation whitespace-nowrap ${
                                statusFilter === 'draft'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Ocultos ({stats.drafts})
                        </button>
                    </div>
                </div>

                {/* ALERTA DE ERRO DE CONEXÃO COM AÇÃO DE RETRY */}
                {fetchError && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span><strong>Falha ao carregar artigos:</strong> {fetchError}</span>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={fetchArticles}
                            className="text-xs border-rose-300 text-rose-800 hover:bg-rose-100 h-8"
                        >
                            Tentar Novamente
                        </Button>
                    </div>
                )}

                {/* ESTADO DE CARREGAMENTO */}
                {loading ? (
                    <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-800" />
                        <p>Carregando publicações do blog...</p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    /* ESTADO VAZIO COM ORIENTAÇÃO */
                    <div className="py-12 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 max-w-lg mx-auto my-4 space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center mx-auto font-bold">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">
                            {searchTerm ? 'Nenhum artigo corresponde à busca' : 'Nenhum artigo encontrado'}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            {searchTerm
                                ? `Não encontramos artigos com o termo "${searchTerm}". Tente buscar por palavras-chave mais gerais.`
                                : 'Você pode sincronizar os artigos publicados no Substack clicando no botão abaixo.'}
                        </p>
                        {!searchTerm && (
                            <Button
                                size="sm"
                                onClick={handleSync}
                                disabled={syncing}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold h-9 gap-1.5 shadow-xs mx-auto"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                                Sincronizar Agora com o Substack
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {/* VISÃO MOBILE: CARDS COMPACTOS (< 640px) */}
                        <div className="block sm:hidden space-y-3">
                            {filteredArticles.map(article => (
                                <div
                                    key={article.id}
                                    className="p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-2.5"
                                >
                                    <div className="flex gap-3 items-start">
                                        {article.cover_image_url && (
                                            <img
                                                src={article.cover_image_url}
                                                alt="Capa"
                                                className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                                                loading="lazy"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="tabular-nums">{formatDate(article.published_at)}</span>
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                    article.status === 'published'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    {article.status === 'published' ? 'Visível' : 'Oculto'}
                                                </span>
                                            </div>
                                            <h4 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug">
                                                {article.title}
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                        <a
                                            href={`/artigos/${article.slug}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] font-semibold text-slate-900 hover:underline flex items-center gap-1"
                                        >
                                            Ver no site <ExternalLink className="w-3 h-3" />
                                        </a>

                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleVisibility(article)}
                                                className={`h-8 px-2.5 text-xs border-slate-200 ${
                                                    article.status === 'published'
                                                        ? 'text-slate-600 hover:bg-slate-100'
                                                        : 'text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50'
                                                }`}
                                                title={article.status === 'published' ? 'Ocultar artigo' : 'Exibir artigo'}
                                            >
                                                {article.status === 'published' ? (
                                                    <span className="flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Ocultar</span>
                                                ) : (
                                                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Publicar</span>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(article)}
                                                className="h-8 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                                                title="Excluir da plataforma"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* VISÃO DESKTOP: TABELA ELEGANTE CLEAN ANALYTICS (>= 640px) */}
                        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200/80">
                            <table className="w-full text-left border-collapse text-xs text-slate-700">
                                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <tr>
                                        <th className="p-3.5">Artigo Publicado</th>
                                        <th className="p-3.5 w-32 text-center">Data</th>
                                        <th className="p-3.5 w-28 text-center">Status</th>
                                        <th className="p-3.5 w-36 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredArticles.map(article => (
                                        <tr key={article.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="p-3.5">
                                                <div className="flex items-center gap-3">
                                                    {article.cover_image_url ? (
                                                        <img
                                                            src={article.cover_image_url}
                                                            alt="Capa"
                                                            className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                                            <Newspaper className="w-5 h-5 opacity-60" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-slate-900 line-clamp-1 text-xs sm:text-sm">
                                                            {article.title}
                                                        </p>
                                                        <a
                                                            href={`/artigos/${article.slug}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-[11px] text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                                                        >
                                                            Ver publicação no site <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3.5 text-center text-slate-600 font-mono text-[11px] tabular-nums">
                                                {formatDate(article.published_at)}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                    article.status === 'published'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                                }`}>
                                                    {article.status === 'published' ? 'Visível' : 'Oculto'}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleVisibility(article)}
                                                        className={`h-8 px-2.5 text-xs border-slate-200 ${
                                                            article.status === 'published'
                                                                ? 'text-slate-600 hover:bg-slate-100'
                                                                : 'text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50'
                                                        }`}
                                                        title={article.status === 'published' ? 'Ocultar artigo' : 'Tornar artigo público'}
                                                    >
                                                        {article.status === 'published' ? (
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Eye className="w-3.5 h-3.5" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDelete(article)}
                                                        className="h-8 px-2 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                                                        title="Excluir da plataforma"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Excluir"
                cancelText="Cancelar"
                isDestructive={true}
            />
        </div>
    );
};

export default BlogManagementDashboard;
