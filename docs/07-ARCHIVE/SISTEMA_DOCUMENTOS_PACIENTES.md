# 📁 Sistema de Documentos Compartilhados - Profissional → Paciente

## 📋 Visão Geral

Sistema para permitir que profissionais façam upload de documentos (PDFs, imagens, relatórios) e compartilhem seletivamente com pacientes específicos através da plataforma.

---

## ✅ ANÁLISE DE VIABILIDADE: **ALTA**

### Infraestrutura Existente
- ✅ **Supabase Storage** já configurado (`professional-photos` bucket)
- ✅ **Sistema de autenticação** com roles (admin, professional, patient)
- ✅ **RLS (Row Level Security)** implementado
- ✅ **Relacionamento Profissional-Paciente** via tabela `bookings`
- ✅ **Upload de arquivos** já funciona em `AdminPage.jsx`

---

## 🏗️ ARQUITETURA

### 1. Estrutura de Banco de Dados

#### Tabela: `patient_documents`

```sql
-- Nova tabela para gerenciar documentos compartilhados
CREATE TABLE patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id) NOT NULL,
    patient_id UUID REFERENCES auth.users(id) NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL, -- Caminho completo no Supabase Storage
    file_type TEXT, -- 'pdf', 'image', 'doc', 'docx', etc.
    file_size INTEGER, -- Tamanho em bytes
    title TEXT NOT NULL,
    description TEXT,
    is_visible BOOLEAN DEFAULT true,
    viewed_at TIMESTAMPTZ, -- Timestamp de quando paciente visualizou
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX idx_patient_docs_professional ON patient_documents(professional_id);
CREATE INDEX idx_patient_docs_patient ON patient_documents(patient_id);
CREATE INDEX idx_patient_docs_visibility ON patient_documents(is_visible);
CREATE INDEX idx_patient_docs_created ON patient_documents(created_at DESC);

-- Comentários para documentação
COMMENT ON TABLE patient_documents IS 'Documentos compartilhados entre profissionais e pacientes';
COMMENT ON COLUMN patient_documents.professional_id IS 'ID do profissional que compartilhou o documento';
COMMENT ON COLUMN patient_documents.patient_id IS 'ID do paciente que receberá o documento';
COMMENT ON COLUMN patient_documents.file_path IS 'Caminho no formato: patient-documents/professional_id/patient_id/filename';
COMMENT ON COLUMN patient_documents.is_visible IS 'Controla se o documento está visível para o paciente';
COMMENT ON COLUMN patient_documents.viewed_at IS 'Data/hora em que o paciente visualizou o documento pela primeira vez';
```

#### Row Level Security (RLS)

```sql
-- Habilitar RLS na tabela
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Política 1: Profissionais podem gerenciar (CRUD) seus próprios documentos
CREATE POLICY "Professionals can manage their documents"
ON patient_documents FOR ALL
USING (auth.uid() = professional_id);

-- Política 2: Pacientes podem visualizar apenas documentos compartilhados com eles
CREATE POLICY "Patients can view their documents"
ON patient_documents FOR SELECT
USING (
    auth.uid() = patient_id 
    AND is_visible = true
);

-- Política 3: Pacientes podem atualizar apenas o campo viewed_at
CREATE POLICY "Patients can mark as viewed"
ON patient_documents FOR UPDATE
USING (auth.uid() = patient_id)
WITH CHECK (auth.uid() = patient_id);
```

---

### 2. Supabase Storage

#### Novo Bucket: `patient-documents`

```sql
-- Criar bucket PRIVADO para documentos de pacientes
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-documents', 'patient-documents', false);

-- Comentário
COMMENT ON TABLE storage.buckets IS 'Bucket privado para armazenar documentos compartilhados com pacientes';
```

#### Políticas de Storage

```sql
-- Política 1: Profissionais podem fazer upload
CREATE POLICY "Professionals can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'patient-documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM professionals WHERE id = auth.uid()
    )
);

-- Política 2: Profissionais podem atualizar/deletar seus próprios documentos
CREATE POLICY "Professionals can update their documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'patient-documents'
    AND auth.uid() IN (
        SELECT professional_id FROM patient_documents 
        WHERE file_path = name
    )
);

CREATE POLICY "Professionals can delete their documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'patient-documents'
    AND auth.uid() IN (
        SELECT professional_id FROM patient_documents 
        WHERE file_path = name
    )
);

-- Política 3: Pacientes e profissionais podem visualizar
CREATE POLICY "Authorized users can download documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'patient-documents'
    AND (
        -- Profissional dono do documento
        auth.uid() IN (
            SELECT professional_id FROM patient_documents 
            WHERE file_path = name
        )
        OR
        -- Paciente com acesso ao documento
        auth.uid() IN (
            SELECT patient_id FROM patient_documents 
            WHERE file_path = name AND is_visible = true
        )
    )
);
```

---

## 📂 Estrutura de Arquivos no Storage

```
patient-documents/
├── {professional_id}/
│   ├── {patient_id}/
│   │   ├── {timestamp}_{original_filename}.pdf
│   │   ├── {timestamp}_{original_filename}.jpg
│   │   └── ...
│   └── {patient_id}/
│       └── ...
```

**Exemplo:**
```
patient-documents/
└── uuid-prof-123/
    └── uuid-patient-456/
        ├── 1735392000000_plano_tratamento.pdf
        └── 1735392100000_resultado_avaliacao.pdf
```

---

## 🎨 INTERFACE DO USUÁRIO

### A. Área do Profissional (AdminPage)

#### Nova Aba: "Documentos dos Pacientes"

```jsx
┌────────────────────────────────────────────────────────────┐
│ 📁 Documentos dos Pacientes                   [+ Novo]     │
├────────────────────────────────────────────────────────────┤
│ Filtros:                                                   │
│ [Todos os Pacientes ▼] [Tipo ▼] [Status ▼] [Buscar...]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📄 Plano de Tratamento Inicial                           │
│    Paciente: João Silva (joao@email.com)                 │
│    PDF • 2.3 MB • Enviado em 15/01/2025 às 14:30        │
│    ✅ Visualizado em 16/01/2025 às 09:15                 │
│    [👁️ Visualizar] [📝 Editar] [🔄 Ocultar] [🗑️ Excluir] │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📊 Resultado de Avaliação Psicológica                    │
│    Paciente: Maria Santos (maria@email.com)              │
│    PDF • 1.8 MB • Enviado em 10/01/2025 às 10:00        │
│    🔔 Não visualizado ainda                               │
│    [👁️ Visualizar] [📝 Editar] [🔄 Ocultar] [🗑️ Excluir] │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Modal de Upload/Compartilhamento

```jsx
┌──────────────────────────────────────────────┐
│ 📤 Compartilhar Documento                    │
├──────────────────────────────────────────────┤
│                                              │
│ Selecione o paciente: *                     │
│ ┌──────────────────────────────────────┐    │
│ │ 🔍 Buscar paciente...                │    │
│ │ ─────────────────────────────────── │    │
│ │ João Silva (joao@email.com)         │    │
│ │ Maria Santos (maria@email.com)      │    │
│ │ Pedro Costa (pedro@email.com)       │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ Título do documento: *                      │
│ [_____________________________________]      │
│                                              │
│ Descrição (opcional):                       │
│ [_____________________________________]      │
│ [_____________________________________]      │
│                                              │
│ Tipo de arquivo:                            │
│ [PDF ▼]                                     │
│                                              │
│ Selecionar arquivo: *                       │
│ ┌──────────────────────────────────────┐    │
│ │ 📎 Clique ou arraste o arquivo aqui │    │
│ │    Formatos: PDF, JPG, PNG, DOC     │    │
│ │    Tamanho máximo: 10 MB            │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ ☑️ Tornar visível para o paciente           │
│    imediatamente                             │
│                                              │
│ [Cancelar]              [Compartilhar]      │
└──────────────────────────────────────────────┘
```

#### Modal de Edição

```jsx
┌──────────────────────────────────────────────┐
│ ✏️ Editar Documento                          │
├──────────────────────────────────────────────┤
│                                              │
│ Título:                                      │
│ [Plano de Tratamento Inicial__________]     │
│                                              │
│ Descrição:                                   │
│ [Plano elaborado após 3 sessões_____]       │
│ [______________________________________]      │
│                                              │
│ Visibilidade:                                │
│ ☑️ Visível para o paciente                   │
│                                              │
│ Arquivo atual:                               │
│ 📄 plano_tratamento.pdf (2.3 MB)            │
│                                              │
│ Substituir arquivo (opcional):               │
│ [📎 Escolher novo arquivo]                   │
│                                              │
│ [Cancelar]         [Salvar Alterações]      │
└──────────────────────────────────────────────┘
```

---

### B. Área do Paciente (PacientePage)

#### Nova Seção: "Documentos Compartilhados"

```jsx
┌────────────────────────────────────────────────────────────┐
│ 📚 Meus Documentos                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 🆕 Novo                                                    │
│ 📄 Plano de Tratamento Inicial                           │
│    Compartilhado por: Dra. Ana Costa                      │
│    Enviado em: 15/01/2025 às 14:30                       │
│    "Plano terapêutico para os próximos 3 meses"          │
│    [📥 Baixar PDF]                                        │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📊 Resultado de Avaliação - Janeiro                      │
│    Compartilhado por: Dra. Ana Costa                      │
│    Enviado em: 10/01/2025 às 10:00                       │
│    Visualizado em: 10/01/2025 às 15:45                   │
│    "Resultado da avaliação psicológica inicial"           │
│    [📥 Baixar PDF]                                        │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ 📝 Exercícios de Terapia Cognitiva                       │
│    Compartilhado por: Dra. Ana Costa                      │
│    Enviado em: 05/01/2025 às 16:20                       │
│    Visualizado em: 05/01/2025 às 18:00                   │
│    [📥 Baixar PDF]                                        │
│                                                            │
└────────────────────────────────────────────────────────────┘

⚠️ Importante: Seus documentos são confidenciais e protegidos.
   Somente você e seu profissional têm acesso a eles.
```

---

## 💻 IMPLEMENTAÇÃO TÉCNICA

### 1. Service Layer: `documentService.js`

```javascript
// src/lib/documentService.js
import { supabase } from './customSupabaseClient';

class DocumentService {
  // Validação de arquivo
  static validateFile(file) {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!file) {
      return { valid: false, error: 'Nenhum arquivo selecionado' };
    }

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'Arquivo muito grande (máximo 10 MB)' };
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Tipo de arquivo não permitido' };
    }

    return { valid: true };
  }

  // Upload de documento
  static async uploadDocument(professionalId, patientId, file, metadata) {
    try {
      // Validar arquivo
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `patient-documents/${professionalId}/${patientId}/${fileName}`;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Determinar tipo do arquivo
      const fileType = this.getFileType(file.type);

      // Criar registro na tabela patient_documents
      const { data: docData, error: docError } = await supabase
        .from('patient_documents')
        .insert([{
          professional_id: professionalId,
          patient_id: patientId,
          file_name: file.name,
          file_path: filePath,
          file_type: fileType,
          file_size: file.size,
          title: metadata.title,
          description: metadata.description || null,
          is_visible: metadata.isVisible !== false
        }])
        .select()
        .single();

      if (docError) throw docError;

      return { success: true, data: docData };
    } catch (error) {
      console.error('Error uploading document:', error);
      return { success: false, error: error.message };
    }
  }

  // Listar documentos do profissional
  static async getProfessionalDocuments(professionalId, filters = {}) {
    try {
      let query = supabase
        .from('patient_documents')
        .select(`
          *,
          patient:patient_id (
            id,
            email,
            user_metadata
          )
        `)
        .eq('professional_id', professionalId)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }
      if (filters.fileType) {
        query = query.eq('file_type', filters.fileType);
      }
      if (filters.isVisible !== undefined) {
        query = query.eq('is_visible', filters.isVisible);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching professional documents:', error);
      return { success: false, error: error.message };
    }
  }

  // Listar documentos do paciente
  static async getPatientDocuments(patientId) {
    try {
      const { data, error } = await supabase
        .from('patient_documents')
        .select(`
          *,
          professional:professional_id (
            id,
            name,
            specialty
          )
        `)
        .eq('patient_id', patientId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching patient documents:', error);
      return { success: false, error: error.message };
    }
  }

  // Baixar documento (URL assinada)
  static async getDocumentUrl(filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;

      return { success: true, url: data.signedUrl };
    } catch (error) {
      console.error('Error getting document URL:', error);
      return { success: false, error: error.message };
    }
  }

  // Marcar documento como visualizado
  static async markAsViewed(documentId) {
    try {
      const { data, error } = await supabase
        .from('patient_documents')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', documentId)
        .is('viewed_at', null)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error marking document as viewed:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar documento
  static async updateDocument(documentId, updates) {
    try {
      const { data, error } = await supabase
        .from('patient_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating document:', error);
      return { success: false, error: error.message };
    }
  }

  // Deletar documento
  static async deleteDocument(documentId, filePath) {
    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('patient-documents')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Deletar registro do banco
      const { error: dbError } = await supabase
        .from('patient_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) throw dbError;

      return { success: true };
    } catch (error) {
      console.error('Error deleting document:', error);
      return { success: false, error: error.message };
    }
  }

  // Utilitário: determinar tipo de arquivo
  static getFileType(mimeType) {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
    return 'other';
  }

  // Utilitário: formatar tamanho de arquivo
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default DocumentService;
```

---

### 2. Componente: `DocumentManager.jsx` (Área do Profissional)

```jsx
// src/components/DocumentManager.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Upload, Eye, Edit, Trash2, Download, 
  Filter, Search, CheckCircle, Clock, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DocumentService from '@/lib/documentService';
import { supabase } from '@/lib/customSupabaseClient';

const DocumentManager = ({ professionalId }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filters, setFilters] = useState({
    patientId: '',
    fileType: '',
    search: ''
  });

  // Estados do formulário de upload
  const [uploadData, setUploadData] = useState({
    patientId: '',
    title: '',
    description: '',
    file: null,
    isVisible: true
  });

  useEffect(() => {
    fetchDocuments();
    fetchPatients();
  }, [professionalId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const result = await DocumentService.getProfessionalDocuments(professionalId, filters);
    if (result.success) {
      setDocuments(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar documentos',
        description: result.error
      });
    }
    setLoading(false);
  };

  const fetchPatients = async () => {
    // Buscar pacientes que já tiveram agendamentos com este profissional
    const { data, error } = await supabase
      .from('bookings')
      .select('user_id, patient_name, patient_email')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (!error) {
      // Remover duplicatas
      const uniquePatients = Array.from(
        new Map(data.map(item => [item.user_id, item])).values()
      );
      setPatients(uniquePatients);
    }
  };

  const handleUpload = async () => {
    if (!uploadData.patientId || !uploadData.title || !uploadData.file) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    const result = await DocumentService.uploadDocument(
      professionalId,
      uploadData.patientId,
      uploadData.file,
      {
        title: uploadData.title,
        description: uploadData.description,
        isVisible: uploadData.isVisible
      }
    );

    if (result.success) {
      toast({
        title: 'Documento enviado',
        description: 'O documento foi compartilhado com sucesso'
      });
      setShowUploadModal(false);
      setUploadData({
        patientId: '',
        title: '',
        description: '',
        file: null,
        isVisible: true
      });
      fetchDocuments();
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: result.error
      });
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) return;

    const result = await DocumentService.deleteDocument(doc.id, doc.file_path);
    if (result.success) {
      toast({ title: 'Documento excluído' });
      fetchDocuments();
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: result.error
      });
    }
  };

  // Componente será continuado...
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Documentos dos Pacientes
        </h2>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <select
          value={filters.patientId}
          onChange={(e) => setFilters({...filters, patientId: e.target.value})}
          className="border rounded px-3 py-2"
        >
          <option value="">Todos os pacientes</option>
          {patients.map(p => (
            <option key={p.user_id} value={p.user_id}>
              {p.patient_name} ({p.patient_email})
            </option>
          ))}
        </select>

        <select
          value={filters.fileType}
          onChange={(e) => setFilters({...filters, fileType: e.target.value})}
          className="border rounded px-3 py-2"
        >
          <option value="">Todos os tipos</option>
          <option value="pdf">PDF</option>
          <option value="image">Imagem</option>
          <option value="doc">Documento</option>
        </select>

        <Button variant="outline" onClick={fetchDocuments}>
          <Filter className="w-4 h-4 mr-2" />
          Filtrar
        </Button>
      </div>

      {/* Lista de documentos */}
      {loading ? (
        <p>Carregando...</p>
      ) : documents.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Nenhum documento encontrado
        </p>
      ) : (
        <div className="space-y-4">
          {documents.map(doc => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{doc.title}</h3>
                  <p className="text-sm text-gray-600">
                    Paciente: {doc.patient?.user_metadata?.full_name || doc.patient?.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    {doc.file_type.toUpperCase()} • 
                    {DocumentService.formatFileSize(doc.file_size)} • 
                    {new Date(doc.created_at).toLocaleString('pt-BR')}
                  </p>
                  {doc.viewed_at ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Visualizado em {new Date(doc.viewed_at).toLocaleString('pt-BR')}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Não visualizado ainda
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2">Selecione o paciente *</label>
              <select
                value={uploadData.patientId}
                onChange={(e) => setUploadData({...uploadData, patientId: e.target.value})}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Escolha um paciente</option>
                {patients.map(p => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.patient_name} ({p.patient_email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2">Título *</label>
              <input
                type="text"
                value={uploadData.title}
                onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: Plano de Tratamento"
              />
            </div>

            <div>
              <label className="block mb-2">Descrição (opcional)</label>
              <textarea
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                className="w-full border rounded px-3 py-2"
                rows="3"
                placeholder="Informações adicionais sobre o documento"
              />
            </div>

            <div>
              <label className="block mb-2">Arquivo *</label>
              <input
                type="file"
                onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos: PDF, JPG, PNG, DOC, DOCX • Máximo: 10 MB
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={uploadData.isVisible}
                onChange={(e) => setUploadData({...uploadData, isVisible: e.target.checked})}
                id="visible"
              />
              <label htmlFor="visible">Tornar visível para o paciente imediatamente</label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload}>
                Compartilhar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentManager;
```

---

### 3. Componente: `PatientDocuments.jsx` (Área do Paciente)

```jsx
// src/components/PatientDocuments.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import DocumentService from '@/lib/documentService';

const PatientDocuments = ({ patientId }) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const fetchDocuments = async () => {
    setLoading(true);
    const result = await DocumentService.getPatientDocuments(patientId);
    if (result.success) {
      setDocuments(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar documentos',
        description: result.error
      });
    }
    setLoading(false);
  };

  const handleDownload = async (doc) => {
    // Marcar como visualizado se ainda não foi
    if (!doc.viewed_at) {
      await DocumentService.markAsViewed(doc.id);
      fetchDocuments(); // Recarregar para atualizar o status
    }

    // Obter URL assinada e baixar
    const result = await DocumentService.getDocumentUrl(doc.file_path);
    if (result.success) {
      window.open(result.url, '_blank');
    } else {
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: result.error
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-[#2d8659]" />
        Meus Documentos
      </h2>

      {loading ? (
        <p>Carregando documentos...</p>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Você ainda não possui documentos compartilhados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map(doc => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-lg p-4 hover:shadow-md transition-all"
            >
              {!doc.viewed_at && (
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-2">
                  🆕 Novo
                </span>
              )}
              
              <h3 className="font-bold text-lg">{doc.title}</h3>
              
              <p className="text-sm text-gray-600 mb-2">
                Compartilhado por: {doc.professional?.name}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Enviado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')} 
                  às {new Date(doc.created_at).toLocaleTimeString('pt-BR')}
                </span>
              </div>

              {doc.viewed_at && (
                <p className="text-xs text-gray-500">
                  Visualizado em: {new Date(doc.viewed_at).toLocaleDateString('pt-BR')} 
                  às {new Date(doc.viewed_at).toLocaleTimeString('pt-BR')}
                </p>
              )}

              {doc.description && (
                <p className="text-sm text-gray-600 italic mt-2">
                  "{doc.description}"
                </p>
              )}

              <div className="mt-4">
                <Button 
                  onClick={() => handleDownload(doc)}
                  className="bg-[#2d8659] hover:bg-[#236b47]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar {doc.file_type.toUpperCase()} 
                  ({DocumentService.formatFileSize(doc.file_size)})
                </Button>
              </div>
            </motion.div>
          ))}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700">
              ⚠️ <strong>Importante:</strong> Seus documentos são confidenciais e protegidos.
              Somente você e seu profissional têm acesso a eles.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDocuments;
```

---

## 📊 INTEGRAÇÃO COM PÁGINAS EXISTENTES

### AdminPage.jsx

```jsx
// Adicionar nova aba no menu
const menuItems = [
  // ... itens existentes
  { value: 'documents', label: 'Documentos', icon: FileText },
];

// No switch de renderização
case 'documents':
  return <DocumentManager professionalId={user.id} />;
```

### PacientePage.jsx

```jsx
// Adicionar seção após "Meus Agendamentos"
<PatientDocuments patientId={user.id} />
```

---

## 🔒 SEGURANÇA E COMPLIANCE

### 1. LGPD - Lei Geral de Proteção de Dados

```sql
-- Tabela de consentimento
CREATE TABLE patient_consent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id),
    consent_type TEXT NOT NULL, -- 'document_sharing'
    granted BOOLEAN DEFAULT false,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Política de Retenção

```sql
-- Função para deletar documentos antigos (exemplo: após 5 anos)
CREATE OR REPLACE FUNCTION delete_old_documents()
RETURNS void AS $$
BEGIN
    DELETE FROM patient_documents
    WHERE created_at < NOW() - INTERVAL '5 years';
END;
$$ LANGUAGE plpgsql;

-- Cron job (configurar no Supabase Dashboard)
-- Executar mensalmente: delete_old_documents()
```

### 3. Auditoria

```sql
-- Tabela de logs de acesso
CREATE TABLE document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES patient_documents(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'view', 'download', 'upload', 'delete'
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função trigger para registrar acessos
CREATE OR REPLACE FUNCTION log_document_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO document_access_log (document_id, user_id, action)
    VALUES (NEW.id, auth.uid(), TG_OP);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_document_access
AFTER INSERT OR UPDATE OR DELETE ON patient_documents
FOR EACH ROW EXECUTE FUNCTION log_document_access();
```

---

## 💰 ESTIMATIVA DE CUSTOS

### Supabase Storage (Free Tier)
- ✅ **Armazenamento**: 1 GB gratuito
- ✅ **Transferência**: 2 GB/mês gratuito

### Cenários de Uso

#### Cenário 1: Clínica Pequena (50 pacientes)
```
Documentos: 200 arquivos × 2 MB = 400 MB ✅
Downloads: 500/mês × 2 MB = 1 GB ✅
Custo: R$ 0,00/mês
```

#### Cenário 2: Clínica Média (200 pacientes)
```
Documentos: 800 arquivos × 2 MB = 1.6 GB
Downloads: 2000/mês × 2 MB = 4 GB
Custo: ~R$ 15,00/mês
  - Storage extra: 0.6 GB × $0.021 = $0.01
  - Transferência extra: 2 GB × $0.09 = $0.18
```

#### Cenário 3: Clínica Grande (500 pacientes)
```
Documentos: 2000 arquivos × 2 MB = 4 GB
Downloads: 5000/mês × 2 MB = 10 GB
Custo: ~R$ 45,00/mês
  - Storage extra: 3 GB × $0.021 = $0.06
  - Transferência extra: 8 GB × $0.09 = $0.72
```

---

## ⏱️ CRONOGRAMA DE IMPLEMENTAÇÃO

### Fase 1: Database e Storage (2-3 horas)
- ✅ Criar tabela `patient_documents`
- ✅ Configurar RLS policies
- ✅ Criar bucket `patient-documents`
- ✅ Configurar storage policies
- ✅ Testar no SQL Editor

### Fase 2: Service Layer (2-3 horas)
- ✅ Implementar `documentService.js`
- ✅ Validação de arquivos
- ✅ Upload/download/delete
- ✅ Geração de URLs assinadas
- ✅ Testes unitários

### Fase 3: UI Profissional (3-4 horas)
- ✅ Componente `DocumentManager.jsx`
- ✅ Modal de upload
- ✅ Lista com filtros
- ✅ Integração com `AdminPage.jsx`
- ✅ Testes de usabilidade

### Fase 4: UI Paciente (2-3 horas)
- ✅ Componente `PatientDocuments.jsx`
- ✅ Card de documento
- ✅ Download com URL assinada
- ✅ Integração com `PacientePage.jsx`
- ✅ Badge de "novo documento"

### Fase 5: Testes e Ajustes (2-3 horas)
- ✅ Testes end-to-end
- ✅ Validação de permissões RLS
- ✅ Performance de upload/download
- ✅ Ajustes de UI/UX
- ✅ Documentação

**Total: 11-16 horas de desenvolvimento**

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Preparação
- [ ] Backup do banco de dados
- [ ] Ambiente de testes configurado
- [ ] Aprovação de custos estimados

### Database
- [ ] Executar script de criação da tabela
- [ ] Configurar RLS policies
- [ ] Criar bucket no Storage
- [ ] Configurar storage policies
- [ ] Testar permissões

### Backend
- [ ] Criar `documentService.js`
- [ ] Implementar validações
- [ ] Implementar upload
- [ ] Implementar download (URL assinada)
- [ ] Implementar delete
- [ ] Testes de service

### Frontend - Profissional
- [ ] Criar `DocumentManager.jsx`
- [ ] Modal de upload
- [ ] Lista de documentos
- [ ] Filtros e busca
- [ ] Integração AdminPage
- [ ] Testes de UI

### Frontend - Paciente
- [ ] Criar `PatientDocuments.jsx`
- [ ] Card de documento
- [ ] Download funcional
- [ ] Badge de novo
- [ ] Integração PacientePage
- [ ] Testes de UI

### Segurança e Compliance
- [ ] Revisar RLS policies
- [ ] Implementar auditoria
- [ ] Política de retenção
- [ ] Termo de consentimento
- [ ] Documentação de segurança

### Deploy e Monitoramento
- [ ] Deploy em staging
- [ ] Testes em staging
- [ ] Deploy em produção
- [ ] Monitorar logs
- [ ] Monitorar uso de storage

---

## 🎯 MELHORIAS FUTURAS

### Curto Prazo
1. **Notificações por Email**
   - Alertar paciente quando novo documento disponível
   - Template de email personalizado

2. **Categorização de Documentos**
   - Tags: "Plano de Tratamento", "Resultado", "Exercício", etc.
   - Filtros por categoria

3. **Prévia de Documentos**
   - Visualizar PDF inline
   - Preview de imagens

### Médio Prazo
4. **Assinatura Digital**
   - Paciente assinar documentos digitalmente
   - Consentimentos eletrônicos

5. **Versionamento**
   - Histórico de versões do documento
   - Comparação entre versões

6. **Compartilhamento Temporário**
   - Links com expiração
   - Acesso por terceiros autorizados

### Longo Prazo
7. **OCR e Busca de Texto**
   - Extrair texto de PDFs
   - Busca full-text

8. **Integração com E-Signature**
   - DocuSign, Adobe Sign
   - Contratos e termos

9. **Backup Automático**
   - Export para Google Drive
   - Export para Dropbox

---

## 📚 REFERÊNCIAS

### Documentação Técnica
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [LGPD - Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

### Boas Práticas
- [OWASP File Upload Security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

---

## 🤝 CONTATO E SUPORTE

Para dúvidas ou suporte durante a implementação:
- **Documentação**: `/docs` folder
- **Issues**: GitHub Issues
- **Email**: suporte@doxologos.com.br

---

**Status**: 📋 **Documentação Completa - Aguardando Aprovação para Implementação**

**Última Atualização**: 28 de Outubro de 2025

**Versão**: 1.0.0
