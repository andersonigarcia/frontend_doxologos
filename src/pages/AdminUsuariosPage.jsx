import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Users, 
  ArrowLeft, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  User, 
  Stethoscope, 
  Mail, 
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const AdminUsuariosPage = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
    role: 'patient'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verificar se usuário é admin
  useEffect(() => {
    if (userRole && userRole !== 'admin') {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Apenas administradores podem acessar esta página."
      });
    }
  }, [userRole, toast]);

  // Carregar dados
  useEffect(() => {
    if (userRole === 'admin') {
      fetchUsers();
    }
  }, [userRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os usuários via Edge Function (com SERVICE_ROLE_KEY)
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao carregar usuários');
      }

      const { users: authUsers } = await response.json();

      // 2. Buscar dados dos profissionais
      const { data: profsData, error: profsError } = await supabase
        .from('professionals')
        .select('*');
      
      if (profsError) throw profsError;

      setProfessionals(profsData || []);

      // 3. Combinar dados
      const usersWithDetails = authUsers.map(authUser => {
        const professionalData = profsData?.find(p => p.id === authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email,
          role: authUser.user_metadata?.role || 'patient',
          created_at: authUser.created_at,
          last_sign_in: authUser.last_sign_in_at,
          professionalData
        };
      });

      setUsers(usersWithDetails);
      setFilteredUsers(usersWithDetails);
      
      console.log('✅ Usuários carregados:', usersWithDetails.length);
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtrar usuários
  useEffect(() => {
    let filtered = users;

    // Filtro por role
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.role === filterRole);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterRole]);

  const handleEditClick = (userData) => {
    setSelectedUser(userData);
    setEditFormData({
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (userData) => {
    setSelectedUser(userData);
    setDeleteDialogOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Atualizar metadata do usuário via Edge Function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            userData: {
              email: editFormData.email,
              user_metadata: {
                full_name: editFormData.full_name,
                role: editFormData.role
              }
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }

      // 2. Se for profissional, atualizar tabela professionals
      if (editFormData.role === 'professional') {
        const professionalExists = professionals.find(p => p.id === selectedUser.id);
        
        if (professionalExists) {
          // Atualizar
          const { error: profError } = await supabase
            .from('professionals')
            .update({
              name: editFormData.full_name,
              email: editFormData.email
            })
            .eq('id', selectedUser.id);
          
          if (profError) throw profError;
        } else {
          // Inserir novo
          const { error: profError } = await supabase
            .from('professionals')
            .insert([{
              id: selectedUser.id,
              name: editFormData.full_name,
              email: editFormData.email,
              specialty: 'Psicologia Clínica'
            }]);
          
          if (profError) throw profError;
        }
      }

      // 3. Se mudou de professional para outro role, remover da tabela
      if (selectedUser.role === 'professional' && editFormData.role !== 'professional') {
        const { error: deleteError } = await supabase
          .from('professionals')
          .delete()
          .eq('id', selectedUser.id);
        
        if (deleteError) console.warn('Aviso ao remover profissional:', deleteError);
      }

      toast({
        title: "✅ Usuário atualizado",
        description: `${editFormData.full_name} foi atualizado com sucesso.`
      });

      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsSubmitting(true);

    try {
      // 1. Remover da tabela professionals se for profissional
      if (selectedUser.role === 'professional') {
        const { error: profError } = await supabase
          .from('professionals')
          .delete()
          .eq('id', selectedUser.id);
        
        if (profError) console.warn('Aviso ao remover profissional:', profError);
      }

      // 2. Deletar usuário do auth via Edge Function
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: selectedUser.id
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }

      toast({
        title: "✅ Usuário excluído",
        description: `${selectedUser.full_name} foi removido do sistema.`
      });

      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'professional':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-800 border-purple-200',
      professional: 'bg-blue-100 text-blue-800 border-blue-200',
      patient: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return badges[role] || badges.patient;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      professional: 'Profissional',
      patient: 'Paciente'
    };
    return labels[role] || 'Usuário';
  };

  // Se não for admin, bloquear acesso
  if (userRole && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
          <p className="text-gray-600 mb-6">
            Apenas administradores podem acessar esta página.
          </p>
          <Link to="/admin">
            <Button className="bg-primary hover:bg-primary/90">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Gestão de Usuários - Doxologos Admin</title>
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
                    Gestão de Usuários
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gerenciar contas de usuários do sistema
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Carregando usuários...</span>
            </div>
          ) : (
            <>
              {/* Filtros */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Busca */}
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

                  {/* Filtro de Role */}
                  <div>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="all">Todos os tipos</option>
                      <option value="admin">Administradores</option>
                      <option value="professional">Profissionais</option>
                      <option value="patient">Pacientes</option>
                    </select>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm">
                  <div className="text-gray-600">
                    Exibindo <span className="font-semibold">{filteredUsers.length}</span> de{' '}
                    <span className="font-semibold">{users.length}</span> usuários
                  </div>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4 text-purple-600" />
                      {users.filter(u => u.role === 'admin').length} Admin
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-4 h-4 text-blue-600" />
                      {users.filter(u => u.role === 'professional').length} Profissionais
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-600" />
                      {users.filter(u => u.role === 'patient').length} Pacientes
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Usuários */}
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-lg">Nenhum usuário encontrado</p>
                    <p className="text-gray-400 text-sm">
                      Tente ajustar os filtros de busca
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((userData, index) => (
                    <motion.div
                      key={userData.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {userData.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>

                          {/* Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-800">
                                {userData.full_name}
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(userData.role)} flex items-center gap-1`}>
                                {getRoleIcon(userData.role)}
                                {getRoleLabel(userData.role)}
                              </span>
                            </div>

                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                {userData.email}
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Cadastrado em: {new Date(userData.created_at).toLocaleDateString('pt-BR')}
                              </div>
                              {userData.last_sign_in && (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <CheckCircle className="w-4 h-4" />
                                  Último acesso: {new Date(userData.last_sign_in).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(userData)}
                            className="hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(userData)}
                            className="hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Usuário
              </label>
              <select
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="patient">Paciente</option>
                <option value="professional">Profissional</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Tem certeza que deseja excluir o usuário:
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-gray-800">{selectedUser?.full_name}</p>
              <p className="text-sm text-gray-600">{selectedUser?.email}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadge(selectedUser?.role)}`}>
                {getRoleLabel(selectedUser?.role)}
              </span>
            </div>
            <p className="text-sm text-red-600 mt-4 font-semibold">
              ⚠️ Esta ação não pode ser desfeita!
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sim, Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminUsuariosPage;
