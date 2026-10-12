import React from 'react';
import { MessageCircle, Star, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminTestimonialsTab() {
    return (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-100">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center justify-center text-slate-800">
                    <MessageCircle className="w-6 h-6 mr-2 text-[#2d8659]" />
                    Gestão de Depoimentos
                </h2>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                    Gerencie todos os depoimentos enviados pelos usuários, modere conteúdo e
                    controle quais avaliações aparecem na vitrine do site principal.
                </p>

                <div className="grid md:grid-cols-2 gap-6 mb-8 text-left">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
                            <MessageCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-center text-slate-900">Página de Depoimentos</h3>
                        <p className="text-gray-600 text-sm mb-4 text-center">
                            Local público onde usuários e pacientes podem enviar seus depoimentos sobre o atendimento na clínica.
                        </p>
                        <Button
                            onClick={() => window.open('/depoimento', '_blank')}
                            variant="outline"
                            className="w-full border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                            Ver Página Pública
                        </Button>
                    </div>

                    <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                            <Star className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-center text-slate-900">Painel de Moderação</h3>
                        <p className="text-gray-600 text-sm mb-4 text-center">
                            Gerencie todos os depoimentos: aprovar, editar correções, organizar ordem e controlar exibição.
                        </p>
                        <Button
                            onClick={() => window.open('/admin/depoimentos', '_blank')}
                            className="w-full bg-[#2d8659] hover:bg-[#236b47]"
                        >
                            Acessar Gestão Completa
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-left">
                    <h4 className="font-semibold mb-3 text-slate-800">Funcionalidades do Módulo:</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Aprovar/Ocultar depoimentos com 1 clique</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Editar texto e correções ortográficas</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Adicionar depoimentos recebidos externamente</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Sistema de busca e filtros por profissional</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Controle de exibição na landing page</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>Moderação e conformidade com diretrizes éticas</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminTestimonialsTab;
