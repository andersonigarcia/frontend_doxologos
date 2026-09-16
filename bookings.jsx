<TabsContent value="bookings" className="mt-6">
                            <Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>

                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                                {/* Header e Toolbar de Ações */}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-[#2d8659]" />
                                            Gestão Operacional de Agendamentos
                                            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                                                {getFilteredBookings().length} de {bookings.length}
                                            </span>
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Filtre, ordene e gerencie todas as consultas em tempo real com controle financeiro.
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {/* Modos de Exibição: Tabela vs Cards vs Calendário */}
                                        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
                                            <button
                                                onClick={() => setBookingView('list')}
                                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                                                    bookingView === 'list' ? 'bg-white text-[#2d8659] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <List className="w-3.5 h-3.5" />
                                                Tabela
                                            </button>
                                            <button
                                                onClick={() => setBookingView('cards')}
                                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                                                    bookingView === 'cards' ? 'bg-white text-[#2d8659] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <LayoutGrid className="w-3.5 h-3.5" />
                                                Cards
                                            </button>
                                            <button
                                                onClick={() => setBookingView('calendar')}
                                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-bold ${
                                                    bookingView === 'calendar' ? 'bg-white text-[#2d8659] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                                Calendário
                                            </button>
                                        </div>

                                        {/* Botão de Filtros */}
                                        <Button
                                            onClick={() => setShowFilters(!showFilters)}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                            {showFilters ? 'Ocultar Filtros' : 'Filtros Avançados'}
                                            {(() => {
                                                const activeCount = Object.values(bookingFilters).filter(v => v !== '').length;
                                                return activeCount > 0 ? (
                                                    <span className="ml-1.5 bg-[#2d8659] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                                        {activeCount}
                                                    </span>
                                                ) : null;
                                            })()}
                                        </Button>

                                        {userRole === 'admin' && (
                                            <Button
                                                onClick={() => setIsEmergencyBookingModalOpen(true)}
                                                variant="default"
                                                size="sm"
                                                className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white font-bold"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                                Novo Encaixe de Urgência
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* BARRA EXECUTIVA DE TOTAIS (1 LINHA COMPACTA DE 48PX) */}
                                {(() => {
                                    const filteredBookings = getFilteredBookings();
                                    const filteredTotals = calculateTotals(filteredBookings);

                                    return (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-[#2d8659]" />
                                                <span className="text-slate-500 font-medium">Agendamentos:</span>
                                                <span className="font-extrabold text-slate-900">{filteredTotals.totalBookings}</span>
                                            </div>

                                            {userRole === 'admin' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">Valor Cobrado:</span>
                                                    <span className="font-bold text-emerald-700">R$ {filteredTotals.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500">{userRole === 'admin' ? 'Repassado:' : 'A faturar:'}</span>
                                                <span className="font-bold text-blue-700">R$ {filteredTotals.totalProfessionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>

                                            {userRole === 'admin' && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500">Taxa Doxologos:</span>
                                                    <span className="font-bold text-purple-700">R$ {filteredTotals.totalPlatformFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500 font-medium">Recebidos:</span>
                                                <span className="font-bold text-emerald-800">R$ {filteredTotals.completedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <span className="text-slate-500 font-medium">Pendentes:</span>
                                                <span className="font-bold text-amber-600">R$ {filteredTotals.pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>

                                            {filteredTotals.cancelledValue > 0 && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-500 font-medium">Cancelados:</span>
                                                    <span className="font-bold text-red-600">R$ {filteredTotals.cancelledValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* BARRA DE ORDENAÇÃO E BUSCA DE 1 LINHA */}
                                {bookingView !== 'calendar' && (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80 text-xs">
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <span className="text-slate-500 font-bold text-[11px] whitespace-nowrap">Ordenar por:</span>
                                            <div className="flex flex-wrap gap-1">
                                                <Button
                                                    onClick={() => handleBookingSort('default')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'default' ? 'bg-[#2d8659] text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Padrão
                                                </Button>
                                                <Button
                                                    onClick={() => handleBookingSort('status')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'status' ? 'bg-[#2d8659] text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Status {bookingSortField === 'status' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                </Button>
                                                <Button
                                                    onClick={() => handleBookingSort('date')}
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'date' ? 'bg-[#2d8659] text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}
                                                >
                                                    Data {bookingSortField === 'date' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                </Button>
                                                {userRole === 'admin' && (
                                                    <Button
                                                        onClick={() => handleBookingSort('professional')}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-7 px-2.5 text-xs rounded-lg ${bookingSortField === 'professional' ? 'bg-[#2d8659] text-white font-bold' : 'text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        Profissional {bookingSortField === 'professional' && (bookingSortOrder === 'asc' ? '↑' : '↓')}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                            <span className="text-[11px] text-slate-500">Exibir:</span>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => {
                                                    setItemsPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="bg-white border border-slate-200 rounded-lg text-xs py-1 px-2 font-bold text-slate-700"
                                            >
                                                <option value="10">10 por página</option>
                                                <option value="20">20 por página</option>
                                                <option value="50">50 por página</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Seção de Filtros - Recolhível */}
                                    {showFilters && (
                                        <div className="bg-gray-50 rounded-lg p-4 mb-6 border animate-in slide-in-from-top-2 duration-200">
                                            <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 2v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                                </svg>
                                                Filtros Avançados
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                                                    {/* Busca por nome/email */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Buscar Paciente</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Nome ou email..."
                                                            value={bookingFilters.search}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, search: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>

                                                    {/* Filtro por Serviço */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Serviço</label>
                                                        <select
                                                            value={bookingFilters.service_id}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, service_id: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os serviços</option>
                                                            {services.map(service => (
                                                                <option key={service.id} value={service.id}>{service.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Profissional */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Profissional</label>
                                                        <select
                                                            value={bookingFilters.professional_id}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, professional_id: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os profissionais</option>
                                                            {professionals.map(prof => (
                                                                <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Status */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Status</label>
                                                        <select
                                                            value={bookingFilters.status}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, status: e.target.value })}
                                                            className="w-full input text-sm"
                                                        >
                                                            <option value="">Todos os status</option>
                                                            <option value="pending_payment">Pendente Pagamento</option>
                                                            <option value="confirmed">Confirmado</option>
                                                            <option value="completed">Concluído</option>
                                                            <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                            <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                            <option value="no_show_unjustified">Falta injustificada</option>
                                                        </select>
                                                    </div>

                                                    {/* Filtro por Período - Data Inicial */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">De</label>
                                                        <input
                                                            type="date"
                                                            value={bookingFilters.date_from}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, date_from: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>

                                                    {/* Filtro por Período - Data Final */}
                                                    <div>
                                                        <label className="block text-xs font-medium mb-1 text-gray-600">Até</label>
                                                        <input
                                                            type="date"
                                                            value={bookingFilters.date_to}
                                                            onChange={(e) => setBookingFilters({ ...bookingFilters, date_to: e.target.value })}
                                                            className="w-full input text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Botão para limpar filtros */}
                                                <div className="mt-4 flex justify-end">
                                                    <Button
                                                        onClick={clearFilters}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-gray-600 hover:text-gray-800"
                                                    >
                                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                        Limpar Filtros
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {(() => {
                                            const filteredBookings = getFilteredBookings();
                                            const sortedBookings = getSortedBookings(filteredBookings);
                                            const paginatedBookings = getPaginatedBookings(sortedBookings);
                                            const totalPages = getTotalPages(sortedBookings);

                                            if (bookings.length === 0) {
                                                return (
                                                    <div className="text-center py-12">
                                                        <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                                        <p className="text-gray-500 text-lg">Nenhum agendamento encontrado</p>
                                                    </div>
                                                );
                                            }

                                            if (filteredBookings.length === 0) {
                                                return (
                                                    <div className="text-center py-12">
                                                        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        <p className="text-gray-500 text-lg mb-2">Nenhum agendamento encontrado com os filtros aplicados</p>
                                                        <p className="text-gray-400 text-sm">Tente ajustar os filtros ou limpar para ver todos os agendamentos</p>
                                                        <Button onClick={clearFilters} variant="outline" className="mt-4">
                                                            Limpar Filtros
                                                        </Button>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div>
                                                    {/* Info de paginação */}
                                                    <div className="flex items-center justify-between mb-4 text-sm text-gray-600">
                                                        <span>
                                                            Mostrando <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong> a <strong>{Math.min(currentPage * itemsPerPage, sortedBookings.length)}</strong> de <strong>{sortedBookings.length}</strong> agendamento(s)
                                                        </span>
                                                        <select
                                                            value={itemsPerPage}
                                                            onChange={(e) => {
                                                                setItemsPerPage(Number(e.target.value));
                                                                setCurrentPage(1);
                                                            }}
                                                            className="input text-sm py-1"
                                                        >
                                                            <option value="5">5 por página</option>
                                                            <option value="10">10 por página</option>
                                                            <option value="20">20 por página</option>
                                                            <option value="50">50 por página</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {bookingView === 'list' ? (
                                                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-xs text-left text-slate-700">
                                                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                                                                            <tr>
                                                                                <th className="p-3">Data & Horário</th>
                                                                                <th className="p-3">Paciente</th>
                                                                                <th className="p-3">Profissional & Serviço</th>
                                                                                <th className="p-3">Financeiro (Preço / Repasse / Taxa)</th>
                                                                                <th className="p-3">Status</th>
                                                                                <th className="p-3 text-right">Ações</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-slate-100">
                                                                            {paginatedBookings.map((b) => {
                                                                                const statusColors = {
                                                                                    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                                    'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                                    'awaiting_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                                    'confirmed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                                                                    'paid': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                                                                    'completed': 'bg-blue-100 text-blue-800 border-blue-200',
                                                                                    'cancelled': 'bg-red-100 text-red-800 border-red-200',
                                                                                    'cancelled_by_patient': 'bg-red-100 text-red-800 border-red-200',
                                                                                    'cancelled_by_professional': 'bg-gray-100 text-gray-800 border-gray-200',
                                                                                    'expired': 'bg-gray-100 text-gray-600 border-gray-200',
                                                                                    'no_show_unjustified': 'bg-orange-100 text-orange-800 border-orange-200',
                                                                                    'refunded': 'bg-purple-100 text-purple-800 border-purple-200',
                                                                                    'partially_refunded': 'bg-purple-100 text-purple-800 border-purple-200'
                                                                                };

                                                                                const statusLabels = {
                                                                                    'pending': 'Pendente',
                                                                                    'pending_payment': 'Pendente',
                                                                                    'awaiting_payment': 'Aguardando',
                                                                                    'confirmed': 'Confirmado',
                                                                                    'paid': 'Pago',
                                                                                    'completed': 'Concluído',
                                                                                    'cancelled': 'Cancelado',
                                                                                    'cancelled_by_patient': 'Cancelado (Paciente)',
                                                                                    'cancelled_by_professional': 'Cancelado (Psicólogo)',
                                                                                    'expired': 'Expirado',
                                                                                    'no_show_unjustified': 'Falta Injustificada',
                                                                                    'refunded': 'Reembolsado',
                                                                                    'partially_refunded': 'Reembolso Parcial'
                                                                                };

                                                                                const patientValue = Number(b.valor_consulta ?? b.service?.price ?? 0) || 0;
                                                                                const professionalValue = Number(
                                                                                    b.valor_repasse_profissional ?? b.service?.professional_payout ?? b.valor_consulta ?? patientValue
                                                                                ) || 0;
                                                                                const platformFeeValue = Math.max(patientValue - professionalValue, 0);

                                                                                return (
                                                                                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                                                                        <td className="p-3 font-mono">
                                                                                            <span className="font-bold text-slate-900 block">
                                                                                                {new Date(b.booking_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                                                            </span>
                                                                                            <span className="text-[11px] text-[#2d8659] font-bold">{b.booking_time}h</span>
                                                                                        </td>

                                                                                        <td className="p-3">
                                                                                            <p className="font-bold text-slate-900">{b.patient_name || 'Nome não informado'}</p>
                                                                                            <p className="text-[10px] text-slate-400">{b.patient_email || b.patient_phone || 'Sem contato'}</p>
                                                                                        </td>

                                                                                        <td className="p-3">
                                                                                            <p className="font-bold text-slate-800">{b.professional?.name || 'N/A'}</p>
                                                                                            <p className="text-[11px] text-slate-500">{b.service?.name || 'N/A'}</p>
                                                                                        </td>

                                                                                        <td className="p-3 font-mono">
                                                                                            {userRole === 'admin' ? (
                                                                                                <div>
                                                                                                    <span className="font-bold text-emerald-700 text-xs">R$ {patientValue.toFixed(2)}</span>
                                                                                                    <div className="text-[10px] text-slate-500">
                                                                                                        Repasse: R$ {professionalValue.toFixed(2)} | Taxa: R$ {platformFeeValue.toFixed(2)}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <span className="font-bold text-blue-700 text-xs">R$ {professionalValue.toFixed(2)}</span>
                                                                                            )}
                                                                                        </td>

                                                                                        <td className="p-3">
                                                                                            <select
                                                                                                value={b.status}
                                                                                                onChange={(e) => handleQuickStatusChange(b.id, e.target.value, b)}
                                                                                                className={`text-xs px-2 py-1 border border-slate-200 rounded-lg font-bold ${statusColors[b.status] || 'bg-slate-100 text-slate-700'}`}
                                                                                            >
                                                                                                <option value="pending_payment">Pendente Pagamento</option>
                                                                                                <option value="confirmed">Confirmado</option>
                                                                                                <option value="completed">Concluído</option>
                                                                                                <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                                                                <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                                                                <option value="no_show_unjustified">Falta Injustificada</option>
                                                                                            </select>
                                                                                        </td>

                                                                                        <td className="p-3 text-right">
                                                                                            <div className="flex items-center justify-end gap-1.5">
                                                                                                {(b.status === 'confirmed' || b.status === 'paid') && b.meeting_link && (
                                                                                                    <a
                                                                                                        href={b.meeting_link}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="bg-emerald-50 text-[#2d8659] border border-emerald-200 px-2 py-1 rounded-md text-[11px] font-bold hover:bg-emerald-100 transition-colors"
                                                                                                    >
                                                                                                        {b.meeting_link.toLowerCase().includes('meet.google.com') || b.meeting_link.toLowerCase().includes('google')
                                                                                                            ? 'Google Meet'
                                                                                                            : b.meeting_link.toLowerCase().includes('zoom')
                                                                                                                ? 'Zoom'
                                                                                                                : 'Sala Virtual'}
                                                                                                    </a>
                                                                                                )}
                                                                                                <Dialog>
                                                                                                    <DialogTrigger asChild>
                                                                                                        <Button
                                                                                                            size="sm"
                                                                                                            variant="outline"
                                                                                                            className="h-7 px-2 text-xs border-slate-200 hover:bg-slate-50"
                                                                                                            onClick={() => {
                                                                                                                setEditingBooking(b);
                                                                                                                setBookingEditData({
                                                                                                                    booking_date: b.booking_date,
                                                                                                                    booking_time: b.booking_time,
                                                                                                                    status: b.status,
                                                                                                                    professional_id: b.professional_id || '',
                                                                                                                    service_id: b.service_id || '',
                                                                                                                    patient_name: b.patient_name || '',
                                                                                                                    patient_email: b.patient_email || '',
                                                                                                                    patient_phone: b.patient_phone || '',
                                                                                                                    valor_consulta: formatNumberToCurrencyInput(b.valor_consulta ?? ''),
                                                                                                                    valor_repasse_profissional: formatNumberToCurrencyInput(
                                                                                                                        b.valor_repasse_profissional ?? b.valor_consulta ?? ''
                                                                                                                    )
                                                                                                                });
                                                                                                            }}
                                                                                                        >
                                                                                                            <Edit className="w-3 h-3" />
                                                                                                        </Button>
                                                                                                    </DialogTrigger>
                                                                                                    <DialogContent className="max-w-2xl">
                                                                                                        <DialogHeader>
                                                                                                            <DialogTitle className="flex items-center">
                                                                                                                <Edit className="w-5 h-5 mr-2 text-[#2d8659]" />
                                                                                                                Editar Agendamento
                                                                                                            </DialogTitle>
                                                                                                        </DialogHeader>
                                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                                                                                            <div>
                                                                                                                <label className="block text-sm font-medium mb-1">Nome do Paciente *</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={bookingEditData.patient_name}
                                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, patient_name: e.target.value })}
                                                                                                                    className="w-full input text-sm"
                                                                                                                    placeholder="Nome completo"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-sm font-medium mb-1">Data *</label>
                                                                                                                <input
                                                                                                                    type="date"
                                                                                                                    value={bookingEditData.booking_date}
                                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_date: e.target.value })}
                                                                                                                    className="w-full input text-sm"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-sm font-medium mb-1">Horário *</label>
                                                                                                                <input
                                                                                                                    type="time"
                                                                                                                    value={bookingEditData.booking_time}
                                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_time: e.target.value })}
                                                                                                                    className="w-full input text-sm"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-sm font-medium mb-1">Status *</label>
                                                                                                                <select
                                                                                                                    value={bookingEditData.status}
                                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, status: e.target.value })}
                                                                                                                    className="w-full input text-sm"
                                                                                                                >
                                                                                                                    <option value="pending_payment">Pendente Pagamento</option>
                                                                                                                    <option value="confirmed">Confirmado</option>
                                                                                                                    <option value="completed">Concluído</option>
                                                                                                                    <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                                                                                    <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                                                                                    <option value="no_show_unjustified">Falta Injustificada</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <DialogFooter>
                                                                                                            <DialogClose asChild>
                                                                                                                <Button variant="outline">Cancelar</Button>
                                                                                                            </DialogClose>
                                                                                                            <Button
                                                                                                                onClick={handleUpdateBooking}
                                                                                                                className="bg-[#2d8659] hover:bg-[#236b47] text-white"
                                                                                                            >
                                                                                                                Salvar
                                                                                                            </Button>
                                                                                                        </DialogFooter>
                                                                                                    </DialogContent>
                                                                                                </Dialog>
                                                                                            </div>
                                                                                        </td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            paginatedBookings.map((b, index) => {
                                                            const statusColors = {
                                                                'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                'pending_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                'awaiting_payment': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                                                'confirmed': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                                                'paid': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                                                'completed': 'bg-blue-100 text-blue-800 border-blue-200',
                                                                'cancelled': 'bg-red-100 text-red-800 border-red-200',
                                                                'cancelled_by_patient': 'bg-red-100 text-red-800 border-red-200',
                                                                'cancelled_by_professional': 'bg-gray-100 text-gray-800 border-gray-200',
                                                                'expired': 'bg-gray-100 text-gray-600 border-gray-200',
                                                                'no_show_unjustified': 'bg-orange-100 text-orange-800 border-orange-200',
                                                                'refunded': 'bg-purple-100 text-purple-800 border-purple-200',
                                                                'partially_refunded': 'bg-purple-100 text-purple-800 border-purple-200'
                                                            };

                                                            const statusLabels = {
                                                                'pending': 'Pendente Pagamento',
                                                                'pending_payment': 'Pendente Pagamento',
                                                                'awaiting_payment': 'Aguardando Pagamento',
                                                                'confirmed': 'Confirmado',
                                                                'paid': 'Pago',
                                                                'completed': 'Concluído (Atendido)',
                                                                'cancelled': 'Cancelado',
                                                                'cancelled_by_patient': 'Cancelado pelo Paciente',
                                                                'cancelled_by_professional': 'Cancelado pelo Profissional',
                                                                'expired': 'Expirado',
                                                                'no_show_unjustified': 'Falta Injustificada',
                                                                'refunded': 'Reembolsado',
                                                                'partially_refunded': 'Parcialmente Reembolsado'
                                                            };

                                                            // Usa valor histórico se disponível, senão usa preço atual do serviço
                                                            const patientValue = Number(b.valor_consulta ?? b.service?.price ?? 0) || 0;
                                                            const professionalValue = Number(
                                                                b.valor_repasse_profissional ?? b.service?.professional_payout ?? b.valor_consulta ?? patientValue
                                                            ) || 0;
                                                            const platformFeeValue = Math.max(patientValue - professionalValue, 0);
                                                            const professionalChipLabel = isAdminView ? 'Profissional' : 'Você recebe';

                                                            const bookingService = services.find(service => service.id === b.service_id) || null;

                                                            let availableServices;
                                                            if (isAdminView) {
                                                                availableServices = services;
                                                            } else {
                                                                const uniqueServices = [];
                                                                const seenServiceIds = new Set();
                                                                const pushService = (service) => {
                                                                    if (service && service.id && !seenServiceIds.has(service.id)) {
                                                                        uniqueServices.push(service);
                                                                        seenServiceIds.add(service.id);
                                                                    }
                                                                };

                                                                pushService(bookingService);
                                                                services.forEach((service) => {
                                                                    if (professionalServiceIdSet.has(service.id)) {
                                                                        pushService(service);
                                                                    }
                                                                });

                                                                availableServices = uniqueServices;
                                                            }

                                                            const quickStatusOptions = isAdminView
                                                                ? [
                                                                    { value: 'pending_payment', label: statusLabels['pending_payment'] },
                                                                    { value: 'confirmed', label: statusLabels['confirmed'] },
                                                                    { value: 'completed', label: statusLabels['completed'] },
                                                                    { value: 'cancelled_by_patient', label: statusLabels['cancelled_by_patient'] },
                                                                    { value: 'cancelled_by_professional', label: statusLabels['cancelled_by_professional'] },
                                                                    { value: 'no_show_unjustified', label: statusLabels['no_show_unjustified'] }
                                                                ]
                                                                : (() => {
                                                                    const options = [
                                                                        { value: b.status, label: `${statusLabels[b.status] || b.status} (atual)`, disabled: true }
                                                                    ];

                                                                    if (b.status !== 'completed') {
                                                                        options.push({ value: 'completed', label: statusLabels['completed'], disabled: b.status !== 'confirmed' });
                                                                    }

                                                                    if (b.status !== 'cancelled_by_professional') {
                                                                        options.push({ value: 'cancelled_by_professional', label: statusLabels['cancelled_by_professional'], disabled: false });
                                                                    }

                                                                    if (b.status !== 'no_show_unjustified') {
                                                                        options.push({ value: 'no_show_unjustified', label: statusLabels['no_show_unjustified'], disabled: false });
                                                                    }

                                                                    return options;
                                                                })();

                                                            const hasEnabledQuickStatusOption = quickStatusOptions.some(option => !option.disabled && option.value !== b.status);
                                                            const quickStatusSelectDisabled = isAnyItemLoading() || (!isAdminView && !hasEnabledQuickStatusOption);

                                                            const serviceOptionLabel = (service) => {
                                                                if (!service) return '';
                                                                if (isAdminView) {
                                                                    const priceNumber = Number(service.price) || 0;
                                                                    return `${service.name} - R$ ${priceNumber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                                                                }
                                                                return service.name;
                                                            };

                                                            return (
                                                                <div key={b.id} className={`relative bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all duration-200 ${(isItemLoading('status', b.id) || isItemLoading('edit', b.id)) ? 'opacity-75' : ''}`}>
                                                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                                                        (b.status === 'confirmed' || b.status === 'paid') ? 'bg-[#2d8659]' :
                                                                        b.status === 'pending_payment' ? 'bg-amber-400' :
                                                                        b.status.includes('cancelled') || b.status === 'no_show_unjustified' ? 'bg-red-400' :
                                                                        'bg-gray-300'
                                                                    }`} />
                                                                    <div className="p-5 pl-7">

                                                                    {/* Overlay de Loading com novo componente */}
                                                                    <LoadingOverlay
                                                                        isLoading={isItemLoading('status', b.id) || isItemLoading('edit', b.id)}
                                                                        message={isItemLoading('status', b.id) ? 'Atualizando status...' : 'Salvando alterações...'}
                                                                    />

                                                                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 mb-4">
                                                                        <div className="flex-1">
                                                                            <div className="mb-3">
                                                                                {/* Nome e Status */}
                                                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                                                    <h3 className="font-semibold text-lg text-gray-900">
                                                                                        {b.patient_name || 'Nome não informado'}
                                                                                    </h3>
                                                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[b.status] || 'bg-gray-100 text-gray-800'}`}>
                                                                                        {statusLabels[b.status] || b.status}
                                                                                    </span>
                                                                                </div>

                                                                                {/* Badges de Valores */}
                                                                                {(patientValue > 0 || professionalValue > 0) && (
                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {patientValue > 0 && userRole === 'admin' && (
                                                                                            <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                                                                                                Paciente: R$ {patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                        {professionalValue > 0 && (
                                                                                            <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                                                                {professionalChipLabel}: R$ {professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                        {userRole === 'admin' && platformFeeValue > 0 && (
                                                                                            <span className="px-2.5 py-1 rounded-full text-xs sm:text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                                                                                Taxa: R$ {platformFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Profissional</span>
                                                                                    <span className="font-medium">{b.professional?.name || 'N/A'}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Serviço</span>
                                                                                    <span className="font-medium">{b.service?.name || 'N/A'}</span>
                                                                                    {b.service?.duration_minutes && (
                                                                                        <span className="text-blue-600 block text-xs">
                                                                                            {b.service.duration_minutes >= 60
                                                                                                ? `${Math.floor(b.service.duration_minutes / 60)}h${b.service.duration_minutes % 60 > 0 ? ` ${b.service.duration_minutes % 60}min` : ''}`
                                                                                                : `${b.service.duration_minutes}min`
                                                                                            }
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Financeiro</span>
                                                                                    {(userRole === 'admin' ? patientValue : professionalValue) > 0 ? (
                                                                                        <div className="space-y-1">
                                                                                            {userRole === 'admin' && patientValue > 0 && (
                                                                                                <span className="font-bold text-green-700 block">
                                                                                                    Paciente: R$ {patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                            {professionalValue > 0 && (
                                                                                                <span className="font-semibold text-blue-700 block">
                                                                                                    {professionalChipLabel}: R$ {professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                            {userRole === 'admin' && platformFeeValue > 0 && (
                                                                                                <span className="text-xs text-purple-700 block">
                                                                                                    Taxa plataforma: R$ {platformFeeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-orange-500 block text-xs">Valor não definido</span>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Data e Horário</span>
                                                                                    <span className="font-medium">
                                                                                        {new Date(b.booking_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                                                    </span>
                                                                                    <span className="block text-blue-600">{b.booking_time}h</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500 block">Contato</span>
                                                                                    <span className="font-medium block text-xs">{b.patient_email || 'N/A'}</span>
                                                                                    <span className="block text-xs">{b.patient_phone || 'N/A'}</span>
                                                                                </div>
                                                                            </div>

                                                                            {/* Exibir dados do Zoom para consultas confirmadas ou pagas */}
                                                                            {/* Exibir dados do Zoom/Meet para consultas confirmadas ou pagas */}
                                                                            {(b.status === 'confirmed' || b.status === 'paid') && b.meeting_link && (
                                                                                <div className="mt-5 pt-5 border-t border-dashed border-gray-200">
                                                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                                                        <div>
                                                                                            <p className="text-sm font-medium text-gray-900">Acesso à Sala Virtual</p>
                                                                                            {b.meeting_password && (
                                                                                                <p className="text-xs text-gray-500 mt-0.5">Senha: <span className="font-mono text-gray-900">{b.meeting_password}</span></p>
                                                                                            )}
                                                                                            {b.meeting_start_url && b.meeting_start_url !== b.meeting_link && (
                                                                                                <a href={b.meeting_start_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-[#2d8659] hover:text-[#236b47] mt-1 underline">
                                                                                                    Iniciar como anfitrião (Host)
                                                                                                </a>
                                                                                            )}
                                                                                        </div>
                                                                                        <a
                                                                                            href={b.meeting_link}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 bg-[#2d8659] hover:bg-[#236b47] text-white text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-all"
                                                                                        >
                                                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                                                            Entrar na Sala Virtual
                                                                                        </a>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex gap-3 flex-col w-full lg:ml-4 lg:w-auto lg:items-end">
                                                                            {/* Mudança rápida de status */}
                                                                            <div className="w-full lg:w-48 relative">
                                                                                <label className="block text-xs text-gray-500 font-medium mb-1.5">
                                                                                    Status Rápido:
                                                                                    {isItemLoading('status', b.id) && (
                                                                                        <LoadingSpinner size="xs" className="inline-block ml-1 text-[#2d8659]" />
                                                                                    )}
                                                                                </label>
                                                                                <LoadingInput isLoading={isItemLoading('status', b.id)}>
                                                                                    <select
                                                                                        value={b.status}
                                                                                        onChange={(e) => handleQuickStatusChange(b.id, e.target.value, b)}
                                                                                        disabled={quickStatusSelectDisabled}
                                                                                        className={`w-full text-sm px-3 py-1.5 border border-gray-200 rounded-full bg-gray-50 hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-[#2d8659] focus:border-transparent transition-all ${quickStatusSelectDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                                                            } ${isItemLoading('status', b.id) ? 'ring-2 ring-[#2d8659] ring-opacity-50' : ''}`}
                                                                                    >
                                                                                        {quickStatusOptions.map((option) => (
                                                                                            <option
                                                                                                key={option.value}
                                                                                                value={option.value}
                                                                                                disabled={option.disabled}
                                                                                            >
                                                                                                {option.label}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                </LoadingInput>
                                                                            </div>

                                                                            <div className="flex flex-row gap-2 mt-2">
                                                                                <Dialog>
                                                                                    <DialogTrigger asChild>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="rounded-full flex-1 lg:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
                                                                                            disabled={isAnyItemLoading()}
                                                                                            onClick={() => {
                                                                                                setEditingBooking(b);
                                                                                                const resolvedProfessionalId = isAdminView
                                                                                                    ? (b.professional_id || '')
                                                                                                    : (currentProfessional?.id || b.professional_id || '');

                                                                                                setBookingEditData({
                                                                                                    booking_date: b.booking_date,
                                                                                                    booking_time: b.booking_time,
                                                                                                    status: b.status,
                                                                                                    professional_id: resolvedProfessionalId,
                                                                                                    service_id: b.service_id || '',
                                                                                                    patient_name: b.patient_name || '',
                                                                                                    patient_email: b.patient_email || '',
                                                                                                    patient_phone: b.patient_phone || '',
                                                                                                    valor_consulta: formatNumberToCurrencyInput(b.valor_consulta ?? ''),
                                                                                                    valor_repasse_profissional: formatNumberToCurrencyInput(
                                                                                                        b.valor_repasse_profissional ?? b.valor_consulta ?? ''
                                                                                                    )
                                                                                                });
                                                                                            }}
                                                                                            className={`hover:bg-blue-50 transition-all flex-1 ${isAnyItemLoading() ? 'opacity-50 cursor-not-allowed' : ''
                                                                                                }`}
                                                                                        >
                                                                                            {isItemLoading('edit', b.id) ? (
                                                                                                <LoadingSpinner size="sm" className="mr-1" />
                                                                                            ) : (
                                                                                                <Edit className="w-4 h-4 mr-1" />
                                                                                            )}
                                                                                            Editar
                                                                                        </Button>
                                                                                    </DialogTrigger>
                                                                                    <DialogContent className="max-w-2xl">
                                                                                        <DialogHeader>
                                                                                            <DialogTitle className="flex items-center">
                                                                                                <Edit className="w-5 h-5 mr-2" />
                                                                                                Editar Agendamento
                                                                                            </DialogTitle>
                                                                                        </DialogHeader>
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Nome do Paciente *</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={bookingEditData.patient_name}
                                                                                                    onChange={e => {
                                                                                                        if (!isAdminView) return;
                                                                                                        setBookingEditData({ ...bookingEditData, patient_name: e.target.value });
                                                                                                    }}
                                                                                                    className={`w-full input ${!isAdminView ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                                                                    placeholder="Nome completo"
                                                                                                    required
                                                                                                    readOnly={!isAdminView}
                                                                                                />
                                                                                            </div>
                                                                                            {isAdminView && (
                                                                                                <>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Email</label>
                                                                                                        <input
                                                                                                            type="email"
                                                                                                            value={bookingEditData.patient_email}
                                                                                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_email: e.target.value })}
                                                                                                            className="w-full input"
                                                                                                            placeholder="email@exemplo.com"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Telefone</label>
                                                                                                        <input
                                                                                                            type="tel"
                                                                                                            value={bookingEditData.patient_phone}
                                                                                                            onChange={e => setBookingEditData({ ...bookingEditData, patient_phone: e.target.value })}
                                                                                                            className="w-full input"
                                                                                                            placeholder="(11) 99999-9999"
                                                                                                        />
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                            {isAdminView && (
                                                                                                <div>
                                                                                                    <label className="block text-sm font-medium mb-1">Status *</label>
                                                                                                    <select
                                                                                                        value={bookingEditData.status}
                                                                                                        onChange={e => setBookingEditData({ ...bookingEditData, status: e.target.value })}
                                                                                                        className="w-full input"
                                                                                                    >
                                                                                                        <option value="pending_payment">Pendente Pagamento</option>
                                                                                                        <option value="confirmed">Confirmado</option>
                                                                                                        <option value="completed">Concluído</option>
                                                                                                        <option value="cancelled_by_patient">Cancelado (Paciente)</option>
                                                                                                        <option value="cancelled_by_professional">Cancelado (Profissional)</option>
                                                                                                        <option value="no_show_unjustified">Falta injustificada</option>
                                                                                                    </select>
                                                                                                </div>
                                                                                            )}
                                                                                            {isAdminView && (
                                                                                                <div>
                                                                                                    <label className="block text-sm font-medium mb-1">Profissional *</label>
                                                                                                    <select
                                                                                                        value={bookingEditData.professional_id}
                                                                                                        onChange={e => setBookingEditData({ ...bookingEditData, professional_id: e.target.value })}
                                                                                                        className="w-full input"
                                                                                                        required
                                                                                                    >
                                                                                                        <option value="">Selecione um profissional</option>
                                                                                                        {professionals.map(prof => (
                                                                                                            <option key={prof.id} value={prof.id}>{prof.name}</option>
                                                                                                        ))}
                                                                                                    </select>
                                                                                                </div>
                                                                                            )}
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Serviço *</label>
                                                                                                <select
                                                                                                    value={bookingEditData.service_id}
                                                                                                    onChange={e => {
                                                                                                        const nextServiceId = e.target.value;
                                                                                                        const matchedService = services.find(service => service.id === nextServiceId);
                                                                                                        setBookingEditData(prev => ({
                                                                                                            ...prev,
                                                                                                            service_id: nextServiceId,
                                                                                                            valor_consulta: matchedService
                                                                                                                ? formatNumberToCurrencyInput(matchedService.price)
                                                                                                                : prev.valor_consulta,
                                                                                                            valor_repasse_profissional: matchedService
                                                                                                                ? formatNumberToCurrencyInput(matchedService.professional_payout ?? matchedService.price)
                                                                                                                : prev.valor_repasse_profissional
                                                                                                        }));
                                                                                                    }}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                >
                                                                                                    <option value="">Selecione um serviço</option>
                                                                                                    {availableServices.map(service => (
                                                                                                        <option key={service.id} value={service.id}>
                                                                                                            {serviceOptionLabel(service)}
                                                                                                        </option>
                                                                                                    ))}
                                                                                                </select>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Data *</label>
                                                                                                <input
                                                                                                    type="date"
                                                                                                    value={bookingEditData.booking_date}
                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_date: e.target.value })}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                />
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-sm font-medium mb-1">Horário *</label>
                                                                                                <input
                                                                                                    type="time"
                                                                                                    value={bookingEditData.booking_time}
                                                                                                    onChange={e => setBookingEditData({ ...bookingEditData, booking_time: e.target.value })}
                                                                                                    className="w-full input"
                                                                                                    required
                                                                                                />
                                                                                            </div>
                                                                                            {isAdminView && (
                                                                                                <>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Valor da Consulta (R$)</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={bookingEditData.valor_consulta}
                                                                                                            onChange={e => setBookingEditData(prev => ({
                                                                                                                ...prev,
                                                                                                                valor_consulta: sanitizeCurrencyInput(e.target.value)
                                                                                                            }))}
                                                                                                            className="w-full input"
                                                                                                            placeholder="150,00"
                                                                                                        />
                                                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                                                            Valor histórico cobrado do paciente no momento do agendamento
                                                                                                        </p>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-sm font-medium mb-1">Repasse ao Profissional (R$)</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={bookingEditData.valor_repasse_profissional}
                                                                                                            onChange={e => setBookingEditData(prev => ({
                                                                                                                ...prev,
                                                                                                                valor_repasse_profissional: sanitizeCurrencyInput(e.target.value)
                                                                                                            }))}
                                                                                                            className="w-full input"
                                                                                                            placeholder="150,00"
                                                                                                        />
                                                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                                                            Utilize este campo para ajustar o valor repassado ao profissional quando necessário.
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                        <DialogFooter>
                                                                                            <DialogClose asChild>
                                                                                                <Button
                                                                                                    variant="outline"
                                                                                                    disabled={isItemLoading('edit', editingBooking?.id)}
                                                                                                >
                                                                                                    Cancelar
                                                                                                </Button>
                                                                                            </DialogClose>
                                                                                            <LoadingButton
                                                                                                isLoading={isItemLoading('edit', editingBooking?.id)}
                                                                                                loadingText="Salvando..."
                                                                                                onClick={handleUpdateBooking}
                                                                                                className="bg-[#2d8659] hover:bg-[#236b47] text-white px-4 py-2 rounded-md"
                                                                                            >
                                                                                                Salvar Alterações
                                                                                            </LoadingButton>
                                                                                        </DialogFooter>
                                                                                    </DialogContent>
                                                                                </Dialog>
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="destructive"
                                                                                    disabled={isAnyItemLoading()}
                                                                                    onClick={() => handleDeleteBooking(b)}
                                                                                    className={`flex items-center flex-1 ${isAnyItemLoading() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                                >
                                                                                    {isItemLoading('delete', b.id) ? (
                                                                                        <LoadingSpinner size="sm" className="mr-1" />
                                                                                    ) : (
                                                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                                                    )}
                                                                                    Excluir
                                                                                </Button>
                                                                            </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }))}

                                                        {/* Navegação de Páginas */}
                                                        {totalPages > 1 && (
                                                            <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
                                                                <Button
                                                                    onClick={() => setCurrentPage(currentPage - 1)}
                                                                    disabled={currentPage === 1}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    ← Anterior
                                                                </Button>

                                                                <div className="flex gap-1">
                                                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                                        <Button
                                                                            key={page}
                                                                            onClick={() => setCurrentPage(page)}
                                                                            variant={currentPage === page ? "default" : "outline"}
                                                                            size="sm"
                                                                            className={currentPage === page ? "bg-[#2d8659] hover:bg-[#236b47]" : ""}
                                                                        >
                                                                            {page}
                                                                        </Button>
                                                                    ))}
                                                                </div>

                                                                <Button
                                                                    onClick={() => setCurrentPage(currentPage + 1)}
                                                                    disabled={currentPage === totalPages}
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    Próxima →
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                            </div>
                        </Suspense>
</TabsContent>