import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const CheckoutTcleCard = ({
    acceptedTcle,
    setAcceptedTcle
}) => {
    return (
        <Card className="p-4 mb-4 border-amber-200 bg-amber-50/50">
            <label className="flex items-start gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    id="tcle-checkbox"
                    data-testid="tcle-checkbox"
                    checked={acceptedTcle}
                    onChange={(e) => setAcceptedTcle(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-[#2d8659] focus:ring-[#2d8659]"
                />
                <span className="text-xs text-amber-900 leading-relaxed">
                    Estou ciente de que meu atendimento é 100% confidencial sob <strong>sigilo ético profissional</strong> e concordo com os <strong>Termos de Cuidado e Política de Reagendamento</strong> (reagende gratuitamente até 24h antes).{' '}
                    <Link to="/termos-e-condicoes" target="_blank" className="underline font-semibold hover:text-[#2d8659]">
                        Ver termos completos
                    </Link>
                </span>
            </label>
        </Card>
    );
};

export default CheckoutTcleCard;
