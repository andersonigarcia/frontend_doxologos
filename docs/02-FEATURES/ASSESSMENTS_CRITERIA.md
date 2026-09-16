# 📋 Critérios Clínicos, Psicométricos e Regulatórios de Autoavaliações (GAD-7)

> **Documento Oficial de Engenharia & Prática Clínica Doxologos**  
> **Versão:** 1.0  
> **Data:** 2026-08-15  
> **Status:** Ativo / Produção  
> **Responsáveis:** Squad Multiagente Doxologos (Especialistas em Produto, Clínica e Engenharia)

---

## 1. 🎯 Objetivo do Documento

Este documento estabelece a base científica, os critérios de pontuação, faixas de corte clínico (*cut-off points*), protocolos de conformidade ética (CFP/LGPD) e diretrizes de acolhimento para o motor de autoavaliações psicométricas da Doxologos, com foco inicial no **GAD-7 (Generalized Anxiety Disorder-7)** e escalabilidade para futuros instrumentos (Burnout, PHQ-9, Escala de Estresse Percebido).

---

## 2. 🔬 Fundamentação Científica do GAD-7

O **GAD-7** é um dos instrumentos de triagem psicométrica mais validados internacionalmente e amplamente utilizado na atenção primária e especializada em saúde mental.

* **Referência Original:** Spitzer RL, Kroenke K, Williams JBW, Löwe B. *A Brief Measure for Assessing Generalized Anxiety Disorder: The GAD-7*. Arch Intern Med. 2006;166(10):1092–1097.
* **Validação no Brasil:** Moreno AL, DeSousa DA, Souza AMFP, et al. *Factor structure, reliability, and item response theory of the Brazilian version of the Generalized Anxiety Disorder 7-item (GAD-7) questionnaire*. Trends Psychiatry Psychother. 2016.
* **Janela Temporal de Avaliação:** **"Nas últimas 2 semanas"**.
* **Constructo Avaliado:** Frequência dos 7 principais sintomas nucleares do Transtorno de Ansiedade Generalizada (TAG) conforme os critérios do DSM-5 e CID-11.

---

## 3. 🔢 Escala Likert e Pontuação

Cada uma das 7 questões é pontuada em uma escala Likert de 4 pontos (0 a 3):

| Opção | Significado Clínico | Valor Numérico |
| :--- | :--- | :---: |
| **Nenhuma vez** | Sintoma ausente no período | **0** |
| **Vários dias** | Presença esporádica (< 50% dos dias) | **1** |
| **Mais da metade dos dias** | Presença frequente ( $\ge$ 50% dos dias) | **2** |
| **Quase todos os dias** | Presença persistente/diária | **3** |

* **Pontuação Mínima:** 0 pontos
* **Pontuação Máxima:** 21 pontos

$$\text{Score Total} = \sum_{i=1}^{7} \text{Item}_i \quad (0 \le \text{Score} \le 21)$$

---

## 4. 📊 Faixas de Corte Clínico (*Cut-Off Points*) e Diretrizes de Ação

| Faixa de Score | Classificação de Gravidade | Código do Sistema (`severity`) | Cor / Tag Visual | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 4** | **Ansiedade Mínima** | `minimal` | 🟢 Verde (`#10b981`) | **Normalidade Populacional:** Sintomas dentro do padrão esperado de adaptação cotidiana. <br>**Conduta:** Psicoeducação preventiva, higiene do sono, práticas regulares de autocuidado e oração/meditação reflexiva. |
| **5 a 9** | **Ansiedade Leve** | `mild` | 🟡 Amarelo (`#eab308`) | **Sintomatologia Subclínica:** Sintomas presentes, porém sem prejuízo funcional grave. <br>**Conduta:** Monitoramento de gatilhos emocionais, exercícios de respiração diafragmática, organização da rotina e reavaliação periódica. |
| **10 a 14** | **Ansiedade Moderada** | `moderate` | 🟠 Laranja (`#f97316`) | **Ponto de Corte Clínico (Cut-off = 10):** Sensibilidade de 89% e especificidade de 82% para identificação de TAG. <br>**Conduta:** Indicação de acompanhamento psicoterapêutico estruturado (como a Terapia Cognitivo-Comportamental). |
| **15 a 21** | **Ansiedade Severa** | `severe` | 🔴 Vermelho (`#ef4444`) | **Quadro Clínico Significativo:** Alto nível de sofrimento psíquico com impacto funcional evidente. <br>**Conduta:** Recomendação imediata de avaliação multiprofissional (Psicologia Clínica + Avaliação Médica/Psiquiátrica). |

---

## 5. 🧩 Pergunta Suplementar de Impacto Funcional

Após os 7 itens clínicos, o teste inclui uma pergunta de impacto global na rotina:
> *"Se você assinalou qualquer problema neste teste, qual foi o nível de dificuldade que esses sintomas trouxeram para o seu trabalho, tarefas de casa ou para lidar com outras pessoas?"*

* **Opções de Resposta:**
  * `0` = Nenhuma dificuldade
  * `1` = Um pouco difícil
  * `2` = Muito difícil
  * `3` = Extremamente difícil
* **Regra de Cálculo:** O impacto funcional **NÃO** é somado ao score de 0-21 do GAD-7, mas é gravado no banco de dados (`functional_impact`) e exibido no prontuário/CRM para qualificar a urgência do atendimento.

---

## 6. ⚖️ Conformidade Ética e Legal (CFP & LGPD)

### 6.1 Resolução do Conselho Federal de Psicologia (CFP)
1. **Caráter Psicoeducativo:** A autoavaliação online é explicitamente classificada como ferramenta de triagem e psicoeducação.
2. **Vedação de Diagnóstico Automatizado:** A plataforma **não emite diagnóstico clínico fechado** nem prescreve tratamentos de forma autônoma.
3. **Disclaimer Obrigatório em todas as Telas e E-mails:**
   > *"Aviso Legal & Ético (Conselho Federal de Psicologia): Esta ferramenta possui finalidade exclusivamente educativa e informativa de autoavaliação e não substitui a consulta, diagnóstico ou acompanhamento com um profissional psicólogo ou médico."*

### 6.2 Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)
* **Finalidade e Consentimento:** O usuário autoriza expressamente o envio do relatório para seu e-mail/WhatsApp (`lgpd_consent = true`).
* **Segurança de Dados Sensíveis:** As respostas são protegidas por criptografia em repouso e políticas de **Row Level Security (RLS)** restritas a psicólogos e administradores.
* **Sanitização de Contato:** Telefones normalizados no formato internacional **E.164** (`+55...`) e e-mails validados e em caixa baixa.

---

## 7. 🌿 Integração de Fé e Ciência (Abordagem Doxologos)

A Doxologos adota uma visão integral do ser humano (biopsicossocial e espiritual). Em cada faixa de resultado:
* A experiência valida o sofrimento psíquico sem culpabilização religiosa.
* Promove uma ponte reflexiva que une o amparo espiritual (ex: Filipenses 4:6-7) com a responsabilidade e a bênção de buscar auxílio clínico e psicoterapêutico especializado.

---

---

## 8. 🔥 Inventário de Burnout e Sobrecarga Emocional

### 8.1 Fundamentação Científica
Baseado no modelo multidimensional consagrado de **Maslach (MBI - Maslach Burnout Inventory)** e na definição da **CID-11 (Código QD85 - Síndrome de Burnout)**, avaliando as 3 dimensões essenciais do esgotamento:
1. **Exaustão Emocional e Física:** Esgotamento de energia e fadiga crônica não restaurada pelo repouso.
2. **Despersonalização / Cinismo:** Distanciamento afetivo, frieza, irritabilidade e perda de empatia nas relações e trabalho.
3. **Redução da Eficácia & Realização Pessoal:** Sensação de incapacidade, insuficiência e perda de propósito ocupacional.

* **Janela Temporal:** **"Nas últimas 4 semanas"**.
* **Número de Itens:** 10 questões psicométricas cobrindo as 3 dimensões nucleares + sintomas psicossomáticos e cognitivos.
* **Escala Likert (0 a 3):**
  * `0` = Nunca ou Raramente (Menos de 1x por semana)
  * `1` = Às vezes (1 a 2x por semana)
  * `2` = Frequentemente (3 a 4x por semana)
  * `3` = Quase sempre ou Diariamente (Todos os dias úteis)
* **Score Total:** Varia de **0 a 30 pontos**.

### 8.2 Faixas de Corte Clínico (*Cut-Off Points*) - Burnout

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 9** | **Equilíbrio & Resiliência** | `minimal` | 🟢 Verde (`#10b981`) | **Faixa Saudável:** Boa capacidade adaptativa e recuperação. Preservar rotinas de desconexão digital e descanso. |
| **10 a 17** | **Sobrecarga Inicial** | `mild` | 🟡 Amarelo (`#eab308`) | **Alerta Amarelo:** Fadiga cumulativa. Momento crucial para estabelecer limites, reorganizar demandas e evitar a cronificação. |
| **18 a 24** | **Risco Elevado de Burnout** | `moderate` | 🟠 Laranja (`#f97316`) | **Esgotamento Moderado:** Padrão significativo de exaustão e cinismo. Indicação formal de psicoterapia clínica e revisão de sobrecarga. |
| **25 a 30** | **Síndrome de Burnout** | `severe` | 🔴 Vermelho (`#ef4444`) | **Esgotamento Severo / Crítico (CID-11 QD85):** Comprometimento neurobiológico e funcional grave. Necessidade urgente de acolhimento psicológico e avaliação médica. |

---

---

## 9. 🌧️ Escala de Depressão e Humor (PHQ-9)

### 9.1 Fundamentação Científica
O **PHQ-9 (Patient Health Questionnaire-9)** é o instrumento padrão-ouro global para rastreio e monitoramento da gravidade de episódios depressivos, mapeando diretamente os 9 critérios do DSM-5 e CID-11:
1. **Anedonia:** Perda de interesse ou prazer nas atividades usuais.
2. **Humor Deprimido:** Tristeza, vazio, desânimo ou sensação de desesperança.
3. **Sono:** Insônia inicial/terminal ou hipersonia.
4. **Fadiga & Vitalidade:** Cansaço crônico ou falta de energia motora.
5. **Apetite & Peso:** Hiporexia ou hiperfagia compensatória.
6. **Autoconceito & Culpa:** Sentimento de inadequação, fracasso ou autoacusação.
7. **Cognição & Atenção:** Dificuldade de foco, leitura ou tomada de decisão.
8. **Psicomotricidade:** Lentificação motora evidente ou agitação psicomotora.
9. **Ideação:** Pensamentos de finitude ou autolesão (Gatilho de Protocolo de Crise).

* **Referência:** Kroenke K, Spitzer RL, Williams JB. *The PHQ-9: validity of a brief depression severity measure*. J Gen Intern Med. 2001;16(9):606-613.
* **Janela Temporal:** **"Nas últimas 2 semanas"**.
* **Número de Itens:** 9 questões em escala Likert (0 a 3).
* **Score Total:** Varia de **0 a 27 pontos**.

### 9.2 Faixas de Corte Clínico (*Cut-Off Points*) - PHQ-9

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 4** | **Depressão Mínima ou Ausente** | `minimal` | 🟢 Verde (`#10b981`) | **Normalidade:** Ausência de sintomatologia relevante. Manter hábitos de sono, exercício e comunhão. |
| **5 a 9** | **Sintomas Depressivos Leves** | `mild` | 🟡 Amarelo (`#eab308`) | **Atenção Preventiva:** Desânimo reativo ou passageiro. Acolhimento, pequenas metas e reavaliação. |
| **10 a 14** | **Depressão Moderada** | `moderate` | 🟠 Laranja (`#f97316`) | **Ponto de Corte Clínico (Cut-off $\ge$ 10):** Sensibilidade de 88% e especificidade de 88%. Indicação de psicoterapia formal (TCC / Ativação Comportamental). |
| **15 a 27** | **Depressão Severa / Profunda** | `severe` | 🔴 Vermelho (`#ef4444`) | **Quadro Clínico Grave:** Sofrimento psíquico expressivo. Demanda avaliação multiprofissional urgente (Psicoterapia + Psiquiatria). |

### 9.3 Protocolo de Apoio a Crises (Item 9)
Quando o usuário pontua no item 9 (ideação/pensamentos de morte), o sistema exibe automaticamente orientações de apoio acolhedor com indicação direta do **CVV (188 - Centro de Valorização da Vida)**, além do CTA prioritário para suporte terapêutico.

---

---

## 10. ⚡ Escala de Rastreio de TDAH em Adultos (ASRS-18)

### 10.1 Fundamentação Científica
Desenvolvida pelo Grupo de Trabalho da **Organização Mundial da Saúde (OMS)** em conjunto com a **Harvard Medical School** e a **New York University**, alinhada aos critérios de Transtorno do Déficit de Atenção e Hiperatividade (TDAH) do DSM-5 e CID-11 (Código 6A05).
* **Referência Original:** Kessler RC, Adler L, Ames M, et al. *The World Health Organization Adult ADHD Self-Report Scale (ASRS)*. Psychol Med. 2005;35(2):245-256.
* **Validação Brasileira:** Mattos P, Segenreich D, Saboya E, et al. *Adaptação transcultural para o português da escala Adult ADHD Self-Report Scale*. Rev Psiquiatr Clín. 2006.
* **Estrutura:** 18 questões divididas em duas dimensões nucleares:
  1. **Desatenção & Disfunção Executiva (Itens 1 a 4, 7 a 11):** Procrastinação, perda de prazos, distratibilidade e memória de trabalho.
  2. **Hiperatividade & Impulsividade (Itens 5, 6, 12 a 18):** Inquietação motora e mental, precipitação e dificuldade de autorregulação.
* **Escala Likert (0 a 4):**
  * `0` = Nunca (0% do tempo)
  * `1` = Raramente
  * `2` = Às vezes
  * `3` = Frequentemente
  * `4` = Muito frequentemente (Quase todos os dias)
* **Score Total:** Varia de **0 a 72 pontos**.

### 10.2 Faixas de Corte Clínico (*Cut-Off Points*) - ASRS-18

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 23** | **Padrão Neurotípico** | `minimal` | 🟢 Verde (`#10b981`) | **Baixa Probabilidade:** Regulação atencional típica. Manter rotinas de higiene do sono e pausas. |
| **24 a 39** | **Sinais Leves de Desatenção** | `mild` | 🟡 Amarelo (`#eab308`) | **Atenção Moderada:** Desafios de dispersão ou sobrecarga ambiental. Ajustes de ambiente e foco (técnica Pomodoro). |
| **40 a 53** | **Alta Probabilidade de TDAH** | `moderate` | 🟠 Laranja (`#f97316`) | **Rastreio Positivo:** Perfil clínico compatível com TDAH no adulto. Indicação formal de avaliação neuropsicológica / psicológica e TCC. |
| **54 a 72** | **Forte Indicação Clínica de TDAH** | `severe` | 🔴 Vermelho (`#ef4444`) | **Alto Impacto Funcional:** Prejuízo persistente na rotina e carreira. Demanda avaliação multidisciplinar prioritária (Psicologia + Neurologia/Psiquiatria). |

---

---

## 11. ✨ Inventário de Culpa, Perfeccionismo e Saúde Espiritual

### 11.1 Fundamentação Científica & Teológica
Instrumento exclusivo desenvolvido pela **Doxologos**, embasado na literatura clínica de **Escrupulosidade (Penn Inventory of Scrupulosity - PIOS)**, **Perfeccionismo Multidimensional (Frost et al. - FMPS)** e Psicologia da Religião.
* **Objetivo:** Avaliar a distinção entre a vivência saudável da fé (baseada na graça, amor, paz e propósito) e a vivência disfuncional (marcada por ansiedade moral obsessiva, medo irracional de punição, autocobrança implacável e culpa tóxica).
* **Estrutura:** 12 questões clínicas avaliando:
  1. Culpa Tóxica & Medo Irracional
  2. Dificuldade de Autoperdão & Ruminação
  3. Perfeccionismo Religioso & Exaustão
  4. Medo de Punição & Imagem Distorcida de Deus
  5. Culpa por Descansar
  6. Comparação & Inferioridade Espiritual
  7. Estigma da Fragilidade Emocional
  8. Ansiedade Ritualística & Retraimento por Vergonha
  9. Negação dos Limites Humanos & Merecimento
* **Escala Likert (0 a 3):**
  * `0` = Raramente ou Nunca
  * `1` = Às vezes
  * `2` = Frequentemente
  * `3` = Quase sempre
* **Score Total:** Varia de **0 a 36 pontos**.

### 11.2 Faixas de Corte Clínico (*Cut-Off Points*) - Saúde Espiritual

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 9** | **Fé Saudável, Graça e Paz Interior** | `minimal` | 🟢 Verde (`#10b981`) | **Espiritualidade Saudável:** A fé atua como fator de proteção e resiliência. Manter práticas integradas de autocuidado e comunhão. |
| **10 a 18** | **Autocobrança & Culpa Esporádica** | `mild` | 🟡 Amarelo (`#eab308`) | **Atenção & Alinhamento:** Tendência a perfeccionismo em fases de estresse. Praticar o autoperdão e resgatar a leveza da graça. |
| **19 a 27** | **Perfeccionismo Religioso & Sobrecarga Moral** | `moderate` | 🟠 Laranja (`#f97316`) | **Sobrecarga Emocional:** A vivência da fé gera ansiedade e desgaste psíquico. Indicação de psicoterapia integrativa (fé + ciência). |
| **28 a 36** | **Escrupulosidade & Angústia Espiritual Severa** | `severe` | 🔴 Vermelho (`#ef4444`) | **Sofrimento Psíquico Grave:** Hipervigilância moral obsessiva e culpa paralisante. Demanda acolhimento psicoterapêutico especializado com urgência. |

---

---

## 12. 🌙 Índice de Qualidade do Sono e Insônia (ISI)

### 12.1 Fundamentação Científica
O **Insomnia Severity Index (ISI)** é o padrão-ouro internacional para triagem e mensuração da gravidade da insônia, amplamente recomendado pela *American Academy of Sleep Medicine (AASM)* e validado no Brasil (*Castro et al., 2009*).
* **Referência Original:** Bastien CH, Vallières A, Morin CM. *Validation of the Insomnia Severity Index as an outcome measure for insomnia research*. Sleep Med. 2001;2(4):297-307.
* **Janela Temporal:** **"Nas últimas 2 semanas"**.
* **Estrutura:** 7 questões clínicas avaliando:
  1. Dificuldade de início do sono (adormecer após deitar).
  2. Dificuldade de manutenção do sono (despertares noturnos).
  3. Despertar precoce matinal.
  4. Nível de insatisfação com o sono atual.
  5. Interferência no funcionamento diurno (fadiga, foco, memória).
  6. Percepção de terceiros sobre o impacto do sono na qualidade de vida.
  7. Nível de angústia e preocupação gerado pela falta de sono.
* **Escala Likert (0 a 4):** Max Score = **28 pontos**.

### 12.2 Faixas de Corte Clínico (*Cut-Off Points*) - ISI

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 7** | **Sono Saudável & Restaurador** | `minimal` | 🟢 Verde (`#10b981`) | **Ausência de Insônia Clínica:** Sono fisiológico normal. Manter horários regulares e desaceleração noturna. |
| **8 a 14** | **Insônia Leve / Subclínica** | `mild` | 🟡 Amarelo (`#eab308`) | **Atenção Preventiva:** Despertares pontuais ligados a estresse ou uso tardio de telas/cafeína. Aplicação de Higiene do Sono. |
| **15 a 21** | **Insônia Clínica Moderada** | `moderate` | 🟠 Laranja (`#f97316`) | **Ponto de Corte Clínico ($\ge$ 15):** Insônia crônica com prejuízo diurno manifesto. Indicação padrão-ouro de Terapia Cognitivo-Comportamental para Insônia (TCC-I). |
| **22 a 28** | **Insônia Clínica Severa / Grave** | `severe` | 🔴 Vermelho (`#ef4444`) | **Quadro Grave & Crônico:** Privação de sono de alto risco físico e psicológico. Demanda intervenção multidisciplinar urgente (Psicologia + Medicina do Sono). |

---

---

## 13. 💍 Avaliação de Conexão e Ajuste Conjugal (RDAS)

### 13.1 Fundamentação Científica
A **Revised Dyadic Adjustment Scale (RDAS)** é o instrumento psicométrico mais utilizado internacionalmente para avaliação da qualidade conjugal e eficácia em intervenções de Terapia de Casal (*Busby et al., 1995*), validada no Brasil.
* **Referência Original:** Busby DM, Christensen C, Crane DR, Larson JH. *A revision of the Dyadic Adjustment Scale for use with married and cohabiting couples*. J Marital Fam Ther. 1995;21(2):191-208.
* **Estrutura:** 14 itens divididos em 3 dimensões clínicas:
  1. **Consenso Conjugal (Itens 1 a 6):** Finanças, lazer, valores/fé, amizades, decisões e afeto.
  2. **Satisfação & Estabilidade (Itens 7 a 10):** Estabilidade da relação, resolução serena de conflitos, apreço e confiança mútua.
  3. **Coesão & Parceria (Itens 11 a 14):** Atividades conjuntas, troca estimulante de ideias, trabalho em equipe e cumplicidade/risadas.
* **Score Total:** Varia de **0 a 69 pontos**.
* **Ponto de Corte de Distresse Conjugal (*Cut-Off*):** Pontuações $< 48$ indicam distresse conjugal e necessidade de intervenção terapêutica.

### 13.2 Faixas de Corte Clínico (*Cut-Off Points*) - RDAS

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 35** | **Crise Conjugal & Desconexão Severa** | `severe` | 🔴 Vermelho (`#ef4444`) | **Distresse Agudo:** Conflitos destrutivos, sensação de solidão a dois e ameaças de separação. Indicação prioritária de Terapia de Casal (EFT / TCC para Casais). |
| **36 a 47** | **Desgaste na Relação & Dificuldades de Ajuste** | `moderate` | 🟠 Laranja (`#f97316`) | **Alerta de Distresse Conjugal (Cut-off RDAS):** Desgaste na comunicação e frustração acumulada. Indicação de mediação terapêutica preventiva. |
| **48 a 58** | **Ajuste Conjugal Saudável & Conexão Estável** | `mild` | 🟡 Amarelo (`#eab308`) | **Ajuste Funcional:** Base sólida de respeito e afeto, com necessidade de pequenos alinhamentos de rotina e intimidade. |
| **59 a 69** | **Alta Sintonia, Intimidade & Coesão** | `minimal` | 🟢 Verde (`#10b981`) | **Excelente Harmonia:** Alto nível de cumplicidade, amizade e valores compartilhados. Manter rituais de conexão e autocuidado. |

---

---

## 14. 💔 Inventário de Dependência Emocional e Autoestima (IDEA)

### 14.1 Fundamentação Científica
Baseado nas pesquisas sobre apego adulto ansioso, apego dependente e na literatura de codependência (*Spann-Fischer Codependency Scale - SFCDS*, *Cuestionario de Dependencia Emocional - CDE de Lemos & Londoño*) e na *Escala de Autoestima de Rosenberg (RSE)*.
* **Objetivo:** Avaliar o grau de dependência da aprovação externa, medo de abandono, anulação de limites pessoais e impacto na autoimagem.
* **Estrutura:** 12 questões clínicas avaliando:
  1. Medo constante de abandono / rejeição.
  2. Dependência da validação alheia para o autoconceito.
  3. Dificuldade severa de dizer "não" e estabelecer limites.
  4. Anulação de opiniões e planos para agradar.
  5. Pavor da solidão / sensação de vazio ao estar só.
  6. Necessidade contínua de reafirmação de afeto.
  7. Tolerância a relações tóxicas/desrespeitosas.
  8. Hipervigilância e ciúmes por insegurança.
  9. Complexo de salvador(a) / sobrecarga pelos problemas alheios.
  10. Autocrítica e sensação crônica de insuficiência.
  11. Perda de identidade e sonhos próprios.
  12. Insegurança para tomar decisões autônomas.
* **Escala Likert (0 a 3):** Max Score = **36 pontos**.

### 14.2 Faixas de Corte Clínico (*Cut-Off Points*) - IDEA

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 9** | **Autonomia Afetiva & Autoestima Saudável** | `minimal` | 🟢 Verde (`#10b981`) | **Vínculo Seguro & Autônomo:** Autoestima equilibrada, limites saudáveis e relacionamentos baseados na reciprocidade. |
| **10 a 18** | **Insegurança Relacional Leve** | `mild` | 🟡 Amarelo (`#eab308`) | **Atenção & Fortalecimento:** Dúvidas pontuais sobre seu valor em fases de estresse. Treino de assertividade e autocompaixão. |
| **19 a 27** | **Padrão Significativo de Dependência Emocional** | `moderate` | 🟠 Laranja (`#f97316`) | **Alerta de Dependência Afetiva:** Anulação de si e sofrimento relacional frequente. Indicação formal de psicoterapia clínica para autoestima e assertividade. |
| **28 a 36** | **Dependência Afetiva Severa / Risco Relacional** | `severe` | 🔴 Vermelho (`#ef4444`) | **Sofrimento Relacional Agudo:** Perda de identidade, pavor de abandono e vulnerabilidade a relações abusivas. Demanda intervenção terapêutica prioritária. |

## 15. 🎲 Inventário de Rastreio de Transtorno de Jogos e Apostas (Ludopatia - CID-11)

### 15.1 Fundamentação Científica
Baseado nos critérios diagnósticos da Organização Mundial da Saúde (OMS) na **CID-11 (Código 6C50 - Gambling Disorder / Transtorno por Jogos de Azar e Apostas)** e no padrão-ouro de triagem psicométrica internacional **PGSI** (*Problem Gambling Severity Index* / Ferris & Wynne).
* **Objetivo:** Rastrear a perda de controle, o fenômeno de "perseguição de perdas" (*chasing losses*), a tolerância neuroquímica por risco financeiro, o impacto no patrimônio/família e a impulsividade relacionada a apostas esportivas (*bets*), cassinos online (*jogo do tigrinho*), loterias e jogos de azar.
* **Estrutura:** 10 questões clínicas avaliando:
  1. Dificuldade de interromper ou limitar tempo e dinheiro apostado.
  2. Tolerância e necessidade de apostar valores progressivamente maiores.
  3. "Perseguição de perdas" (*chasing losses*) nos dias seguintes.
  4. Pensamentos intrusivos e preocupação contínua com jogos/apostas.
  5. Uso do jogo como fuga de ansiedade, tédio, frustração ou tristeza.
  6. Mentiras para familiares e amigos para ocultar perdas e tempo jogado.
  7. Endividamento, uso de reservas financeiras, empréstimos ou venda de bens.
  8. Sintomas de irritabilidade, ansiedade e abstinência ao tentar parar.
  9. Prejuízo em relacionamentos afetivos, confiança conjugal e trabalho.
  10. Remorso agudo, vergonha e promessas repetidas de parar não cumpridas.
* **Escala Likert (0 a 3):** Max Score = **30 pontos**.

### 15.2 Faixas de Corte Clínico (*Cut-Off Points*) - Jogos & Apostas (CID-11)

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 5** | **Risco Mínimo / Comportamento Controlado** | `minimal` | 🟢 Verde (`#10b981`) | **Padrão Recreativo / Baixo Risco:** Sem perda de controle ou perseguição de prejuízos. Recomenda-se vigilância sobre o caráter aditivo dos jogos digitais. |
| **6 a 12** | **Comportamento de Risco / Alerta Inicial** | `mild` | 🟡 Amarelo (`#eab308`) | **Sinal Amarelo de Alerta:** Início de tolerância e uso das apostas para alívio emocional. Bloqueio voluntário preventivo e psicoeducação sobre dopamina. |
| **13 a 20** | **Transtorno de Jogo Moderado (CID-11 6C50)** | `moderate` | 🟠 Laranja (`#f97316`) | **Critérios Diagnósticos Presentes:** Perda de controle, mentiras e endividamento crescente. Indicação formal de Psicoterapia Cognitivo-Comportamental (TCC) para impulsividade e gestão financeira assistida. |
| **21 a 30** | **Transtorno de Jogo Severo / Ludopatia Grave** | `severe` | 🔴 Vermelho (`#ef4444`) | **Quadro Compulsivo Agudo / Emergência:** Sofrimento extremo, risco de ruína patrimonial e desesperança. Intervenção urgente multidisciplinar (Psicoterapia + Psiquiatria + Grupos de Apoio como JA). |

## 16. 🕊️ Inventário de Rastreio de Violência Eclesiástica e Abuso Espiritual

### 16.1 Fundamentação Científica
Baseado nas pesquisas sobre trauma religioso, controle coercitivo em comunidades de fé e abuso espiritual (*Oakley & Kinmond, 2013; Spiritual Abuse Questionnaire - SAQ; Ward, 2011; Johnson & VanVonderen*).
* **Objetivo:** Avaliar a presença de autoritarismo, manipulação moral com textos sagrados, controle de decisões pessoais, ameaças de maldição, gaslighting eclesial, exploração do voluntariado e impacto na saúde mental e na relação com Deus.
* **Estrutura:** 10 questões clínicas avaliando:
  1. Inquestionabilidade da liderança e rotulação de dúvidas como rebeldia.
  2. Coerção moral e uso da Bíblia fora de contexto para exigir submissão cega.
  3. Tentativa de controle de decisões íntimas (casamento, profissão, amizades).
  4. Ameaças de perda de "cobertura espiritual" ou maldição ao discordar.
  5. Pressão para isolamento de familiares e amigos de fora da comunidade.
  6. Sobrecarga e exploração no voluntariado ("fazer pouco para Deus").
  7. Humilhação e exposição pública de confissões ou erros no púlpito.
  8. *Gaslighting* eclesiástico e inversão de culpa diante de falhas de líderes.
  9. Sintomas somáticos de ansiedade e taquicardia em cultos/reuniões.
  10. Distorção da imagem de Deus como um juiz punitivo e perda da paz na graça.
* **Escala Likert (0 a 3):** Max Score = **30 pontos**.

### 16.2 Faixas de Corte Clínico (*Cut-Off Points*) - Abuso Espiritual

| Faixa de Score | Classificação | Código | Cor / Tag | Significado Clínico & Conduta Recomendada |
| :---: | :---: | :---: | :---: | :--- |
| **0 a 5** | **Ambiente Saudável / Risco Mínimo** | `minimal` | 🟢 Verde (`#10b981`) | **Comunidade Saudável & Acolhedora:** Relações baseadas na graça, liberdade de pensamento, diálogo transparente e respeito aos limites individuais. |
| **6 a 12** | **Sinais Iniciais de Toxicidade / Alerta** | `mild` | 🟡 Amarelo (`#eab308`) | **Sinal Amarelo de Rigidez:** Pressões pontuais de controle ou sobrecarga de tarefas. Recomenda-se estabelecer limites saudáveis e discernimento. |
| **13 a 20** | **Padrão Evidente de Violência Eclesiástica** | `moderate` | 🟠 Laranja (`#f97316`) | **Abuso Espiritual Presente:** Manipulação psicológica, ameaças de perda de cobertura e inversão de culpa. Indicação de psicoterapia para separar a fé do trauma humano. |
| **21 a 30** | **Abuso Espiritual Severo / Trauma Religioso Crítico** | `severe` | 🔴 Vermelho (`#ef4444`) | **Trauma Eclesiástico Grave:** Sofrimento extremo, hipervigilância, pânico e luto comunitário. Acolhimento psicoterapêutico urgente e afastamento do ambiente tóxico. |

---

## 17. 🏗️ Arquitetura Técnica do Motor Psicométrico

```
src/
├── data/assessments/
│   ├── gad7.json             # GAD-7 (Ansiedade Generalizada)
│   ├── burnout.json          # Inventário de Burnout & Sobrecarga Emocional
│   ├── phq9.json             # PHQ-9 (Escala de Depressão e Humor)
│   ├── asrs18.json           # ASRS-18 (Rastreio de TDAH em Adultos)
│   ├── espiritualidade.json   # Culpa, Perfeccionismo e Saúde Espiritual
│   ├── sono.json             # ISI (Índice de Qualidade do Sono e Insônia)
│   ├── casamento.json        # RDAS (Avaliação de Conexão e Ajuste Conjugal)
│   ├── dependencia.json      # IDEA (Dependência Emocional e Autoestima)
│   ├── jogos.json            # CID-11 6C50 (Transtorno de Jogos e Apostas / Ludopatia)
│   ├── abuso-espiritual.json # Violência Eclesiástica e Abuso Espiritual
│   └── index.js              # Registry central extensível de instrumentos
├── lib/
│   ├── assessmentEngine.js   # Funções puras de cálculo de score e classificação
│   ├── assessmentService.js  # Gravação de leads, sanitização e CRM
│   └── emailTemplates.js     # Templates transacionais responsivos de relatórios
└── components/assessment/    # UI modular (Runner, Gauge, Questions, Result, CRM)
```









