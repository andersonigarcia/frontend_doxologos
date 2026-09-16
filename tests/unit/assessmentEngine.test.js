import { calculateAssessmentResult, getSeverityTheme } from '@/lib/assessmentEngine';
import gad7Schema from '@/data/assessments/gad7.json';
import { getAssessmentByIdentifier, getAllAssessments } from '@/data/assessments';

describe('Assessment Engine - GAD-7 Psycometric Calculations', () => {
  test('Deve carregar o schema GAD-7 corretamente pelo registry', () => {
    const assessment = getAssessmentByIdentifier('gad-7');
    expect(assessment).toBeDefined();
    expect(assessment.id).toBe('gad-7');
    expect(assessment.questionsCount).toBe(7);
    expect(assessment.questions.length).toBe(7);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-ansiedade')).toBe(assessment);
    expect(getAssessmentByIdentifier('teste-ansiedade-gad7')).toBe(assessment);

    const all = getAllAssessments();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  test('Deve calcular pontuação mínima (0 pontos = Ansiedade Mínima)', () => {
    const answers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const result = calculateAssessmentResult(gad7Schema, answers);

    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(21);
    expect(result.percentage).toBe(0);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Ansiedade Mínima');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar no limite de Ansiedade Mínima (4 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0, 7: 0 };
    const result = calculateAssessmentResult(gad7Schema, answers);

    expect(result.score).toBe(4);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Ansiedade Mínima');
  });

  test('Deve classificar em Ansiedade Leve (5 a 9 pontos)', () => {
    const answersScore5 = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0, 7: 0 };
    const result5 = calculateAssessmentResult(gad7Schema, answersScore5);
    expect(result5.score).toBe(5);
    expect(result5.severity).toBe('mild');
    expect(result5.range.label).toBe('Ansiedade Leve');

    const answersScore9 = { 1: 2, 2: 2, 3: 2, 4: 1, 5: 1, 6: 1, 7: 0 };
    const result9 = calculateAssessmentResult(gad7Schema, answersScore9);
    expect(result9.score).toBe(9);
    expect(result9.severity).toBe('mild');
  });

  test('Deve classificar em Ansiedade Moderada (10 a 14 pontos)', () => {
    const answersScore10 = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1, 7: 0 };
    const result10 = calculateAssessmentResult(gad7Schema, answersScore10);
    expect(result10.score).toBe(10);
    expect(result10.severity).toBe('moderate');
    expect(result10.range.label).toBe('Ansiedade Moderada');

    const answersScore14 = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 };
    const result14 = calculateAssessmentResult(gad7Schema, answersScore14);
    expect(result14.score).toBe(14);
    expect(result14.severity).toBe('moderate');
  });

  test('Deve classificar em Ansiedade Severa (15 a 21 pontos)', () => {
    const answersScore15 = { 1: 3, 2: 3, 3: 3, 4: 2, 5: 2, 6: 1, 7: 1 };
    const result15 = calculateAssessmentResult(gad7Schema, answersScore15);
    expect(result15.score).toBe(15);
    expect(result15.severity).toBe('severe');
    expect(result15.range.label).toBe('Ansiedade Severa');

    const answersScore21 = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3 };
    const result21 = calculateAssessmentResult(gad7Schema, answersScore21);
    expect(result21.score).toBe(21);
    expect(result21.percentage).toBe(100);
    expect(result21.severity).toBe('severe');
    expect(result21.range.label).toBe('Ansiedade Severa');
  });

  test('Deve retornar estrutura segura para respostas vazias ou nulas', () => {
    const result = calculateAssessmentResult(gad7Schema, {});
    expect(result.score).toBe(0);
    expect(result.isComplete).toBe(false);
    expect(result.answeredCount).toBe(0);

    const emptyResult = calculateAssessmentResult(null, {});
    expect(emptyResult.score).toBe(0);
  });

  test('Deve retornar temas visuais correspondentes às cores de severidade', () => {
    const themeEmerald = getSeverityTheme('emerald');
    expect(themeEmerald.stroke).toBe('#10b981');

    const themeRose = getSeverityTheme('rose');
    expect(themeRose.stroke).toBe('#e11d48');

    const themeFallback = getSeverityTheme('unknown');
    expect(themeFallback.stroke).toBe('#6b7280');
  });
});


describe('Assessment Engine - Burnout & Sobrecarga Emocional Calculations', () => {
  const burnoutSchema = getAssessmentByIdentifier('burnout');

  test('Deve carregar o schema Burnout corretamente pelo registry', () => {
    expect(burnoutSchema).toBeDefined();
    expect(burnoutSchema.id).toBe('burnout');
    expect(burnoutSchema.questions.length).toBe(10);
    expect(burnoutSchema.maxScore).toBe(30);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-burnout')).toBe(burnoutSchema);
    expect(getAssessmentByIdentifier('sobrecarga-emocional')).toBe(burnoutSchema);
    expect(getAssessmentByIdentifier('esgotamento-profissional')).toBe(burnoutSchema);
  });

  test('Deve classificar em Equilíbrio & Resiliência (0 a 9 pontos)', () => {
    const answers = { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1, 6: 0, 7: 0, 8: 1, 9: 0, 10: 0 };
    const result = calculateAssessmentResult(burnoutSchema, answers);

    expect(result.score).toBe(4);
    expect(result.maxScore).toBe(30);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Equilíbrio & Resiliência Ocupacional');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Sobrecarga Inicial / Alerta Amarelo (10 a 17 pontos)', () => {
    const answers = { 1: 1, 2: 2, 3: 1, 4: 1, 5: 2, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1 };
    const result = calculateAssessmentResult(burnoutSchema, answers);

    expect(result.score).toBe(13);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Sobrecarga Inicial / Alerta Amarelo');
  });

  test('Deve classificar em Risco Elevado de Burnout (18 a 24 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2 };
    const result = calculateAssessmentResult(burnoutSchema, answers);

    expect(result.score).toBe(20);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Risco Elevado de Burnout');
  });

  test('Deve classificar em Síndrome de Burnout Estabelecida (25 a 30 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 2, 8: 3, 9: 2, 10: 3 };
    const result = calculateAssessmentResult(burnoutSchema, answers);

    expect(result.score).toBe(28);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Síndrome de Burnout Estabelecida');
  });
});

describe('Assessment Engine - PHQ-9 (Depressão e Humor) Calculations', () => {
  const phq9Schema = getAssessmentByIdentifier('phq-9');

  test('Deve carregar o schema PHQ-9 corretamente pelo registry', () => {
    expect(phq9Schema).toBeDefined();
    expect(phq9Schema.id).toBe('phq-9');
    expect(phq9Schema.questions.length).toBe(9);
    expect(phq9Schema.maxScore).toBe(27);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-depressao')).toBe(phq9Schema);
    expect(getAssessmentByIdentifier('teste-depressao-phq9')).toBe(phq9Schema);
    expect(getAssessmentByIdentifier('phq9')).toBe(phq9Schema);
    expect(getAssessmentByIdentifier('depressao')).toBe(phq9Schema);
  });

  test('Deve classificar em Depressão Mínima ou Ausente (0 a 4 pontos)', () => {
    const answers = { 1: 0, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const result = calculateAssessmentResult(phq9Schema, answers);

    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(27);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Depressão Mínima ou Ausente');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Sintomas Depressivos Leves (5 a 9 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 0, 9: 0 };
    const result = calculateAssessmentResult(phq9Schema, answers);

    expect(result.score).toBe(7);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Sintomas Depressivos Leves');
  });

  test('Deve classificar em Depressão Moderada (10 a 14 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0 };
    const result = calculateAssessmentResult(phq9Schema, answers);

    expect(result.score).toBe(12);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Depressão Moderada');
  });

  test('Deve classificar em Depressão Severa (15 a 27 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 1 };
    const result = calculateAssessmentResult(phq9Schema, answers);

    expect(result.score).toBe(20);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Depressão Severa / Esgotamento Profundo');
  });
});

describe('Assessment Engine - ASRS-18 (TDAH em Adultos) Calculations', () => {
  const asrsSchema = getAssessmentByIdentifier('asrs-18');

  test('Deve carregar o schema ASRS-18 corretamente pelo registry', () => {
    expect(asrsSchema).toBeDefined();
    expect(asrsSchema.id).toBe('asrs-18');
    expect(asrsSchema.questions.length).toBe(18);
    expect(asrsSchema.maxScore).toBe(72);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-tdah')).toBe(asrsSchema);
    expect(getAssessmentByIdentifier('teste-tdah-adultos')).toBe(asrsSchema);
    expect(getAssessmentByIdentifier('asrs18')).toBe(asrsSchema);
    expect(getAssessmentByIdentifier('tdah')).toBe(asrsSchema);
  });

  test('Deve classificar em Padrão Neurotípico / Baixa Probabilidade (0 a 23 pontos)', () => {
    // 18 questões com média de 1 ponto = 18 pontos
    const answers = {};
    for (let i = 1; i <= 18; i++) answers[i] = 1;
    const result = calculateAssessmentResult(asrsSchema, answers);

    expect(result.score).toBe(18);
    expect(result.maxScore).toBe(72);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Padrão Neurotípico / Baixa Probabilidade de TDAH');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Sinais Leves de Desatenção e Inquietação (24 a 39 pontos)', () => {
    // 6 com 2 pontos e 12 com 1 ponto = 24 pontos
    const answers = {};
    for (let i = 1; i <= 6; i++) answers[i] = 2;
    for (let i = 7; i <= 18; i++) answers[i] = 1;
    const result = calculateAssessmentResult(asrsSchema, answers);

    expect(result.score).toBe(24);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Sinais Leves de Desatenção e Inquietação');
  });

  test('Deve classificar em Alta Probabilidade de TDAH em Adultos (40 a 53 pontos)', () => {
    // 18 questões com 2.5 de média -> ex: 10 com 3 e 8 com 2 = 46 pontos
    const answers = {};
    for (let i = 1; i <= 10; i++) answers[i] = 3;
    for (let i = 11; i <= 18; i++) answers[i] = 2;
    const result = calculateAssessmentResult(asrsSchema, answers);

    expect(result.score).toBe(46);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Alta Probabilidade de TDAH em Adultos');
  });

  test('Deve classificar em Forte Indicação Clínica de TDAH (54 a 72 pontos)', () => {
    // 18 questões com 4 pontos = 72 pontos
    const answers = {};
    for (let i = 1; i <= 18; i++) answers[i] = 4;
    const result = calculateAssessmentResult(asrsSchema, answers);

    expect(result.score).toBe(72);
    expect(result.percentage).toBe(100);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Forte Indicação Clínica de TDAH / Alto Impacto');
  });
});

describe('Assessment Engine - Culpa, Perfeccionismo e Saúde Espiritual Calculations', () => {
  const espSchema = getAssessmentByIdentifier('espiritualidade');

  test('Deve carregar o schema de Espiritualidade corretamente pelo registry', () => {
    expect(espSchema).toBeDefined();
    expect(espSchema.id).toBe('espiritualidade');
    expect(espSchema.questions.length).toBe(12);
    expect(espSchema.maxScore).toBe(36);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-espiritualidade')).toBe(espSchema);
    expect(getAssessmentByIdentifier('culpa-perfeccionismo')).toBe(espSchema);
    expect(getAssessmentByIdentifier('saude-espiritual')).toBe(espSchema);
    expect(getAssessmentByIdentifier('escrupulosidade')).toBe(espSchema);
  });

  test('Deve classificar em Fé Saudável, Graça e Paz Interior (0 a 9 pontos)', () => {
    const answers = { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 1, 9: 0, 10: 0, 11: 0, 12: 0 };
    const result = calculateAssessmentResult(espSchema, answers);

    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(36);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Fé Saudável, Graça e Paz Interior');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Autocobrança & Culpa Esporádica (10 a 18 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 11: 1, 12: 1 };
    const result = calculateAssessmentResult(espSchema, answers);

    expect(result.score).toBe(14);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Autocobrança & Culpa Esporádica');
  });

  test('Deve classificar em Perfeccionismo Religioso & Sobrecarga Moral (19 a 27 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 };
    const result = calculateAssessmentResult(espSchema, answers);

    expect(result.score).toBe(23);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Perfeccionismo Religioso & Sobrecarga Moral');
  });

  test('Deve classificar em Escrupulosidade & Angústia Espiritual Severa (28 a 36 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 2, 9: 3, 10: 3, 11: 3, 12: 3 };
    const result = calculateAssessmentResult(espSchema, answers);

    expect(result.score).toBe(35);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Escrupulosidade & Angústia Espiritual Severa');
  });
});

describe('Assessment Engine - Índice de Qualidade do Sono e Insônia (ISI) Calculations', () => {
  const sonoSchema = getAssessmentByIdentifier('sono-isi');

  test('Deve carregar o schema de Sono (ISI) corretamente pelo registry', () => {
    expect(sonoSchema).toBeDefined();
    expect(sonoSchema.id).toBe('sono-isi');
    expect(sonoSchema.questions.length).toBe(7);
    expect(sonoSchema.maxScore).toBe(28);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-sono')).toBe(sonoSchema);
    expect(getAssessmentByIdentifier('teste-insonia')).toBe(sonoSchema);
    expect(getAssessmentByIdentifier('sono')).toBe(sonoSchema);
    expect(getAssessmentByIdentifier('insonia')).toBe(sonoSchema);
  });

  test('Deve classificar em Sono Saudável & Restaurador (0 a 7 pontos)', () => {
    const answers = { 1: 0, 2: 1, 3: 0, 4: 1, 5: 0, 6: 0, 7: 1 };
    const result = calculateAssessmentResult(sonoSchema, answers);

    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(28);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Sono Saudável & Restaurador');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Insônia Leve / Subclínica (8 a 14 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 1, 4: 2, 5: 1, 6: 1, 7: 2 };
    const result = calculateAssessmentResult(sonoSchema, answers);

    expect(result.score).toBe(11);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Insônia Leve / Subclínica');
  });

  test('Deve classificar em Insônia Clínica Moderada (15 a 21 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 2, 4: 3, 5: 3, 6: 2, 7: 2 };
    const result = calculateAssessmentResult(sonoSchema, answers);

    expect(result.score).toBe(18);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Insônia Clínica Moderada');
  });

  test('Deve classificar em Insônia Clínica Severa / Grave (22 a 28 pontos)', () => {
    const answers = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 3, 6: 3, 7: 4 };
    const result = calculateAssessmentResult(sonoSchema, answers);

    expect(result.score).toBe(26);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Insônia Clínica Severa / Grave');
  });
});

describe('Assessment Engine - Avaliação de Conexão e Ajuste Conjugal (RDAS) Calculations', () => {
  const rdasSchema = getAssessmentByIdentifier('casamento-rdas');

  test('Deve carregar o schema de Casamento (RDAS) corretamente pelo registry', () => {
    expect(rdasSchema).toBeDefined();
    expect(rdasSchema.id).toBe('casamento-rdas');
    expect(rdasSchema.questions.length).toBe(14);
    expect(rdasSchema.maxScore).toBe(69);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-casamento')).toBe(rdasSchema);
    expect(getAssessmentByIdentifier('teste-relacionamento')).toBe(rdasSchema);
    expect(getAssessmentByIdentifier('teste-casal')).toBe(rdasSchema);
    expect(getAssessmentByIdentifier('rdas')).toBe(rdasSchema);
  });

  test('Deve classificar em Crise Conjugal & Desconexão Severa (0 a 35 pontos)', () => {
    // 14 perguntas com 2 pontos = 28 pontos
    const answers = {};
    for (let i = 1; i <= 14; i++) answers[i] = 2;
    const result = calculateAssessmentResult(rdasSchema, answers);

    expect(result.score).toBe(28);
    expect(result.maxScore).toBe(69);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Crise Conjugal & Desconexão Severa');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Desgaste na Relação & Dificuldades de Ajuste (36 a 47 pontos)', () => {
    // 14 perguntas com 3 pontos = 42 pontos
    const answers = {};
    for (let i = 1; i <= 14; i++) answers[i] = 3;
    const result = calculateAssessmentResult(rdasSchema, answers);

    expect(result.score).toBe(42);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Desgaste na Relação & Dificuldades de Ajuste');
  });

  test('Deve classificar em Ajuste Conjugal Saudável & Conexão Estável (48 a 58 pontos)', () => {
    // 10 com 4 e 4 com 3 = 52 pontos
    const answers = {};
    for (let i = 1; i <= 10; i++) answers[i] = 4;
    for (let i = 11; i <= 14; i++) answers[i] = 3;
    const result = calculateAssessmentResult(rdasSchema, answers);

    expect(result.score).toBe(52);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Ajuste Conjugal Saudável & Conexão Estável');
  });

  test('Deve classificar em Alta Sintonia, Intimidade & Coesão (59 a 69 pontos)', () => {
    // 10 com 5 e 4 com 4 = 66 pontos
    const answers = {};
    for (let i = 1; i <= 10; i++) answers[i] = 5;
    for (let i = 11; i <= 14; i++) answers[i] = 4;
    const result = calculateAssessmentResult(rdasSchema, answers);

    expect(result.score).toBe(66);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Alta Sintonia, Intimidade & Coesão');
  });
});

describe('Assessment Engine - Inventário de Dependência Emocional e Autoestima (IDEA) Calculations', () => {
  const depSchema = getAssessmentByIdentifier('dependencia-emocional');

  test('Deve carregar o schema de Dependência Emocional corretamente pelo registry', () => {
    expect(depSchema).toBeDefined();
    expect(depSchema.id).toBe('dependencia-emocional');
    expect(depSchema.questions.length).toBe(12);
    expect(depSchema.maxScore).toBe(36);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-dependencia-emocional')).toBe(depSchema);
    expect(getAssessmentByIdentifier('teste-autoestima')).toBe(depSchema);
    expect(getAssessmentByIdentifier('teste-dependencia')).toBe(depSchema);
    expect(getAssessmentByIdentifier('autoestima')).toBe(depSchema);
    expect(getAssessmentByIdentifier('idea')).toBe(depSchema);
  });

  test('Deve classificar em Autonomia Afetiva & Autoestima Saudável (0 a 9 pontos)', () => {
    const answers = { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1, 6: 0, 7: 0, 8: 1, 9: 0, 10: 0, 11: 0, 12: 0 };
    const result = calculateAssessmentResult(depSchema, answers);

    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(36);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Autonomia Afetiva & Autoestima Saudável');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Insegurança Relacional Leve (10 a 18 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 2, 4: 1, 5: 1, 6: 1, 7: 1, 8: 2, 9: 1, 10: 1, 11: 1, 12: 1 };
    const result = calculateAssessmentResult(depSchema, answers);

    expect(result.score).toBe(14);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Insegurança Relacional Leve');
  });

  test('Deve classificar em Padrão Significativo de Dependência Emocional (19 a 27 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 };
    const result = calculateAssessmentResult(depSchema, answers);

    expect(result.score).toBe(23);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Padrão Significativo de Dependência Emocional');
  });

  test('Deve classificar em Dependência Afetiva Severa / Risco Relacional (28 a 36 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 2, 9: 3, 10: 3, 11: 3, 12: 3 };
    const result = calculateAssessmentResult(depSchema, answers);

    expect(result.score).toBe(35);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Dependência Afetiva Severa / Risco Relacional');
  });
});

describe('Assessment Engine - Inventário de Transtorno de Jogos e Apostas (Ludopatia - CID-11) Calculations', () => {
  const jogosSchema = getAssessmentByIdentifier('jogos-apostas');

  test('Deve carregar o schema de Jogos/Apostas corretamente pelo registry', () => {
    expect(jogosSchema).toBeDefined();
    expect(jogosSchema.id).toBe('jogos-apostas');
    expect(jogosSchema.questions.length).toBe(10);
    expect(jogosSchema.maxScore).toBe(30);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-apostas')).toBe(jogosSchema);
    expect(getAssessmentByIdentifier('ludopatia')).toBe(jogosSchema);
    expect(getAssessmentByIdentifier('bets')).toBe(jogosSchema);
    expect(getAssessmentByIdentifier('jogo-patologico')).toBe(jogosSchema);
    expect(getAssessmentByIdentifier('transtorno-jogos')).toBe(jogosSchema);
  });

  test('Deve classificar em Risco Mínimo / Comportamento Controlado (0 a 5 pontos)', () => {
    const answers = { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const result = calculateAssessmentResult(jogosSchema, answers);

    expect(result.score).toBe(1);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Risco Mínimo / Comportamento Controlado');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Comportamento de Risco / Alerta Inicial (6 a 12 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 1, 9: 1, 10: 0 };
    const result = calculateAssessmentResult(jogosSchema, answers);

    expect(result.score).toBe(8);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Comportamento de Risco / Alerta Inicial');
  });

  test('Deve classificar em Transtorno de Jogo de Gravidade Moderada (13 a 20 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1, 6: 2, 7: 1, 8: 2, 9: 1, 10: 1 };
    const result = calculateAssessmentResult(jogosSchema, answers);

    expect(result.score).toBe(16);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Transtorno de Jogo de Gravidade Moderada (CID-11 6C50)');
  });

  test('Deve classificar em Transtorno de Jogo Severo / Ludopatia Grave (21 a 30 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 2, 10: 3 };
    const result = calculateAssessmentResult(jogosSchema, answers);

    expect(result.score).toBe(29);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Transtorno de Jogo Severo / Ludopatia Grave');
  });
});

describe('Assessment Engine - Inventário de Violência Eclesiástica e Abuso Espiritual Calculations', () => {
  const abusoSchema = getAssessmentByIdentifier('abuso-espiritual');

  test('Deve carregar o schema de Abuso Espiritual corretamente pelo registry', () => {
    expect(abusoSchema).toBeDefined();
    expect(abusoSchema.id).toBe('abuso-espiritual');
    expect(abusoSchema.questions.length).toBe(10);
    expect(abusoSchema.maxScore).toBe(30);

    // Teste de aliases
    expect(getAssessmentByIdentifier('teste-abuso-espiritual')).toBe(abusoSchema);
    expect(getAssessmentByIdentifier('violencia-eclesiastica')).toBe(abusoSchema);
    expect(getAssessmentByIdentifier('trauma-religioso')).toBe(abusoSchema);
    expect(getAssessmentByIdentifier('manipulacao-religiosa')).toBe(abusoSchema);
    expect(getAssessmentByIdentifier('igreja-toxica')).toBe(abusoSchema);
  });

  test('Deve classificar em Ambiente Saudável / Risco Mínimo de Abuso (0 a 5 pontos)', () => {
    const answers = { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
    const result = calculateAssessmentResult(abusoSchema, answers);

    expect(result.score).toBe(1);
    expect(result.severity).toBe('minimal');
    expect(result.range.label).toBe('Ambiente Saudável / Risco Mínimo de Abuso');
    expect(result.isComplete).toBe(true);
  });

  test('Deve classificar em Sinais Iniciais de Toxicidade / Alerta Eclesiástico (6 a 12 pontos)', () => {
    const answers = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 0, 10: 1 };
    const result = calculateAssessmentResult(abusoSchema, answers);

    expect(result.score).toBe(9);
    expect(result.severity).toBe('mild');
    expect(result.range.label).toBe('Sinais Iniciais de Toxicidade / Alerta Eclesiástico');
  });

  test('Deve classificar em Padrão Evidente de Violência Eclesiástica e Manipulação (13 a 20 pontos)', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 1, 6: 2, 7: 1, 8: 2, 9: 1, 10: 1 };
    const result = calculateAssessmentResult(abusoSchema, answers);

    expect(result.score).toBe(16);
    expect(result.severity).toBe('moderate');
    expect(result.range.label).toBe('Padrão Evidente de Violência Eclesiástica e Manipulação');
  });

  test('Deve classificar em Abuso Espiritual Severo / Trauma Religioso Crítico (21 a 30 pontos)', () => {
    const answers = { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3 };
    const result = calculateAssessmentResult(abusoSchema, answers);

    expect(result.score).toBe(30);
    expect(result.severity).toBe('severe');
    expect(result.range.label).toBe('Abuso Espiritual Severo / Trauma Religioso Crítico');
  });
});

describe('Assessment Engine - Decomposição em Dimensões e Dossiê Clínico', () => {
  const abusoSchema = getAssessmentByIdentifier('abuso-espiritual');
  const gad7Schema = getAssessmentByIdentifier('gad-7');

  test('Deve calcular corretamente as dimensões clínicas do teste de Abuso Espiritual', () => {
    const answers = {
      1: 3, // Autoritarismo
      2: 3, // Coerção Moral
      3: 2, // Controle de Decisões
      4: 3, // Ameaças Espirituais
      5: 1, // Isolamento
      6: 2, // Sobrecarga
      7: 0, // Humilhação
      8: 3, // Gaslighting
      9: 3, // Sintomas Somáticos
      10: 2, // Distorção da Imagem de Deus
    };

    const result = calculateAssessmentResult(abusoSchema, answers);

    expect(Array.isArray(result.dimensions)).toBe(true);
    expect(result.dimensions.length).toBe(10);

    // Deve estar ordenado da maior intensidade para a menor
    expect(result.dimensions[0].percentage).toBeGreaterThanOrEqual(result.dimensions[result.dimensions.length - 1].percentage);

    // As dimensões com score 3 devem ter 100% e nível elevado
    const topDim = result.dimensions[0];
    expect(topDim.percentage).toBe(100);
    expect(topDim.level).toBe('elevado');
    expect(topDim.levelColor).toBe('#ef4444');
  });

  test('Deve gerar roteiro de perguntas para terapia e texto de psicoeducação', () => {
    const answers = { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2 };
    const result = calculateAssessmentResult(gad7Schema, answers);

    expect(Array.isArray(result.therapyQuestions)).toBe(true);
    expect(result.therapyQuestions.length).toBe(3);
    expect(result.therapyQuestions[0]).toContain('Como os sintomas relacionados a');
    expect(typeof result.psychoeducation).toBe('string');
    expect(result.psychoeducation.length).toBeGreaterThan(10);
  });
});









