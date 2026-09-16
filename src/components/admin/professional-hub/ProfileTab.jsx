import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Upload, X, User, Settings, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const ProfileTab = ({ professional, onUpdate }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: professional?.name || '',
    email: professional?.email || '',
    whatsapp: professional?.whatsapp || professional?.phone || '',
    mini_curriculum: professional?.mini_curriculum || '',
    personal_meet_link: professional?.personal_meet_link || '',
    image_url: professional?.image_url || '',
    cpf: professional?.cpf || '',
    cnpj: professional?.cnpj || '',
    crp: professional?.crp || '',
    specialty: professional?.specialty || ''
  });

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(professional?.services_ids || []);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Buscar todos os serviços ativos
  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');
        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        console.error('Erro ao buscar serviços:', err);
      }
    };
    fetchServices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Imagem muito grande. Máximo de 5MB.' });
      return;
    }

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `professional_${professional.id}_${Date.now()}.${fileExt}`;
      const filePath = `professionals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('professional-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso! Não esqueça de salvar as alterações.' });
    } catch (err) {
      console.error('Erro no upload:', err);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar foto.' });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Atualizar auth via Edge Function
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
            userId: professional.id,
            userData: {
              email: formData.email,
              user_metadata: {
                full_name: formData.name,
                role: 'professional'
              }
            },
            professionalData: {
              name: formData.name,
              email: formData.email,
              whatsapp: formData.whatsapp,
              phone: formData.whatsapp,
              mini_curriculum: formData.mini_curriculum,
              personal_meet_link: formData.personal_meet_link,
              image_url: formData.image_url,
              cpf: formData.cpf,
              cnpj: formData.cnpj,
              crp: formData.crp,
              specialty: formData.specialty,
              services_ids: selectedServices
            }
          })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao atualizar dados do profissional.');
      }

      toast({
        title: "Sucesso!",
        description: "Os dados do profissional foram atualizados."
      });
      
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Erro na atualização do perfil:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-2xl font-bold mb-8 border-b border-gray-100 pb-4 text-gray-800">
        Dados do Cadastro
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8 text-sm">
        
        {/* SEÇÃO 1: Identificação e Acesso */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-purple-600" /> Identificação e Acesso
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Nome do Profissional</label>
              <input 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Dr. João Silva"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">E-mail</label>
              <input 
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="joao@clinica.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 2: Contato e Mídia */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2 text-purple-600" /> Contato e Mídia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">WhatsApp / Celular (com DDD)</label>
                <input 
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  placeholder="5531999999999"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Utilizado para notificações e contato direto</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Link Fixo do Google Meet</label>
                <input 
                  name="personal_meet_link"
                  value={formData.personal_meet_link}
                  onChange={handleChange}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Enviado automaticamente aos pacientes em agendamentos online</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-2 text-gray-600">Foto do Profissional</label>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-sm">
                  {formData.image_url ? (
                    <>
                      <img src={formData.image_url} alt="Avatar" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                        className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white transition-all"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </>
                  ) : (
                    <Upload className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    id="image-upload"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <label 
                    htmlFor="image-upload"
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-semibold rounded-xl text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Procurar imagem...'}
                  </label>
                  <p className="mt-2 text-xs text-gray-500">
                    Upload seguro para Supabase Storage. Alta qualidade, até 5MB. Formatos aceitos: JPG, PNG, WEBP.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SEÇÃO 3: Atuação e Documentação */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-purple-600" /> Atuação e Documentação
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">CPF</label>
              <input 
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">CNPJ</label>
              <input 
                name="cnpj"
                value={formData.cnpj}
                onChange={handleChange}
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Registro (CRP/CRN/CRM)</label>
              <input 
                name="crp"
                value={formData.crp}
                onChange={handleChange}
                placeholder="06/123456"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600">Especialidade Principal</label>
              <input 
                name="specialty"
                value={formData.specialty}
                onChange={handleChange}
                placeholder="Ex: Psicologia Clínica"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
        </div>

        {/* SEÇÃO 4: Apresentação e Currículo */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <label className="block text-xs font-medium mb-2 text-gray-600">Minicurrículo ou Apresentação</label>
          <textarea 
            name="mini_curriculum"
            value={formData.mini_curriculum}
            onChange={handleChange}
            rows={4}
            placeholder="Escreva um breve resumo sobre o profissional, suas abordagens e formação..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white resize-none"
          />
        </div>

        {/* SEÇÃO 5: Serviços e Precificação */}
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-purple-600" /> Serviços que Atende
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Selecione quais modalidades de atendimento este profissional está apto a realizar na plataforma.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 overflow-y-auto space-y-2 shadow-inner">
            {services.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 flex flex-col items-center">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-gray-400" />
                Carregando serviços...
              </p>
            ) : (
              services.map(service => (
                <label key={service.id} className="flex items-start gap-3 p-3 hover:bg-purple-50/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-purple-100">
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      checked={selectedServices.includes(service.id)}
                      onChange={() => handleServiceToggle(service.id)}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">{service.name}</span>
                    <span className="text-xs text-gray-500 font-medium">
                      {service.duration} min • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                    </span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold px-6 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Alterações do Profissional
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProfileTab;
