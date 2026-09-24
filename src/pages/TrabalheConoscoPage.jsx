
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
import { supabase } from '@/lib/customSupabaseClient';
import DoxologosLogo from '@/components/brand/DoxologosLogo';

const TrabalheConoscoPage = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    specialty: '',
    crp: '',
    experience: '',
    message: ''
  });
  
  const [documentType, setDocumentType] = useState('cpf');
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [emailError, setEmailError] = useState('');

  /**
   * Formata telefone: (11) 98765-4321 ou (11) 3456-7890
   */
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      // Telefone fixo: (11) 3456-7890
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      // Celular: (11) 98765-4321
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  /**
   * Valida formato de email
   */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Formata CPF ou CNPJ
   */
  const formatDocument = (val, type) => {
    let v = val.replace(/\D/g, '');
    if (type === 'cpf') {
      if (v.length > 11) v = v.slice(0, 11);
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d)/, '$1.$2');
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      if (v.length > 14) v = v.slice(0, 14);
      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    }
    return v;
  };

  const handleDocTypeChange = (type) => {
    setDocumentType(type);
    setFormData(prev => ({ ...prev, cpf_cnpj: '' }));
  };

  /**
   * Manipula mudanças nos campos do formulário com máscaras
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    
    // Aplicar máscaras
    if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cpf_cnpj') {
      formattedValue = formatDocument(value, documentType);
    } else if (name === 'email') {
      // Validar email ao digitar
      if (value && !validateEmail(value)) {
        setEmailError('Email inválido');
      } else {
        setEmailError('');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

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
    
    // Validar email antes de enviar
    if (!validateEmail(formData.email)) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Por favor, insira um endereço de email válido.',
      });
      return;
    }

    // Validar telefone (mínimo 10 dígitos)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      toast({
        variant: 'destructive',
        title: 'Telefone inválido',
        description: 'Por favor, insira um telefone válido com DDD.',
      });
      return;
    }

    // Validar Registro Profissional (básico)
    if (!formData.crp || formData.crp.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Registro inválido',
        description: 'Por favor, insira um registro profissional válido.',
      });
      return;
    }
    
    try {
      setUploading(true);
      
      logger.info('Job application form submitted', { 
        name: formData.name,
        email: formData.email 
      });
      
      // 1. Upload resume to Supabase Storage if provided
      let resumeUrl = null;
      let resumePath = null;
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resumeFile);
          
        if (uploadError) {
          logger.warn(`Falha ao fazer upload do currículo no Supabase: ${uploadError.message}. O arquivo será enviado por e-mail como fallback.`);
          // Don't throw, we will just use the email fallback
        } else {
          resumePath = filePath;
          resumeUrl = filePath;
        }
      }
      
      // 2. Insert into database (mesmo se o upload falhar, queremos registrar a candidatura)
      const { error: dbError } = await supabase
        .from('professional_applications')
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf_cnpj: formData.cpf_cnpj,
          crp: formData.crp,
          specialty: formData.specialty,
          experience: formData.experience,
          message: formData.message,
          resume_url: resumeUrl,
          status: 'pending'
        }]);
        
      if (dbError) {
        throw new Error(`Erro ao salvar candidatura: ${dbError.message}`);
      }

      // 3. Send email to HR
      const emailData = {
        to: 'doxologos@doxologos.com.br', // Email do RH
        subject: `Nova Candidatura: ${formData.name}`,
        html: `
          <h2>Nova Candidatura Recebida via Site</h2>
          <p>Uma nova candidatura foi recebida e está aguardando avaliação no Painel de Controle (Hub 360 > Profissionais > Em Avaliação).</p>
          <hr>
          <p><strong>Nome:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Telefone:</strong> ${formData.phone}</p>
          <p><strong>CPF/CNPJ:</strong> ${formData.cpf_cnpj}</p>
          <p><strong>Registro Profissional:</strong> ${formData.crp}</p>
          <p><strong>Especialidade:</strong> ${formData.specialty}</p>
          <p><strong>Experiência:</strong> ${formData.experience}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${formData.message || 'Não informada'}</p>
          ${!resumeUrl ? '<p style="color: #d97706;"><strong>Aviso:</strong> O currículo está em anexo neste e-mail (falha ao salvar na nuvem).</p>' : ''}
        `,
        attachments: []
      };

      // Se o upload falhou (ou como backup), anexa o arquivo no email
      if (resumeFile && !resumeUrl) {
        try {
          const base64Content = await convertFileToBase64(resumeFile);
          emailData.attachments.push({
            filename: resumeFile.name,
            content: base64Content,
            encoding: 'base64'
          });
        } catch (convErr) {
          logger.error('Erro ao converter arquivo para base64', convErr);
        }
      }
      
      // Attempt to send email but don't fail the whole process if email fails
      try {
        await emailService.sendEmail(emailData);
        logger.success('Job application email sent');
      } catch (emailErr) {
        logger.error('Failed to send notification email to HR', emailErr);
        // Continue anyway since it's saved in DB
      }
      
      toast({
        title: "✅ Candidatura enviada com sucesso!",
        description: "Nossa equipe de curadoria analisará seu perfil e entraremos em contato em breve.",
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        cpf_cnpj: '',
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
        description: error.message || 'Ocorreu um erro ao enviar sua candidatura. Por favor, tente novamente.',
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
            <Link to="/" className="flex items-center space-x-2" aria-label="Doxologos - Página inicial">
              <DoxologosLogo className="h-9 md:h-10 w-auto" />
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
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent ${
                        emailError ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {emailError && (
                      <p className="text-red-500 text-sm mt-1">{emailError}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(11) 98765-4321"
                      maxLength="15"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">CPF ou CNPJ (Opcional)</label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                          type="radio" 
                          name="docType" 
                          checked={documentType === 'cpf'} 
                          onChange={() => handleDocTypeChange('cpf')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        CPF
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input 
                          type="radio" 
                          name="docType" 
                          checked={documentType === 'cnpj'} 
                          onChange={() => handleDocTypeChange('cnpj')}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        CNPJ
                      </label>
                    </div>
                    <input
                      type="text"
                      name="cpf_cnpj"
                      value={formData.cpf_cnpj}
                      onChange={handleInputChange}
                      placeholder={documentType === 'cpf' ? "000.000.000-00" : "00.000.000/0000-00"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Registro Profissional (Ex: CRP, CRN, CRM) *</label>
                    <input
                      type="text"
                      name="crp"
                      required
                      value={formData.crp}
                      onChange={handleInputChange}
                      placeholder="Ex: 06/123456 ou CRM-SP 12345"
                      maxLength="30"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d8659] focus:border-transparent"
                    />
                  </div>
                  <select
                    name="specialty"
                    required
                    value={formData.specialty}
                    onChange={handleInputChange}
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
                    name="experience"
                    required
                    value={formData.experience}
                    onChange={handleInputChange}
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
                    name="message"
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
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
  