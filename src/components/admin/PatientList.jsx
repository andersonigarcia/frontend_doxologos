import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, TrendingUp, Calendar, DollarSign, Phone, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkeletonTable, EmptyState } from '@/components/common';
import { cn } from '@/lib/utils';

/**
 * PatientList - Lista de pacientes com estatísticas
 * 
 * @component
 * @param {Object} props
 * @param {Array} props.patients - Array de pacientes
 * @param {Function} props.onPatientClick - Callback ao clicar em paciente
 * @param {boolean} props.loading - Estado de carregamento
 * @param {string} props.className - Classes CSS adicionais
 */
export const PatientList = ({
    patients = [],
    onPatientClick,
    loading = false,
    className = ''
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('lastBookingDate');
    const [sortOrder, setSortOrder] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filtrar pacientes
    const filteredPatients = useMemo(() => {
        return patients.filter(patient => {
            const searchLower = searchTerm.toLowerCase();
            return (
                patient.name?.toLowerCase().includes(searchLower) ||
                patient.email?.toLowerCase().includes(searchLower) ||
                patient.phone?.includes(searchTerm)
            );
        });
    }, [patients, searchTerm]);

    // Ordenar pacientes
    const sortedPatients = useMemo(() => {
        const sorted = [...filteredPatients].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            // Tratamento especial para datas
            if (sortField === 'lastBookingDate' || sortField === 'firstBookingDate') {
                aValue = new Date(aValue || 0);
                bValue = new Date(bValue || 0);
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [filteredPatients, sortField, sortOrder]);

    // Paginação
    const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
    const paginatedPatients = sortedPatients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Função para alternar ordenação
    const toggleSort = (field) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    // Renderizar ícone de ordenação
    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ?
            <ChevronUp className="w-4 h-4 inline ml-1" /> :
            <ChevronDown className="w-4 h-4 inline ml-1" />;
    };

    if (loading) {
        return (
            <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden', className)}>
                <div className="p-6">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
                </div>
                <SkeletonTable rows={10} columns={6} />
            </div>
        );
    }

    if (patients.length === 0) {
        return (
            <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
                <EmptyState
                    icon={Users}
                    title="Nenhum paciente encontrado"
                    description="Os pacientes aparecerão aqui automaticamente após realizarem agendamentos"
                />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}
        >
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-xl">
                        <Users className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            Gestão de Pacientes
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">Total de {filteredPatients.length} pacientes cadastrados</p>
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar nome ou e-mail..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium text-sm"
                        />
                    </div>
                    
                    <select
                        value={`${sortField}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-');
                            setSortField(field);
                            setSortOrder(order);
                        }}
                        className="w-full md:w-48 px-4 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                    >
                        <option value="lastBookingDate-desc">Últimas Consultas</option>
                        <option value="name-asc">Nome (A-Z)</option>
                        <option value="name-desc">Nome (Z-A)</option>
                        <option value="totalBookings-desc">Mais Consultas</option>
                        <option value="totalRepasse-desc">Maior Ganho Gerado</option>
                    </select>
                </div>
            </div>

            {/* Lista de Cards */}
            <div className="flex flex-col gap-4">
                {paginatedPatients.map((patient, index) => (
                    <motion.div
                        key={patient.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4"
                    >
                        {/* Info Principal */}
                        <div className="flex items-center gap-4 flex-1 w-full lg:w-auto">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                                {patient.name ? patient.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg">{patient.name}</h4>
                                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500 font-medium">
                                    {patient.email && (
                                        <span className="flex items-center gap-1">
                                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                                            {patient.email}
                                        </span>
                                    )}
                                    {patient.phone && (
                                        <span className="flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                                            {patient.phone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Estatísticas Rápidas */}
                        <div className="flex items-center justify-center gap-6 px-5 py-2.5 bg-gray-50 rounded-xl border border-gray-100 w-full lg:w-auto">
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Sessões</p>
                                <p className="font-bold text-gray-900 text-lg">{patient.validBookings}</p>
                            </div>
                            <div className="w-px h-8 bg-gray-200"></div>
                            <div className="text-center">
                                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Ganho Gerado</p>
                                <p className="font-bold text-emerald-600 text-lg">
                                    <span className="text-xs mr-0.5">R$</span>
                                    {(patient.totalRepasse || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Ação */}
                        <div className="shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
                            <Button
                                variant="outline"
                                onClick={() => onPatientClick && onPatientClick(patient)}
                                className="w-full lg:w-auto bg-white border-gray-200 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 rounded-xl font-semibold shadow-sm"
                            >
                                Ver Detalhes
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
                    <p className="text-sm text-gray-600">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedPatients.length)} de {sortedPatients.length} pacientes
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-gray-600">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Próxima
                        </Button>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default PatientList;
