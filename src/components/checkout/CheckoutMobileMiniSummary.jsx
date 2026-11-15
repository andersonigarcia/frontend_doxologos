import React from 'react';

const CheckoutMobileMiniSummary = ({
    type,
    packageData,
    booking,
    inscricao,
    tituloParam,
    bookingTotal,
    formatCurrency
}) => {
    return (
        <div className="md:hidden mb-5 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="min-w-0 pr-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
                    {type === 'evento' ? 'Evento' : packageData ? 'Pacote' : 'Consulta Online'}
                </span>
                <p className="font-bold text-gray-900 text-sm truncate">
                    {type === 'evento'
                        ? (inscricao?.evento?.titulo || tituloParam)
                        : packageData
                            ? `${packageData.total_sessions} Sessões com ${packageData.professional_name || 'Profissional'}`
                            : (booking?.service?.name || 'Psicoterapia')}
                </p>
                {booking?.professional?.name && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                        com {booking.professional.name}
                    </p>
                )}
            </div>
            <div className="text-right flex-shrink-0">
                <span className="text-[11px] text-gray-500 block">Total</span>
                <span className="text-xl font-bold text-[#2d8659]">
                    {formatCurrency(bookingTotal)}
                </span>
            </div>
        </div>
    );
};

export default CheckoutMobileMiniSummary;
