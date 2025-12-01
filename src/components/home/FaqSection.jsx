import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FaqSection = ({ faqs = [] }) => {
  const [showAll, setShowAll] = useState(false);

  if (!faqs.length) {
    return null;
  }

  const visibleFaqs = faqs.slice(0, showAll ? faqs.length : 8);

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-gray-600">Tire suas dúvidas</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {visibleFaqs.map((faq, index) => (
            <motion.details
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-50 rounded-lg p-6 shadow-md group hover:shadow-lg transition-all duration-300"
            >
              <summary className="font-bold text-lg cursor-pointer flex items-center justify-between">
                <span className="pr-4">{faq.question}</span>
                <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <p className="mt-4 text-gray-600 leading-relaxed">{faq.answer}</p>
            </motion.details>
          ))}
        </div>

        {faqs.length > 8 && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setShowAll((prev) => !prev)}
              variant="outline"
              className="border-[#2d8659] text-[#2d8659] hover:bg-[#2d8659] hover:text-white"
            >
              {showAll ? 'Ver menos perguntas' : `Ver mais ${faqs.length - 8} perguntas`}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FaqSection;
