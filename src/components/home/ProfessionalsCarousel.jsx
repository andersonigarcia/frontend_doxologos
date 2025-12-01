import React from 'react';
import { motion } from 'framer-motion';
import HorizontalCarousel from '@/components/common/HorizontalCarousel';

const ProfessionalsCarousel = ({ professionals = [] }) => {
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

        <HorizontalCarousel
          items={professionals}
          ariaLabel="Profissionais disponíveis para agendamento"
          trackClassName="gap-6 pb-8 pt-2 px-1"
          itemClassName="min-w-[260px] sm:min-w-[300px] md:min-w-[320px] lg:min-w-[340px] max-w-[340px]"
          getItemKey={(prof) => prof.id}
          dotAriaLabel={(prof) => `Ir para o profissional ${prof?.name || ''}`}
          gradientEdges
          itemRenderer={({ item: prof, index }) => (
            <motion.article
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative bg-white border border-transparent hover:border-[#2d8659]/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col h-full"
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={prof.name}
                  src={
                    prof.image_url ||
                    'https://images.unsplash.com/photo-1603991414220-51b87b89a371?w=400&h=300&fit=crop&crop=face'
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {prof.specialty && (
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-[#2d8659] text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full shadow-sm">
                    {prof.specialty}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 p-6">
                <div className="flex flex-col gap-2">
                  <h3 className="text-2xl font-semibold text-gray-900 leading-tight">{prof.name}</h3>
                  {prof.crp && <span className="text-sm font-medium text-gray-500">CRP {prof.crp}</span>}
                </div>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-4">
                  {prof.mini_curriculum ||
                    prof.description ||
                    'Profissional dedicado ao cuidado integral do paciente com acolhimento e ética cristã.'}
                </p>
                <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span className="text-[#2d8659] font-medium">Atendimento online</span>
                  <span className="text-gray-400">Psicologia </span>
                </div>
              </div>
            </motion.article>
          )}
        />
      </div>
    </section>
  );
};

export default ProfessionalsCarousel;
