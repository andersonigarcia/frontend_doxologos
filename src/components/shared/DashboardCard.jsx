import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

/**
 * Card de Dashboard
 * 
 * Card reutilizável para exibir métricas no dashboard
 * 
 * @param {Object} props
 * @param {string} props.title - Título do card
 * @param {string|number} props.value - Valor principal
 * @param {React.ReactNode} props.icon - Ícone do card
 * @param {string} props.trend - Tendência (ex: "+12%")
 * @param {"up"|"down"|"neutral"} props.trendDirection - Direção da tendência
 * @param {string} props.description - Descrição adicional
 * @param {string} props.className - Classes CSS adicionais
 */
export function DashboardCard({
    title,
    value,
    icon,
    trend,
    trendDirection = 'neutral',
    description,
    className = '',
}) {
    const getTrendIcon = () => {
        switch (trendDirection) {
            case 'up':
                return <ArrowUp className="h-4 w-4" />;
            case 'down':
                return <ArrowDown className="h-4 w-4" />;
            default:
                return <Minus className="h-4 w-4" />;
        }
    };

    const getTrendColor = () => {
        switch (trendDirection) {
            case 'up':
                return 'text-green-600';
            case 'down':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                    {title}
                </CardTitle>
                {icon && (
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {icon}
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(trend || description) && (
                    <div className="flex items-center gap-2 mt-2">
                        {trend && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
                                {getTrendIcon()}
                                <span>{trend}</span>
                            </div>
                        )}
                        {description && (
                            <p className="text-xs text-gray-500">{description}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
