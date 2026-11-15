import {
  validateLeadPhone,
  validateLeadEmail,
  validateLeadName,
  validateLeadData,
  VALID_BR_DDDS,
} from '../leadValidator';

describe('leadValidator — Suite de Proteção de Leads e Antifraude', () => {
  describe('validateLeadPhone', () => {
    it('deve aprovar números de celular legítimos de diferentes estados', () => {
      const validCases = [
        '(11) 98456-7890',
        '+55 (21) 99876-5430',
        '5531984561234',
        '(81) 99221-4079', // Caso real de Pernambuco da imagem
        '47988123456',
        '(51) 99345-6789',
      ];

      validCases.forEach((phone) => {
        const result = validateLeadPhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.sanitizedPhone).toMatch(/^\+55\d{10,11}$/);
      });
    });

    it('deve rejeitar DDDs inválidos no Brasil (ex: 00, 10, 20, 23)', () => {
      const invalidDDDs = ['(00) 98765-4321', '(10) 98765-4321', '(20) 98765-4321', '(23) 98765-4321'];

      invalidDDDs.forEach((phone) => {
        const result = validateLeadPhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('não é válido no Brasil');
      });
    });

    it('deve rejeitar números com todos os dígitos iguais (ex: 99999-9999 ou 00000-0000)', () => {
      const repeatedAll = [
        '(11) 99999-9999',
        '+5551999999999', // Caso visto na imagem do usuário
        '(31) 98888-8888',
        '(21) 91111-1111',
        '(41) 00000-0000',
      ];

      repeatedAll.forEach((phone) => {
        const result = validateLeadPhone(phone);
        expect(result.isValid).toBe(false);
      });
    });

    it('deve rejeitar repetições em blocos fictícios (ex: 988887777 da imagem)', () => {
      const repeatedBlocks = [
        '+5511988887777', // Caso visto na imagem do usuário
        '(11) 98888-7777',
        '(21) 91111-2222',
        '(31) 93333-4444',
      ];

      repeatedBlocks.forEach((phone) => {
        const result = validateLeadPhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeTruthy();
      });
    });

    it('deve rejeitar números com repetição excessiva consecutiva (> 5 do mesmo dígito)', () => {
      const result = validateLeadPhone('(11) 988888888');
      expect(result.isValid).toBe(false);
    });

    it('deve rejeitar sequências óbvias (123456789, 987654321)', () => {
      expect(validateLeadPhone('(11) 987654321').isValid).toBe(false);
      expect(validateLeadPhone('(11) 123456789').isValid).toBe(false);
    });

    it('deve exigir dígito 9 inicial para celular de 11 dígitos', () => {
      const result = validateLeadPhone('(11) 88765-4321');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('começar com o dígito 9');
    });
  });

  describe('validateLeadEmail', () => {
    it('deve aprovar e-mails válidos legítimos', () => {
      const validEmails = [
        'paciente@gmail.com',
        'contato@empresa.com.br',
        'joao.silva@outlook.com',
        'maria_oliveira@uol.com.br',
      ];

      validEmails.forEach((email) => {
        const res = validateLeadEmail(email);
        expect(res.isValid).toBe(true);
        expect(res.sanitizedEmail).toBe(email.toLowerCase());
      });
    });

    it('deve rejeitar domínios de exemplo e teste (ex: example.com, teste.com.br)', () => {
      const fictitiousEmails = [
        'maria.teste@example.com', // Caso da imagem
        'teste@teste.com.br',      // Caso da imagem
        'usuario@test.com',
        'alguem@fake.com',
        'lead@mailinator.com',
        'contato@tempmail.com',
      ];

      fictitiousEmails.forEach((email) => {
        const res = validateLeadEmail(email);
        expect(res.isValid).toBe(false);
        expect(res.error).toBeTruthy();
      });
    });

    it('deve rejeitar usernames notórios de teste (ex: teste@..., asdasd@...)', () => {
      const testUsernames = [
        'teste@gmail.com',
        'test@hotmail.com',
        'asdasd@gmail.com',
        'fake@yahoo.com',
      ];

      testUsernames.forEach((email) => {
        const res = validateLeadEmail(email);
        expect(res.isValid).toBe(false);
      });
    });

    it('deve rejeitar formatos de e-mail malformados', () => {
      expect(validateLeadEmail('sem-arroba').isValid).toBe(false);
      expect(validateLeadEmail('sem-ponto@com').isValid).toBe(false);
      expect(validateLeadEmail('@semusuario.com').isValid).toBe(false);
    });
  });

  describe('validateLeadName', () => {
    it('deve aprovar nomes legítimos', () => {
      const validNames = ['Tuane Talita', 'Maria Aparecida', 'João Victor', 'Ana', 'Dr. Roberto'];
      validNames.forEach((n) => {
        const res = validateLeadName(n);
        expect(res.isValid).toBe(true);
        expect(res.sanitizedName).toBe(n);
      });
    });

    it('deve detectar quando o usuário colou e-mail no campo nome', () => {
      const emailAsName = 'tuanetalita7@gmail.com'; // Caso da imagem do usuário
      const res = validateLeadName(emailAsName);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('digitou um e-mail no campo nome');
    });

    it('deve rejeitar nomes fictícios como "TEste" ou "Maria Teste"', () => {
      expect(validateLeadName('TEste').isValid).toBe(false); // Caso da imagem
      expect(validateLeadName('Maria Teste').isValid).toBe(false); // Caso da imagem
      expect(validateLeadName('test').isValid).toBe(false);
      expect(validateLeadName('asdasd').isValid).toBe(false);
      expect(validateLeadName('fulano').isValid).toBe(false);
      expect(validateLeadName('anonimo').isValid).toBe(false);
    });

    it('deve rejeitar nomes com menos de 2 caracteres ou sem letras', () => {
      expect(validateLeadName('A').isValid).toBe(false);
      expect(validateLeadName('12345').isValid).toBe(false);
      expect(validateLeadName('---').isValid).toBe(false);
    });
  });

  describe('validateLeadData (Orquestração)', () => {
    it('deve aprovar lead com todos os campos válidos', () => {
      const res = validateLeadData({
        name: 'Maria Oliveira',
        email: 'maria.oliveira@gmail.com',
        phone: '(11) 98456-7890',
      });
      expect(res.isValid).toBe(true);
      expect(res.errors).toEqual({});
      expect(res.sanitized.phone).toBe('+5511984567890');
    });

    it('deve aprovar lead fornecendo apenas WhatsApp válido', () => {
      const res = validateLeadData({
        phone: '(11) 98456-7890',
      });
      expect(res.isValid).toBe(true);
      expect(res.sanitized.phone).toBe('+5511984567890');
    });

    it('deve aprovar lead fornecendo apenas E-mail válido', () => {
      const res = validateLeadData({
        email: 'paciente@gmail.com',
      });
      expect(res.isValid).toBe(true);
      expect(res.sanitized.email).toBe('paciente@gmail.com');
    });

    it('deve rejeitar lead sem nenhum contato', () => {
      const res = validateLeadData({
        name: 'Carlos',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.general).toContain('pelo menos seu E-mail ou WhatsApp');
    });

    it('deve sinalizar dados fictícios nos campos correspondentes', () => {
      const res = validateLeadData({
        name: 'Maria Teste',
        email: 'maria.teste@example.com',
        phone: '+5511988887777',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.name).toBeTruthy();
      expect(res.errors.email).toBeTruthy();
      expect(res.errors.phone).toBeTruthy();
    });
  });
});
