import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { MessageCircle, Star } from 'lucide-react';

const TestimonialsSection = ({
  testimonials = [],
  isLoading,
  carouselRef,
  activeIndex,
  onScrollToIndex,
  onLeaveTestimonial,
}) => {
  const handleContactScroll = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const contactSection = document.getElementById('contato');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return (
    <section id="depoimentos" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">O Que Dizem Nossos Pacientes</h2>
          <p className="text-xl text-gray-600">Histórias reais de transformação</p>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d8659] mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Carregando depoimentos...</p>
          </div>
        ) : testimonials.length > 0 ? (
          <div className="relative">
            <motion.div
              ref={carouselRef}
              className="flex overflow-x-auto space-x-8 pb-8 scroll-smooth carousel-container"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              {testimonials.map((testimonial, index) => {
                const patientName =
                  testimonial.bookings?.patient_name || testimonial.patient_name || 'Paciente Anônimo';
                const professionalName =
                  testimonial.professionals?.name || testimonial.bookings?.professional?.name;

                return (
                  <motion.div
                    key={testimonial.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white p-8 rounded-xl flex-shrink-0 w-full sm:w-1/2 md:w-1/3 hover:shadow-lg transition-shadow"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-500 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                    <div className="space-y-1">
                      <p className="font-bold text-[#2d8659]">- {patientName}</p>
                      {professionalName && (
                        <p className="text-sm text-gray-600">
                          Atendido por <span className="font-semibold text-[#2d8659]">{professionalName}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => onScrollToIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    activeIndex === index ? 'bg-[#2d8659]' : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-blue-50 rounded-lg p-8 max-w-2xl mx-auto">
              <MessageCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Seja o Primeiro a Compartilhar</h3>
              <p className="text-gray-600 mb-6">
                Ainda não temos depoimentos públicos, mas você pode ser o primeiro! Compartilhe sua experiência conosco.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={onLeaveTestimonial} className="bg-[#2d8659] hover:bg-[#236b47]">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Deixar Depoimento
                </Button>
                <Button
                  variant="outline"
                  className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white"
                  onClick={handleContactScroll}
                >
                  Entre em Contato
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
