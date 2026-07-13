import React, { useState, useEffect } from 'react';
import { Newspaper, Search, Eye, EyeOff, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/customSupabaseClient';

const BlogManagementDashboard = () => {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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

    // Helper: chama a edge function admin-update-article com o token do admin
    const callAdminEdgeFunction = async (body) => {
        // Padrão idêntico ao AdminUsuariosPage (que funciona com admin-list-users)
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        
        console.log('[BlogMgmt] session check:', { 
            hasSession: !!sessionData?.session, 
            hasToken: !!accessToken,
            tokenPrefix: accessToken?.substring(0, 20) 
        });

        if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-article`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );

        const json = await res.json();
        if (!res.ok) {
            const errorMsg = json.details ? `${json.error} - ${json.details}` : (json.error || 'Erro desconhecido na operação');
            throw new Error(errorMsg);
        }
        return json;
    };

    const fetchArticles = async () => {
        try {
            setLoading(true);
            // Busca todos os artigos (incluindo rascunhos/ocultos) bypassando o RLS do cliente
            const response = await callAdminEdgeFunction({ action: 'list' });
            setArticles(response.articles || []);
        } catch (error) {
            console.error('Erro ao buscar artigos:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar',
                description: error.message || 'Não foi possível carregar os artigos do blog.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            toast({ title: 'Sincronizando...', description: 'Buscando artigos do Substack.' });
            
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-substack-manual`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ substackUrl: 'https://doxologosoficial.substack.com/feed' })
            });
            
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Erro desconhecido na sincronização');
            
            toast({ 
                title: 'Sincronização concluída!', 
                description: `Novos: ${json.stats?.novos || 0} | Atualizados: ${json.stats?.atualizados || 0}` 
            });
            
            // Reload list
            fetchArticles();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Erro na Sincronização', description: e.message });
        } finally {
            setSyncing(false);
        }
    };

    const toggleVisibility = async (article) => {
        // 'draft' = oculto, 'published' = visível (valores válidos do schema)
        const newStatus = article.status === 'published' ? 'draft' : 'published';
        try {
            await callAdminEdgeFunction({
                action: 'update_status',
                article_id: article.id,
                status: newStatus
            });

            toast({
                title: 'Status atualizado',
                description: `Artigo "${article.title}" agora está ${newStatus === 'published' ? 'visível' : 'oculto'}.`
            });
            
            setArticles(articles.map(a => a.id === article.id ? { ...a, status: newStatus } : a));
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar visibilidade',
                description: error.message || 'Não foi possível atualizar a visibilidade do artigo.'
            });
        }
    };

    const handleDelete = (article) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Excluir Artigo',
            message: `Tem certeza que deseja excluir o artigo "${article.title}"? Isso removerá o artigo apenas da plataforma, não afetará o Substack.`,
            onConfirm: async () => {
                try {
                    await callAdminEdgeFunction({
                        action: 'delete',
                        article_id: article.id
                    });

                    toast({
                        title: 'Artigo excluído',
                        description: 'O artigo foi removido da plataforma com sucesso.'
                    });
                    
                    setArticles(articles.filter(a => a.id !== article.id));
                } catch (error) {
                    console.error('Erro ao excluir artigo:', error);
                    toast({
                        variant: 'destructive',
                        title: 'Erro',
                        description: error.message || 'Não foi possível excluir o artigo.'
                    });
                } finally {
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pt-BR');
    };

    const filteredArticles = articles.filter(a => 
        a.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Newspaper className="w-6 h-6 mr-2 text-[#2d8659]" />
                Gestão do Blog (Substack)
            </h2>

            {/* Top Bar: Sync and Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar artigo por título..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-[#2d8659] focus:border-[#2d8659]"
                    />
                </div>
                
                <Button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="bg-[#2d8659] hover:bg-[#236b47] flex items-center gap-2 whitespace-nowrap"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </Button>
            </div>

            {/* Articles List */}
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
                        <tr>
                            <th className="p-4 font-semibold text-sm">Artigo</th>
                            <th className="p-4 font-semibold text-sm w-32 text-center">Data</th>
                            <th className="p-4 font-semibold text-sm w-32 text-center">Status</th>
                            <th className="p-4 font-semibold text-sm w-40 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500">Carregando artigos...</td>
                            </tr>
                        ) : filteredArticles.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-gray-500">
                                    Nenhum artigo encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredArticles.map(article => (
                                <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {article.cover_image_url && (
                                                <img src={article.cover_image_url} alt="Capa" className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-900 line-clamp-1">{article.title}</p>
                                                <a 
                                                    href={`/artigos/${article.slug}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs text-[#2d8659] hover:underline flex items-center mt-1"
                                                >
                                                    Ver na plataforma <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-sm text-gray-600">
                                        {formatDate(article.published_at)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {article.status === 'published' ? 'Visível' : 'Oculto'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => toggleVisibility(article)}
                                                className={`px-2 py-1 h-8 ${
                                                    article.status === 'published' ? 'text-gray-500 hover:text-gray-700' : 'text-[#2d8659] hover:text-[#236b47]'
                                                }`}
                                                title={article.status === 'published' ? 'Ocultar artigo' : 'Exibir artigo'}
                                            >
                                                {article.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(article)}
                                                className="px-2 py-1 h-8"
                                                title="Excluir da plataforma"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
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
