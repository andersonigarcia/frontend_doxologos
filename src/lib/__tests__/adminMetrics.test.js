import {
    pctDelta,
    formatDelta,
    computeOccupancyPct,
    summarizeBookingsFinancials,
    filterBookingsByPeriod,
    generateExecutiveCsvReport,
    anonymizePatientName,
    computeNoShowAndCancellationMetrics,
    computePatientRetentionMetrics,
    identifyDisengagedPatients,
    computeCapacityAndDemandByDay,
    computeFunnelMetrics,
    computeChannelAcquisition,
    computeMonthlyGoalsProgress,
    computePatientFollowUpAndRetention
} from '../adminMetrics';

describe('pctDelta', () => {
    it('calcula variação positiva e negativa', () => {
        expect(pctDelta(110, 100)).toBe(10);
        expect(pctDelta(90, 100)).toBe(-10);
    });

    it('retorna null sem base de comparação (nunca inventa 0% ou 100%)', () => {
        expect(pctDelta(50, 0)).toBeNull();
        expect(pctDelta(50, undefined)).toBeNull();
        expect(pctDelta(NaN, 10)).toBeNull();
    });
});

describe('formatDelta', () => {
    it('formata com sinal e usa traço quando indisponível', () => {
        expect(formatDelta(8.5)).toBe('+8.5%');
        expect(formatDelta(-3.2)).toBe('-3.2%');
        expect(formatDelta(0)).toBe('0.0%');
        expect(formatDelta(null)).toBe('—');
        expect(formatDelta(undefined)).toBe('—');
    });
});

describe('computeOccupancyPct', () => {
    it('usa capacidade configurada por profissional', () => {
        expect(computeOccupancyPct(40, 1, 80)).toBe(50);
        expect(computeOccupancyPct(80, 2, 80)).toBe(50);
    });

    it('limita a 100% e retorna null sem capacidade', () => {
        expect(computeOccupancyPct(500, 1, 80)).toBe(100);
        expect(computeOccupancyPct(10, 0, 80)).toBeNull();
        expect(computeOccupancyPct(10, 3, 0)).toBeNull();
    });
});

describe('summarizeBookingsFinancials', () => {
    const bookings = [
        { status: 'confirmed', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'paid', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'completed', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'no_show_unjustified', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'pending_payment', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'cancelled_by_patient', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'refunded', valor_consulta: 100, valor_repasse_profissional: 60 },
        { status: 'expired', valor_consulta: 100, valor_repasse_profissional: 60 },
    ];

    it('GMV conta somente reservas realizadas (regressão: antes somava todos os status)', () => {
        const s = summarizeBookingsFinancials(bookings);
        expect(s.gmvRealized).toBe(400);
        expect(s.payoutRealized).toBe(240);
        expect(s.realizedCount).toBe(4);
    });

    it('margem é bruta e take rate é derivado do dado real', () => {
        const s = summarizeBookingsFinancials(bookings);
        expect(s.platformGrossMargin).toBe(160);
        expect(s.takeRatePct).toBe(40);
    });

    it('pendentes ficam separados como "a receber"', () => {
        const s = summarizeBookingsFinancials(bookings);
        expect(s.toReceive).toBe(100);
        expect(s.pendingCount).toBe(1);
    });

    it('sem reservas realizadas, take rate é null (UI mostra traço)', () => {
        const s = summarizeBookingsFinancials([{ status: 'cancelled', valor_consulta: 100 }]);
        expect(s.gmvRealized).toBe(0);
        expect(s.takeRatePct).toBeNull();
    });

    it('usa o preço do serviço quando a reserva não tem valor', () => {
        const s = summarizeBookingsFinancials([
            { status: 'confirmed', service: { price: 200, professional_payout: 120 } },
        ]);
        expect(s.gmvRealized).toBe(200);
        expect(s.payoutRealized).toBe(120);
    });

    it('tolera lista vazia ou indefinida', () => {
        expect(summarizeBookingsFinancials().gmvRealized).toBe(0);
        expect(summarizeBookingsFinancials(null).realizedCount).toBe(0);
    });
});

describe('filterBookingsByPeriod', () => {
    const fixedRef = new Date('2026-10-20T12:00:00Z');
    const mockBookings = [
        { id: 'b1', booking_date: '2026-10-20', valor_consulta: 150 }, // hoje
        { id: 'b2', booking_date: '2026-10-19', valor_consulta: 150 }, // ontem
        { id: 'b3', booking_date: '2026-10-15', valor_consulta: 150 }, // dentro de 7d
        { id: 'b4', booking_date: '2026-10-08', valor_consulta: 150 }, // 7d anterior
        { id: 'b5', booking_date: '2026-09-15', valor_consulta: 150 }, // mês passado
        { id: 'b6', booking_date: '2026-08-10', valor_consulta: 150 }  // mês retrasado
    ];

    it('filtra período "today" vs "yesterday"', () => {
        const { current, previous, label } = filterBookingsByPeriod(mockBookings, 'today', fixedRef);
        expect(label).toBe('Hoje');
        expect(current.map(b => b.id)).toEqual(['b1']);
        expect(previous.map(b => b.id)).toEqual(['b2']);
    });

    it('filtra período "7d" com comparativo dos 7 dias anteriores', () => {
        const { current, previous, label } = filterBookingsByPeriod(mockBookings, '7d', fixedRef);
        expect(label).toBe('Últimos 7 dias');
        expect(current.map(b => b.id)).toContain('b1');
        expect(current.map(b => b.id)).toContain('b2');
        expect(current.map(b => b.id)).toContain('b3');
        expect(previous.map(b => b.id)).toContain('b4');
    });

    it('filtra período "all" retornando tudo', () => {
        const { current, previous, label } = filterBookingsByPeriod(mockBookings, 'all', fixedRef);
        expect(label).toBe('Histórico Total');
        expect(current.length).toBe(mockBookings.length);
        expect(previous.length).toBe(0);
    });
});

describe('generateExecutiveCsvReport', () => {
    it('gera CSV com consolidado e discriminativo sem PII', () => {
        const summary = {
            gmvRealized: 300,
            payoutRealized: 180,
            platformGrossMargin: 120,
            takeRatePct: 40,
            toReceive: 150,
            realizedCount: 2,
            pendingCount: 1
        };
        const bookings = [
            { id: 'bk-1', booking_date: '2026-10-19', booking_time: '14:00', status: 'completed', valor_consulta: 150, valor_repasse_profissional: 90, professional: { name: 'Dr. Lucas' }, service: { name: 'Terapia' } }
        ];

        const csv = generateExecutiveCsvReport(summary, bookings, 'Outubro 2026');
        expect(csv).toContain('RELATORIO EXECUTIVO DE FECHAMENTO — DOXOLOGOS PSICOLOGIA');
        expect(csv).toContain('Periodo: Outubro 2026');
        expect(csv).toContain('GMV Realizado (Consultas Pagas/Concluidas);R$ 300,00');
        expect(csv).toContain('Take Rate Efetivo;40%');
        expect(csv).toContain('bk-1;2026-10-19;14:00;Dr. Lucas;Terapia;completed;150,00;90,00;60,00');
        expect(csv).not.toContain('patient_name');
        expect(csv).not.toContain('patient_email');
    });
});

describe('anonymizePatientName', () => {
    it('anonimiza nomes preservando primeiro nome e inicial do sobrenome', () => {
        expect(anonymizePatientName('Mariana Silva Santos')).toBe('Mariana S.');
        expect(anonymizePatientName('Carlos')).toBe('Carlos');
        expect(anonymizePatientName('')).toBe('Paciente Anônimo');
        expect(anonymizePatientName(null)).toBe('Paciente Anônimo');
    });
});

describe('computeNoShowAndCancellationMetrics', () => {
    const mockList = [
        { id: '1', booking_date: '2026-10-19', status: 'completed', professional_id: 'p1', professional: { name: 'Dra. Ana' } },
        { id: '2', booking_date: '2026-10-19', status: 'completed', professional_id: 'p1', professional: { name: 'Dra. Ana' } },
        { id: '3', booking_date: '2026-10-19', status: 'no_show', professional_id: 'p1', professional: { name: 'Dra. Ana' } },
        { id: '4', booking_date: '2026-10-20', status: 'cancelled', professional_id: 'p2', professional: { name: 'Dr. Bruno' } },
        { id: '5', booking_date: '2026-10-20', status: 'confirmed', professional_id: 'p2', professional: { name: 'Dr. Bruno' } }
    ];

    it('calcula taxa de no-show e cancelamentos com agrupamento correto', () => {
        const res = computeNoShowAndCancellationMetrics(mockList);
        expect(res.total).toBe(5);
        expect(res.completedCount).toBe(2);
        expect(res.noShowCount).toBe(1);
        expect(res.cancelledCount).toBe(1);
        expect(res.confirmedCount).toBe(1);

        // No-show rate = 1 / (2 completed + 1 no-show) = 33.3%
        expect(res.noShowRatePct).toBe(33.3);
        // Cancellation rate = 1 / 5 = 20.0%
        expect(res.cancellationRatePct).toBe(20.0);

        // Agrupamento por profissional
        const prof1 = res.byProfessional.find(p => p.professionalId === 'p1');
        expect(prof1.name).toBe('Dra. Ana');
        expect(prof1.completed).toBe(2);
        expect(prof1.noShow).toBe(1);
        expect(prof1.noShowRatePct).toBe(33.3);
    });

    it('retorna zeros com lista vazia sem quebrar', () => {
        const res = computeNoShowAndCancellationMetrics([]);
        expect(res.total).toBe(0);
        expect(res.noShowRatePct).toBe(0);
        expect(res.cancellationRatePct).toBe(0);
    });
});

describe('computePatientRetentionMetrics', () => {
    const retentionBookings = [
        // Paciente 1: 3 consultas (2026-09-01, 2026-09-08, 2026-09-15) -> 7 dias até a 2ª sessão
        { id: 'b1', patient_email: 'paciente1@email.com', booking_date: '2026-09-01', booking_time: '10:00', status: 'completed' },
        { id: 'b2', patient_email: 'paciente1@email.com', booking_date: '2026-09-08', booking_time: '10:00', status: 'completed' },
        { id: 'b3', patient_email: 'paciente1@email.com', booking_date: '2026-09-15', booking_time: '10:00', status: 'completed' },
        // Paciente 2: 1 consulta (2026-09-05) -> única consulta
        { id: 'b4', patient_email: 'paciente2@email.com', booking_date: '2026-09-05', booking_time: '14:00', status: 'completed' }
    ];

    it('calcula taxa de retorno para 2ª sessão e tempo médio de retorno', () => {
        const metrics = computePatientRetentionMetrics(retentionBookings);
        expect(metrics.totalPatients).toBe(2);
        expect(metrics.singleSessionCount).toBe(1);
        expect(metrics.multiSessionCount).toBe(1);
        // Retorno para 2ª sessão: 1 / 2 = 50%
        expect(metrics.secondSessionReturnRatePct).toBe(50.0);
        // Intervalo entre 1ª e 2ª sessão de paciente1: 7 dias
        expect(metrics.avgDaysToSecondSession).toBe(7.0);

        // Coortes
        const cohort1 = metrics.cohorts.find(c => c.category.includes('1 Consulta'));
        expect(cohort1.count).toBe(1);
        expect(cohort1.percentage).toBe(50.0);
    });
});

describe('identifyDisengagedPatients', () => {
    const fixedToday = new Date('2026-10-19T12:00:00Z');
    const bookings = [
        // Paciente A: última consulta há 45 dias (2026-09-04), sem agendamento futuro -> em risco!
        { id: 'b1', patient_email: 'pacienteA@email.com', patient_name: 'Ana Carolina', booking_date: '2026-09-04', status: 'completed', professional: { name: 'Dra. Silvia' } },
        // Paciente B: última consulta há 40 dias (2026-09-09), MAS tem agendamento futuro em 2026-10-25 -> NÃO está em risco!
        { id: 'b2', patient_email: 'pacienteB@email.com', patient_name: 'Bernardo Lima', booking_date: '2026-09-09', status: 'completed', professional: { name: 'Dra. Silvia' } },
        { id: 'b3', patient_email: 'pacienteB@email.com', patient_name: 'Bernardo Lima', booking_date: '2026-10-25', status: 'confirmed', professional: { name: 'Dra. Silvia' } },
        // Paciente C: última consulta há 5 dias (2026-10-14) -> recente, não em risco
        { id: 'b4', patient_email: 'pacienteC@email.com', patient_name: 'Camila Rocha', booking_date: '2026-10-14', status: 'completed', professional: { name: 'Dr. Lucas' } }
    ];

    it('identifica estritamente pacientes sem consulta há mais de 30 dias e sem agendamento futuro', () => {
        const atRisk = identifyDisengagedPatients(bookings, 30, fixedToday);
        expect(atRisk.length).toBe(1);
        expect(atRisk[0].patientDisplay).toBe('Ana C.');
        expect(atRisk[0].daysSinceLastSession).toBeGreaterThanOrEqual(44);
        expect(atRisk[0].professionalName).toBe('Dra. Silvia');
    });
});

describe('computeCapacityAndDemandByDay', () => {
    const mockAvail = {
        prof1: {
            monday: ['09:00', '10:00', '14:00', '19:00'],
            tuesday: ['10:00', '15:00']
        }
    };
    const mockBookings = [
        { booking_date: '2026-10-19', booking_time: '09:00' } // Segunda-feira às 09:00
    ];

    it('computa slots abertos vs agendados por dia e turno', () => {
        const result = computeCapacityAndDemandByDay(mockBookings, mockAvail);
        const monday = result.find(d => d.key === 'monday');
        expect(monday.slotsAvailable).toBe(4);
        expect(monday.slotsBooked).toBe(1);
        expect(monday.occupancyPct).toBe(25.0);
        expect(monday.byShift.morning.available).toBe(2);
        expect(monday.byShift.morning.booked).toBe(1);
    });
});

describe('computeFunnelMetrics', () => {
    const mockLeads = [
        { id: 'l1', status: 'novo' },
        { id: 'l2', status: 'contatado' },
        { id: 'l3', status: 'agendou' },
        { id: 'l4', status: 'novo' }
    ];

    const mockBookings = [
        { id: 'b1', status: 'completed' },
        { id: 'b2', status: 'confirmed' },
        { id: 'b3', status: 'pending_payment' },
        { id: 'b4', status: 'cancelled' }
    ];

    it('calcula funil de conversão de leads e checkout corretamente', () => {
        const funnel = computeFunnelMetrics(mockBookings, mockLeads);
        expect(funnel.totalLeads).toBe(4);
        expect(funnel.leadsContacted).toBe(2); // contatado + agendou
        expect(funnel.leadsBooked).toBe(1); // agendou
        // Conversão de lead: 1 / 4 = 25%
        expect(funnel.leadConversionPct).toBe(25.0);

        // Checkout total = 2 realizadas (completed + confirmed) + 1 pendente + 1 cancelada = 4
        // Conversão checkout: 2 / 4 = 50%
        expect(funnel.checkoutConversionPct).toBe(50.0);
        // Abandono checkout: (1 pendente + 1 cancelada) / 4 = 50%
        expect(funnel.checkoutAbandonmentPct).toBe(50.0);
        expect(funnel.funnelStages.length).toBe(5);
    });
});

describe('computeChannelAcquisition', () => {
    const mockBookings = [
        { id: 'b1', business_model: 'b2c', status: 'completed', valor_consulta: 150 },
        { id: 'b2', business_model: 'b2b', status: 'completed', valor_consulta: 250 },
        { id: 'b3', business_model: 'b2b', status: 'confirmed', valor_consulta: 250 },
        { id: 'b4', business_model: 'b2c', status: 'pending', valor_consulta: 150 }
    ];

    it('agrupa faturamento e consultas por canal de negócio', () => {
        const channels = computeChannelAcquisition(mockBookings);
        const b2c = channels.find(c => c.channel.includes('B2C'));
        const b2b = channels.find(c => c.channel.includes('B2B'));

        expect(b2c.count).toBe(2);
        expect(b2c.revenue).toBe(150); // apenas b1 realizado

        expect(b2b.count).toBe(2);
        expect(b2b.revenue).toBe(500); // b2 e b3 realizados
    });
});

describe('computeMonthlyGoalsProgress', () => {
    it('calcula o progresso de metas de faturamento, consultas, novos pacientes e retenção', () => {
        const current = {
            gmvRealized: 15000,
            realizedCount: 100,
            newPatientsCount: 20,
            retentionPct: 50
        };
        const targets = {
            target_monthly_revenue_brl: 30000,
            target_monthly_bookings_count: 200,
            target_new_patients_count: 40,
            target_retention_return_rate_pct: 50
        };

        const goals = computeMonthlyGoalsProgress(current, targets);
        expect(goals.length).toBe(4);

        const rev = goals.find(g => g.id === 'revenue');
        expect(rev.progressPct).toBe(50.0);
        expect(rev.status).toBe('at_risk');

        const ret = goals.find(g => g.id === 'retention');
        expect(ret.progressPct).toBe(100.0);
        expect(ret.status).toBe('achieved');
    });
});

describe('computePatientFollowUpAndRetention (Acompanhamento e Retenção)', () => {
    const fixedToday = new Date('2026-10-20T12:00:00Z');

    const testBookings = [
        // Paciente 1: Fez 1 consulta há 14 dias (2026-10-06), sem agendamento futuro -> Drop-off 1ª consulta
        {
            id: 'b-single',
            patient_email: 'joao@email.com',
            patient_name: 'João Pedro',
            patient_phone: '11988887777',
            booking_date: '2026-10-06',
            booking_time: '14:00',
            status: 'completed',
            valor_consulta: 160,
            professional: { name: 'Dra. Helena' }
        },
        // Paciente 2: Fez 3 consultas, última há 40 dias (2026-09-10), sem agendamento futuro -> Inativo 30d+
        {
            id: 'b-over30-1',
            patient_email: 'maria@email.com',
            patient_name: 'Maria Santos',
            booking_date: '2026-08-20',
            status: 'completed',
            valor_consulta: 150,
            professional: { name: 'Dr. Lucas' }
        },
        {
            id: 'b-over30-2',
            patient_email: 'maria@email.com',
            patient_name: 'Maria Santos',
            booking_date: '2026-09-10',
            status: 'completed',
            valor_consulta: 150,
            professional: { name: 'Dr. Lucas' }
        },
        // Paciente 3: Inativo há 75 dias (2026-08-06) -> Crítico 60d+
        {
            id: 'b-crit',
            patient_email: 'carlos@email.com',
            patient_name: 'Carlos Mendes',
            booking_date: '2026-08-06',
            status: 'completed',
            valor_consulta: 180,
            professional: { name: 'Dra. Helena' }
        },
        // Paciente 4: Fez consulta no passado mas JÁ TEM agendamento futuro confirmado em 2026-10-25 -> NÃO DEVE ESTAR EM RISCO
        {
            id: 'b-active-past',
            patient_email: 'ana@email.com',
            patient_name: 'Ana Clara',
            booking_date: '2026-10-01',
            status: 'completed',
            valor_consulta: 150,
            professional: { name: 'Dr. Lucas' }
        },
        {
            id: 'b-active-future',
            patient_email: 'ana@email.com',
            patient_name: 'Ana Clara',
            booking_date: '2026-10-25',
            status: 'confirmed',
            valor_consulta: 150,
            professional: { name: 'Dr. Lucas' }
        }
    ];

    it('segmenta corretamente os pacientes e exclui quem tem agendamento futuro', () => {
        const result = computePatientFollowUpAndRetention(testBookings, { referenceDate: fixedToday });

        expect(result.summary.totalAtRisk).toBe(3);
        expect(result.summary.singleSessionDropoffCount).toBe(1);
        expect(result.summary.over30DaysNoReturnCount).toBe(1);
        expect(result.summary.criticalOver60DaysCount).toBe(1);

        // Paciente Ana Clara não pode estar na lista porque tem agendamento futuro
        const ana = result.patients.find(p => p.patientId === 'ana@email.com');
        expect(ana).toBeUndefined();

        // Paciente João (1 consulta)
        const joao = result.patients.find(p => p.patientId === 'joao@email.com');
        expect(joao).toBeDefined();
        expect(joao.segment).toBe('single_session');
        expect(joao.urgency).toBe('critical');
        expect(joao.totalSessions).toBe(1);
        expect(joao.daysSinceLastSession).toBe(14);
        expect(joao.messageTemplates.firstSessionCare).toContain('João');
        expect(joao.messageTemplates.firstSessionCare).toContain('Dra. Helena');

        // Paciente Maria (inativo 30d+)
        const maria = result.patients.find(p => p.patientId === 'maria@email.com');
        expect(maria).toBeDefined();
        expect(maria.segment).toBe('over_30d');
        expect(maria.totalSessions).toBe(2);

        // Paciente Carlos (crítico 60d+)
        const carlos = result.patients.find(p => p.patientId === 'carlos@email.com');
        expect(carlos).toBeDefined();
        expect(carlos.segment).toBe('critical_60d');
    });

    it('aplica e reflete os status de acompanhamento do admin', () => {
        const adminMap = {
            'joao@email.com': { status: 'contatado', notes: 'Mensagem enviada no WhatsApp' },
            'maria@email.com': { status: 'reagendado', notes: 'Reagendou para próxima quinta' }
        };

        const result = computePatientFollowUpAndRetention(testBookings, {
            referenceDate: fixedToday,
            adminStatusMap: adminMap
        });

        const joao = result.patients.find(p => p.patientId === 'joao@email.com');
        expect(joao.followUpStatus).toBe('contatado');
        expect(joao.adminNotes).toBe('Mensagem enviada no WhatsApp');

        const maria = result.patients.find(p => p.patientId === 'maria@email.com');
        expect(maria.followUpStatus).toBe('reagendado');

        expect(result.summary.followUpFunnelCounts.contatado).toBe(1);
        expect(result.summary.followUpFunnelCounts.reagendado).toBe(1);
        expect(result.summary.followUpFunnelCounts.pendente).toBe(1);
    });
});



