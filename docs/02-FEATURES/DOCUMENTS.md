# 📄 Sistema de Documentos - Doxologos

Este documento consolida informações sobre o sistema de upload e gestão de documentos de pacientes.

---

## 🎯 Visão Geral

O sistema permite:
- ✅ Upload de documentos por pacientes
- ✅ Visualização por profissionais
- ✅ Armazenamento seguro no Supabase Storage
- ✅ Controle de acesso via RLS
- ✅ Suporte a múltiplos formatos

---

## 📁 Tipos de Documentos Suportados

### Formatos Aceitos
- **Imagens**: JPG, PNG, WebP (max 5MB)
- **PDFs**: PDF (max 10MB)
- **Documentos**: DOC, DOCX (max 10MB)

### Categorias
- Exames médicos
- Laudos
- Receitas
- Documentos pessoais
- Outros

---

## 🗄️ Estrutura do Banco

### Tabela: patient_documents
```sql
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id),
  professional_id UUID REFERENCES professionals(id),
  booking_id UUID REFERENCES bookings(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  category TEXT,
  description TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_professional ON patient_documents(professional_id);
```

### RLS Policies
```sql
-- Pacientes veem apenas seus documentos
CREATE POLICY "Users can view own documents" ON patient_documents
  FOR SELECT USING (auth.uid() = patient_id);

-- Profissionais veem documentos de seus pacientes
CREATE POLICY "Professionals can view patient documents" ON patient_documents
  FOR SELECT USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = patient_documents.booking_id 
      AND bookings.professional_id = auth.uid()
    )
  );

-- Pacientes podem fazer upload
CREATE POLICY "Users can upload own documents" ON patient_documents
  FOR INSERT WITH CHECK (auth.uid() = patient_id);
```

---

## 📤 Upload de Documentos

### Frontend
```jsx
const UploadDocument = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      // 1. Upload para Storage
      const filePath = `${userId}/${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('patient-documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Criar registro no banco
      const { data, error } = await supabase
        .from('patient_documents')
        .insert({
          patient_id: userId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          category: selectedCategory
        });

      if (error) throw error;

      alert('Documento enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Enviando...' : 'Enviar Documento'}
      </button>
    </div>
  );
};
```

### Validação
```javascript
const validateFile = (file) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande (máx 10MB)');
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Tipo de arquivo não suportado');
  }

  return true;
};
```

---

## 📥 Download de Documentos

### Gerar URL Assinada
```javascript
const downloadDocument = async (filePath) => {
  const { data, error } = await supabase.storage
    .from('patient-documents')
    .createSignedUrl(filePath, 60); // Expira em 60 segundos

  if (error) {
    console.error('Erro ao gerar URL:', error);
    return;
  }

  // Abrir em nova aba
  window.open(data.signedUrl, '_blank');
};
```

### Visualização Inline
```jsx
const DocumentViewer = ({ document }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const loadUrl = async () => {
      const { data } = await supabase.storage
        .from('patient-documents')
        .createSignedUrl(document.file_path, 3600);
      setUrl(data?.signedUrl);
    };
    loadUrl();
  }, [document]);

  if (!url) return <Spinner />;

  if (document.file_type.startsWith('image/')) {
    return <img src={url} alt={document.file_name} />;
  }

  if (document.file_type === 'application/pdf') {
    return <iframe src={url} width="100%" height="600px" />;
  }

  return <a href={url} download>Baixar {document.file_name}</a>;
};
```

---

## 🔒 Segurança

### Storage Policies
```sql
-- Bucket: patient-documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Professionals can view patient documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents' AND
  EXISTS (
    SELECT 1 FROM patient_documents pd
    WHERE pd.file_path = name
    AND pd.professional_id = auth.uid()
  )
);
```

### Sanitização de Nomes
```javascript
const sanitizeFileName = (fileName) => {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_');
};
```

---

## 📊 Gestão de Documentos (Admin)

### Listar Documentos
```jsx
const DocumentList = ({ patientId }) => {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const fetchDocuments = async () => {
      const { data } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('uploaded_at', { ascending: false });
      setDocuments(data);
    };
    fetchDocuments();
  }, [patientId]);

  return (
    <div className="document-list">
      {documents.map(doc => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
};
```

### Deletar Documento
```javascript
const deleteDocument = async (documentId, filePath) => {
  // 1. Deletar do storage
  const { error: storageError } = await supabase.storage
    .from('patient-documents')
    .remove([filePath]);

  if (storageError) throw storageError;

  // 2. Deletar do banco
  const { error: dbError } = await supabase
    .from('patient_documents')
    .delete()
    .eq('id', documentId);

  if (dbError) throw dbError;
};
```

---

## 📋 Checklist de Implementação

### Setup Inicial
- [x] Bucket criado no Supabase Storage
- [x] Tabela patient_documents criada
- [x] RLS policies configuradas
- [x] Storage policies configuradas

### Frontend
- [x] Componente de upload
- [x] Validação de arquivo
- [x] Progress indicator
- [x] Visualizador de documentos
- [x] Lista de documentos

### Segurança
- [x] Validação de tipo de arquivo
- [x] Validação de tamanho
- [x] Sanitização de nomes
- [x] URLs assinadas (tempo limitado)
- [x] Controle de acesso via RLS

---

## 🚀 Melhorias Futuras

- [ ] Compressão automática de imagens
- [ ] OCR para extrair texto de PDFs
- [ ] Categorização automática via IA
- [ ] Notificações quando novo documento é enviado
- [ ] Versionamento de documentos
- [ ] Compartilhamento temporário com terceiros

---

**Última atualização**: 30 de Dezembro de 2025
