import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FaqSection = ({ faqs = [] }) => {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(null);

  if (!faqs.length) {
    return null;
  }

  // Filtrar FAQs baseado na busca
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;

    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  const visibleFaqs = filteredFaqs.slice(0, showAll ? filteredFaqs.length : 6);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <section className="py-12 sm:py-20 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">Perguntas Frequentes</h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">Tire suas dúvidas</p>

          {/* Busca - Mobile First */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar perguntas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 sm:py-4 border-2 border-gray-200 rounded-lg
                focus:border-[#2d8659] focus:outline-none
                text-base touch-manipulation
                transition-colors"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2
                  w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300
                  flex items-center justify-center
                  active:scale-95 transition-all touch-manipulation"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          {/* Resultado da busca */}
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-3">
              {filteredFaqs.length === 0
                ? 'Nenhuma pergunta encontrada'
                : `${filteredFaqs.length} ${filteredFaqs.length === 1 ? 'pergunta encontrada' : 'perguntas encontradas'}`}
            </p>
          )}
        </motion.div>

        {/* FAQs - Mobile Optimized */}
        <div className="space-y-3 sm:space-y-4">
          <AnimatePresence mode="wait">
            {visibleFaqs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 text-gray-500"
              >
                Nenhuma pergunta encontrada. Tente outra busca.
              </motion.div>
            ) : (
              visibleFaqs.map((faq, index) => (
                <motion.div
                  key={`${faq.question}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full text-left p-4 sm:p-6 flex items-start justify-between gap-4
                      active:scale-[0.99] transition-transform touch-manipulation"
                    aria-expanded={openIndex === index}
                  >
                    <span className="font-bold text-base sm:text-lg text-gray-900 pr-2">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 sm:px-6 pb-4 sm:pb-6 text-gray-600 leading-relaxed text-sm sm:text-base">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Botão Ver Mais */}
        {!searchQuery && filteredFaqs.length > 6 && (
          <div className="text-center mt-6 sm:mt-8">
            <Button
              onClick={() => setShowAll((prev) => !prev)}
              variant="outline"
              size="lg"
              className="border-2 border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white
                px-6 sm:px-8 py-3 sm:py-4 text-base
                active:scale-95 transition-all touch-manipulation"
            >
              {showAll
                ? 'Ver menos perguntas'
                : `Ver mais ${filteredFaqs.length - 6} ${filteredFaqs.length - 6 === 1 ? 'pergunta' : 'perguntas'}`}
            </Button>
          </div>
        )}

        {/* CTA de contato se não encontrar */}
        {searchQuery && filteredFaqs.length === 0 && (
          <div className="text-center mt-8 p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              Não encontrou o que procurava?
            </p>
            <Button
              onClick={() => {
                const element = document.getElementById('contato');
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-[#2d8659] hover:bg-[#236b47]
                active:scale-95 transition-all touch-manipulation"
            >
              Entre em Contato
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FaqSection;
