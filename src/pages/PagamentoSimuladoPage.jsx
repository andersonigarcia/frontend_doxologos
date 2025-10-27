// Página para simular checkout do Mercado Pago em desenvolvimento
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function PagamentoSimuladoPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const bookingId = searchParams.get('booking_id');
    const [status, setStatus] = useState(null);

    const handlePaymentAction = (paymentStatus) => {
        setStatus(paymentStatus);
        
        // Simular redirecionamento de volta para a aplicação
        setTimeout(() => {
            const redirectUrl = new URL(window.location.origin + '/area-do-paciente');
            redirectUrl.searchParams.append('booking_id', bookingId);
            redirectUrl.searchParams.append('payment_status', paymentStatus);
            window.location.href = redirectUrl.toString();
        }, 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-800">
                        🧪 Simulador de Pagamento - Mercado Pago
                    </CardTitle>
                    <CardDescription>
                        Ambiente de Desenvolvimento
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {!status ? (
                        <>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Booking ID:</strong> {bookingId || 'N/A'}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Esta é uma simulação do checkout do Mercado Pago para testes em desenvolvimento.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    onClick={() => handlePaymentAction('approved')}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                                    size="lg"
                                >
                                    <CheckCircle className="mr-2 h-5 w-5" />
                                    Simular Pagamento Aprovado
                                </Button>

                                <Button 
                                    onClick={() => handlePaymentAction('pending')}
                                    variant="outline"
                                    className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                                    size="lg"
                                >
                                    <Clock className="mr-2 h-5 w-5" />
                                    Simular Pagamento Pendente
                                </Button>

                                <Button 
                                    onClick={() => handlePaymentAction('rejected')}
                                    variant="outline"
                                    className="w-full border-red-500 text-red-700 hover:bg-red-50"
                                    size="lg"
                                >
                                    <XCircle className="mr-2 h-5 w-5" />
                                    Simular Pagamento Recusado
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                                Redirecionando para área do paciente...
                            </p>
                        </div>
                    )}

                    <div className="border-t pt-4 mt-6">
                        <Button 
                            onClick={() => navigate('/')}
                            variant="ghost"
                            className="w-full text-gray-600"
                        >
                            Voltar para início
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
