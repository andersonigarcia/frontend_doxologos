import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HorizontalCarousel from '@/components/common/HorizontalCarousel';

const EventsHighlight = ({ events = [] }) => {
  if (!events.length) {
    return null;
  }

  return (
    <section id="eventos" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Nossos Próximos Eventos</h2>
          <p className="text-xl text-gray-600">Participe de nossos workshops e palestras online.</p>
        </motion.div>

        <HorizontalCarousel
          items={events}
          ariaLabel="Eventos em destaque"
          showArrows={false}
          trackClassName="gap-8 pb-8"
          itemClassName="w-full max-w-2xl"
          autoplayInterval={5000}
          pauseOnHover
          getItemKey={(event) => event.id}
          dotAriaLabel={(event, index) => `Ir para o evento ${event?.titulo || index + 1}`}
          showDots={events.length > 1}
          itemRenderer={({ item: event, index }) => (
            <motion.article
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50/70 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row overflow-hidden h-full"
            >
              <div className="p-8 flex-1">
                <span className="inline-block bg-[#2d8659]/10 text-[#2d8659] font-semibold px-3 py-1 rounded-full text-sm mb-3">
                  {event.tipo_evento}
                </span>
                <h3 className="text-2xl font-bold mb-3">{event.titulo}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{event.descricao}</p>
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date(event.data_inicio).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {' '}às{' '}
                  {new Date(event.data_inicio).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="flex items-center text-sm text-gray-500 mb-5">
                  <Users className="w-4 h-4 mr-2" />
                  Ministrado por:
                  <span className="font-semibold ml-1">{event.professional?.name || 'Equipe Doxologos'}</span>
                </div>
                {event.valor > 0 ? (
                  <div className="mb-4">
                    <div className="inline-block bg-[#2d8659] text-white px-4 py-2 rounded-lg">
                      <span className="text-sm font-medium">Investimento: </span>
                      <span className="text-lg font-bold">
                        R$ {parseFloat(event.valor).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                      🎉 Gratuito
                    </span>
                  </div>
                )}
                <Link to={`/evento/${event.link_slug}`}>
                  <Button className="bg-[#2d8659] hover:bg-[#236b47] w-full md:w-auto transition-all duration-300 hover:scale-105">
                    Inscreva-se Agora
                  </Button>
                </Link>
              </div>
              <div className="bg-gradient-to-br from-[#2d8659] to-[#236b47] text-white p-6 flex flex-col justify-center items-center text-center w-full md:w-48">
                <span className="text-4xl font-bold">{new Date(event.data_inicio).getDate()}</span>
                <span className="text-xl font-semibold">
                  {new Date(event.data_inicio).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                </span>
              </div>
            </motion.article>
          )}
        />
      </div>
    </section>
  );
};

export default EventsHighlight;
