# 📖 Guia Operacional — Transmissão de Eventos para 1.000+ Pessoas (Custo R$ 0,00)

Guia passo a passo para criar, configurar e transmitir eventos ao vivo na plataforma Doxologos utilizando o **YouTube Live Não Listado (Embed)** com capacidade ilimitada, zero custo de software e rastreabilidade total de presença dos participantes.

---

## 🎯 Por que usamos esta solução?

- 💰 **Custo**: **R$ 0,00 (100% Gratuito)** — Elimina a necessidade de licenças pagas do Zoom Webinar (R$ 927+/ano).
- 👥 **Capacidade**: **Ilimitada** (Suporta 1.000, 5.000 ou 10.000+ inscritos simultâneos sem queda ou travamentos).
- 🛡️ **Segurança**: A live é configurada como **Não Listada** e é exibida **exclusivamente dentro do site da Doxologos** para alunos/participantes autenticados e com inscrição confirmada.
- 📊 **Presença**: O sistema de presença e tempo de tela da Doxologos registra automaticamente quem assistiu ao evento.

---

## 🚀 Passo a Passo Completo

---

### Passo 1: Criar a Transmissão no YouTube Studio (5 minutos)

1. Acesse o [YouTube Studio](https://studio.youtube.com) da conta Doxologos.
2. No canto superior direito, clique em **Criar ➕** > **Transmitir ao vivo 🔴**.
3. Escolha **Agendar transmissão**.
4. Preencha as informações do evento:
   - **Título**: Nome do evento / workshop.
   - **Visibilidade**: Selecione **"Não Listado" (Unlisted)**. *(⚠️ NUNCA selecione "Público" para eventos pagos/restritos).*
   - **Categoria**: Pessoas e Blogs / Educação.
   - **Miniatura (Thumbnail)**: Imagem de capa do evento.
5. Na aba de **Configurações da Transmissão**:
   - Marque a opção **"Permitir incorporação" (Allow embedding)**.
6. Copie a URL do vídeo gerado (exemplo: `https://www.youtube.com/watch?v=abc123XYZ00` ou `https://youtu.be/abc123XYZ00`).

---

### Passo 2: Cadastrar o Link no Painel de Admin da Doxologos

1. Acesse a área administrativa da Doxologos (`/admin` -> aba **Eventos**).
2. Edite o evento desejado ou crie um novo evento.
3. No campo **Link da Sala / Videoconferência** (`meeting_link`), cole a URL do YouTube gerada no Passo 1.
4. Salve as alterações.

> 💡 **Como o sistema se comporta**:
> A plataforma Doxologos detectará automaticamente que o link pertence ao YouTube e exibirá o **Player de Vídeo Embutido** diretamente dentro da Área do Paciente/Inscrito, ativando os pings automáticos de presença!

---

### Passo 3: Configurar a Transmissão (OBS Studio ou StreamYard)

Você pode transmitir usando o **OBS Studio** (instalado no computador) ou o **StreamYard** (direto no navegador).

#### Opção A: Usando o StreamYard (Mais Simples — Direto no Navegador)
1. Acesse [streamyard.com](https://streamyard.com) (Versão Grátis).
2. Adicione o seu canal do YouTube como Destino.
3. Entre no estúdio virtual, ative sua câmera, microfone e compartilhe sua apresentação de slides.
4. Clique em **"Entrar ao vivo" (Go Live)** na hora do evento.

#### Opção B: Usando o OBS Studio (Mais Avançado / Profissional)
1. Baixe e abra o [OBS Studio](https://obsproject.com/) (Grátis).
2. Vá em **Configurações** > **Transmissão**.
3. Selecione o serviço **YouTube - RTMPS**.
4. No YouTube Studio, copie a **Chave de Transmissão (Stream Key)** e cole no OBS.
5. No OBS, adicione suas fontes: **Dispositivo de Captura de Vídeo** (Sua WebCam) e **Captura de Tela/Janela** (Seus Slides).
6. Clique em **"Iniciar Transmissão"** no OBS.

---

### Passo 4: No Dia do Evento (Operação em Tempo Real)

1. **15 minutos antes**:
   - Abra o OBS Studio / StreamYard e inicie a transmissão com uma tela de espera ("O evento começará em breve...").
   - Acesse a Área do Aluno na Doxologos para confirmar que o player está carregando o vídeo corretamente.
2. **No horário marcado**:
   - Inicie a apresentação e a aula.
3. **Ao finalizar**:
   - Encerre a transmissão no OBS / StreamYard e no YouTube Studio.
   - O YouTube processará automaticamente o vídeo da gravação, mantendo-o disponível para replay na própria plataforma Doxologos caso desejado!

---

## ❓ Perguntas Frequentes & Resolução de Problemas

#### 1. E se alguém tentar compartilhar a URL do YouTube?
A transmissão é "Não Listada" e o participante precisa fazer login na Doxologos para ver a tela do player com o chat/presença. Caso queira restrição ainda maior de domínio, pode-se usar o Vimeo OTT.

#### 2. Os participantes conseguem falar por microfone?
Não. Em eventos de 1.000 pessoas, a interação dos participantes ocorre via chat/perguntas. Isso garante áudio cristalino sem interrupções de microfones acidentalmente abertos.

#### 3. Como sei quem realmente participou do evento?
A Doxologos registra os dados automaticamente na tabela `presenca_eventos` (disponível no relatório do painel admin), informando a hora de entrada, hora de saída e o tempo total assistido por cada participante.
