import React, { useState, useEffect, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  DollarSign, 
  Settings,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Import Tabs Components
import ProfileTab from '@/components/admin/professional-hub/ProfileTab';
import ScheduleTab from '@/components/admin/professional-hub/ScheduleTab';
import FinancialTab from '@/components/admin/professional-hub/FinancialTab';

const ProfessionalHubPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchProfessional();
    }
  }, [id, userRole]);

  const fetchProfessional = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      setProfessional(data);
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Profissional não encontrado."
      });
      navigate('/admin/professionals');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ status: newStatus })
        .eq('id', professional.id);
      
      if (error) throw error;
      
      setProfessional(prev => ({ ...prev, status: newStatus }));
      toast({
        title: "Status atualizado!",
        description: `O profissional agora está ${newStatus}.`
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    }
  };

  if (userRole !== 'admin') {
    return <div className="p-8 text-center text-gray-500">Acesso negado.</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!professional) return null;

  return (
    <>
      <Helmet>
        <title>{professional.name} - Hub 360</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header Fixo */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/professionals')} className="shrink-0">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                
                <div className="flex items-center gap-4 border-l border-gray-200 pl-4">
                  {professional.image_url ? (
                    <img src={professional.image_url} alt={professional.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-100" width={48} height={48} loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg">
                      {professional.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">{professional.name}</h1>
                    <p className="text-sm text-gray-500">{professional.email}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Ações Críticas */}
                {professional.status === 'active' ? (
                  <Button 
                    variant="outline" 
                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={() => handleStatusChange('suspended')}
                  >
                    Suspender Profissional
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => handleStatusChange('active')}
                  >
                    Reativar Profissional
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content (Tabs) */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6 bg-white border border-gray-200 p-1 w-full justify-start overflow-x-auto">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Cadastro
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Agenda & Consultas
              </TabsTrigger>
              <TabsTrigger value="finance" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Financeiro
              </TabsTrigger>
            </TabsList>

            <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
              <TabsContent value="profile">
                <ProfileTab professional={professional} onUpdate={fetchProfessional} />
              </TabsContent>
              
              <TabsContent value="schedule">
                <ScheduleTab professionalId={professional.id} />
              </TabsContent>
              
              <TabsContent value="finance">
                <FinancialTab professionalId={professional.id} />
              </TabsContent>
            </Suspense>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default ProfessionalHubPage;
