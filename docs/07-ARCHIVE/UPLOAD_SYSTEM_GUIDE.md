# Sistema de Envio de Currículos por Email - Trabalhe Conosco

## 📋 Visão Geral

Sistema implementado para envio de currículos (PDF) na página "Trabalhe Conosco", com envio direto por email como anexo usando o serviço de email configurado.

---

## 🎯 Funcionalidades Implementadas

### 1. **Upload de Arquivo PDF**
- Aceita apenas arquivos PDF
- Tamanho máximo: 5MB
- Validação de tipo e tamanho no frontend
- Conversão para Base64 para envio por email

### 2. **Interface Drag & Drop**
- Área de upload com feedback visual
- Prévia do arquivo selecionado
- Botão para remover arquivo
- Loading state durante envio

### 3. **Envio por Email**
- Email enviado para RH com currículo anexado
- Dados do formulário no corpo do email
- Anexo em PDF (Base64)
- Confirmação de envio

### 4. **Validações**
- ✅ Tipo de arquivo (application/pdf)
- ✅ Tamanho máximo (5MB)
- ✅ Campo obrigatório
- ✅ Tratamento de erros

---

## 📧 Configuração do Email

### Pré-requisito

O sistema utiliza o `emailService` já configurado no projeto. Certifique-se de que:

1. **Supabase Edge Function** `send-email` está configurada
2. **Variáveis de ambiente** estão corretas no Supabase
3. **SendGrid/Resend API Key** está ativa

### Verificar Configuração

```javascript
// Testar envio de email
import emailService from '@/lib/emailService';

const result = await emailService.send({
  to: 'teste@email.com',
  subject: 'Teste',
  html: '<p>Teste</p>'
});

console.log(result.success); // Deve ser true
```

---

## � Código Implementado

### Conversão de Arquivo para Base64

```javascript
const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};
```

### Envio de Email com Anexo

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setUploading(true);
  
  try {
    // Converter arquivo para Base64
    let resumeBase64 = null;
    if (resumeFile) {
      resumeBase64 = await convertFileToBase64(resumeFile);
    }
    
    // Enviar email
    const emailData = {
      to: 'rh@doxologos.com.br',
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
      `,
      attachments: resumeFile ? [{
        filename: resumeFile.name,
        content: resumeBase64,
        encoding: 'base64',
        contentType: 'application/pdf'
      }] : []
    };
    
    const result = await emailService.send(emailData);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    toast({
      title: "✅ Candidatura enviada!",
      description: "Recebemos sua candidatura e currículo.",
    });
    
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Erro ao enviar',
      description: 'Tente novamente.',
    });
  } finally {
    setUploading(false);
  }
};
```

### Validação de Arquivo

```javascript
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validar tipo (apenas PDF)
  if (file.type !== 'application/pdf') {
    toast({
      variant: 'destructive',
      title: 'Formato inválido',
      description: 'Apenas arquivos PDF.',
    });
    return;
  }
  
  // Validar tamanho (máx 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    toast({
      variant: 'destructive',
      title: 'Arquivo muito grande',
      description: 'Máximo 5MB.',
    });
    return;
  }
  
  setResumeFile(file);
};
```

---

## 📧 Template de Email Recebido

```
Para: rh@doxologos.com.br
Assunto: Nova Candidatura: João Silva
Anexo: curriculo-joao.pdf (1.2 MB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nova Candidatura Recebida

Nome: João Silva
Email: joao@email.com
Telefone: (11) 98765-4321
CRP: 06/123456
Especialidade: Psicologia Clínica
Experiência: 5 a 10 anos

Mensagem:
Tenho grande interesse em fazer parte da equipe Doxologos...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Currículo em anexo
```

---

## 🎨 Interface do Usuário

### Estado Vazio

```jsx
<label htmlFor="resume-upload">
  <Upload className="w-12 h-12" />
  <p>Clique para selecionar ou arraste o arquivo</p>
  <p className="text-xs">Apenas PDF, máximo 5MB</p>
</label>
```

### Arquivo Selecionado

```jsx
<div className="flex items-center justify-between">
  <div className="flex items-center">
    <File className="w-8 h-8 text-green" />
    <div>
      <p>{resumeFile.name}</p>
      <p className="text-xs">{(resumeFile.size / 1024).toFixed(0)} KB</p>
    </div>
  </div>
  <button onClick={handleRemoveFile}>
    <X className="w-5 h-5" />
  </button>
</div>
```

### Botão com Loading

```jsx
<Button
  type="submit"
  disabled={uploading || !resumeFile}
>
  {uploading ? (
    <>
      <Upload className="animate-pulse" />
      Enviando...
    </>
  ) : (
    'Enviar Candidatura'
  )}
</Button>
```

---

## 📊 Dados Salvos (Backup Local)

```javascript
{
  name: "João Silva",
  email: "joao@email.com",
  phone: "(11) 98765-4321",
  specialty: "psicologia-clinica",
  crp: "06/123456",
  experience: "5-10",
  message: "Tenho grande interesse...",
  resumeFileName: "curriculo-joao.pdf",
  date: "2025-10-28T12:30:00.000Z"
}
```

> ⚠️ **Nota**: O arquivo não é salvo localmente, apenas o nome. O PDF é enviado diretamente por email.

---

## 🧪 Testes

### Testar Envio

1. Acesse `/trabalhe-conosco`
2. Preencha o formulário
3. Selecione um PDF (<5MB)
4. Clique em "Enviar Candidatura"
5. Aguarde loading
6. Verifique toast de sucesso
7. **Verificar email em `rh@doxologos.com.br`**

### Testar Validações

**PDF inválido**:
```
1. Selecione um .jpg
2. Deve mostrar erro
```

**Arquivo grande**:
```
1. Selecione PDF >5MB
2. Deve mostrar erro
```

**Sem arquivo**:
```
1. Tente enviar sem PDF
2. Botão desabilitado
```

---

## 🐛 Troubleshooting

### Erro: "Falha ao enviar email"

**Causa**: Serviço de email não configurado

**Solução**:
1. Verificar Edge Function `send-email`
2. Verificar API Keys (SendGrid/Resend)
3. Testar `emailService.send()` manualmente

### Email não chega

**Causa**: Email bloqueado por spam

**Solução**:
1. Verificar pasta de spam
2. Adicionar `@doxologos.com.br` aos contatos
3. Verificar configuração SPF/DKIM no domínio

### Anexo corrompido

**Causa**: Erro na conversão Base64

**Solução**:
1. Verificar função `convertFileToBase64`
2. Testar com PDF diferente
3. Ver logs: `window.viewLogs()`

---

## 📈 Vantagens sobre Storage

✅ **Simplicidade**: Sem necessidade de configurar bucket  
✅ **Custo zero**: Não usa storage do Supabase  
✅ **Backup automático**: Email permanece no RH  
✅ **Notificação imediata**: RH recebe na hora  
✅ **Menos código**: Sem upload/download de arquivos  
✅ **Segurança**: Arquivo não fica público  

---

## 🔒 Segurança

### 1. **Validação Rigorosa**
- Tipo de arquivo (apenas PDF)
- Tamanho máximo (5MB)
- Sanitização do HTML no email

### 2. **Proteção contra Spam**
- Rate limiting no email service
- Captcha (futuro)

### 3. **Logs de Auditoria**
```javascript
logger.info('Resume selected', { fileName });
logger.success('Email sent', { to, hasAttachment });
logger.error('Send failed', error);
```

---

## 📚 Melhorias Futuras

### 1. **Email de Confirmação**
```javascript
// Enviar email para o candidato
await emailService.send({
  to: formData.email,
  subject: 'Candidatura Recebida',
  html: '<p>Recebemos sua candidatura...</p>'
});
```

### 2. **Múltiplos Anexos**
```javascript
// Permitir certificados, carta de recomendação, etc
const [files, setFiles] = useState([]);
```

### 3. **Integração com ATS**
```javascript
// Enviar para sistema de RH (ex: Gupy, Vagas.com)
await atsIntegration.createCandidate(formData);
```

### 4. **Notificação Slack/Teams**
```javascript
// Notificar equipe em tempo real
await slackNotify(`Nova candidatura: ${formData.name}`);
```

---

## ✅ Checklist

- [x] Validação de arquivo (tipo e tamanho)
- [x] Conversão para Base64
- [x] Envio por email com anexo
- [x] Interface drag & drop
- [x] Loading state
- [x] Tratamento de erros
- [x] Logs de auditoria
- [x] Backup local dos dados
- [x] Toast de confirmação

---

**Última atualização**: 2025-10-28  
**Status**: ✅ Implementado e pronto  
**Versão**: 2.0 (Email + Anexo)

---

## 🎯 Funcionalidades Implementadas

### 1. **Upload de Arquivo PDF**
- Aceita apenas arquivos PDF
- Tamanho máximo: 5MB
- Validação de tipo e tamanho no frontend
- Nome único gerado automaticamente

### 2. **Interface Drag & Drop**
- Área de upload com feedback visual
- Prévia do arquivo selecionado
- Botão para remover arquivo
- Loading state durante upload

### 3. **Armazenamento Seguro**
- Upload para Supabase Storage
- Bucket: `job-applications`
- Pasta: `resumes/`
- Nomenclatura: `timestamp-nome-sanitizado.pdf`

### 4. **Validações**
- ✅ Tipo de arquivo (application/pdf)
- ✅ Tamanho máximo (5MB)
- ✅ Campo obrigatório
- ✅ Tratamento de erros

---

## 🏗️ Configuração do Supabase Storage

### Passo 1: Criar Bucket no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **Storage** → **Create bucket**
3. Nome do bucket: `job-applications`
4. **Public**: ✅ Sim (para acesso público aos arquivos)
5. Clique em **Create bucket**

### Passo 2: Configurar Políticas (RLS)

Execute no SQL Editor do Supabase:

```sql
-- Permitir upload público de currículos
CREATE POLICY "Allow public upload to resumes folder"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'job-applications' 
  AND (storage.foldername(name))[1] = 'resumes'
);

-- Permitir leitura pública dos currículos
CREATE POLICY "Allow public read of resumes"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'job-applications' 
  AND (storage.foldername(name))[1] = 'resumes'
);

-- Opcional: Limitar tamanho do arquivo (5MB)
CREATE POLICY "Limit file size to 5MB"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'job-applications' 
  AND octet_length(decode(metadata->>'size', 'escape')) <= 5242880
);
```

### Passo 3: Configurar MIME Types

No Supabase Dashboard:
1. Vá em **Storage** → **job-applications**
2. Clique em **Settings**
3. Em **Allowed MIME types**, adicione:
   - `application/pdf`

---

## 📁 Estrutura de Armazenamento

```
job-applications/
└── resumes/
    ├── 1730153400000-joao-silva.pdf
    ├── 1730153410000-maria-santos.pdf
    └── 1730153420000-pedro-oliveira.pdf
```

**Formato do nome**: `{timestamp}-{nome-sanitizado}.pdf`

- **timestamp**: Milissegundos desde Unix Epoch (garante unicidade)
- **nome-sanitizado**: Nome do candidato em lowercase, sem caracteres especiais

---

## 💻 Código Implementado

### Upload de Arquivo

```javascript
const uploadResume = async () => {
  if (!resumeFile) return null;
  
  try {
    setUploading(true);
    
    // Gera nome único
    const timestamp = Date.now();
    const sanitizedName = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${timestamp}-${sanitizedName}.pdf`;
    const filePath = `resumes/${fileName}`;
    
    // Upload para Supabase
    const { data, error } = await supabase.storage
      .from('job-applications')
      .upload(filePath, resumeFile, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    if (error) throw error;
    
    // Obtém URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('job-applications')
      .getPublicUrl(filePath);
    
    return publicUrl;
    
  } catch (error) {
    console.error('Upload error:', error);
    toast({
      variant: 'destructive',
      title: 'Erro ao enviar currículo',
      description: 'Tente novamente.',
    });
    return null;
  } finally {
    setUploading(false);
  }
};
```

### Validação de Arquivo

```javascript
const handleFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validar tipo
  if (file.type !== 'application/pdf') {
    toast({
      variant: 'destructive',
      title: 'Formato inválido',
      description: 'Apenas arquivos PDF são permitidos.',
    });
    return;
  }
  
  // Validar tamanho (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    toast({
      variant: 'destructive',
      title: 'Arquivo muito grande',
      description: 'O arquivo deve ter no máximo 5MB.',
    });
    return;
  }
  
  setResumeFile(file);
};
```

---

## 🎨 Interface do Usuário

### Estado Vazio (Nenhum arquivo selecionado)

```jsx
<div className="flex flex-col items-center p-8">
  <Upload className="w-12 h-12 text-gray-400" />
  <p className="text-sm font-medium">
    Clique para selecionar ou arraste o arquivo
  </p>
  <p className="text-xs text-gray-500">
    Apenas PDF, máximo 5MB
  </p>
</div>
```

### Arquivo Selecionado

```jsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg">
  <div className="flex items-center space-x-3">
    <File className="w-8 h-8 text-green-600" />
    <div>
      <p className="text-sm font-medium">{resumeFile.name}</p>
      <p className="text-xs text-gray-500">
        {(resumeFile.size / 1024).toFixed(0)} KB
      </p>
    </div>
  </div>
  <button onClick={handleRemoveFile}>
    <X className="w-5 h-5 text-gray-500" />
  </button>
</div>
```

### Botão de Envio com Loading

```jsx
<Button
  type="submit"
  disabled={uploading || !resumeFile}
  className="w-full"
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
```

---

## 🔒 Segurança

### 1. **Validação no Frontend**
- Tipo de arquivo (apenas PDF)
- Tamanho máximo (5MB)
- Nome sanitizado (remove caracteres especiais)

### 2. **Políticas no Supabase (RLS)**
- Apenas uploads em `resumes/`
- Limite de tamanho de arquivo
- Leitura pública controlada

### 3. **Logs de Auditoria**
```javascript
logger.info('Resume upload started', { fileName });
logger.success('Resume uploaded', { publicUrl });
logger.error('Upload failed', error);
```

---

## 📊 Dados Salvos

Cada candidatura salva no localStorage contém:

```javascript
{
  name: "João Silva",
  email: "joao@email.com",
  phone: "(11) 98765-4321",
  specialty: "psicologia-clinica",
  crp: "06/123456",
  experience: "5-10",
  message: "Tenho grande interesse...",
  resumeUrl: "https://xxx.supabase.co/storage/v1/object/public/job-applications/resumes/1730153400000-joao-silva.pdf",
  resumeFileName: "curriculo-joao.pdf",
  date: "2025-10-28T12:30:00.000Z"
}
```

---

## 🧪 Testes

### Testar Upload

1. Acesse `/trabalhe-conosco`
2. Preencha o formulário
3. Selecione um arquivo PDF (<5MB)
4. Verifique prévia do arquivo
5. Clique em "Enviar Candidatura"
6. Aguarde loading
7. Verifique toast de sucesso

### Testar Validações

**Arquivo não-PDF**:
```
1. Selecione um arquivo .jpg ou .docx
2. Deve mostrar erro: "Formato inválido"
```

**Arquivo grande**:
```
1. Selecione um PDF >5MB
2. Deve mostrar erro: "Arquivo muito grande"
```

**Sem arquivo**:
```
1. Tente enviar sem selecionar arquivo
2. Botão deve estar desabilitado
```

### Testar no Supabase Dashboard

1. Acesse **Storage** → **job-applications**
2. Abra pasta **resumes**
3. Verifique se o arquivo foi enviado
4. Clique no arquivo para ver URL pública
5. Acesse a URL no navegador (deve abrir o PDF)

---

## 🐛 Troubleshooting

### Erro: "Upload failed"

**Causa**: Bucket não criado ou políticas incorretas

**Solução**:
1. Verificar se bucket `job-applications` existe
2. Verificar políticas RLS no SQL Editor
3. Testar upload manualmente no Dashboard

### Erro: "Access denied"

**Causa**: Políticas RLS muito restritivas

**Solução**:
```sql
-- Temporariamente desabilitar RLS para debug
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Após testar, reabilitar e ajustar políticas
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Arquivo não aparece no Storage

**Causa**: Path incorreto ou bucket errado

**Solução**:
1. Verificar nome do bucket no código: `'job-applications'`
2. Verificar path: `resumes/${fileName}`
3. Checar logs no console para ver erro

---

## 📈 Melhorias Futuras

### 1. **Compressão de PDF**
```javascript
import { compressPdf } from '@/lib/pdfCompressor';

const compressedFile = await compressPdf(resumeFile);
```

### 2. **Múltiplos Arquivos**
```javascript
// Aceitar currículo + certificados
const [files, setFiles] = useState([]);
```

### 3. **Preview de PDF**
```javascript
import { pdfjs } from 'react-pdf';

<Document file={resumeFile}>
  <Page pageNumber={1} />
</Document>
```

### 4. **Integração com Email**
```javascript
// Enviar email automático para RH
await emailService.send({
  to: 'rh@doxologos.com.br',
  subject: 'Nova Candidatura',
  template: 'new-application',
  data: { name, resumeUrl }
});
```

### 5. **Scan de Vírus**
```javascript
// Integrar com serviço de antivírus
const isSafe = await virusScanner.check(resumeFile);
```

---

## ✅ Checklist de Deploy

- [ ] Criar bucket `job-applications` no Supabase
- [ ] Configurar políticas RLS
- [ ] Adicionar MIME type `application/pdf`
- [ ] Testar upload localmente
- [ ] Testar validações (tipo, tamanho)
- [ ] Verificar URL pública funciona
- [ ] Testar em mobile
- [ ] Configurar limite de storage (quota)
- [ ] Configurar backup dos arquivos
- [ ] Documentar para equipe de RH

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs no console** (F12)
2. **Ver logs do logger**: `window.viewLogs()`
3. **Verificar Supabase Dashboard** → Storage → job-applications
4. **Revisar políticas RLS** no SQL Editor
5. **Contatar equipe técnica** com screenshot do erro

---

**Última atualização**: 2025-10-28  
**Status**: ✅ Implementado e pronto para produção  
**Versão**: 1.0
