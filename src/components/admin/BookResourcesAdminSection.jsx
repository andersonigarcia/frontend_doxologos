/**
 * BookResourcesAdminSection.jsx
 * 
 * Seção de Gestão do Book Companion no Painel Administrativo.
 * 
 * Funcionalidades:
 * - Visão geral de métricas (Visualizações, Downloads Gratuitos, Vendas Clínicas, Faturamento)
 * - Listagem de recursos com busca e status
 * - Upload Direto de PDFs (Drag & Drop / Botão Selecionar) para o Supabase Storage (book-files)
 * - Explorador e Seletor de Arquivos do Bucket integrado no Modal e em aba dedicada
 * - Detecção de arquivos órfãos no Bucket com criação de recurso em 1 clique
 * - Criação e Edição de Slugs / Recursos (QR Code Companion)
 * - Tabela de Leads & Vendas recentes (downloads efetuados)
 * - Prévia e cópia do link do QR Code (/r/:slug)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Plus, Search, ExternalLink, Edit2, Trash2,
    Eye, Download, ShoppingBag, DollarSign, Copy, Check,
    AlertCircle, RefreshCw, QrCode, CheckCircle2, XCircle,
    FileText, User, Mail, Sparkles, Filter, Loader2,
    Upload, Folder, FolderOpen, HardDrive, FileCheck,
    FileWarning, ArrowUpRight, Link2, ShieldCheck, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { QRCodeSVG } from 'qrcode.react';

const INITIAL_RESOURCE_STATE = {
    id: null,
    slug: '',
    chapter_number: '',
    book_title: 'Livro Doxologos',
    title: '',
    description: '',
    chapter_context: '',
    bridge_text: '',
    free_file_url: '',
    free_file_label: 'Baixar Material Gratuito',
    has_paid_version: false,
    paid_title: '',
    paid_description: '',
    paid_price_brl: '27.90',
    paid_file_url: '',
    paid_license_type: 'clinical',
    paid_file_label: 'Adquirir Versão Clínica',
    is_active: true
};

const BUCKET_NAME = 'book-files';

export default function BookResourcesAdminSection() {
    const { toast } = useToast();
    const [resources, setResources] = useState([]);
    const [recentDownloads, setRecentDownloads] = useState([]);
    const [bucketFiles, setBucketFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bucketLoading, setBucketLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [storageSearchTerm, setStorageSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('resources'); // 'resources' | 'storage' | 'leads'

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentResource, setCurrentResource] = useState(INITIAL_RESOURCE_STATE);
    const [saving, setSaving] = useState(false);

    // Upload states inside modal
    const [uploadingFree, setUploadingFree] = useState(false);
    const [uploadingPaid, setUploadingPaid] = useState(false);
    const [customUrlModeFree, setCustomUrlModeFree] = useState(false);
    const [customUrlModePaid, setCustomUrlModePaid] = useState(false);

    // Storage file picker inside modal
    const [storagePickerOpen, setStoragePickerOpen] = useState(false);
    const [storagePickerTarget, setStoragePickerTarget] = useState('free'); // 'free' | 'paid'
    const [pickerSearchTerm, setPickerSearchTerm] = useState('');

    // Storage tab state
    const [uploadingStorageTab, setUploadingStorageTab] = useState(false);
    const storageFileInputRef = useRef(null);

    // QR Preview modal
    const [qrPreviewResource, setQrPreviewResource] = useState(null);
    const [copiedSlug, setCopiedSlug] = useState(null);

    // Helper: Obter URL pública de um arquivo no bucket
    const getFilePublicUrl = (fileName) => {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        return data?.publicUrl || '';
    };

    // Helper: Extrair nome do arquivo a partir de uma URL do Supabase Storage
    const extractFileNameFromUrl = (url) => {
        if (!url) return '';
        try {
            const parts = url.split('/');
            const rawName = parts[parts.length - 1].split('?')[0];
            return decodeURIComponent(rawName);
        } catch {
            return url;
        }
    };

    // Helper: Sanitizar nome de arquivo
    const sanitizeFileName = (originalName, prefix = '') => {
        const ext = originalName.split('.').pop().toLowerCase();
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
        const cleanName = nameWithoutExt
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '_')
            .replace(/_+/g, '_');
        return prefix ? `${prefix}-${cleanName}.${ext}` : `${cleanName}.${ext}`;
    };

    // Helper: Formatar tamanho de arquivo
    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // Carregar arquivos do Storage (Bucket)
    const loadBucketFiles = useCallback(async () => {
        setBucketLoading(true);
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .list('', {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) {
                console.warn('Erro ao listar arquivos do bucket book-files:', error);
                setBucketFiles([]);
            } else {
                // Filtra pastas vazias ou placeholders
                const filesOnly = (data || []).filter(f => f.name && !f.name.startsWith('.emptyFolderPlaceholder'));
                setBucketFiles(filesOnly);
            }
        } catch (err) {
            console.error('Erro ao conectar ao storage:', err);
            setBucketFiles([]);
        } finally {
            setBucketLoading(false);
        }
    }, []);

    // Carregar todos os dados (Tabelas + Storage)
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Recursos
            const { data: resData, error: resErr } = await supabase
                .from('book_resources')
                .select('*')
                .order('chapter_number', { ascending: true, nullsFirst: false });

            if (resErr) throw resErr;
            setResources(resData || []);

            // 2. Downloads / Leads recentes
            const { data: dlData, error: dlErr } = await supabase
                .from('user_book_downloads')
                .select(`
                    *,
                    resource:resource_id (title, slug, chapter_number)
                `)
                .order('created_at', { ascending: false })
                .limit(50);

            if (dlErr) throw dlErr;
            setRecentDownloads(dlData || []);

            // 3. Arquivos do Bucket
            await loadBucketFiles();
        } catch (error) {
            console.error('Erro ao carregar dados do Book Companion:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar dados',
                description: error.message || 'Verifique as permissões de banco e storage.'
            });
        } finally {
            setLoading(false);
        }
    }, [toast, loadBucketFiles]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Métricas
    const totalViews = resources.reduce((acc, r) => acc + (r.view_count || 0), 0);
    const totalDownloads = resources.reduce((acc, r) => acc + (r.download_count || 0), 0);
    const totalPurchases = resources.reduce((acc, r) => acc + (r.purchase_count || 0), 0);
    const totalRevenue = recentDownloads
        .filter(d => d.download_type === 'paid' && d.payment_status === 'completed')
        .reduce((acc, d) => acc + Number(d.paid_amount_brl || 0), 0);

    // Upload direto de arquivo dentro do Modal
    const handleFileUpload = async (file, target = 'free') => {
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf') && !file.type.includes('pdf')) {
            toast({
                variant: 'destructive',
                title: 'Formato inválido',
                description: 'Por favor, envie um arquivo em formato PDF.'
            });
            return;
        }

        if (target === 'free') setUploadingFree(true);
        else setUploadingPaid(true);

        try {
            const prefix = currentResource.slug?.trim() ? currentResource.slug.trim() : `mat${Date.now()}`;
            const cleanName = sanitizeFileName(file.name, prefix);

            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(cleanName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const publicUrl = getFilePublicUrl(cleanName);

            if (target === 'free') {
                setCurrentResource(prev => ({
                    ...prev,
                    free_file_url: publicUrl
                }));
            } else {
                setCurrentResource(prev => ({
                    ...prev,
                    paid_file_url: publicUrl
                }));
            }

            toast({
                title: 'Upload concluído!',
                description: `Arquivo salvo com sucesso: ${cleanName}`
            });

            // Atualiza a lista do bucket em background
            loadBucketFiles();
        } catch (error) {
            console.error('Erro no upload:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao enviar arquivo',
                description: error.message || 'Verifique as permissões do bucket no Supabase.'
            });
        } finally {
            if (target === 'free') setUploadingFree(false);
            else setUploadingPaid(false);
        }
    };

    // Upload direto na aba de Storage
    const handleStorageTabUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingStorageTab(true);
        try {
            const cleanName = sanitizeFileName(file.name);
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(cleanName, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) throw error;

            toast({
                title: 'Arquivo adicionado ao Bucket!',
                description: cleanName
            });

            loadBucketFiles();
        } catch (err) {
            console.error('Erro no upload storage:', err);
            toast({
                variant: 'destructive',
                title: 'Falha no upload',
                description: err.message
            });
        } finally {
            setUploadingStorageTab(false);
            if (storageFileInputRef.current) {
                storageFileInputRef.current.value = '';
            }
        }
    };

    // Excluir arquivo do Storage
    const handleDeleteBucketFile = async (fileName) => {
        const linkedResource = resources.find(r =>
            r.free_file_url?.includes(fileName) || r.paid_file_url?.includes(fileName)
        );

        if (linkedResource) {
            const confirmMsg = `ATENÇÃO: O arquivo "${fileName}" está vinculado ao material "${linkedResource.title}" (Cap. ${linkedResource.chapter_number || 'S/N'}). Se você excluí-lo, os leitores terão erro 404 ao escanear o QR Code.\n\nDeseja realmente excluir?`;
            if (!window.confirm(confirmMsg)) return;
        } else {
            if (!window.confirm(`Tem certeza que deseja excluir o arquivo "${fileName}" do bucket?`)) return;
        }

        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([fileName]);

            if (error) throw error;

            toast({ title: 'Arquivo excluído do bucket com sucesso.' });
            loadBucketFiles();
        } catch (err) {
            console.error('Erro ao excluir do bucket:', err);
            toast({
                variant: 'destructive',
                title: 'Erro ao excluir',
                description: err.message
            });
        }
    };

    // Criar material a partir de um arquivo do bucket (1 clique)
    const handleCreateFromBucketFile = (file) => {
        const publicUrl = getFilePublicUrl(file.name);

        // Extrair sugestões inteligentes do nome do arquivo
        let suggestedChapter = '';
        const capMatch = file.name.match(/cap(?:itulo)?[_-]?0*(\d+)/i);
        if (capMatch) {
            suggestedChapter = capMatch[1];
        }

        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        const humanTitle = nameWithoutExt
            .replace(/[_-]+/g, ' ')
            .replace(/qrcode/i, '')
            .replace(/mat\d*/i, '')
            .trim();

        const cleanSlug = nameWithoutExt
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-');

        setCurrentResource({
            ...INITIAL_RESOURCE_STATE,
            slug: cleanSlug || `material-${Date.now()}`,
            chapter_number: suggestedChapter,
            title: humanTitle || nameWithoutExt,
            free_file_url: publicUrl
        });

        setIsModalOpen(true);
    };

    // Selecionar arquivo existente do bucket para o modal
    const handleSelectFileFromPicker = (fileName) => {
        const publicUrl = getFilePublicUrl(fileName);
        if (storagePickerTarget === 'free') {
            setCurrentResource(prev => ({ ...prev, free_file_url: publicUrl }));
        } else {
            setCurrentResource(prev => ({ ...prev, paid_file_url: publicUrl }));
        }
        setStoragePickerOpen(false);
        toast({
            title: 'Arquivo vinculado!',
            description: fileName
        });
    };

    // Salvar recurso no banco de dados
    const handleSave = async (e) => {
        e.preventDefault();
        if (!currentResource.slug.trim()) {
            toast({ variant: 'destructive', title: 'Slug é obrigatório', description: 'Defina o identificador do QR Code.' });
            return;
        }
        if (!currentResource.title.trim()) {
            toast({ variant: 'destructive', title: 'Título é obrigatório' });
            return;
        }
        if (!currentResource.free_file_url.trim()) {
            toast({
                variant: 'destructive',
                title: 'Arquivo Gratuito é obrigatório',
                description: 'Faça upload de um PDF ou selecione um arquivo do bucket.'
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                slug: currentResource.slug.trim().toLowerCase(),
                chapter_number: currentResource.chapter_number ? parseInt(currentResource.chapter_number, 10) : null,
                book_title: currentResource.book_title.trim() || 'Livro Doxologos',
                title: currentResource.title.trim(),
                description: currentResource.description?.trim() || null,
                chapter_context: currentResource.chapter_context?.trim() || null,
                bridge_text: currentResource.bridge_text?.trim() || null,
                free_file_url: currentResource.free_file_url.trim(),
                free_file_label: currentResource.free_file_label?.trim() || 'Baixar Material Gratuito',
                has_paid_version: Boolean(currentResource.has_paid_version),
                paid_title: currentResource.has_paid_version ? (currentResource.paid_title?.trim() || null) : null,
                paid_description: currentResource.has_paid_version ? (currentResource.paid_description?.trim() || null) : null,
                paid_price_brl: currentResource.has_paid_version ? parseFloat(currentResource.paid_price_brl || 0) : 0,
                paid_file_url: currentResource.has_paid_version ? (currentResource.paid_file_url?.trim() || null) : null,
                paid_license_type: currentResource.paid_license_type || 'clinical',
                paid_file_label: currentResource.has_paid_version ? (currentResource.paid_file_label?.trim() || 'Adquirir Versão Clínica') : null,
                is_active: Boolean(currentResource.is_active)
            };

            if (currentResource.id) {
                // Update
                const { error } = await supabase
                    .from('book_resources')
                    .update(payload)
                    .eq('id', currentResource.id);
                if (error) throw error;
                toast({ title: 'Recurso atualizado com sucesso!' });
            } else {
                // Insert
                const { error } = await supabase
                    .from('book_resources')
                    .insert([payload]);
                if (error) throw error;
                toast({ title: 'Novo recurso criado com sucesso!' });
            }

            setIsModalOpen(false);
            loadData();
        } catch (error) {
            console.error('Erro ao salvar recurso:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar',
                description: error.message || 'Slug duplicado ou erro de validação.'
            });
        } finally {
            setSaving(false);
        }
    };

    // Alternar status ativo
    const toggleActive = async (resource) => {
        try {
            const { error } = await supabase
                .from('book_resources')
                .update({ is_active: !resource.is_active })
                .eq('id', resource.id);

            if (error) throw error;
            setResources(prev => prev.map(r => r.id === resource.id ? { ...r, is_active: !r.is_active } : r));
            toast({ title: `Recurso ${!resource.is_active ? 'ativado' : 'desativado'}.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao alterar status', description: error.message });
        }
    };

    // Excluir recurso
    const handleDelete = async (id, title) => {
        if (!window.confirm(`Tem certeza que deseja excluir o recurso "${title}"?`)) return;

        try {
            const { error } = await supabase
                .from('book_resources')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setResources(prev => prev.filter(r => r.id !== id));
            toast({ title: 'Recurso excluído com sucesso.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
        }
    };

    // Copiar URL do QR Code
    const copyUrl = (slug) => {
        const url = `${window.location.origin}/r/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
        toast({ title: 'Link copiado!', description: url });
    };

    // Filtros
    const filteredResources = resources.filter(r =>
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.chapter_number?.toString().includes(searchTerm)
    );

    const filteredStorageFiles = bucketFiles.filter(f =>
        f.name?.toLowerCase().includes(storageSearchTerm.toLowerCase())
    );

    const filteredPickerFiles = bucketFiles.filter(f =>
        f.name?.toLowerCase().includes(pickerSearchTerm.toLowerCase())
    );

    // Contagem de arquivos órfãos (arquivos no storage sem recurso cadastrado)
    const orphanFilesCount = bucketFiles.filter(file => {
        return !resources.some(r =>
            r.free_file_url?.includes(file.name) || r.paid_file_url?.includes(file.name)
        );
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 bg-emerald-100 text-[#2d8659] rounded-xl">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Book Companion (Materiais do Livro)</h2>
                            <p className="text-sm text-slate-500">Gestão integrada de QR Codes, uploads para o Storage e materiais complementares</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading || bucketLoading}
                        className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${(loading || bucketLoading) ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    <Button
                        onClick={() => {
                            setCurrentResource(INITIAL_RESOURCE_STATE);
                            setCustomUrlModeFree(false);
                            setCustomUrlModePaid(false);
                            setIsModalOpen(true);
                        }}
                        className="bg-[#2d8659] hover:bg-[#236b47] text-white gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Novo Material
                    </Button>
                </div>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visualizações (QR)</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{totalViews}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Eye className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Downloads Gratuitos</p>
                            <p className="text-2xl font-bold text-emerald-700 mt-1">{totalDownloads}</p>
                        </div>
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <Download className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas Clínicas</p>
                            <p className="text-2xl font-bold text-amber-700 mt-1">{totalPurchases}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita Gerada</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                R$ {totalRevenue.toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Abas: Recursos vs Storage vs Leads */}
            <div className="flex border-b border-slate-200 space-x-6">
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'resources'
                            ? 'border-[#2d8659] text-[#2d8659]'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Materiais Cadastrados ({resources.length})
                </button>

                <button
                    onClick={() => setActiveTab('storage')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'storage'
                            ? 'border-[#2d8659] text-[#2d8659]'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <HardDrive className="w-4 h-4" />
                    Arquivos no Storage ({bucketFiles.length})
                    {orphanFilesCount > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {orphanFilesCount} novo{orphanFilesCount > 1 ? 's' : ''}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('leads')}
                    className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                        activeTab === 'leads'
                            ? 'border-[#2d8659] text-[#2d8659]'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <User className="w-4 h-4" />
                    Histórico de Acessos & Leads ({recentDownloads.length})
                </button>
            </div>

            {/* Conteúdo Aba 1: Materiais Cadastrados */}
            {activeTab === 'resources' && (
                <div className="space-y-4">
                    {/* Barra de Busca */}
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                        <Search className="w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Buscar por título, slug ou capítulo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm"
                        />
                    </div>

                    {/* Tabela de Recursos */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Cap.</th>
                                        <th className="p-4">Material / Título</th>
                                        <th className="p-4">Slug do QR Code</th>
                                        <th className="p-4">Arquivo PDF</th>
                                        <th className="p-4">Versão Paga?</th>
                                        <th className="p-4 text-center">Visualizações</th>
                                        <th className="p-4 text-center">Downloads</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2d8659]" />
                                                Carregando materiais...
                                            </td>
                                        </tr>
                                    ) : filteredResources.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-slate-400">
                                                Nenhum material encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredResources.map((res) => {
                                            const freeFileName = extractFileNameFromUrl(res.free_file_url);
                                            return (
                                                <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-bold text-slate-900">
                                                        {res.chapter_number ? `Cap. ${res.chapter_number}` : '—'}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-semibold text-slate-900">{res.title}</div>
                                                        <div className="text-xs text-slate-400 truncate max-w-xs">{res.description || res.book_title}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold">
                                                                /r/{res.slug}
                                                            </code>
                                                            <button
                                                                onClick={() => copyUrl(res.slug)}
                                                                className="text-slate-400 hover:text-slate-600 p-1"
                                                                title="Copiar URL"
                                                            >
                                                                {copiedSlug === res.slug ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        {res.free_file_url ? (
                                                            <a
                                                                href={res.free_file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors font-medium max-w-[200px] truncate"
                                                                title={`Abrir PDF: ${freeFileName}`}
                                                            >
                                                                <FileCheck className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                                                                <span className="truncate">{freeFileName}</span>
                                                            </a>
                                                        ) : (
                                                            <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 text-[11px]">
                                                                Sem arquivo
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {res.has_paid_version ? (
                                                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                                R$ {Number(res.paid_price_brl || 0).toFixed(2).replace('.', ',')}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-slate-500">
                                                                Apenas Grátis
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center font-semibold text-slate-700">
                                                        {res.view_count || 0}
                                                    </td>
                                                    <td className="p-4 text-center font-semibold text-emerald-700">
                                                        {res.download_count || 0}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => toggleActive(res)}
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                res.is_active
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}
                                                        >
                                                            {res.is_active ? 'Ativo' : 'Inativo'}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-slate-900"
                                                                title="Ver QR Code"
                                                                onClick={() => setQrPreviewResource(res)}
                                                            >
                                                                <QrCode className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                                title="Testar Página"
                                                                onClick={() => window.open(`/r/${res.slug}`, '_blank')}
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                                                                title="Editar"
                                                                onClick={() => {
                                                                    setCurrentResource({
                                                                        ...res,
                                                                        paid_price_brl: res.paid_price_brl ? String(res.paid_price_brl) : '27.90'
                                                                    });
                                                                    setCustomUrlModeFree(false);
                                                                    setCustomUrlModePaid(false);
                                                                    setIsModalOpen(true);
                                                                }}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                                title="Excluir"
                                                                onClick={() => handleDelete(res.id, res.title)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo Aba 2: Explorador do Storage / Bucket */}
            {activeTab === 'storage' && (
                <div className="space-y-4">
                    {/* Header da Aba Storage com Upload Direto */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                            <Search className="w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Filtrar arquivos no bucket..."
                                value={storageSearchTerm}
                                onChange={(e) => setStorageSearchTerm(e.target.value)}
                                className="bg-white max-w-xs text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                ref={storageFileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleStorageTabUpload}
                                className="hidden"
                            />

                            <Button
                                onClick={() => storageFileInputRef.current?.click()}
                                disabled={uploadingStorageTab}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 text-xs"
                            >
                                {uploadingStorageTab ? (
                                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando...</>
                                ) : (
                                    <><Upload className="w-3.5 h-3.5" /> Enviar PDF para o Bucket</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Tabela de Arquivos do Storage */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4">Nome do Arquivo</th>
                                        <th className="p-4">Tamanho</th>
                                        <th className="p-4">Status de Vinculação</th>
                                        <th className="p-4">URL Pública</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bucketLoading ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                                                Carregando arquivos do bucket...
                                            </td>
                                        </tr>
                                    ) : filteredStorageFiles.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                Nenhum arquivo encontrado no bucket `book-files`.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStorageFiles.map((file) => {
                                            const publicUrl = getFilePublicUrl(file.name);
                                            const linkedResource = resources.find(r =>
                                                r.free_file_url?.includes(file.name) || r.paid_file_url?.includes(file.name)
                                            );

                                            return (
                                                <tr key={file.id || file.name} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                        <span className="font-mono text-xs text-slate-800">{file.name}</span>
                                                    </td>
                                                    <td className="p-4 text-xs text-slate-500">
                                                        {formatFileSize(file.metadata?.size)}
                                                    </td>
                                                    <td className="p-4">
                                                        {linkedResource ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 text-xs">
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                    Vinculado: Cap. {linkedResource.chapter_number || '—'}
                                                                </Badge>
                                                                <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                                                    {linkedResource.title}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 gap-1 text-xs font-semibold">
                                                                <Sparkles className="w-3 h-3 text-amber-600" />
                                                                Novo / Órfão (Sem Recurso)
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-1.5 max-w-xs">
                                                            <span className="text-xs text-slate-400 font-mono truncate">
                                                                {publicUrl}
                                                            </span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(publicUrl);
                                                                    toast({ title: 'URL pública copiada!' });
                                                                }}
                                                                className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0"
                                                                title="Copiar URL"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!linkedResource && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleCreateFromBucketFile(file)}
                                                                    className="bg-[#2d8659] hover:bg-[#236b47] text-white text-xs gap-1 h-8"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                    Criar Material
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                                title="Visualizar / Baixar PDF"
                                                                onClick={() => window.open(publicUrl, '_blank')}
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </Button>

                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                                title="Excluir do Bucket"
                                                                onClick={() => handleDeleteBucketFile(file.name)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Conteúdo Aba 3: Leads & Downloads */}
            {activeTab === 'leads' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="p-4">Data / Hora</th>
                                    <th className="p-4">Material</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Lead / Comprador</th>
                                    <th className="p-4">E-mail</th>
                                    <th className="p-4">Status Pagamento</th>
                                    <th className="p-4">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2d8659]" />
                                            Carregando acessos...
                                        </td>
                                    </tr>
                                ) : recentDownloads.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400">
                                            Nenhum download registrado ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    recentDownloads.map((dl) => (
                                        <tr key={dl.id} className="hover:bg-slate-50/80">
                                            <td className="p-4 text-xs text-slate-500">
                                                {new Date(dl.created_at).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="p-4 font-semibold text-slate-900">
                                                {dl.resource?.title || 'Material'}
                                                {dl.resource?.chapter_number && (
                                                    <span className="text-xs text-slate-400 ml-1">
                                                        (Cap. {dl.resource.chapter_number})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {dl.download_type === 'paid' ? (
                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                        Compra Clínica
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                        Download Grátis
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="p-4 font-medium text-slate-900">
                                                {dl.lead_name || 'Leitor'}
                                            </td>
                                            <td className="p-4 text-slate-600 font-mono text-xs">
                                                {dl.lead_email || '—'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    dl.payment_status === 'completed'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : dl.payment_status === 'pending'
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {dl.payment_status === 'completed' ? 'Concluído' : dl.payment_status === 'pending' ? 'Pendente' : dl.payment_status}
                                                </span>
                                            </td>
                                            <td className="p-4 font-semibold text-slate-900">
                                                {dl.paid_amount_brl ? `R$ ${Number(dl.paid_amount_brl).toFixed(2).replace('.', ',')}` : 'Grátis'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Criação / Edição */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            {currentResource.id ? 'Editar Material do Livro' : 'Novo Material do Livro'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Preencha os dados do material que será aberto quando o leitor escanear o QR Code do capítulo.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-5 pt-2">
                        {/* Seção 1: Identificação */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="form-slug" className="text-xs font-bold text-slate-700">
                                    Slug do QR Code *
                                </Label>
                                <Input
                                    id="form-slug"
                                    placeholder="ex: cap04-ansiedade"
                                    value={currentResource.slug}
                                    onChange={e => setCurrentResource(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                    required
                                    className="font-mono text-sm"
                                />
                                <p className="text-[11px] text-slate-400">Imutável após impressão.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="form-chapter" className="text-xs font-bold text-slate-700">
                                    Nº do Capítulo
                                </Label>
                                <Input
                                    id="form-chapter"
                                    type="number"
                                    placeholder="ex: 4"
                                    value={currentResource.chapter_number || ''}
                                    onChange={e => setCurrentResource(prev => ({ ...prev, chapter_number: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="form-book-title" className="text-xs font-bold text-slate-700">
                                    Título do Livro
                                </Label>
                                <Input
                                    id="form-book-title"
                                    placeholder="Livro Doxologos"
                                    value={currentResource.book_title}
                                    onChange={e => setCurrentResource(prev => ({ ...prev, book_title: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Título & Descrição */}
                        <div className="space-y-1.5">
                            <Label htmlFor="form-title" className="text-xs font-bold text-slate-700">
                                Título do Material *
                            </Label>
                            <Input
                                id="form-title"
                                placeholder="ex: Diário de Reestruturação Cognitiva"
                                value={currentResource.title}
                                onChange={e => setCurrentResource(prev => ({ ...prev, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="form-description" className="text-xs font-bold text-slate-700">
                                Descrição Resumida
                            </Label>
                            <Input
                                id="form-description"
                                placeholder="Resumo do exercício que aparece na página"
                                value={currentResource.description || ''}
                                onChange={e => setCurrentResource(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="form-context" className="text-xs font-bold text-slate-700">
                                Contexto do Capítulo (Opcional)
                            </Label>
                            <Input
                                id="form-context"
                                placeholder="ex: No capítulo 4, você aprendeu sobre os pensamentos disfuncionais..."
                                value={currentResource.chapter_context || ''}
                                onChange={e => setCurrentResource(prev => ({ ...prev, chapter_context: e.target.value }))}
                            />
                        </div>

                        {/* Seção 2: Arquivo Gratuito (Upload Integrado / Picker) */}
                        <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                                    <Download className="w-4 h-4 text-emerald-600" />
                                    Material Gratuito (PDF para Download) *
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCustomUrlModeFree(!customUrlModeFree)}
                                    className="text-[11px] text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                                >
                                    <Link2 className="w-3 h-3" />
                                    {customUrlModeFree ? 'Voltar para Upload' : 'Editar URL Manual'}
                                </button>
                            </div>

                            {/* Se o arquivo já foi selecionado */}
                            {currentResource.free_file_url && !customUrlModeFree && (
                                <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5 truncate">
                                        <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        <div className="truncate">
                                            <p className="text-xs font-semibold text-slate-900 truncate">
                                                {extractFileNameFromUrl(currentResource.free_file_url)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate font-mono">
                                                {currentResource.free_file_url}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-blue-600 hover:text-blue-700"
                                            onClick={() => window.open(currentResource.free_file_url, '_blank')}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Testar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-red-600 hover:text-red-700"
                                            onClick={() => setCurrentResource(prev => ({ ...prev, free_file_url: '' }))}
                                        >
                                            Trocar
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Área de Upload e Seletor do Bucket quando não há arquivo ou quer trocar */}
                            {(!currentResource.free_file_url || customUrlModeFree) && (
                                <>
                                    {!customUrlModeFree ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {/* Opção 1: Upload Direto */}
                                            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 rounded-xl bg-white hover:bg-emerald-50/50 cursor-pointer transition-colors text-center group">
                                                <input
                                                    type="file"
                                                    accept=".pdf,application/pdf"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(file, 'free');
                                                    }}
                                                    disabled={uploadingFree}
                                                />
                                                {uploadingFree ? (
                                                    <div className="flex flex-col items-center">
                                                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-1" />
                                                        <span className="text-xs font-semibold text-emerald-800">Enviando PDF...</span>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload className="w-5 h-5 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                                                        <span className="text-xs font-bold text-slate-800">Subir PDF do Computador</span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5">Clique para selecionar</span>
                                                    </>
                                                )}
                                            </label>

                                            {/* Opção 2: Escolher do Bucket */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setStoragePickerTarget('free');
                                                    setStoragePickerOpen(true);
                                                }}
                                                className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors text-center group"
                                            >
                                                <FolderOpen className="w-5 h-5 text-slate-600 mb-1 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-bold text-slate-800">Escolher do Bucket</span>
                                                <span className="text-[10px] text-slate-400 mt-0.5">{bucketFiles.length} arquivo(s) disponível(is)</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-free-url" className="text-xs font-semibold text-slate-700">
                                                URL Pública do PDF *
                                            </Label>
                                            <Input
                                                id="form-free-url"
                                                placeholder="https://...supabase.co/storage/v1/object/public/book-files/..."
                                                value={currentResource.free_file_url}
                                                onChange={e => setCurrentResource(prev => ({ ...prev, free_file_url: e.target.value }))}
                                                required
                                                className="bg-white font-mono text-xs"
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="space-y-1.5 pt-1">
                                <Label htmlFor="form-free-label" className="text-xs font-semibold text-slate-700">
                                    Texto do Botão de Download
                                </Label>
                                <Input
                                    id="form-free-label"
                                    placeholder="Baixar Material Gratuito"
                                    value={currentResource.free_file_label || ''}
                                    onChange={e => setCurrentResource(prev => ({ ...prev, free_file_label: e.target.value }))}
                                    className="bg-white"
                                />
                            </div>
                        </div>

                        {/* Seção 3: Oferta Paga (Upsell Clínico) */}
                        <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                                    <Sparkles className="w-4 h-4 text-amber-600" />
                                    Versão Clínica Paga (Upsell / Micro-venda)
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="form-has-paid"
                                        checked={currentResource.has_paid_version}
                                        onCheckedChange={checked => setCurrentResource(prev => ({ ...prev, has_paid_version: checked }))}
                                    />
                                    <Label htmlFor="form-has-paid" className="text-xs font-semibold text-slate-700">
                                        Oferecer versão paga
                                    </Label>
                                </div>
                            </div>

                            {currentResource.has_paid_version && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="space-y-3 pt-2"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-paid-title" className="text-xs font-semibold text-slate-700">
                                                Título da Versão Clínica
                                            </Label>
                                            <Input
                                                id="form-paid-title"
                                                placeholder="ex: Versão Clínica com Guia do Terapeuta"
                                                value={currentResource.paid_title || ''}
                                                onChange={e => setCurrentResource(prev => ({ ...prev, paid_title: e.target.value }))}
                                                className="bg-white"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="form-paid-price" className="text-xs font-semibold text-slate-700">
                                                Preço (R$)
                                            </Label>
                                            <Input
                                                id="form-paid-price"
                                                type="number"
                                                step="0.10"
                                                placeholder="27.90"
                                                value={currentResource.paid_price_brl}
                                                onChange={e => setCurrentResource(prev => ({ ...prev, paid_price_brl: e.target.value }))}
                                                className="bg-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Arquivo da Versão Paga */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold text-slate-700">
                                                Arquivo da Versão Clínica (PDF)
                                            </Label>
                                            <button
                                                type="button"
                                                onClick={() => setCustomUrlModePaid(!customUrlModePaid)}
                                                className="text-[11px] text-amber-800 hover:underline flex items-center gap-1"
                                            >
                                                <Link2 className="w-3 h-3" />
                                                {customUrlModePaid ? 'Voltar para Upload' : 'Editar URL Manual'}
                                            </button>
                                        </div>

                                        {currentResource.paid_file_url && !customUrlModePaid ? (
                                            <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5 truncate">
                                                    <FileCheck className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                                    <div className="truncate">
                                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                                            {extractFileNameFromUrl(currentResource.paid_file_url)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 truncate font-mono">
                                                            {currentResource.paid_file_url}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs text-red-600 hover:text-red-700"
                                                    onClick={() => setCurrentResource(prev => ({ ...prev, paid_file_url: '' }))}
                                                >
                                                    Trocar
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {!customUrlModePaid ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-amber-300 rounded-xl bg-white hover:bg-amber-50/50 cursor-pointer transition-colors text-center group">
                                                            <input
                                                                type="file"
                                                                accept=".pdf,application/pdf"
                                                                className="hidden"
                                                                onChange={e => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileUpload(file, 'paid');
                                                                }}
                                                                disabled={uploadingPaid}
                                                            />
                                                            {uploadingPaid ? (
                                                                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Upload className="w-4 h-4 text-amber-600 mb-1" />
                                                                    <span className="text-xs font-bold text-slate-800">Subir PDF Clínico</span>
                                                                </>
                                                            )}
                                                        </label>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setStoragePickerTarget('paid');
                                                                setStoragePickerOpen(true);
                                                            }}
                                                            className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-colors text-center"
                                                        >
                                                            <FolderOpen className="w-4 h-4 text-slate-600 mb-1" />
                                                            <span className="text-xs font-bold text-slate-800">Escolher do Bucket</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        placeholder="https://...supabase.co/storage/v1/object/public/book-files/..."
                                                        value={currentResource.paid_file_url || ''}
                                                        onChange={e => setCurrentResource(prev => ({ ...prev, paid_file_url: e.target.value }))}
                                                        className="bg-white font-mono text-xs"
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="form-bridge" className="text-xs font-semibold text-slate-700">
                                            Texto Ponte para a Plataforma
                                        </Label>
                                        <Input
                                            id="form-bridge"
                                            placeholder="ex: Nossos psicólogos utilizam esta ferramenta em sessões de TCC..."
                                            value={currentResource.bridge_text || ''}
                                            onChange={e => setCurrentResource(prev => ({ ...prev, bridge_text: e.target.value }))}
                                            className="bg-white"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Status Ativo */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Switch
                                id="form-active"
                                checked={currentResource.is_active}
                                onCheckedChange={checked => setCurrentResource(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="form-active" className="text-sm font-medium text-slate-700">
                                Recurso Ativo (página acessível publicamente via QR Code)
                            </Label>
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-[#2d8659] hover:bg-[#236b47] text-white"
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                                ) : (
                                    'Salvar Recurso'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Seletor de Arquivos do Bucket (Picker) */}
            <Dialog open={storagePickerOpen} onOpenChange={setStoragePickerOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-emerald-600" />
                            Selecionar Arquivo do Bucket (`book-files`)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Escolha um dos arquivos já disponíveis no Storage para preencher automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                            <Search className="w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Filtrar por nome..."
                                value={pickerSearchTerm}
                                onChange={(e) => setPickerSearchTerm(e.target.value)}
                                className="bg-white border-0 text-xs h-8 focus-visible:ring-0"
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                            {filteredPickerFiles.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400">
                                    Nenhum arquivo encontrado no bucket.
                                </div>
                            ) : (
                                filteredPickerFiles.map((file) => (
                                    <div
                                        key={file.id || file.name}
                                        className="p-3 hover:bg-emerald-50/60 flex items-center justify-between transition-colors group cursor-pointer"
                                        onClick={() => handleSelectFileFromPicker(file.name)}
                                    >
                                        <div className="flex items-center gap-2.5 truncate">
                                            <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                            <div className="truncate">
                                                <p className="text-xs font-semibold text-slate-800 font-mono truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400">
                                                    {formatFileSize(file.metadata?.size)}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white"
                                        >
                                            Selecionar
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setStoragePickerOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Prévia do QR Code */}
            <Dialog open={Boolean(qrPreviewResource)} onOpenChange={() => setQrPreviewResource(null)}>
                <DialogContent className="max-w-sm text-center">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            QR Code — {qrPreviewResource?.title}
                        </DialogTitle>
                    </DialogHeader>

                    {qrPreviewResource && (
                        <div className="flex flex-col items-center space-y-4 py-4">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm inline-block">
                                <QRCodeSVG
                                    value={`${window.location.origin}/r/${qrPreviewResource.slug}`}
                                    size={200}
                                    level="H"
                                    includeMargin
                                />
                            </div>

                            <div className="text-xs text-slate-500 font-mono bg-slate-100 px-3 py-1.5 rounded-lg break-all">
                                {`${window.location.origin}/r/${qrPreviewResource.slug}`}
                            </div>

                            <div className="flex gap-2 w-full">
                                <Button
                                    variant="outline"
                                    className="flex-1 text-xs"
                                    onClick={() => copyUrl(qrPreviewResource.slug)}
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Link
                                </Button>
                                <Button
                                    className="flex-1 bg-[#2d8659] hover:bg-[#236b47] text-white text-xs"
                                    onClick={() => window.open(`/r/${qrPreviewResource.slug}`, '_blank')}
                                >
                                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> Abrir
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
