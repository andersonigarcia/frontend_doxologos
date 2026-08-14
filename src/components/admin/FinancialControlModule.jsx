import React, { useState } from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  FileText,
  Receipt,
  Building2,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function FinancialControlModule({
  financialData = {},
  bookings = [],
  userRole = 'admin',
  onNavigateTab
}) {
  const { settings } = useSystemSettings();
  const [subTab, setSubTab] = useState('dre'); // 'dre', 'reconcile', 'ledger', 'refunds'

  const formatBrl = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const mpFeeRate = (Number(settings.mp_estimated_gateway_fee_pct) || 2.99) / 100;
  const nfseTaxRate = (Number(settings.nfse_estimated_tax_rate_pct) || 6.00) / 100;
  const defaultRetentionPct = Number(settings.platform_default_retention_pct) || 40;

  // Cálculos da DRE Consolidada
  const gmv = financialData?.monthlyRevenue || bookings.reduce((acc, b) => acc + (Number(b.valor_consulta || b.service?.price || 0)), 0);
  const payoutTotal = bookings.reduce((acc, b) => acc + (Number(b.valor_repasse_profissional || b.service?.professional_payout || b.valor_consulta || 0)), 0);
  const estimatedMpFees = gmv * mpFeeRate;
  const estimatedNfseTaxes = gmv * nfseTaxRate;
  const platformGrossMargin = Math.max(0, gmv - payoutTotal);
  const netMargin = Math.max(0, platformGrossMargin - estimatedMpFees - estimatedNfseTaxes);
  const takeRatePct = gmv > 0 ? (platformGrossMargin / gmv) * 100 : defaultRetentionPct;

  return (
    <div className="space-y-6">
      {/* Header da Controladoria */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Módulo de Controladoria Unificada
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            DRE, Extrato Financeiro & Ledger de Repasses
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visão consolidada de caixa, conciliação de recebíveis do Mercado Pago, retenção de impostos e repasses aos profissionais.
          </p>
        </div>

        {/* Sub-Navegação da Controladoria */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setSubTab('dre')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'dre' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DRE Consolidada
          </button>
          <button
            onClick={() => setSubTab('ledger')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'ledger' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Repasses (Ledger)
          </button>
          <button
            onClick={() => onNavigateTab?.('payments')}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg"
          >
            Checkout MP
          </button>
        </div>
      </div>

      {/* RENDERIZADOR SUB-TAB: DRE CONSOLIDADA */}
      {subTab === 'dre' && (
        <div className="space-y-6">
          {/* CARDS RESUMO DRE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase">Receita Bruta (GMV)</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatBrl(gmv)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Total faturado no período</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase">Repasse Profissionais</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">{formatBrl(payoutTotal)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Devido aos psicólogos</p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 uppercase">Margem Bruta Clínica</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatBrl(platformGrossMargin)}</p>
              <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Take Rate Bruto: {takeRatePct.toFixed(1)}%</p>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-[#2d8659] to-[#236b47] text-white rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-emerald-100 uppercase">Resultado Líquido</span>
              <p className="text-xl font-extrabold text-white mt-1">{formatBrl(netMargin)}</p>
              <p className="text-[10px] text-emerald-100/80 mt-0.5">Após taxas MP e Impostos</p>
            </Card>
          </div>

          {/* TABELA DRE SINTÉTICA */}
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Demonstrativo de Resultado do Exercício (DRE Gerencial)
            </h3>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-3 flex justify-between font-bold text-slate-900 bg-slate-50/80 px-4 rounded-lg">
                <span>(+) RECEITA OPERACIONAL BRUTA (GMV Consultas)</span>
                <span>{formatBrl(gmv)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-4 pl-8">
                <span>(-) Repasse devido aos Psicólogos</span>
                <span className="text-red-600">({formatBrl(payoutTotal)})</span>
              </div>

              <div className="py-3 flex justify-between font-semibold text-slate-900 bg-emerald-50/50 px-4 rounded-lg">
                <span>(=) MARGEM BRUTA DA PLATAFORMA (Take Rate)</span>
                <span className="text-emerald-700">{formatBrl(platformGrossMargin)}</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-4 pl-8">
                <span>(-) Taxas de Processamento de Meio de Pagamento (Mercado Pago ~2.99%)</span>
                <span className="text-red-600">({formatBrl(estimatedMpFees)})</span>
              </div>

              <div className="py-2.5 flex justify-between text-slate-600 px-4 pl-8">
                <span>(-) Provisão Tributária NFS-e / Simples Nacional (~6%)</span>
                <span className="text-red-600">({formatBrl(estimatedNfseTaxes)})</span>
              </div>

              <div className="py-3.5 flex justify-between font-extrabold text-base bg-[#2d8659] text-white px-4 rounded-xl mt-2 shadow-sm">
                <span>(=) MARGEM LÍQUIDA OPERACIONAL DOXOLOGOS</span>
                <span>{formatBrl(netMargin)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* RENDERIZADOR SUB-TAB: LEDGER DE REPASSES */}
      {subTab === 'ledger' && (
        <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Ledger de Repasses aos Profissionais</h3>
              <p className="text-xs text-slate-500">Controle de honorários a pagar por psicólogo.</p>
            </div>
            <Button size="sm" variant="outline" className="text-xs">
              Exportar Relatório PDF
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="text-[11px] uppercase bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Profissional</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Valor Consulta</th>
                  <th className="p-3 text-right">Repasse Psicólogo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.slice(0, 10).map((b, idx) => (
                  <tr key={b.id || idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-mono">{b.booking_date} {b.booking_time}</td>
                    <td className="p-3 font-semibold text-slate-900">{b.patient_name || 'Paciente'}</td>
                    <td className="p-3">{b.professional?.name || 'Psicólogo'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {b.status || 'confirmado'}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{formatBrl(b.valor_consulta || b.service?.price || 0)}</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{formatBrl(b.valor_repasse_profissional || b.service?.professional_payout || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default FinancialControlModule;
