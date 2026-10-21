/**
 * adminMetrics — fórmulas puras e testáveis dos KPIs do módulo administrativo.
 *
 * Fonte única das definições (ver docs/04-DEVELOPMENT/ADMIN_METRICS_DICTIONARY.md).
 * Decisões do gestor (Fase 1):
 *  - Receita realizada = reservas efetivamente pagas (nunca pendente/cancelada/reembolsada).
 *  - "A receber" (pendente) é exibido separadamente.
 *  - Take rate padrão vem de system_settings.platform_default_retention_pct (40).
 *  - Sem dado => null (a UI mostra "—"), nunca um número inventado.
 */

export const REALIZED_STATUSES = ['confirmed', 'paid', 'completed', 'no_show_unjustified'];
export const PENDING_STATUSES = ['pending', 'pending_payment', 'awaiting_payment'];
export const COMPLETED_STATUSES = ['completed', 'no_show_unjustified'];
export const ABANDONED_STATUSES = ['cancelled', 'expired', 'abandoned', 'rejected'];

const toNumber = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

/**
 * Variação percentual entre períodos.
 * Retorna null quando não há base de comparação (período anterior zero/ausente).
 */
export function pctDelta(current, previous) {
    const cur = Number(current);
    const prev = Number(previous);
    if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
    return Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
}

/** "+8.5%", "-3.2%" ou "—" quando indisponível. */
export function formatDelta(delta) {
    if (delta === null || delta === undefined || !Number.isFinite(Number(delta))) return '—';
    const n = Number(delta);
    return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

/**
 * Ocupação da agenda = consultas ocupando slot ÷ (profissionais × capacidade mensal).
 * Retorna null se não houver capacidade configurada.
 */
export function computeOccupancyPct(bookedSlots, professionalsCount, capacityPerProfessional) {
    const capacity = toNumber(professionalsCount) * toNumber(capacityPerProfessional);
    if (capacity <= 0) return null;
    return Math.min(100, Math.max(0, (toNumber(bookedSlots) / capacity) * 100));
}

/**
 * Consolida financeiro a partir de reservas (visão admin).
 * - gmvRealized: soma de valor_consulta das reservas realizadas
 * - payoutRealized: repasse aos profissionais dessas reservas
 * - platformGrossMargin: gmv - repasse (ANTES de taxa MP e impostos)
 * - takeRatePct: margem / gmv (null se gmv = 0)
 * - toReceive: valor de reservas pendentes (separado da receita)
 */
export function summarizeBookingsFinancials(bookings = []) {
    const summary = {
        gmvRealized: 0,
        payoutRealized: 0,
        platformGrossMargin: 0,
        takeRatePct: null,
        toReceive: 0,
        realizedCount: 0,
        completedCount: 0,
        pendingCount: 0,
        activeSlotCount: 0,
    };

    (bookings || []).forEach((booking) => {
        const status = String(booking?.status || '').toLowerCase();
        const patientValue = toNumber(booking?.valor_consulta ?? booking?.service?.price);
        const professionalValue = toNumber(
            booking?.valor_repasse_profissional ?? booking?.service?.professional_payout ?? booking?.valor_consulta
        );

        if (REALIZED_STATUSES.includes(status)) {
            summary.gmvRealized += patientValue;
            summary.payoutRealized += professionalValue;
            summary.realizedCount += 1;
            summary.activeSlotCount += 1;
            if (COMPLETED_STATUSES.includes(status)) summary.completedCount += 1;
        } else if (PENDING_STATUSES.includes(status)) {
            summary.toReceive += patientValue;
            summary.pendingCount += 1;
        }
    });

    summary.platformGrossMargin = Math.max(summary.gmvRealized - summary.payoutRealized, 0);
    summary.takeRatePct =
        summary.gmvRealized > 0
            ? Number(((summary.platformGrossMargin / summary.gmvRealized) * 100).toFixed(1))
            : null;

    return summary;
}

/**
 * Filtra agendamentos por período atual e período anterior para cálculo de comparativos.
 * @param {Array} bookings 
 * @param {'today'|'7d'|'30d'|'month'|'prev_month'|'all'} period 
 * @param {Date} [referenceDate] 
 * @returns {{ current: Array, previous: Array, label: string }}
 */
export function filterBookingsByPeriod(bookings = [], period = '30d', referenceDate = new Date()) {
    const list = Array.isArray(bookings) ? bookings : [];
    const ref = new Date(referenceDate);
    const toYmd = (d) => d.toISOString().split('T')[0];

    // Helper para extrair data do agendamento (booking_date ou created_at)
    const getBookingYmd = (b) => {
        if (b?.booking_date) {
            const raw = String(b.booking_date).trim();
            return raw.length >= 10 ? raw.slice(0, 10) : raw;
        }
        if (b?.created_at) {
            return String(b.created_at).slice(0, 10);
        }
        return '';
    };

    if (period === 'all') {
        return { current: list, previous: [], label: 'Histórico Total' };
    }

    if (period === 'today') {
        const todayStr = toYmd(ref);
        const yest = new Date(ref);
        yest.setDate(yest.getDate() - 1);
        const yestStr = toYmd(yest);

        return {
            current: list.filter(b => getBookingYmd(b) === todayStr),
            previous: list.filter(b => getBookingYmd(b) === yestStr),
            label: 'Hoje'
        };
    }

    if (period === '7d') {
        const curStart = new Date(ref);
        curStart.setDate(curStart.getDate() - 6);
        const prevEnd = new Date(curStart);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 6);

        const curStartStr = toYmd(curStart);
        const refStr = toYmd(ref);
        const prevStartStr = toYmd(prevStart);
        const prevEndStr = toYmd(prevEnd);

        return {
            current: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= curStartStr && ymd <= refStr;
            }),
            previous: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= prevStartStr && ymd <= prevEndStr;
            }),
            label: 'Últimos 7 dias'
        };
    }

    if (period === '30d') {
        const curStart = new Date(ref);
        curStart.setDate(curStart.getDate() - 29);
        const prevEnd = new Date(curStart);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 29);

        const curStartStr = toYmd(curStart);
        const refStr = toYmd(ref);
        const prevStartStr = toYmd(prevStart);
        const prevEndStr = toYmd(prevEnd);

        return {
            current: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= curStartStr && ymd <= refStr;
            }),
            previous: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= prevStartStr && ymd <= prevEndStr;
            }),
            label: 'Últimos 30 dias'
        };
    }

    if (period === 'month') {
        const year = ref.getFullYear();
        const month = ref.getMonth(); // 0-indexed
        const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDay = new Date(year, month + 1, 0).getDate();
        const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        // Mês anterior completo
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevStartStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
        const prevEndDay = new Date(prevYear, prevMonth + 1, 0).getDate();
        const prevEndStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevEndDay).padStart(2, '0')}`;

        const monthName = ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        return {
            current: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= startStr && ymd <= endStr;
            }),
            previous: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= prevStartStr && ymd <= prevEndStr;
            }),
            label: `Mês Atual (${monthName})`
        };
    }

    if (period === 'prev_month') {
        const year = ref.getFullYear();
        const month = ref.getMonth();
        const curYear = month === 0 ? year - 1 : year;
        const curMonth = month === 0 ? 11 : month - 1;
        const startStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
        const endDay = new Date(curYear, curMonth + 1, 0).getDate();
        const endStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

        const monthPrior = curMonth === 0 ? 11 : curMonth - 1;
        const yearPrior = curMonth === 0 ? curYear - 1 : curYear;
        const priorStartStr = `${yearPrior}-${String(monthPrior + 1).padStart(2, '0')}-01`;
        const priorEndDay = new Date(yearPrior, monthPrior + 1, 0).getDate();
        const priorEndStr = `${yearPrior}-${String(monthPrior + 1).padStart(2, '0')}-${String(priorEndDay).padStart(2, '0')}`;

        const labelName = new Date(curYear, curMonth, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        return {
            current: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= startStr && ymd <= endStr;
            }),
            previous: list.filter(b => {
                const ymd = getBookingYmd(b);
                return ymd >= priorStartStr && ymd <= priorEndStr;
            }),
            label: `Mês Anterior (${labelName})`
        };
    }

    return { current: list, previous: [], label: 'Personalizado' };
}

/**
 * Gera string CSV estruturada para fechamento e auditoria executiva.
 * ZERO PII: Não exporta prontuários, documentos ou anotações clínicas.
 */
export function generateExecutiveCsvReport(summary = {}, bookings = [], periodLabel = 'Período') {
    const lines = [];

    lines.push('RELATORIO EXECUTIVO DE FECHAMENTO — DOXOLOGOS PSICOLOGIA');
    lines.push(`Periodo: ${periodLabel}`);
    lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
    lines.push('');
    lines.push('--- CONSOLIDADO FINANCEIRO ---');
    lines.push(`GMV Realizado (Consultas Pagas/Concluidas);R$ ${(summary.gmvRealized || 0).toFixed(2).replace('.', ',')}`);
    lines.push(`Repasses aos Profissionais;R$ ${(summary.payoutRealized || 0).toFixed(2).replace('.', ',')}`);
    lines.push(`Margem Bruta da Plataforma;R$ ${(summary.platformGrossMargin || 0).toFixed(2).replace('.', ',')}`);
    lines.push(`Take Rate Efetivo;${summary.takeRatePct !== null && summary.takeRatePct !== undefined ? `${summary.takeRatePct}%` : 'N/A'}`);
    lines.push(`A Receber (Pendentes de Confirmacao);R$ ${(summary.toReceive || 0).toFixed(2).replace('.', ',')}`);
    lines.push(`Consultas Realizadas / Concluidas;${summary.realizedCount || 0}`);
    lines.push(`Cobrancas Pendentes;${summary.pendingCount || 0}`);
    lines.push('');
    lines.push('--- DISCRIMINATIVO DE ATENDIMENTOS ---');
    lines.push('ID;Data;Horario;Profissional;Servico;Status;Valor Consulta (R$);Repasse Profissional (R$);Margem Clinica (R$)');

    (bookings || []).forEach(b => {
        const id = b.id || '';
        const data = b.booking_date || '';
        const hora = b.booking_time || '';
        const prof = (b.professional?.name || 'Profissional').replace(/;/g, ' ');
        const serv = (b.service?.name || 'Psicoterapia').replace(/;/g, ' ');
        const status = b.status || '';
        const valor = Number(b.valor_consulta || b.service?.price || 0);
        const repasse = Number(b.valor_repasse_profissional || b.service?.professional_payout || 0);
        const margem = Math.max(0, valor - repasse);

        lines.push(`${id};${data};${hora};${prof};${serv};${status};${valor.toFixed(2).replace('.', ',')};${repasse.toFixed(2).replace('.', ',')};${margem.toFixed(2).replace('.', ',')}`);
    });

    return lines.join('\r\n');
}

/**
 * Anonimiza nome de paciente para exibição em listas de gestão executiva (Zero PII).
 */
export function anonymizePatientName(name = '') {
    if (!name || typeof name !== 'string') return 'Paciente Anônimo';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const lastInitial = parts[parts.length - 1][0] ? `${parts[parts.length - 1][0]}.` : '';
    return `${first} ${lastInitial}`;
}

/**
 * Consolida métricas de No-show e Cancelamentos por profissional e por dia da semana.
 * @param {Array} bookings
 * @returns {Object}
 */
export function computeNoShowAndCancellationMetrics(bookings = []) {
    const list = Array.isArray(bookings) ? bookings : [];

    let total = 0;
    let completedCount = 0;
    let noShowCount = 0;
    let cancelledCount = 0;
    let confirmedCount = 0;

    const byProfessionalMap = {};
    const byDayOfWeek = {
        0: { dayName: 'Domingo', key: 'sunday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        1: { dayName: 'Segunda', key: 'monday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        2: { dayName: 'Terça', key: 'tuesday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        3: { dayName: 'Quarta', key: 'wednesday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        4: { dayName: 'Quinta', key: 'thursday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        5: { dayName: 'Sexta', key: 'friday', total: 0, completed: 0, noShow: 0, cancelled: 0 },
        6: { dayName: 'Sábado', key: 'saturday', total: 0, completed: 0, noShow: 0, cancelled: 0 }
    };

    list.forEach(b => {
        const status = (b.status || '').toLowerCase().trim();
        const sessionStatus = (b.session_status || '').toLowerCase().trim();
        const isNoShow = status === 'no_show' || status === 'no_show_unjustified' || sessionStatus === 'no_show';
        const isCancelled = status === 'cancelled' || sessionStatus === 'cancelled';
        const isCompleted = status === 'completed' || sessionStatus === 'completed';
        const isConfirmed = status === 'confirmed' || status === 'paid';

        total += 1;
        if (isCompleted) completedCount += 1;
        if (isNoShow) noShowCount += 1;
        if (isCancelled) cancelledCount += 1;
        if (isConfirmed) confirmedCount += 1;

        // Agrupamento por profissional
        const profId = b.professional_id || b.professional?.id || 'unassigned';
        const profName = b.professional?.name || 'Profissional';
        if (!byProfessionalMap[profId]) {
            byProfessionalMap[profId] = {
                professionalId: profId,
                name: profName,
                total: 0,
                completed: 0,
                noShow: 0,
                cancelled: 0
            };
        }
        byProfessionalMap[profId].total += 1;
        if (isCompleted) byProfessionalMap[profId].completed += 1;
        if (isNoShow) byProfessionalMap[profId].noShow += 1;
        if (isCancelled) byProfessionalMap[profId].cancelled += 1;

        // Agrupamento por dia da semana
        if (b.booking_date) {
            const rawYmd = String(b.booking_date).slice(0, 10);
            const dateObj = new Date(`${rawYmd}T12:00:00`);
            if (!Number.isNaN(dateObj.getTime())) {
                const dayIndex = dateObj.getDay();
                if (byDayOfWeek[dayIndex]) {
                    byDayOfWeek[dayIndex].total += 1;
                    if (isCompleted) byDayOfWeek[dayIndex].completed += 1;
                    if (isNoShow) byDayOfWeek[dayIndex].noShow += 1;
                    if (isCancelled) byDayOfWeek[dayIndex].cancelled += 1;
                }
            }
        }
    });

    const attendedOrNoShow = completedCount + noShowCount;
    const noShowRatePct = attendedOrNoShow > 0
        ? Number(((noShowCount / attendedOrNoShow) * 100).toFixed(1))
        : 0;

    const cancellationRatePct = total > 0
        ? Number(((cancelledCount / total) * 100).toFixed(1))
        : 0;

    const byProfessionalList = Object.values(byProfessionalMap).map(p => {
        const profAttended = p.completed + p.noShow;
        const rate = profAttended > 0 ? Number(((p.noShow / profAttended) * 100).toFixed(1)) : 0;
        return {
            ...p,
            noShowRatePct: rate
        };
    }).sort((a, b) => b.noShow - a.noShow);

    return {
        total,
        completedCount,
        noShowCount,
        cancelledCount,
        confirmedCount,
        noShowRatePct,
        cancellationRatePct,
        byProfessional: byProfessionalList,
        byDayOfWeek: Object.values(byDayOfWeek)
    };
}

/**
 * Calcula métricas clínicas de Retenção e Recorrência de Pacientes (Coortes).
 * @param {Array} bookings
 * @returns {Object}
 */
export function computePatientRetentionMetrics(bookings = []) {
    const list = Array.isArray(bookings) ? bookings : [];

    const patientMap = {};

    list.forEach(b => {
        const status = (b.status || '').toLowerCase().trim();
        const isEligible = REALIZED_STATUSES.includes(status);
        if (!isEligible) return;

        const patientKey = (b.patient_email || b.user_id || b.patient_name || '').toLowerCase().trim();
        if (!patientKey) return;

        if (!patientMap[patientKey]) {
            patientMap[patientKey] = {
                key: patientKey,
                name: b.patient_name || 'Paciente',
                email: b.patient_email || '',
                phone: b.patient_phone || '',
                sessions: []
            };
        }

        const dateStr = b.booking_date ? String(b.booking_date).slice(0, 10) : '';
        const timeStr = b.booking_time ? String(b.booking_time).slice(0, 5) : '00:00';
        patientMap[patientKey].sessions.push({
            id: b.id,
            dateTime: `${dateStr}T${timeStr}`,
            date: dateStr,
            professionalId: b.professional_id,
            professionalName: b.professional?.name || 'Psicólogo'
        });
    });

    const patients = Object.values(patientMap);
    const totalPatients = patients.length;

    let singleSessionCount = 0;
    let multiSessionCount = 0;
    let cohort1 = 0;
    let cohort2To4 = 0;
    let cohort5Plus = 0;

    const daysToSecondSessionList = [];

    patients.forEach(p => {
        p.sessions.sort((a, b) => (a.dateTime > b.dateTime ? 1 : -1));
        const count = p.sessions.length;

        if (count === 1) {
            singleSessionCount += 1;
            cohort1 += 1;
        } else if (count >= 2) {
            multiSessionCount += 1;
            if (count <= 4) {
                cohort2To4 += 1;
            } else {
                cohort5Plus += 1;
            }

            const firstDate = new Date(p.sessions[0].dateTime);
            const secondDate = new Date(p.sessions[1].dateTime);
            if (!Number.isNaN(firstDate.getTime()) && !Number.isNaN(secondDate.getTime())) {
                const diffDays = Math.max(0, Math.round((secondDate - firstDate) / (1000 * 60 * 60 * 24)));
                daysToSecondSessionList.push(diffDays);
            }
        }
    });

    const secondSessionReturnRatePct = totalPatients > 0
        ? Number(((multiSessionCount / totalPatients) * 100).toFixed(1))
        : null;

    const avgDaysToSecondSession = daysToSecondSessionList.length > 0
        ? Number((daysToSecondSessionList.reduce((acc, d) => acc + d, 0) / daysToSecondSessionList.length).toFixed(1))
        : null;

    return {
        totalPatients,
        singleSessionCount,
        multiSessionCount,
        secondSessionReturnRatePct,
        avgDaysToSecondSession,
        cohorts: [
            { category: '1 Consulta (Inicial)', count: cohort1, percentage: totalPatients > 0 ? Number(((cohort1 / totalPatients) * 100).toFixed(1)) : 0 },
            { category: '2 a 4 Consultas (Acompanhamento)', count: cohort2To4, percentage: totalPatients > 0 ? Number(((cohort2To4 / totalPatients) * 100).toFixed(1)) : 0 },
            { category: '5+ Consultas (Fidelizados)', count: cohort5Plus, percentage: totalPatients > 0 ? Number(((cohort5Plus / totalPatients) * 100).toFixed(1)) : 0 }
        ]
    };
}

/**
 * Identifica pacientes em risco de abandono clínico (sem consulta há mais de X dias e sem agendamento futuro).
 * Retorna dados anonimizados para a gestão (Zero PII).
 * @param {Array} bookings
 * @param {number} daysThreshold
 * @param {Date} referenceDate
 * @returns {Array<Object>}
 */
export function identifyDisengagedPatients(bookings = [], daysThreshold = 30, referenceDate = new Date()) {
    const list = Array.isArray(bookings) ? bookings : [];
    const ref = new Date(referenceDate);
    const refYmd = ref.toISOString().slice(0, 10);

    const patientMap = {};

    list.forEach(b => {
        const patientKey = (b.patient_email || b.user_id || b.patient_name || '').toLowerCase().trim();
        if (!patientKey) return;

        if (!patientMap[patientKey]) {
            patientMap[patientKey] = {
                key: patientKey,
                rawName: b.patient_name || 'Paciente',
                email: b.patient_email || '',
                phone: b.patient_phone || '',
                pastSessions: [],
                futureBookings: []
            };
        }

        const dateStr = b.booking_date ? String(b.booking_date).slice(0, 10) : '';
        const status = (b.status || '').toLowerCase().trim();

        if (dateStr >= refYmd && (status === 'confirmed' || status === 'paid' || status === 'pending')) {
            patientMap[patientKey].futureBookings.push(b);
        } else if (REALIZED_STATUSES.includes(status)) {
            patientMap[patientKey].pastSessions.push({
                date: dateStr,
                professionalName: b.professional?.name || 'Psicólogo',
                professionalId: b.professional_id
            });
        }
    });

    const atRiskPatients = [];

    Object.values(patientMap).forEach(p => {
        if (p.futureBookings.length > 0) return;
        if (p.pastSessions.length === 0) return;

        p.pastSessions.sort((a, b) => (b.date > a.date ? 1 : -1));
        const lastSession = p.pastSessions[0];

        if (!lastSession.date) return;
        const lastDate = new Date(`${lastSession.date}T12:00:00`);
        if (Number.isNaN(lastDate.getTime())) return;

        const daysSinceLast = Math.max(0, Math.floor((ref - lastDate) / (1000 * 60 * 60 * 24)));

        if (daysSinceLast >= daysThreshold) {
            atRiskPatients.push({
                patientId: p.key,
                patientDisplay: anonymizePatientName(p.rawName),
                daysSinceLastSession: daysSinceLast,
                lastSessionDate: lastSession.date,
                totalSessions: p.pastSessions.length,
                professionalName: lastSession.professionalName,
                professionalId: lastSession.professionalId,
                email: p.email,
                phone: p.phone
            });
        }
    });

    return atRiskPatients.sort((a, b) => b.daysSinceLastSession - a.daysSinceLastSession);
}

/**
 * Calcula Capacidade vs Demanda por Dia da Semana e Turno (Manhã, Tarde, Noite).
 * @param {Array} bookings
 * @param {Object} availability
 * @returns {Array<Object>}
 */
export function computeCapacityAndDemandByDay(bookings = [], availability = {}) {
    const list = Array.isArray(bookings) ? bookings : [];

    const days = [
        { dayOfWeek: 1, key: 'monday', label: 'Segunda-feira' },
        { dayOfWeek: 2, key: 'tuesday', label: 'Terça-feira' },
        { dayOfWeek: 3, key: 'wednesday', label: 'Quarta-feira' },
        { dayOfWeek: 4, key: 'thursday', label: 'Quinta-feira' },
        { dayOfWeek: 5, key: 'friday', label: 'Sexta-feira' },
        { dayOfWeek: 6, key: 'saturday', label: 'Sábado' }
    ];

    const result = days.map(d => {
        let slotsMorning = 0;
        let slotsAfternoon = 0;
        let slotsNight = 0;

        if (availability && typeof availability === 'object') {
            Object.values(availability).forEach(profAvail => {
                if (!profAvail) return;
                const times = profAvail[d.key] || [];
                if (Array.isArray(times)) {
                    times.forEach(t => {
                        const hour = parseInt(String(t).slice(0, 2), 10);
                        if (hour >= 8 && hour < 12) slotsMorning += 1;
                        else if (hour >= 12 && hour < 18) slotsAfternoon += 1;
                        else if (hour >= 18 && hour <= 22) slotsNight += 1;
                    });
                }
            });
        }

        let bookedMorning = 0;
        let bookedAfternoon = 0;
        let bookedNight = 0;

        list.forEach(b => {
            if (!b.booking_date) return;
            const dateObj = new Date(`${String(b.booking_date).slice(0, 10)}T12:00:00`);
            if (dateObj.getDay() !== d.dayOfWeek) return;

            const timeStr = String(b.booking_time || '12:00').slice(0, 2);
            const hour = parseInt(timeStr, 10);

            if (hour >= 8 && hour < 12) bookedMorning += 1;
            else if (hour >= 12 && hour < 18) bookedAfternoon += 1;
            else if (hour >= 18 && hour <= 22) bookedNight += 1;
        });

        const totalSlots = slotsMorning + slotsAfternoon + slotsNight;
        const totalBooked = bookedMorning + bookedAfternoon + bookedNight;
        const occupancyPct = totalSlots > 0 ? Number(((totalBooked / totalSlots) * 100).toFixed(1)) : null;

        return {
            ...d,
            slotsAvailable: totalSlots,
            slotsBooked: totalBooked,
            occupancyPct,
            byShift: {
                morning: { available: slotsMorning, booked: bookedMorning },
                afternoon: { available: slotsAfternoon, booked: bookedAfternoon },
                night: { available: slotsNight, booked: bookedNight }
            }
        };
    });

    return result;
}

/**
 * Consolida métricas do Funil de Conversão e Abandono de Checkout/PIX.
 * @param {Array} bookings
 * @param {Array} leads
 * @returns {Object}
 */
export function computeFunnelMetrics(bookings = [], leads = []) {
    const bList = Array.isArray(bookings) ? bookings : [];
    const lList = Array.isArray(leads) ? leads : [];

    const totalLeads = lList.length;
    const leadsContacted = lList.filter(l => l.status === 'contatado' || l.status === 'agendou').length;
    const leadsBooked = lList.filter(l => l.status === 'agendou').length;

    const totalBookingsCreated = bList.length;
    const completedBookings = bList.filter(b => (b.status || '').toLowerCase() === 'completed').length;
    const realizedBookings = bList.filter(b => REALIZED_STATUSES.includes((b.status || '').toLowerCase())).length;
    const pendingBookings = bList.filter(b => PENDING_STATUSES.includes((b.status || '').toLowerCase())).length;
    const cancelledBookings = bList.filter(b => ABANDONED_STATUSES.includes((b.status || '').toLowerCase())).length;

    const checkoutTotal = realizedBookings + pendingBookings + cancelledBookings;
    const checkoutConversionPct = checkoutTotal > 0
        ? Number(((realizedBookings / checkoutTotal) * 100).toFixed(1))
        : 0;

    const checkoutAbandonmentPct = checkoutTotal > 0
        ? Number((((pendingBookings + cancelledBookings) / checkoutTotal) * 100).toFixed(1))
        : 0;

    const leadConversionPct = totalLeads > 0
        ? Number(((leadsBooked / totalLeads) * 100).toFixed(1))
        : 0;

    const funnelStages = [
        { stage: '1. Testes Concluídos (Leads)', count: totalLeads, conversionPct: 100 },
        { stage: '2. Leads Qualificados/Contatados', count: leadsContacted, conversionPct: totalLeads > 0 ? Number(((leadsContacted / totalLeads) * 100).toFixed(1)) : 0 },
        { stage: '3. Checkouts Iniciados', count: totalBookingsCreated, conversionPct: null },
        { stage: '4. Pagamentos Confirmados (PIX/Cartão)', count: realizedBookings, conversionPct: totalBookingsCreated > 0 ? Number(((realizedBookings / totalBookingsCreated) * 100).toFixed(1)) : 0 },
        { stage: '5. Consultas Realizadas', count: completedBookings, conversionPct: realizedBookings > 0 ? Number(((completedBookings / realizedBookings) * 100).toFixed(1)) : 0 }
    ];

    return {
        totalLeads,
        leadsContacted,
        leadsBooked,
        leadConversionPct,
        totalBookingsCreated,
        realizedBookings,
        pendingBookings,
        cancelledBookings,
        completedBookings,
        checkoutConversionPct,
        checkoutAbandonmentPct,
        funnelStages
    };
}

/**
 * Agrupa aquisições e faturamento por canal de negócio.
 * @param {Array} bookings
 * @returns {Array<Object>}
 */
export function computeChannelAcquisition(bookings = []) {
    const list = Array.isArray(bookings) ? bookings : [];

    const channelMap = {
        b2c: { channel: 'B2C (Pacientes Diretos)', count: 0, revenue: 0 },
        b2b: { channel: 'B2B (Empresas & Convênios)', count: 0, revenue: 0 },
        livro: { channel: 'Leitores do Livro', count: 0, revenue: 0 },
        eventos: { channel: 'Workshops & Eventos', count: 0, revenue: 0 },
        outros: { channel: 'Orgânico / Direto', count: 0, revenue: 0 }
    };

    list.forEach(b => {
        const isRealized = REALIZED_STATUSES.includes((b.status || '').toLowerCase());
        const model = (b.business_model || '').toLowerCase();
        const value = Number(b.valor_consulta ?? b?.service?.price ?? 0);

        let key = 'outros';
        if (model.includes('b2b') || model.includes('empresa')) key = 'b2b';
        else if (model.includes('b2c')) key = 'b2c';
        else if (model.includes('livro') || b.book_resource_id) key = 'livro';
        else if (model.includes('evento') || b.event_id) key = 'eventos';
        else key = 'b2c';

        channelMap[key].count += 1;
        if (isRealized) {
            channelMap[key].revenue += value;
        }
    });

    return Object.values(channelMap).filter(c => c.count > 0 || c.revenue > 0);
}

/**
 * Calcula o progresso das metas mensais da clínica contra o realizado.
 * @param {Object} currentMetrics
 * @param {Object} targets
 * @returns {Array<Object>}
 */
export function computeMonthlyGoalsProgress(currentMetrics = {}, targets = {}) {
    const revenueTarget = Number(targets.target_monthly_revenue_brl || 30000);
    const bookingsTarget = Number(targets.target_monthly_bookings_count || 200);
    const newPatientsTarget = Number(targets.target_new_patients_count || 30);
    const retentionTarget = Number(targets.target_retention_return_rate_pct || 60);

    const revenueCurrent = Number(currentMetrics.gmvRealized || 0);
    const bookingsCurrent = Number(currentMetrics.realizedCount || 0);
    const newPatientsCurrent = Number(currentMetrics.newPatientsCount || 0);
    const retentionCurrent = currentMetrics.retentionPct !== null && currentMetrics.retentionPct !== undefined
        ? Number(currentMetrics.retentionPct)
        : 0;

    const calcProgress = (curr, tgt) => {
        if (!tgt || tgt <= 0) return 0;
        return Number(Math.min(150, Math.max(0, (curr / tgt) * 100)).toFixed(1));
    };

    const getStatus = (progress) => {
        if (progress >= 100) return 'achieved';
        if (progress >= 70) return 'on_track';
        return 'at_risk';
    };

    const goals = [
        {
            id: 'revenue',
            title: 'Faturamento Realizado (GMV)',
            current: revenueCurrent,
            target: revenueTarget,
            unit: 'currency',
            progressPct: calcProgress(revenueCurrent, revenueTarget),
            status: getStatus(calcProgress(revenueCurrent, revenueTarget))
        },
        {
            id: 'bookings',
            title: 'Consultas Concluídas',
            current: bookingsCurrent,
            target: bookingsTarget,
            unit: 'number',
            progressPct: calcProgress(bookingsCurrent, bookingsTarget),
            status: getStatus(calcProgress(bookingsCurrent, bookingsTarget))
        },
        {
            id: 'new_patients',
            title: 'Novos Pacientes no Mês',
            current: newPatientsCurrent,
            target: newPatientsTarget,
            unit: 'number',
            progressPct: calcProgress(newPatientsCurrent, newPatientsTarget),
            status: getStatus(calcProgress(newPatientsCurrent, newPatientsTarget))
        },
        {
            id: 'retention',
            title: 'Retorno para 2ª Sessão',
            current: retentionCurrent,
            target: retentionTarget,
            unit: 'percent',
            progressPct: calcProgress(retentionCurrent, retentionTarget),
            status: getStatus(calcProgress(retentionCurrent, retentionTarget))
        }
    ];

    return goals;
}

/**
 * Consolida o radar de acompanhamento e retenção ativa de pacientes para a administração.
 * 
 * Segmenta e direciona pacientes com base em risco de abandono e ausência de retorno:
 *  - 'single_session': Só 1 consulta realizada e sem retorno agendado há >= 7 dias (Drop-off precoce).
 *  - 'over_30d': Sem retorno agendado há 30 a 59 dias (Risco Moderado/Alto).
 *  - 'critical_60d': Inativo há mais de 60 dias sem agendamento (Abandono prolongado).
 *  - 'recent_no_next': Atendimento recente (8 a 29 dias) mas sem próxima sessão marcada (Atenção preventiva).
 * 
 * Gera scripts de acolhimento humanizado em estrita conformidade com o Código de Ética do Psicólogo (CFP).
 * 
 * @param {Array} bookings - Lista de agendamentos
 * @param {Object} [options={}]
 * @param {Date} [options.referenceDate=new Date()]
 * @param {number} [options.singleSessionDaysThreshold=7]
 * @param {number} [options.noReturnDaysThreshold=30]
 * @param {number} [options.criticalDaysThreshold=60]
 * @param {Object} [options.adminStatusMap={}] - Mapeamento de status gerido pelo admin { [patientKey]: { status, notes, updated_at } }
 * @returns {Object}
 */
export function computePatientFollowUpAndRetention(bookings = [], options = {}) {
    const list = Array.isArray(bookings) ? bookings : [];
    const ref = options.referenceDate ? new Date(options.referenceDate) : new Date();
    const refYmd = ref.toISOString().slice(0, 10);

    const singleSessionDaysThreshold = options.singleSessionDaysThreshold ?? 7;
    const noReturnDaysThreshold = options.noReturnDaysThreshold ?? 30;
    const criticalDaysThreshold = options.criticalDaysThreshold ?? 60;
    const adminStatusMap = options.adminStatusMap || {};

    const patientMap = {};

    list.forEach(b => {
        const patientKey = (b.patient_email || b.user_id || b.patient_name || '').toLowerCase().trim();
        if (!patientKey) return;

        if (!patientMap[patientKey]) {
            patientMap[patientKey] = {
                key: patientKey,
                rawName: b.patient_name || 'Paciente',
                email: b.patient_email || '',
                phone: b.patient_phone || '',
                pastSessions: [],
                futureBookings: []
            };
        }

        const dateStr = b.booking_date ? String(b.booking_date).slice(0, 10) : '';
        const status = (b.status || '').toLowerCase().trim();
        const price = Number(b.valor_consulta ?? b?.service?.price ?? 150);

        if (dateStr >= refYmd && ['confirmed', 'paid', 'pending', 'pending_payment'].includes(status)) {
            patientMap[patientKey].futureBookings.push({
                id: b.id,
                date: dateStr,
                time: b.booking_time ? String(b.booking_time).slice(0, 5) : '00:00',
                status
            });
        } else if (REALIZED_STATUSES.includes(status)) {
            patientMap[patientKey].pastSessions.push({
                id: b.id,
                date: dateStr,
                time: b.booking_time ? String(b.booking_time).slice(0, 5) : '00:00',
                professionalName: b.professional?.name || 'Psicólogo(a)',
                professionalId: b.professional_id,
                price
            });
        }
    });

    const atRiskList = [];
    let singleSessionDropoffCount = 0;
    let over30DaysNoReturnCount = 0;
    let criticalOver60DaysCount = 0;
    let recentWithoutNextCount = 0;
    let potentialRecoverableRevenue = 0;

    const followUpFunnelCounts = {
        pendente: 0,
        contatado: 0,
        reagendado: 0,
        pausa: 0,
        concluido: 0
    };

    Object.values(patientMap).forEach(p => {
        // Se possui agendamento futuro garantido, não está em risco de abandono
        if (p.futureBookings.length > 0) return;
        // Se não possui nenhuma sessão realizada no passado, não iniciou tratamento ainda
        if (p.pastSessions.length === 0) return;

        p.pastSessions.sort((a, b) => (b.date > a.date ? 1 : -1));
        const lastSession = p.pastSessions[0];
        if (!lastSession.date) return;

        const dateParts = lastSession.date.split('-').map(Number);
        if (dateParts.length < 3 || dateParts.some(Number.isNaN)) return;
        const [y, m, d] = dateParts;
        const lastDateUtc = Date.UTC(y, m - 1, d);
        const refDateUtc = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());

        const daysSinceLastSession = Math.max(0, Math.round((refDateUtc - lastDateUtc) / (1000 * 60 * 60 * 24)));
        const totalSessions = p.pastSessions.length;
        const avgSessionPrice = lastSession.price || 150;

        let segment = null;
        let urgency = 'medium';
        let riskReason = '';
        let suggestedAction = '';

        if (daysSinceLastSession >= criticalDaysThreshold) {
            segment = 'critical_60d';
            urgency = 'critical';
            riskReason = `Abandono prolongado (sem agendar há ${daysSinceLastSession} dias)`;
            suggestedAction = 'Reconexão suave e afetuosa: perguntar como tem passado e reafirmar que o espaço terapêutico segue aberto.';
            criticalOver60DaysCount += 1;
        } else if (totalSessions === 1 && daysSinceLastSession >= singleSessionDaysThreshold) {
            segment = 'single_session';
            urgency = 'critical';
            riskReason = `Drop-off de 1ª consulta (sem retorno há ${daysSinceLastSession} dias)`;
            suggestedAction = 'Acolhimento da 1ª Consulta: verificar como se sentiu com o profissional e apoiar a continuidade do processo.';
            singleSessionDropoffCount += 1;
        } else if (daysSinceLastSession >= noReturnDaysThreshold) {
            segment = 'over_30d';
            urgency = 'high';
            riskReason = `Sem retorno há mais de 30 dias (${daysSinceLastSession} dias sem consulta)`;
            suggestedAction = 'Contato de cuidado e escuta: verificar bem-estar e checar se deseja retomar ou agendar novo horário.';
            over30DaysNoReturnCount += 1;
        } else if (daysSinceLastSession >= 8) {
            segment = 'recent_no_next';
            urgency = 'preventive';
            riskReason = `Atendimento recente sem agendamento futuro (${daysSinceLastSession} dias)`;
            suggestedAction = 'Apoio preventivo de agenda: verificar se deseja fixar o horário semanal para manter o ritmo terapêutico.';
            recentWithoutNextCount += 1;
        }

        // Se o paciente foi enquadrado em algum segmento de acompanhamento
        if (segment) {
            potentialRecoverableRevenue += avgSessionPrice;

            const adminInfo = adminStatusMap[p.key] || {};
            const followUpStatus = adminInfo.status || 'pendente';
            if (followUpFunnelCounts[followUpStatus] !== undefined) {
                followUpFunnelCounts[followUpStatus] += 1;
            } else {
                followUpFunnelCounts.pendente += 1;
            }

            const firstName = p.rawName?.trim()?.split(' ')[0] || 'Paciente';
            const profName = lastSession.professionalName || 'seu(sua) psicólogo(a)';

            // Mensagens humanizadas pautadas nas normas do CFP (Acolhimento sem pressão comercial)
            const messageTemplates = {
                firstSessionCare: `Olá, ${firstName}! Aqui é da equipe de acolhimento da Doxologos Psicologia. Esperamos que seu primeiro encontro com ${profName} tenha sido um momento confortável e seguro. Gostaríamos de saber como você se sentiu e se você precisa de algum apoio para dar continuidade ao seu processo terapêutico. Como você tem passado?`,
                gentleReconnection: `Olá, ${firstName}, tudo bem? Aqui é da equipe Doxologos. Passando com muito carinho para saber como você está. Sabemos que a rotina por vezes pede pausas e que a terapia tem seu próprio tempo. Queremos que você saiba que nosso espaço e ${profName} continuam de portas abertas quando você sentir que é a hora de retomar. Conte sempre conosco!`,
                operationalSupport: `Olá, ${firstName}! Aqui é da Doxologos Psicologia. Notamos que faz alguns dias desde seu último encontro com ${profName}. Gostaríamos de verificar se você teve qualquer dificuldade com horários ou agendamento na plataforma. Se precisar de apoio para encontrar um horário ideal para sua rotina, estamos à disposição para ajudar!`
            };

            atRiskList.push({
                patientId: p.key,
                rawName: p.rawName,
                patientDisplay: anonymizePatientName(p.rawName),
                email: p.email,
                phone: p.phone,
                cleanPhone: p.phone ? p.phone.replace(/\D/g, '') : '',
                totalSessions,
                lastSessionDate: lastSession.date,
                daysSinceLastSession,
                professionalName: lastSession.professionalName,
                professionalId: lastSession.professionalId,
                segment,
                urgency,
                riskReason,
                suggestedAction,
                estimatedSessionValue: avgSessionPrice,
                followUpStatus,
                adminNotes: adminInfo.notes || '',
                statusUpdatedAt: adminInfo.updated_at || null,
                messageTemplates
            });
        }
    });

    // Ordenação prioritária: Maior urgência e maior tempo de inatividade
    const urgencyWeight = { critical: 3, high: 2, preventive: 1, medium: 1 };
    atRiskList.sort((a, b) => {
        const weightDiff = (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
        if (weightDiff !== 0) return weightDiff;
        return b.daysSinceLastSession - a.daysSinceLastSession;
    });

    return {
        summary: {
            totalAtRisk: atRiskList.length,
            singleSessionDropoffCount,
            over30DaysNoReturnCount,
            criticalOver60DaysCount,
            recentWithoutNextCount,
            potentialRecoverableRevenue,
            followUpFunnelCounts
        },
        patients: atRiskList
    };
}


