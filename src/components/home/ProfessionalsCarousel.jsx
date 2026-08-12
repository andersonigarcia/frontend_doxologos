import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ProfessionalsCarousel = ({ professionals = [] }) => {
  const navigate = useNavigate();
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  const handleOpenProfile = (professional) => {
    if (!professional) return;
    setSelectedProfessional(professional);
  };

  const handleCloseProfile = () => {
    setSelectedProfessional(null);
  };

  const handleScheduleClick = (professional) => {
    if (!professional) return;
    handleCloseProfile();
    // Usa a navegação padrão que eles já utilizavam
    navigate('/agendamento'); 
  };

  if (!professionals.length) {
    return (
      <section id="profissionais" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Conheça Nossa Equipe</h2>
            <p className="text-xl text-gray-600">Equipe qualificada e comprometida com seu bem-estar</p>
          </motion.div>
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">Nenhum profissional encontrado.</p>
            <p className="text-gray-400 text-sm mt-2">Verifique se há registros na tabela professionals do Supabase.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="profissionais" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Conheça Nossa Equipe </h2>
          <p className="text-xl text-gray-600">Equipe qualificada e comprometida com seu bem-estar</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {professionals.slice(0, 6).map((prof, index) => (
            <motion.div
              key={prof.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative bg-white border border-[#e4ded5] hover:border-[#1b3c37]/40 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full text-center"
            >
              {/* Botão invisível que engloba a imagem e o texto para abrir o modal */}
              <button 
                type="button" 
                onClick={() => handleOpenProfile(prof)}
                className="w-full text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b3c37] flex-1 flex flex-col items-center"
                aria-label={`Ver perfil de ${prof?.name || 'profissional'}`}
              >
                <div className="w-full pt-6 pb-2 flex justify-center bg-gradient-to-b from-[#f4efe6]/50 to-white">
                  <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-sm bg-[#f4efe6]">
                    <img
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      alt={prof.name}
                      src={
                        prof.image_url ||
                        'https://images.unsplash.com/photo-1603991414220-51b87b89a371?w=400&h=300&fit=crop&crop=face'
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-1 p-4 pb-2 w-full items-center">
                  <div className="flex flex-col gap-1 items-center">
                    <h3 className="font-serif text-lg font-bold text-[#1b3c37] leading-tight transition-colors line-clamp-1">{prof.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {prof.specialty && (
                        <span className="text-[#1b3c37] text-[10px] font-bold tracking-wider uppercase bg-[#edf0ed] px-2 py-0.5 rounded-full border border-[#9bab9b]/30">
                          {prof.specialty}
                        </span>
                      )}
                      {prof.crp && <span className="text-xs font-medium text-gray-500">CRP {prof.crp}</span>}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[#262624]/80 leading-relaxed line-clamp-2">
                    {prof.mini_curriculum ||
                      prof.description ||
                      'Profissional dedicado ao cuidado integral do paciente com acolhimento e ética cristã.'}
                  </p>
                  <div className="mt-3 text-[#1b3c37] text-sm font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Ler perfil completo <ExternalLink className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>
              
              <div className="p-4 pt-3 mt-auto border-t border-[#e4ded5] flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-[#edf0ed] text-[#1b3c37] px-2 py-1 rounded-md font-medium">Atendimento online</span>
                  <span className="text-gray-400">Psicologia</span>
                </div>
                <Button 
                  onClick={() => handleScheduleClick(prof)}
                  className="w-full bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] transition-colors h-10 text-sm"
                >
                  <Calendar className="w-4 h-4 mr-2" /> Agendar Consulta
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {professionals.length > 6 && (
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/agendamento')}
              className="px-8 border-[#1b3c37] text-[#1b3c37] hover:bg-[#1b3c37] hover:text-[#f0ebe1] transition-colors h-14 text-lg font-medium"
            >
              Buscar psicólogo por especialidade <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedProfessional} onOpenChange={(open) => !open && handleCloseProfile()}>
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white border-0 shadow-2xl">
          {selectedProfessional && (
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Imagem Lateral (Mobile: Topo) */}
              <div className="w-full md:w-2/5 h-56 md:h-auto relative bg-[#f4efe6]">
                <img
                  src={selectedProfessional.image_url || 'https://images.unsplash.com/photo-1603991414220-51b87b89a371?w=400&h=300&fit=crop&crop=face'}
                  alt={selectedProfessional.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden" />
              </div>
              
              {/* Conteúdo */}
              <div className="w-full md:w-3/5 flex flex-col h-full max-h-[calc(90vh-14rem)] md:max-h-[90vh]">
                <div className="p-6 md:p-8 flex-1 overflow-y-auto">
                  <DialogHeader className="mb-6 text-left">
                    <DialogTitle className="font-serif text-3xl font-bold text-[#1b3c37] leading-tight pr-8">
                      {selectedProfessional.name}
                    </DialogTitle>
                    {selectedProfessional.crp && (
                      <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
                        CRP {selectedProfessional.crp}
                      </DialogDescription>
                    )}
                  </DialogHeader>

                  <div className="space-y-6">
                    {selectedProfessional.specialty && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Especialidade</h4>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#1b3c37]/10 text-[#1b3c37] text-sm font-semibold">
                          {selectedProfessional.specialty}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sobre o Profissional</h4>
                      <div className="text-[#262624] text-[15px] leading-relaxed whitespace-pre-wrap">
                        {selectedProfessional.description || selectedProfessional.mini_curriculum || 'Profissional dedicado ao cuidado integral do paciente.'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 bg-[#f8f6f0] border-t border-[#e4ded5] shrink-0">
                  <Button 
                    size="lg" 
                    className="w-full bg-[#1b3c37] hover:bg-[#132d29] text-[#f0ebe1] h-12 text-base font-semibold shadow-md transition-all hover:scale-[1.01]"
                    onClick={() => handleScheduleClick(selectedProfessional)}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Agendar Consulta com {selectedProfessional.name.split(' ')[0]}
                  </Button>
                  <p className="text-center text-xs text-gray-500 mt-3 font-medium">
                    Atendimento online por vídeo chamada
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ProfessionalsCarousel;
