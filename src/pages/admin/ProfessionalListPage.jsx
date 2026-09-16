import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  ArrowLeft, 
  Search, 
  Eye, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const ProfessionalListPage = ({ isEmbedded = false }) => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('active'); // active, suspended, cancelled, all
  const [currentTab, setCurrentTab] = useState('ativos');

  useEffect(() => {
    if (userRole === 'admin') {
      fetchProfessionals();
    }
  }, [userRole]);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const [profRes, appRes] = await Promise.all([
        supabase.from('professionals').select('*').order('name', { ascending: true }),
        supabase.from('professional_applications').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      ]);
      
      if (profRes.error) throw profRes.error;
      if (appRes.error) throw appRes.error;
      
      setProfessionals(profRes.data || []);
      setFilteredProfessionals(profRes.data || []);
      setApplications(appRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    if (!confirm('Tem certeza que deseja aprovar este profissional e enviar o convite?')) return;
    setApproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('approve-professional-application', {
        body: { applicationId: appId }
      });
      if (error) throw error;
      toast({ title: '✅ Profissional aprovado e convite enviado!' });
      fetchProfessionals();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao aprovar', description: error.message });
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    let filtered = professionals;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => (p.status || 'active') === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProfessionals(filtered);
  }, [professionals, searchTerm, filterStatus]);

  const getStatusBadge = (status) => {
    const s = status || 'active';
    if (s === 'active') return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Ativo</span>;
    if (s === 'suspended') return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Suspenso</span>;
    if (s === 'cancelled') return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Cancelado</span>;
    return null;
  };

  if (userRole !== 'admin') {
    return (
      <div className={`${isEmbedded ? '' : 'min-h-screen'} bg-gray-50 flex items-center justify-center p-8`}>
        <p className="text-gray-500">Acesso negado.</p>
      </div>
    );
  }

  const content = (
    <div className={`${isEmbedded ? '' : 'max-w-7xl mx-auto px-4 py-8'}`}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          <span className="ml-3 text-gray-600">Carregando profissionais...</span>
        </div>
      ) : (
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="ativos" className="gap-2">
                <Users className="w-4 h-4" />
                Profissionais Cadastrados
              </TabsTrigger>
              <TabsTrigger value="avaliacao" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Em Avaliação
                {applications.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                    {applications.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="ativos" className="m-0 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">Todos os Status</option>
                  <option value="active">Ativos</option>
                  <option value="suspended">Suspensos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="space-y-4">
            {filteredProfessionals.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 text-lg">Nenhum profissional encontrado</p>
              </div>
            ) : (
              filteredProfessionals.map((prof, index) => (
                <motion.div
                  key={prof.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {prof.image_url ? (
                      <img src={prof.image_url} alt={prof.name} className="w-12 h-12 rounded-full object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                        {prof.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{prof.name}</h3>
                        {getStatusBadge(prof.status)}
                      </div>
                      <p className="text-sm text-gray-500">{prof.email}</p>
                    </div>
                  </div>
                  <div>
                    <Button 
                      onClick={() => navigate(`/admin/professionals/${prof.id}`)}
                      variant="outline" 
                      className="hover:bg-purple-50 hover:text-purple-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Hub 360
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
          </TabsContent>

          <TabsContent value="avaliacao" className="m-0">
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-100">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-lg">Nenhuma candidatura pendente no momento.</p>
                </div>
              ) : (
                applications.map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg shadow-sm border border-yellow-200 hover:shadow-md transition-shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{app.name}</h3>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Aguardando Avaliação</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                        <div><strong className="block text-gray-500 text-xs">Email</strong>{app.email}</div>
                        <div><strong className="block text-gray-500 text-xs">Telefone</strong>{app.phone}</div>
                        <div><strong className="block text-gray-500 text-xs">CPF/CNPJ</strong>{app.cpf_cnpj}</div>
                        <div><strong className="block text-gray-500 text-xs">CRP/CRN</strong>{app.crp}</div>
                        <div><strong className="block text-gray-500 text-xs">Especialidade</strong>{app.specialty}</div>
                      </div>
                      {app.message && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700 italic border border-gray-100">
                          "{app.message}"
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      {app.resume_url && (
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            const { data } = await supabase.storage.from('resumes').createSignedUrl(app.resume_url, 3600);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                            else toast({ variant: 'destructive', title: 'Erro ao abrir currículo' });
                          }}
                        >
                          Ver Currículo
                        </Button>
                      )}
                      <Button 
                        onClick={() => handleApprove(app.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={approving}
                      >
                        {approving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Aprovar Perfil
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <>
      <Helmet>
        <title>Profissionais - Hub 360 Admin</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/admin">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="w-7 h-7 text-purple-600" />
                    Hub de Profissionais
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestão centralizada de profissionais, agendas e repasses
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {content}
      </div>
    </>
  );
};

export default ProfessionalListPage;
