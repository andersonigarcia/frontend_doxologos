
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft, Briefcase, Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { SecureStorage } from '@/lib/secureStorage';
import emailService from '@/lib/emailService';
import { logger } from '@/lib/logger';

const TrabalheConoscoPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialty: '',
    crp: '',
    experience: '',
    message: ''
  });
  
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  /**
   * Manipula seleção de arquivo
   */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validar tipo de arquivo (PDF)
    if (file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Por favor, selecione apenas arquivos PDF.',
      });
      return;
    }
    
    // Validar tamanho (máx 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 5MB.',
      });
      return;
    }
    
    setResumeFile(file);
    logger.info('Resume file selected', { 
      name: file.name, 
      size: file.size,
      type: file.type 
    });
  };

  /**
   * Remove arquivo selecionado
   */
  const handleRemoveFile = () => {
    setResumeFile(null);
    logger.debug('Resume file removed');
  };

  /**
   * Converte arquivo para Base64 para envio por email
   */
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Remove "data:application/pdf;base64,"
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setUploading(true);
      
      logger.info('Job application form submitted', { 
        name: formData.name,
        email: formData.email 
      });
      
      // Converter arquivo para Base64
      let resumeBase64 = null;
      if (resumeFile) {
        resumeBase64 = await convertFileToBase64(resumeFile);
        logger.debug('Resume converted to Base64', { 
          fileName: resumeFile.name 
        });
      }
      
      // Enviar email com currículo anexado
      const emailData = {
        to: 'doxologos@doxologos.com.br', // Email do RH
        subject: `Nova Candidatura: ${formData.name}`,
        html: `
          <h2>Nova Candidatura Recebida</h2>
          <p><strong>Nome:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Telefone:</strong> ${formData.phone}</p>
          <p><strong>CRP:</strong> ${formData.crp}</p>
          <p><strong>Especialidade:</strong> ${formData.specialty}</p>
          <p><strong>Experiência:</strong> ${formData.experience}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${formData.message || 'Não informada'}</p>
          <hr>
          <p><em>Currículo em anexo (se enviado)</em></p>
        `,
        attachments: resumeFile ? [{
          filename: resumeFile.name,
          content: resumeBase64,
          encoding: 'base64',
          contentType: 'application/pdf'
        }] : []
      };
      
      // Enviar email
      const result = await emailService.sendEmail(emailData);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao enviar email');
      }
      
      logger.success('Job application email sent', { 
        to: emailData.to,
        hasAttachment: !!resumeFile
      });
      
      // Salvar candidatura localmente (backup)
      const application = {
        ...formData,
        resumeFileName: resumeFile?.name,
        date: new Date().toISOString()
      };
      
      const applications = SecureStorage.getArray('jobApplications', []);
      applications.push(application);
      SecureStorage.set('jobApplications', applications);
      
      logger.success('Job application saved locally', { 
        applicationId: applications.length 
      });

      toast({
        title: "✅ Candidatura enviada!",
        description: "Recebemos sua candidatura e currículo. Entraremos em contato em breve!",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        crp: '',
        experience: '',
        message: ''
      });
      setResumeFile(null);
      
    } catch (error) {
      logger.error('Error submitting job application', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar candidatura',
        description: 'Ocorreu um erro ao enviar o email. Por favor, tente novamente.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Trabalhe Conosco - Doxologos Clínica Online</title>
        <meta name="description" content="Faça parte da equipe Doxologos. Envie sua candidatura e ajude a transformar vidas através do atendimento psicológico." />
      </Helmet>

      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-[#2d8659]" />
              <span className="text-2xl font-bold gradient-text">Doxologos</span>
            </Link>
            <Link to="/">
              <Button variant="outline" className="border-[#2d8659] text-[#2d8659]">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="min-h-screen bg-gray-50">
        {/* Hero */}
        <section className="hero-gradient py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-4xl mx-auto"
            >
              <Briefcase className="w-16 h-16 text-[#2d8659] mx-auto mb-6" />
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Trabalhe <span className="gradient-text">Conosco</span>
              </h1>
              <p className="text-xl text-gray-700">
                Faça parte de uma equipe comprometida em transformar vidas através do cuidado integral da saúde mental.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Por que trabalhar conosco */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-bold mb-4">Por Que Trabalhar na Doxologos?</h2>
              <p className="text-xl text-gray-600">Benefícios de fazer parte da nossa equipe</p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Flexibilidade',
                  description: 'Trabalho 100% remoto com horários flexíveis para melhor qualidade de vida.'
                },
                {
                  title: 'Desenvolvimento',
                  description: 'Oportunidades de capacitação contínua e crescimento profissional.'
                },
                {
                  title: 'Propósito',
                  description: 'Faça parte de uma missão maior: transformar vidas através do cuidado integral.'
                },
                {
                  title: 'Remuneração Justa',
                  description: 'Valorização do trabalho profissional com remuneração competitiva.'
                },
                {
                  title: 'Suporte Técnico',
                  description: 'Plataforma moderna e suporte completo para seus atendimentos online.'
                },
                {
                  title: 'Ambiente Acolhedor',
                  description: 'Equipe colaborativa e ambiente de trabalho respeitoso e ético.'
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 p-6 rounded-xl"
                >
                  <h3 className="text-xl font-bold mb-3 text-[#2d8659]">{benefit.title}</h3>
                  <p className="text-gray-700">{benefit.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Requisitos */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl shadow-lg p-8"
            >
              <h2 className="text-3xl font-bold mb-6">Requisitos</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Formação em Psicologia com registro ativo no CRP
                </li>
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Experiência em atendimento clínico (desejável)
                </li>
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Identificação com valores cristãos
                </li>
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Disponibilidade para atendimento online
                </li>
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Comprometimento com ética profissional
                </li>
                <li className="flex items-start">
                  <span className="text-[#2d8659] mr-2">✓</span>
                  Habilidade com tecnologia e plataformas digitais
                </li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Formulário */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 text-center">Envie sua Candidatura</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">CRP *</label>
                    <input
                      type="text"
                      required
                      value={formData.crp}
                      onChange={(e) => setFormData({...formData, crp: e.target.value})}
                      placeholder="Ex: 06/123456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Especialidade *</label>
                  <select
                    required
                    value={formData.specialty}
                    onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="psicologia-clinica">Psicologia Clínica</option>
                    <option value="terapia-familiar">Terapia Familiar</option>
                    <option value="psicologia-infantil">Psicologia Infantil</option>
                    <option value="aconselhamento">Aconselhamento Cristão</option>
                    <option value="outra">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tempo de Experiência *</label>
                  <select
                    required
                    value={formData.experience}
                    onChange={(e) => setFormData({...formData, experience: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                  >
                    <option value="">Selecione...</option>
                    <option value="menos-1">Menos de 1 ano</option>
                    <option value="1-3">1 a 3 anos</option>
                    <option value="3-5">3 a 5 anos</option>
                    <option value="5-10">5 a 10 anos</option>
                    <option value="mais-10">Mais de 10 anos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mensagem / Carta de Apresentação</label>
                  <textarea
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Conte-nos um pouco sobre você, sua experiência e por que gostaria de fazer parte da equipe Doxologos..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                  />
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
                  <label className="block text-sm font-medium mb-3">
                    Currículo (PDF) *
                  </label>
                  
                  {!resumeFile ? (
                    <div>
                      <input
                        type="file"
                        id="resume-upload"
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="resume-upload"
                        className="flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Clique para selecionar ou arraste o arquivo
                        </p>
                        <p className="text-xs text-gray-500">
                          Apenas PDF, máximo 5MB
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <File className="w-8 h-8 text-[#2d8659]" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {resumeFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(resumeFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        aria-label="Remover arquivo"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Dica: Inclua suas experiências, formações e certificações relevantes.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={uploading || !resumeFile}
                  className="w-full bg-[#2d8659] hover:bg-[#236b47] text-lg py-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Upload className="w-5 h-5 mr-2 animate-pulse" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Candidatura'
                  )}
                </Button>
              </form>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default TrabalheConoscoPage;
  