import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart3, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AnalyticsDashboardPage() {
    // URL do dashboard compartilhado do PostHog (pode ser salvo no localstorage ou vindo do banco depois)
    const [dashboardUrl, setDashboardUrl] = useState(() => {
        return localStorage.getItem('posthog_dashboard_url') || '';
    });
    
    const [isEditing, setIsEditing] = useState(!dashboardUrl);

    const handleSaveUrl = () => {
        if (dashboardUrl) {
            let finalUrl = dashboardUrl.trim();
            // Se o usuário colou a tag <iframe> inteira, extraímos apenas o src=""
            const srcMatch = finalUrl.match(/src=["'](.*?)["']/);
            if (srcMatch && srcMatch[1]) {
                finalUrl = srcMatch[1];
            }
            
            setDashboardUrl(finalUrl);
            localStorage.setItem('posthog_dashboard_url', finalUrl);
            setIsEditing(false);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-[#2d8659]" />
                        Comportamento e Analytics
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Acompanhe funis de conversão, gravações de tela e o comportamento dos usuários na plataforma via PostHog.
                    </p>
                </div>

                <div className="flex gap-2">
                    {dashboardUrl && !isEditing && (
                        <Button 
                            variant="outline" 
                            onClick={() => window.open(dashboardUrl, '_blank')}
                            className="bg-white"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir no PostHog
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        onClick={() => setIsEditing(!isEditing)}
                        className="bg-white"
                    >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurar Dashboard
                    </Button>
                </div>
            </div>

            {isEditing && (
                <Card className="border-[#2d8659]/20 shadow-sm">
                    <CardHeader className="bg-[#2d8659]/5 pb-4">
                        <CardTitle className="text-lg">Configuração do PostHog</CardTitle>
                        <CardDescription>
                            Para embutir o dashboard aqui, vá no PostHog em "Dashboards", clique nos 3 pontos e escolha "Share". Copie a URL do "Embedded iframe" e cole abaixo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex gap-3">
                            <Input
                                placeholder="Ex: https://us.posthog.com/embedded/XXXXXXX"
                                value={dashboardUrl}
                                onChange={(e) => setDashboardUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleSaveUrl} className="bg-[#2d8659] hover:bg-[#236b47] text-white">
                                Salvar e Visualizar
                            </Button>
                        </div>
                        <div className="mt-4 text-xs text-slate-500 bg-amber-50 border border-amber-200 p-3 rounded">
                            <p className="font-semibold text-amber-800 mb-1">Dica sobre o ícone de rosto triste (Erro de iframe):</p>
                            Se o dashboard ficar com um ícone de "carinha triste" cinza, é porque o PostHog bloqueou a visualização. Para resolver isso:
                            <ul className="list-disc pl-5 mt-1">
                                <li>No PostHog, certifique-se de que a URL é a do <strong>Embedded iframe</strong> (geralmente contém <code>/embedded/</code> na URL) e não o link normal da página.</li>
                                <li>O link não pode exigir login para ser visto (ative o <strong>Share publicly</strong>).</li>
                                <li>Você pode colar a tag <code>&lt;iframe&gt;</code> inteira aqui que nós extraímos o link pra você automaticamente.</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isEditing && dashboardUrl ? (
                <Card className="w-full h-[800px] overflow-hidden shadow-sm border-gray-200">
                    <iframe
                        src={dashboardUrl}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-popups"
                        title="PostHog Analytics Dashboard"
                        className="w-full h-full bg-gray-50"
                    />
                </Card>
            ) : (
                !isEditing && (
                    <Card className="p-12 text-center border-dashed">
                        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum Dashboard Configurado</h3>
                        <p className="text-gray-500 max-w-md mx-auto mb-6">
                            Configure a URL pública de compartilhamento do seu dashboard do PostHog para visualizá-lo diretamente aqui no painel admin.
                        </p>
                        <Button onClick={() => setIsEditing(true)}>
                            Configurar URL
                        </Button>
                    </Card>
                )
            )}
        </div>
    );
}
