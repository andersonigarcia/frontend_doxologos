import React from 'react';
import { Users, ShieldAlert } from 'lucide-react';
import ProfessionalListPage from '@/pages/admin/ProfessionalListPage';
import ProfileTab from '@/components/admin/professional-hub/ProfileTab';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export function AdminProfessionalsTab({ userRole = 'admin', professionals = [], services = [], onRefresh }) {
    const { user } = useAuth();

    if (userRole === 'admin') {
        return (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
                <ProfessionalListPage isEmbedded onRefresh={onRefresh} />
            </div>
        );
    }

    if (userRole !== 'professional') {
        return (
            <div className="bg-white rounded-xl shadow-xs p-6 border border-rose-200/80">
                <h2 className="text-xl font-bold mb-2 flex items-center text-rose-800">
                    <ShieldAlert className="w-6 h-6 mr-2 text-rose-600" /> Acesso Restrito
                </h2>
                <p className="text-sm text-slate-600">
                    Apenas administradores ou o próprio profissional autenticado podem editar estes dados.
                </p>
            </div>
        );
    }

    const currentProfessional = user?.id
        ? professionals.find((prof) => prof?.user_id === user.id || prof?.id === user.id) || null
        : null;

    if (!currentProfessional) {
        return (
            <div className="bg-white rounded-xl shadow-xs p-6 border border-slate-200/80">
                <h2 className="text-xl font-bold mb-2 flex items-center text-slate-900">
                    <Users className="w-6 h-6 mr-2 text-slate-800" /> Meu Perfil Profissional
                </h2>
                <p className="text-sm text-slate-500">
                    Não foi possível localizar o seu perfil profissional vinculado a esta conta.
                </p>
            </div>
        );
    }

    return (
        <ProfileTab
            professional={currentProfessional}
            onUpdate={onRefresh}
            isSelfService
        />
    );
}

export default AdminProfessionalsTab;
