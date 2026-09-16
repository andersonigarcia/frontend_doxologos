import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Upload, X } from 'lucide-react';
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold mb-6">Dados do Cadastro</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input 
              name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
              placeholder="5531999999999"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Fixo do Google Meet</label>
            <input 
              name="personal_meet_link"
              value={formData.personal_meet_link}
              onChange={handleChange}
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input 
              name="cpf"
              value={formData.cpf}
              onChange={handleChange}
              placeholder="000.000.000-00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
            <input 
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              placeholder="00.000.000/0000-00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registro (CRP/CRN)</label>
            <input 
              name="crp"
              value={formData.crp}
              onChange={handleChange}
              placeholder="06/123456"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade Principal</label>
            <input 
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              placeholder="Ex: Psicologia Clínica"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
          
          {/* Lado Esquerdo - Foto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Profissional</label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {formData.image_url ? (
                  <>
                    <img src={formData.image_url} alt="Avatar" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
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
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                >
                  {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Procurar imagem...'}
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Upload seguro para Supabase Storage. Alta qualidade, até 5MB. Formatos aceitos: JPG, PNG, WEBP.
                </p>
              </div>
            </div>
          </div>

          {/* Lado Direito - Serviços */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serviços que Atende</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-64 overflow-y-auto space-y-2">
              {services.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Carregando serviços ou nenhum serviço cadastrado.</p>
              ) : (
                services.map(service => (
                  <label key={service.id} className="flex items-start gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        checked={selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      <span className="text-xs text-gray-500">
                        {service.duration} min • {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selecione um ou mais serviços que este profissional pode atender na plataforma.
            </p>
          </div>

        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minicurrículo</label>
          <textarea 
            name="mini_curriculum"
            value={formData.mini_curriculum}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="pt-4 flex justify-end">
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
        </div>
      </form>
    </div>
  );
};

export default ProfileTab;
