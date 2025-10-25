import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Eye, EyeOff, Edit3, Trash2, Plus, MessageCircle, Calendar, User, Mail, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/customSupabaseClient';

const DepoimentosAdminPage = () => {
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, approved, pending, rejected
    const [editingReview, setEditingReview] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const [editForm, setEditForm] = useState({
        rating: 5,
        comment: '',
        is_approved: false
    });

    const [createForm, setCreateForm] = useState({
        patient_name: '',
        patient_email: '',
        rating: 5,
        comment: '',
        is_approved: true,
        source: 'manual' // Para indicar que foi criado manualmente
    });

    useEffect(() => {
        fetchReviews();
    }, []);

    useEffect(() => {
        filterReviews();
    }, [reviews, searchTerm, filter]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    bookings(patient_name, patient_email, booking_date, booking_time),
                    professionals(name)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReviews(data || []);
        } catch (error) {
            console.error('Erro ao buscar depoimentos:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar depoimentos',
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const filterReviews = () => {
        let filtered = reviews;

        // Filtro por status
        if (filter === 'approved') {
            filtered = filtered.filter(review => review.is_approved);
        } else if (filter === 'pending') {
            filtered = filtered.filter(review => review.is_approved === false);
        }

        // Filtro por busca
        if (searchTerm) {
            filtered = filtered.filter(review =>
                review.bookings?.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.bookings?.patient_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.professionals?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredReviews(filtered);
    };

    const toggleApproval = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('reviews')
                .update({ is_approved: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            toast({
                title: !currentStatus ? 'Depoimento aprovado!' : 'Depoimento ocultado',
                description: !currentStatus ? 'O depoimento agora será exibido no site.' : 'O depoimento foi removido do site.'
            });

            fetchReviews();
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao alterar status',
                description: error.message
            });
        }
    };

    const deleteReview = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este depoimento?')) return;

        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({
                title: 'Depoimento excluído',
                description: 'O depoimento foi removido permanentemente.'
            });

            fetchReviews();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao excluir depoimento',
                description: error.message
            });
        }
    };

    const startEdit = (review) => {
        setEditForm({
            rating: review.rating,
            comment: review.comment,
            is_approved: review.is_approved
        });
        setEditingReview(review.id);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        
        if (!createForm.patient_name || !createForm.comment) {
            toast({
                variant: 'destructive',
                title: 'Campos obrigatórios',
                description: 'Nome e comentário são obrigatórios.'
            });
            return;
        }

        try {
            const { error } = await supabase
                .from('reviews')
                .insert([{
                    patient_name: createForm.patient_name,
                    patient_email: createForm.patient_email,
                    rating: createForm.rating,
                    comment: createForm.comment,
                    is_approved: createForm.is_approved,
                    // Para depoimentos manuais, usar null nos campos relacionais
                    booking_id: null,
                    patient_id: null,
                    professional_id: null
                }]);

            if (error) throw error;

            toast({
                title: 'Depoimento criado!',
                description: 'O depoimento foi adicionado com sucesso.'
            });

            // Reset form
            setCreateForm({
                patient_name: '',
                patient_email: '',
                rating: 5,
                comment: '',
                is_approved: true,
                source: 'manual'
            });
            setShowCreateForm(false);
            fetchReviews();

        } catch (error) {
            console.error('Erro ao criar depoimento:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao criar depoimento',
                description: error.message
            });
        }
    };

    const saveEdit = async () => {
        try {
            const { error } = await supabase
                .from('reviews')
                .update(editForm)
                .eq('id', editingReview);

            if (error) throw error;

            toast({
                title: 'Depoimento atualizado!',
                description: 'As alterações foram salvas com sucesso.'
            });

            setEditingReview(null);
            fetchReviews();
        } catch (error) {
            console.error('Erro ao salvar:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar alterações',
                description: error.message
            });
        }
    };



    const getStatusBadge = (isApproved) => {
        return isApproved ? (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Eye className="w-3 h-3 mr-1" />
                Visível
            </span>
        ) : (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <EyeOff className="w-3 h-3 mr-1" />
                Oculto
            </span>
        );
    };

    const renderStars = (rating) => {
        return (
            <div className="flex">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659] mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando depoimentos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Depoimentos</h1>
                            <p className="text-gray-600">Gerencie, modere e organize os depoimentos do site</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => setShowCreateForm(true)}
                                className="bg-[#2d8659] hover:bg-[#236b47]"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Depoimento
                            </Button>
                            <div className="text-sm text-gray-600">
                                <p>💡 <strong>Dica:</strong> Crie depoimentos de eventos, palestras ou outros canais</p>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <Card className="p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, email ou comentário..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="input pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={filter === 'all' ? 'default' : 'outline'}
                                    onClick={() => setFilter('all')}
                                    size="sm"
                                >
                                    Todos ({reviews.length})
                                </Button>
                                <Button
                                    variant={filter === 'approved' ? 'default' : 'outline'}
                                    onClick={() => setFilter('approved')}
                                    size="sm"
                                >
                                    Visíveis ({reviews.filter(r => r.is_approved).length})
                                </Button>
                                <Button
                                    variant={filter === 'pending' ? 'default' : 'outline'}
                                    onClick={() => setFilter('pending')}
                                    size="sm"
                                >
                                    Ocultos ({reviews.filter(r => !r.is_approved).length})
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Create Form Modal */}
                {showCreateForm && (
                    <Card className="p-6 mb-6 border-2 border-[#2d8659]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Criar Novo Depoimento</h3>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setCreateForm({
                                        patient_name: '',
                                        patient_email: '',
                                        rating: 5,
                                        comment: '',
                                        is_approved: true,
                                        source: 'manual'
                                    });
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                        
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nome do Cliente *</label>
                                    <input
                                        type="text"
                                        value={createForm.patient_name}
                                        onChange={(e) => setCreateForm({...createForm, patient_name: e.target.value})}
                                        className="input"
                                        placeholder="Nome completo do cliente"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Email (opcional)</label>
                                    <input
                                        type="email"
                                        value={createForm.patient_email}
                                        onChange={(e) => setCreateForm({...createForm, patient_email: e.target.value})}
                                        className="input"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Avaliação *</label>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={createForm.rating}
                                        onChange={(e) => setCreateForm({...createForm, rating: parseInt(e.target.value)})}
                                        className="input w-40"
                                    >
                                        {[1,2,3,4,5].map(num => (
                                            <option key={num} value={num}>{num} estrela{num > 1 ? 's' : ''}</option>
                                        ))}
                                    </select>
                                    <div className="flex">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-5 h-5 ${i < createForm.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-2">Depoimento *</label>
                                <textarea
                                    value={createForm.comment}
                                    onChange={(e) => setCreateForm({...createForm, comment: e.target.value})}
                                    rows={4}
                                    className="input resize-none"
                                    placeholder="Digite o depoimento do cliente (eventos, palestras, etc.)"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Use este campo para depoimentos vindos de eventos, palestras, redes sociais ou outros canais.
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="create-approved"
                                    checked={createForm.is_approved}
                                    onChange={(e) => setCreateForm({...createForm, is_approved: e.target.checked})}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="create-approved" className="text-sm font-medium">
                                    Aprovar automaticamente (aparecerá no site imediatamente)
                                </label>
                            </div>
                            
                            <div className="flex items-center justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-[#2d8659] hover:bg-[#236b47]"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Depoimento
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                {/* Reviews List */}
                <div className="space-y-4">
                    {filteredReviews.length === 0 ? (
                        <Card className="p-12 text-center">
                            <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum depoimento encontrado</h3>
                            <p className="text-gray-600">
                                {searchTerm || filter !== 'all' 
                                    ? 'Tente ajustar os filtros de busca.'
                                    : 'Adicione o primeiro depoimento ou aguarde envios dos usuários.'
                                }
                            </p>
                        </Card>
                    ) : (
                        filteredReviews.map((review) => (
                            <motion.div
                                key={review.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="p-6">
                                    {editingReview === review.id ? (
                                        /* Edit Form */
                                        <div className="space-y-4">
                                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                                <p className="text-sm text-blue-800">
                                                    <strong>Informações do Agendamento:</strong><br/>
                                                    Paciente: {review.bookings?.patient_name || 'Não informado'}<br/>
                                                    Email: {review.bookings?.patient_email || 'Não informado'}<br/>
                                                    Data: {review.bookings?.booking_date ? new Date(review.bookings.booking_date).toLocaleDateString('pt-BR') : 'Não informada'}
                                                    {review.bookings?.booking_time && ` às ${review.bookings.booking_time}`}<br/>
                                                    Profissional: {review.professionals?.name || 'Não informado'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Avaliação</label>
                                                <select
                                                    value={editForm.rating}
                                                    onChange={(e) => setEditForm({...editForm, rating: parseInt(e.target.value)})}
                                                    className="input"
                                                >
                                                    {[1,2,3,4,5].map(num => (
                                                        <option key={num} value={num}>{num} estrela{num > 1 ? 's' : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Comentário</label>
                                                <textarea
                                                    value={editForm.comment}
                                                    onChange={(e) => setEditForm({...editForm, comment: e.target.value})}
                                                    rows={4}
                                                    className="input resize-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="approved"
                                                    checked={editForm.is_approved}
                                                    onChange={(e) => setEditForm({...editForm, is_approved: e.target.checked})}
                                                    className="rounded border-gray-300"
                                                />
                                                <label htmlFor="approved" className="text-sm font-medium">Visível no site</label>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={saveEdit} className="bg-[#2d8659] hover:bg-[#236b47]">
                                                    Salvar
                                                </Button>
                                                <Button variant="outline" onClick={() => setEditingReview(null)}>
                                                    Cancelar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Display Mode */
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-[#2d8659]/10 rounded-full flex items-center justify-center">
                                                        <User className="w-6 h-6 text-[#2d8659]" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{review.bookings?.patient_name || 'Nome não informado'}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <Mail className="w-4 h-4" />
                                                            {review.bookings?.patient_email || 'Email não informado'}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                            <Calendar className="w-4 h-4" />
                                                            Consulta: {review.bookings?.booking_date ? new Date(review.bookings.booking_date).toLocaleDateString('pt-BR') : 'Data não informada'} 
                                                            {review.bookings?.booking_time && ` às ${review.bookings.booking_time}`}
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            Com: {review.professionals?.name || 'Profissional não informado'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {getStatusBadge(review.is_approved)}
                                                    {renderStars(review.rating)}
                                                </div>
                                            </div>
                                            
                                            <p className="text-gray-700 mb-4 italic">"{review.comment}"</p>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    {new Date(review.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => toggleApproval(review.id, review.is_approved)}
                                                    >
                                                        {review.is_approved ? (
                                                            <>
                                                                <EyeOff className="w-4 h-4 mr-1" />
                                                                Ocultar
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-4 h-4 mr-1" />
                                                                Aprovar
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => startEdit(review)}
                                                    >
                                                        <Edit3 className="w-4 h-4 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => deleteReview(review.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>


            </div>
        </div>
    );
};

export default DepoimentosAdminPage;