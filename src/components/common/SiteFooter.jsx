import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram } from 'lucide-react';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

const SiteFooter = () => {
  return (
    <footer className="bg-[#1b3c37] text-[#f0ebe1] py-12 border-t border-[#132d29] mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Coluna 1: Marca e Redes Sociais */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <DoxologosLogo variant="white" className="h-10 w-auto" />
            </div>
            <p className="text-gray-400 mb-6 text-sm">Cuidado integral para sua saúde mental com ética cristã.</p>
            <div className="flex space-x-4">
              <a href="https://instagram.com/doxologosoficial" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                <Instagram className="w-6 h-6" />
              </a>
            </div>
          </div>

          {/* Coluna 2: Pacientes */}
          <div>
            <h3 className="font-bold text-lg mb-4">Para Pacientes</h3>
            <div className="space-y-2 text-sm">
              <Link to="/" className="block text-gray-400 hover:text-white transition-colors">Início</Link>
              <Link to="/agendamento" className="block text-gray-400 hover:text-[#2d8659] transition-colors font-medium">Agendamento</Link>
              <Link to="/#profissionais" className="block text-gray-400 hover:text-white transition-colors">Profissionais</Link>
              <Link to="/artigos" className="block text-gray-400 hover:text-white transition-colors font-medium">Blog (Artigos)</Link>
              <Link to="/ferramentas" className="block text-gray-400 hover:text-white transition-colors">Testes & Ferramentas</Link>
              <Link to="/area-do-paciente" className="block text-gray-400 hover:text-white transition-colors">Área do Paciente</Link>
            </div>
          </div>

          {/* Coluna 3: Especialidades (SEO Interligação) */}
          <div>
            <h4 className="text-lg font-bold mb-6 text-white border-b border-[#2d8659] pb-2 inline-block">Especialidades</h4>
            <ul className="space-y-3">
              <li><Link to="/terapia/ansiedade" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Ansiedade</Link></li>
              <li><Link to="/terapia/depressao" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Depressão</Link></li>
              <li><Link to="/terapia/tdah" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>TDAH em Adultos</Link></li>
              <li><Link to="/terapia/casal" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Terapia de Casal</Link></li>
              <li><Link to="/terapia/burnout" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Burnout</Link></li>
              <li><Link to="/terapia/dependencia-emocional" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Dependência Emocional</Link></li>
              <li><Link to="/terapia/vicio-apostas" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Vício em Apostas</Link></li>
              <li><Link to="/terapia/abuso-espiritual" className="text-[#a4b5a4] hover:text-white transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#2d8659] rounded-full"></span>Abuso Espiritual</Link></li>
            </ul>
          </div>

          {/* Coluna 4: Institucional */}
          <div>
            <h3 className="font-bold text-lg mb-4">Institucional</h3>
            <div className="space-y-2 text-sm">
              <Link to="/quem-somos" className="block text-gray-400 hover:text-white transition-colors">Quem Somos</Link>
              <Link to="/trabalhe-conosco" className="block text-gray-400 hover:text-white transition-colors">Trabalhe Conosco</Link>
              <Link to="/admin" className="block text-gray-400 hover:text-white transition-colors">Área do Profissional</Link>
              <Link to="/doacao" className="block text-gray-400 hover:text-white transition-colors">Faça uma Doação</Link>
            </div>
          </div>

          {/* Coluna 5: Contato */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contato</h3>
            <div className="space-y-2 text-gray-400 text-sm">
              <p>contato@doxologos.com.br</p>
              <p>(31) 97198-2947</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 pb-4 text-xs text-gray-500 max-w-3xl mx-auto text-center">
          <p className="font-medium text-yellow-500 mb-2">
            ⚠️ ATENÇÃO: Este site não oferece atendimento para casos de urgência ou emergência de saúde mental.
            Em caso de crise grave, ligue 188 (CVV - Centro de Valorização da Vida) ou procure o pronto-socorro mais próximo.
          </p>
          <p>
            Atendimento em conformidade com a Resolução CFP nº 11/2018 e orientações do Conselho Federal de Psicologia.
          </p>
        </div>

        <div className="border-t border-gray-800 pt-6 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} Doxologos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
