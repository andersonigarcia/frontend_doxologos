/**
 * BookShelfSection.jsx
 * 
 * Seção "Meus Materiais do Livro" exibida na Área do Paciente.
 * Lista todos os materiais (gratuitos + pagos) que o usuário já desbloqueou
 * ao escanear os QR Codes do livro.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    BookOpen, Download, CheckCircle, ShoppingBag,
    ChevronRight, Loader2, Library
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getUserBookShelf } from '@/services/bookResourceService';

export default function BookShelfSection() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;

        const load = async () => {
            setLoading(true);
            const { data } = await getUserBookShelf(user.id);
            setItems(data || []);
            setLoading(false);
        };

        load();
    }, [user?.id]);

    const triggerDownload = (url, title) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = title || 'material-doxologos.pdf';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <Library className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-600 font-semibold text-base mb-1">Sua estante está vazia</h3>
                <p className="text-gray-400 text-sm">
                    Escaneie os QR Codes do livro para desbloquear materiais complementares.
                </p>
            </div>
        );
    }

    // Separar gratuitos e pagos
    const freeItems = items.filter(i => i.download_type === 'free');
    const paidItems = items.filter(i => i.download_type === 'paid');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-gray-800">Meus Materiais do Livro</h2>
                <Badge variant="secondary" className="ml-auto text-xs">
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                </Badge>
            </div>

            {/* Materiais Pagos */}
            {paidItems.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5" /> Versões Clínicas Adquiridas
                    </p>
                    {paidItems.map((item, idx) => (
                        <ResourceCard
                            key={item.id}
                            item={item}
                            type="paid"
                            index={idx}
                            onDownload={triggerDownload}
                        />
                    ))}
                </div>
            )}

            {/* Materiais Gratuitos */}
            {freeItems.length > 0 && (
                <div className="space-y-3">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Materiais Gratuitos Baixados
                    </p>
                    {freeItems.map((item, idx) => (
                        <ResourceCard
                            key={item.id}
                            item={item}
                            type="free"
                            index={idx}
                            onDownload={triggerDownload}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ================================================================
// Card individual de material
// ================================================================
function ResourceCard({ item, type, index, onDownload }) {
    const resource = item.resource;
    if (!resource) return null;

    const isPaid = type === 'paid';
    const title = isPaid ? (resource.paid_title || resource.title) : resource.title;
    const fileUrl = isPaid ? resource.paid_file_url : resource.free_file_url;
    const downloadedAt = new Date(item.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm ${
                isPaid
                    ? 'bg-amber-50 border-amber-100 hover:border-amber-200'
                    : 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'
            }`}
        >
            {/* Ícone */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                isPaid ? 'bg-amber-100' : 'bg-emerald-100'
            }`}>
                {isPaid ? (
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                ) : (
                    <Download className="w-4 h-4 text-emerald-600" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${isPaid ? 'text-amber-900' : 'text-emerald-900'}`}>
                    {title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    {resource.chapter_number && (
                        <span className="text-xs text-gray-500">Cap. {resource.chapter_number}</span>
                    )}
                    <span className="text-gray-400 text-xs">·</span>
                    <span className="text-xs text-gray-400">Desbloqueado em {downloadedAt}</span>
                </div>
                {isPaid && (
                    <div className="flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600 font-medium">Licença clínica ativa</span>
                    </div>
                )}
            </div>

            {/* Ação */}
            <Button
                id={`btn-shelf-download-${item.id}`}
                variant="ghost"
                size="sm"
                className={`flex-shrink-0 ${
                    isPaid ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-100' : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100'
                }`}
                onClick={() => onDownload(fileUrl, title)}
            >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Baixar</span>
            </Button>
        </motion.div>
    );
}
