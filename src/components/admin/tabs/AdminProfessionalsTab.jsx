import React from 'react';
import { Users } from 'lucide-react';
import ProfessionalListPage from '@/pages/admin/ProfessionalListPage';

export function AdminProfessionalsTab({ userRole = 'admin', professionals = [], services = [], onRefresh }) {
    if (userRole === 'admin') {
        return (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                <ProfessionalListPage isEmbedded onRefresh={onRefresh} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center text-slate-800">
                <Users className="w-6 h-6 mr-2 text-[#2d8659]" /> Meu Perfil Profissional
            </h2>
            <div className="space-y-4">
                {professionals.map((prof, index) => (
                    <div
                        key={prof.id}
                        className={`border rounded-lg p-6 transition-all ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } border-slate-200`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            {prof.image_url && (
                                <img
                                    src={prof.image_url}
                                    alt={prof.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                                    width={56}
                                    height={56}
                                />
                            )}
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{prof.name}</h3>
                                {prof.email && <p className="text-sm text-gray-600">📧 {prof.email}</p>}
                                {(prof.whatsapp || prof.phone) && (
                                    <p className="text-sm text-gray-600">📱 {prof.whatsapp || prof.phone}</p>
                                )}
                            </div>
                        </div>

                        {prof.mini_curriculum && (
                            <div className="mb-4 text-sm text-gray-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="font-medium text-xs text-slate-500 mb-1 uppercase tracking-wider">Apresentação</p>
                                <p>{prof.mini_curriculum}</p>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Serviços Habilitados</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {(prof.services_ids || []).map((serviceId) => {
                                    const service = services.find((s) => s.id === serviceId);
                                    return service ? (
                                        <span
                                            key={serviceId}
                                            className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-medium"
                                        >
                                            {service.name}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AdminProfessionalsTab;
