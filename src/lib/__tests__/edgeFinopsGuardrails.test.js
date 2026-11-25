import fs from 'fs';
import path from 'path';

describe('FinOps IA & Confiabilidade NFS-e (Edge Functions Guardrails)', () => {
  const functionsDir = path.resolve(process.cwd(), 'supabase/functions');

  test('generate-session-summary não envia patient_name no prompt e controla FinOps/timeout', () => {
    const src = fs.readFileSync(path.join(functionsDir, 'generate-session-summary/index.ts'), 'utf8');
    expect(src).not.toContain('booking.patient_name');
    expect(src).toContain('maxOutputTokens');
    expect(src).toContain('AbortSignal.timeout');
    expect(src).toContain('usedGemini ? 1.20 : 0.00');
  });

  test('admin-insights controla maxOutputTokens, timeout e isAiGenerated real', () => {
    const src = fs.readFileSync(path.join(functionsDir, 'admin-insights/index.ts'), 'utf8');
    expect(src).toContain('maxOutputTokens');
    expect(src).toContain('AbortSignal.timeout');
    expect(src).toContain('isAiGenerated: usedGemini');
  });

  test('retry-failed-nfse exige RBAC admin/service_role e não trafega PII desnecessária', () => {
    const src = fs.readFileSync(path.join(functionsDir, 'retry-failed-nfse/index.ts'), 'utf8');
    expect(src).toContain("from '../_shared/auth.ts'");
    expect(src).toContain('requireAdmin(req, supabase)');
    expect(src).toContain('err instanceof AuthError');
    expect(src).not.toContain('tomador_nome, tomador_cpf_cnpj');
  });
});

