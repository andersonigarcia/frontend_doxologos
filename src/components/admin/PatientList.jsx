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
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#2d8659]" />
                    <h3 className="text-xl font-bold text-gray-900">
                        Pacientes ({filteredPatients.length})
                    </h3>
                </div>

                {/* Busca */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar paciente..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleSort('name')}
                            >
                                Paciente <SortIcon field="name" />
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleSort('totalBookings')}
                            >
                                Consultas <SortIcon field="totalBookings" />
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleSort('totalSpent')}
                            >
                                Total Gasto <SortIcon field="totalSpent" />
                            </th>
                            <th
                                className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleSort('lastBookingDate')}
                            >
                                Última Consulta <SortIcon field="lastBookingDate" />
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPatients.map((patient, index) => (
                            <motion.tr
                                key={patient.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <td className="py-4 px-4">
                                    <div>
                                        <p className="font-medium text-gray-900">{patient.name}</p>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                            {patient.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {patient.email}
                                                </span>
                                            )}
                                            {patient.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {patient.phone}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{patient.totalBookings}</span>
                                        <div className="text-xs text-gray-500">
                                            <div>✓ {patient.completedBookings} completas</div>
                                            {patient.pendingBookings > 0 && (
                                                <div className="text-amber-600">⏳ {patient.pendingBookings} pendentes</div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                                        <DollarSign className="w-4 h-4" />
                                        {patient.totalSpent.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <div className="flex items-center gap-1 text-gray-700">
                                        <Calendar className="w-4 h-4" />
                                        {patient.lastBookingDate ?
                                            new Date(patient.lastBookingDate).toLocaleDateString('pt-BR') :
                                            '-'
                                        }
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onPatientClick && onPatientClick(patient)}
                                        className="text-[#2d8659] border-[#2d8659] hover:bg-[#2d8659] hover:text-white"
                                    >
                                        Ver Detalhes
                                    </Button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
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
