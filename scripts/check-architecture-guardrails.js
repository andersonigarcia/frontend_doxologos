/**
 * Script de Verificação de Integridade Arquitetural e Guardrails (Fase 4)
 * Impede regressões, schema drifts e chamadas diretas proibidas em componentes de UI.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🛡️  Iniciando auditoria de Guardrails e Integridade Arquitetural...\n');

let errors = [];

function checkFileExists(relPath, description) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`[ARQUIVO AUSENTE] ${description}: ${relPath}`);
    return false;
  }
  return true;
}

function checkFileContains(relPath, requiredTokens, description) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const token of requiredTokens) {
    if (!content.includes(token)) {
      errors.push(`[INTEGRIDADE DE CÓDIGO] ${description} em ${relPath} não contém o token obrigatório: "${token}"`);
    }
  }
}

function checkFileNotContains(relPath, forbiddenTokens, description) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const token of forbiddenTokens) {
    if (content.includes(token)) {
      errors.push(`[VIOLAÇÃO DE GUARDRAIL] ${description} em ${relPath} contém padrão proibido: "${token}"`);
    }
  }
}

function parseExportedArray(relPath, arrayName) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, 'utf8');
  const regex = new RegExp(`export const ${arrayName} = \\[([\\s\\S]*?)\\];`);
  const match = content.match(regex);
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.replace(/['"\r\n\s]/g, ''))
    .filter(Boolean);
}

// 1. Guardrail de Serviços Canônicos
console.log('1️⃣  Validando camada de serviços canônicos...');
if (checkFileExists('src/services/professionalService.js', 'Serviço canônico de profissionais')) {
  checkFileContains(
    'src/services/professionalService.js',
    [
      'export const ALLOWED_PROFESSIONAL_FIELDS',
      'export function sanitizeProfessionalPayload',
      'export async function getProfessionalById',
      'export async function updateProfessional',
      'export async function listProfessionals',
      'export async function updateProfessionalStatus',
      'admin_list_users'
    ],
    'professionalService.js'
  );
}

if (checkFileExists('src/services/bookingService.js', 'Serviço canônico de agendamentos')) {
  checkFileContains(
    'src/services/bookingService.js',
    [
      'export const ALLOWED_BOOKING_FIELDS',
      'export const VALID_BOOKING_STATUSES',
      'export function sanitizeBookingPayload',
      'export async function getBookingById',
      'export async function createBooking',
      'export async function createChildBookings',
      'export async function updateBookingStatus',
      'export async function rescheduleBooking',
      'export async function listBookings'
    ],
    'bookingService.js'
  );
}

if (checkFileExists('src/services/paymentService.js', 'Serviço canônico de pagamentos')) {
  checkFileContains(
    'src/services/paymentService.js',
    [
      'export const ALLOWED_PAYMENT_FIELDS',
      'export const VALID_PAYMENT_STATUSES',
      'export function sanitizePaymentPayload',
      'export async function getPaymentById',
      'export async function getPaymentByMpId',
      'export async function getPaymentByBookingId',
      'export async function listPayments',
      'export async function updatePaymentStatus',
      'export async function createPaymentRecord'
    ],
    'paymentService.js'
  );
}

if (checkFileExists('src/services/patientService.js', 'Serviço canônico de pacientes')) {
  checkFileContains(
    'src/services/patientService.js',
    [
      'export const ALLOWED_PATIENT_NOTE_FIELDS',
      'export function sanitizePatientNotePayload',
      'export async function getPatientHomeworkTasks',
      'export async function getPatientNotesHistory',
      'export async function savePatientSessionNote'
    ],
    'patientService.js'
  );
}

if (checkFileExists('src/services/refundService.js', 'Serviço canônico de reembolsos e cancelamentos')) {
  checkFileContains(
    'src/services/refundService.js',
    [
      'export const HOURS_CANCELLATION_LIMIT',
      'export const PACKAGE_REFUND_PERCENTAGE',
      'export const PACKAGE_PLATFORM_RETENTION',
      'export const ALLOWED_PAYMENT_REFUND_FIELDS',
      'export const ALLOWED_PAYMENT_LEDGER_FIELDS',
      'export function sanitizeRefundReason',
      'export async function checkPayoutIntegrityForRefund',
      'export async function recordRefundLedgerEntries',
      'export async function processManualPaymentRefund',
      'export function evaluatePatientCancellationEligibility',
      'export async function executePatientCancellation',
      'export function evaluatePackageRefund',
      'export async function processEventRefundReversal'
    ],
    'refundService.js'
  );
}

// 2. Prevenção de Schema Drift (Campos Fantasmas & Catálogo de Banco)
console.log('2️⃣  Validando ausência de Schema Drift e integridade contra o catálogo de banco...');

const catalogPath = path.join(rootDir, 'src', 'constants', 'databaseCatalog.json');
let catalog = null;
if (fs.existsSync(catalogPath)) {
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  } catch (e) {
    errors.push(`[CATÁLOGO CORROMPIDO] Erro ao parsear databaseCatalog.json: ${e.message}`);
  }
} else {
  errors.push('[CATÁLOGO AUSENTE] src/constants/databaseCatalog.json não foi encontrado. Execute npm run schema:sync.');
}

const allowedProfFields = parseExportedArray('src/services/professionalService.js', 'ALLOWED_PROFESSIONAL_FIELDS');
if (allowedProfFields.includes('email')) {
  errors.push('[SCHEMA DRIFT] ALLOWED_PROFESSIONAL_FIELDS não pode conter "email" (coluna inexistente em public.professionals).');
}
if (allowedProfFields.includes('password')) {
  errors.push('[SCHEMA DRIFT] ALLOWED_PROFESSIONAL_FIELDS não pode conter "password" (pertence a auth.users).');
}

// Validação contra catálogo real do Postgres
if (catalog?.tables?.professionals?.columns) {
  const dbProfCols = catalog.tables.professionals.columns;
  for (const field of allowedProfFields) {
    if (!dbProfCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_PROFESSIONAL_FIELDS não existe no catálogo de public.professionals.`);
    }
  }
}

const allowedBookingFields = parseExportedArray('src/services/bookingService.js', 'ALLOWED_BOOKING_FIELDS');
if (allowedBookingFields.includes('meeting_platform')) {
  errors.push('[SCHEMA DRIFT] ALLOWED_BOOKING_FIELDS não pode conter "meeting_platform" (coluna inexistente em public.bookings).');
}

if (catalog?.tables?.bookings?.columns) {
  const dbBookingCols = catalog.tables.bookings.columns;
  for (const field of allowedBookingFields) {
    if (!dbBookingCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_BOOKING_FIELDS não existe no catálogo de public.bookings.`);
    }
  }
}

const allowedPaymentFields = parseExportedArray('src/services/paymentService.js', 'ALLOWED_PAYMENT_FIELDS');
if (catalog?.tables?.payments?.columns) {
  const dbPaymentCols = catalog.tables.payments.columns;
  for (const field of allowedPaymentFields) {
    if (!dbPaymentCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_PAYMENT_FIELDS não existe no catálogo de public.payments.`);
    }
  }
}

const allowedPatientFields = parseExportedArray('src/services/patientService.js', 'ALLOWED_PATIENT_NOTE_FIELDS');
if (catalog?.tables?.patient_notes?.columns) {
  const dbPatientCols = catalog.tables.patient_notes.columns;
  for (const field of allowedPatientFields) {
    if (!dbPatientCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_PATIENT_NOTE_FIELDS não existe no catálogo de public.patient_notes.`);
    }
  }
}

const allowedRefundFields = parseExportedArray('src/services/refundService.js', 'ALLOWED_PAYMENT_REFUND_FIELDS');
if (catalog?.tables?.payment_refunds?.columns) {
  const dbRefundCols = catalog.tables.payment_refunds.columns;
  for (const field of allowedRefundFields) {
    if (!dbRefundCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_PAYMENT_REFUND_FIELDS não existe no catálogo de public.payment_refunds.`);
    }
  }
}

const allowedLedgerFields = parseExportedArray('src/services/refundService.js', 'ALLOWED_PAYMENT_LEDGER_FIELDS');
if (catalog?.tables?.payment_ledger_entries?.columns) {
  const dbLedgerCols = catalog.tables.payment_ledger_entries.columns;
  for (const field of allowedLedgerFields) {
    if (!dbLedgerCols.includes(field)) {
      errors.push(`[SCHEMA DRIFT] Campo "${field}" em ALLOWED_PAYMENT_LEDGER_FIELDS não existe no catálogo de public.payment_ledger_entries.`);
    }
  }
}

// Componente ProfileTab não deve tentar mutações diretas
checkFileNotContains(
  'src/components/admin/professional-hub/ProfileTab.jsx',
  [".from('professionals').update", ".from('professionals').insert"],
  'ProfileTab.jsx deve usar professionalService e não mutações diretas'
);

// Componente ScheduleTab não deve fazer queries diretas a bookings
checkFileNotContains(
  'src/components/admin/professional-hub/ScheduleTab.jsx',
  [".from('bookings')"],
  'ScheduleTab.jsx deve usar bookingService.listBookings e não .from(\'bookings\')'
);

// Componentes de checkout não devem fazer queries diretas a payments
checkFileNotContains(
  'src/pages/CheckoutSuccessPage.jsx',
  [".from('payments')"],
  'CheckoutSuccessPage.jsx deve usar paymentService.getPaymentByMpId'
);
checkFileNotContains(
  'src/pages/CheckoutFailurePage.jsx',
  [".from('payments')"],
  'CheckoutFailurePage.jsx deve usar paymentService.getPaymentByMpId'
);

// Componente de acompanhamento do paciente não deve fazer queries diretas a patient_notes_history
checkFileNotContains(
  'src/components/shared/PatientAcompanhamento.jsx',
  [".from('patient_notes_history')"],
  'PatientAcompanhamento.jsx deve usar patientService.getPatientHomeworkTasks'
);

// 3. Verificação de Memória e Documentação
console.log('3️⃣  Validando integridade da memória do squad e documentação...');
if (checkFileExists('ARCH.md', 'Documentação de Arquitetura')) {
  checkFileContains(
    'ARCH.md',
    [
      'booking_date, booking_time',
      'patient_name, patient_email, patient_phone',
      'professionalService.js',
      'bookingService.js',
      'paymentService.js',
      'patientService.js',
      'databaseCatalog.json'
    ],
    'ARCH.md com schemas e serviços canônicos documentados'
  );
}

if (checkFileExists('.squad/CORE_INVARIANTS.md', 'Invariantes Centrais (Tier 1)')) {
  checkFileContains(
    '.squad/CORE_INVARIANTS.md',
    ['professionalService.js', 'bookingService.js', 'paymentService.js', 'patientService.js', 'npm run squad:check'],
    'CORE_INVARIANTS.md com catálogo completo de serviços e pipeline'
  );
}

if (checkFileExists('.squad/03_SQUAD_MEMORY.md', 'Memória do Squad (Tier 2)')) {
  checkFileContains(
    '.squad/03_SQUAD_MEMORY.md',
    ['ADR 006', 'ADR 007', 'ADR 008', 'ADR 009', 'ADR 010', 'ADR 011'],
    'Memória do Squad com histórico completo de ADRs (006 a 011)'
  );
}

// 4. Verificação de Testes Unitários de Domínio
console.log('4️⃣  Validando presença de suítes de testes de domínio...');
checkFileExists('src/services/__tests__/professionalService.test.js', 'Testes unitários de professionalService');
checkFileExists('src/services/__tests__/bookingService.test.js', 'Testes unitários de bookingService');
checkFileExists('src/services/__tests__/paymentService.test.js', 'Testes unitários de paymentService');
checkFileExists('src/services/__tests__/patientService.test.js', 'Testes unitários de patientService');
checkFileExists('src/services/__tests__/refundService.test.js', 'Testes unitários de refundService');
checkFileExists('src/services/__tests__/schemaValidator.test.js', 'Testes unitários de schemaValidator');

// 5. Verificação de Blindagem de Segurança & RBAC (Onda 1 / ADR 012)
console.log('5️⃣  Validando blindagem de segurança & RBAC centralizado (Onda 1)...');
if (checkFileExists('supabase/functions/_shared/auth.ts', 'Módulo centralizado de autenticação e RBAC')) {
  checkFileContains(
    'supabase/functions/_shared/auth.ts',
    [
      'export function getUserRoles',
      'export function isAdminUser',
      'export async function requireAdmin',
      'export function hasAnyRole',
      'export class AuthError'
    ],
    'supabase/functions/_shared/auth.ts'
  );
}

// Funções administrativas não devem validar permissão diretamente em user_metadata
checkFileNotContains(
  'supabase/functions/admin-update-user/index.ts',
  ['user.user_metadata?.role'],
  'admin-update-user deve usar requireAdmin e não user.user_metadata?.role'
);
checkFileNotContains(
  'supabase/functions/admin-delete-user/index.ts',
  ['user.user_metadata?.role'],
  'admin-delete-user deve usar requireAdmin e não user.user_metadata?.role'
);
checkFileNotContains(
  'supabase/functions/admin-list-users/index.ts',
  ['user.user_metadata?.role'],
  'admin-list-users deve usar requireAdmin e não user.user_metadata?.role'
);

// Content-Security-Policy em index.html
if (checkFileExists('index.html', 'Página principal')) {
  checkFileContains(
    'index.html',
    ['http-equiv="Content-Security-Policy"'],
    'index.html com CSP estrita configurada'
  );
}

// 6. Verificação de Resiliência Fintech & Ingestão Assíncrona de Webhooks (Onda 2 / ADR 013)
console.log('6️⃣  Validando resiliência fintech & idempotência de webhooks (Onda 2)...');
if (checkFileExists('supabase/functions/mp-webhook/index.ts', 'Webhook do Mercado Pago')) {
  checkFileContains(
    'supabase/functions/mp-webhook/index.ts',
    [
      'IDEMPOTENCY GUARD',
      'idempotent_duplicate',
      'existingProcessedPayment'
    ],
    'mp-webhook com barreira de idempotência ativa'
  );
  checkFileNotContains(
    'supabase/functions/mp-webhook/index.ts',
    ["await supabase.functions.invoke('emit-nfse'"],
    'mp-webhook não deve bloquear retorno HTTP aguardando emit-nfse (deve ser assíncrono)'
  );
}

if (checkFileExists('src/services/paymentService.js', 'Serviço de pagamentos')) {
  checkFileContains(
    'src/services/paymentService.js',
    ['idempotency_key'],
    'paymentService com suporte a idempotency_key'
  );
}

// 7. Verificação de Reatividade & Camada de Cache TanStack Query (Onda 3 / ADR 014)
console.log('7️⃣  Validando camada de cache reativo TanStack Query e hooks canônicos (Onda 3)...');
const requiredQueryFiles = [
  ['src/hooks/queries/index.js', 'Barrel export de hooks de queries'],
  ['src/hooks/queries/useProfessionalsQuery.js', 'Hook canônico de profissionais'],
  ['src/hooks/queries/useBookingsQuery.js', 'Hook canônico de agendamentos'],
  ['src/hooks/queries/usePaymentStatusQuery.js', 'Hook canônico de status de pagamento'],
  ['src/hooks/queries/usePatientHistoryQuery.js', 'Hook canônico de histórico do paciente'],
  ['src/hooks/queries/useBookingMutations.js', 'Mutações canônicas com invalidação de cache']
];

for (const [file, desc] of requiredQueryFiles) {
  checkFileExists(file, desc);
}

if (checkFileExists('src/hooks/queries/useProfessionalsQuery.js', 'Hook de profissionais')) {
  checkFileContains(
    'src/hooks/queries/useProfessionalsQuery.js',
    ['useProfessionalsQuery', 'useProfessionalDetailQuery', 'PROFESSIONALS_QUERY_KEY'],
    'useProfessionalsQuery.js'
  );
}

if (checkFileExists('src/hooks/queries/useBookingsQuery.js', 'Hook de agendamentos')) {
  checkFileContains(
    'src/hooks/queries/useBookingsQuery.js',
    ['useBookingsQuery', 'usePatientBookingsQuery', 'BOOKINGS_QUERY_KEY', 'PATIENT_BOOKINGS_QUERY_KEY'],
    'useBookingsQuery.js'
  );
}

if (checkFileExists('src/hooks/queries/usePaymentStatusQuery.js', 'Hook de pagamentos')) {
  checkFileContains(
    'src/hooks/queries/usePaymentStatusQuery.js',
    ['usePaymentStatusQuery', 'usePaymentByIdQuery', 'PAYMENTS_QUERY_KEY'],
    'usePaymentStatusQuery.js'
  );
}

if (checkFileExists('src/hooks/queries/usePatientHistoryQuery.js', 'Hook de histórico')) {
  checkFileContains(
    'src/hooks/queries/usePatientHistoryQuery.js',
    ['usePatientHomeworkTasksQuery', 'usePatientNotesHistoryQuery', 'PATIENT_HISTORY_QUERY_KEY'],
    'usePatientHistoryQuery.js'
  );
}

if (checkFileExists('src/hooks/queries/useBookingMutations.js', 'Mutações de agendamento')) {
  checkFileContains(
    'src/hooks/queries/useBookingMutations.js',
    ['useCreateBookingMutation', 'useUpdateBookingStatusMutation', 'useRescheduleBookingMutation', 'invalidateQueries'],
    'useBookingMutations.js'
  );
}

if (checkFileExists('src/hooks/booking/useBookingData.js', 'Hook de dados de agendamento')) {
  checkFileContains(
    'src/hooks/booking/useBookingData.js',
    ['DEFAULT_STALE_TIME', 'DEFAULT_GC_TIME', 'staleTime: DEFAULT_STALE_TIME', 'gcTime: DEFAULT_GC_TIME'],
    'useBookingData.js com configuração de cache explícita (anti-flicker)'
  );
}

if (checkFileExists('src/pages/PacientePage.jsx', 'Portal do paciente')) {
  checkFileContains(
    'src/pages/PacientePage.jsx',
    ['usePatientBookingsQuery', 'usePatientReviewsQuery', 'invalidateQueries'],
    'PacientePage.jsx integrado ao TanStack Query reativo'
  );
}

// 8. Verificação de Desmembramento Estrutural de God Components & Observabilidade RUM (Onda 4 / ADR 015)
console.log('8️⃣  Validando desmembramento dos God Components & observabilidade RUM (Onda 4)...');
const requiredModularTabFiles = [
  ['src/lib/observability/rumMonitoring.js', 'Módulo de telemetria RUM e Web Vitals'],
  ['src/lib/observability/__tests__/rumMonitoring.test.js', 'Testes unitários de RUM monitoring'],
  ['src/components/admin/tabs/index.js', 'Barrel export de abas administrativas'],
  ['src/components/admin/tabs/AdminBookingsTab.jsx', 'Aba modular de agendamentos operacionais'],
  ['src/components/admin/tabs/AdminEventsTab.jsx', 'Aba modular de gestão de eventos'],
  ['src/components/admin/tabs/AdminServicesTab.jsx', 'Aba modular de serviços clínicos'],
  ['src/components/admin/tabs/AdminProfessionalsTab.jsx', 'Aba modular de perfil profissional'],
  ['src/components/admin/tabs/AdminPaymentsTab.jsx', 'Aba modular de pagamentos e repasses'],
  ['src/components/admin/tabs/AdminTestimonialsTab.jsx', 'Aba modular de moderação de depoimentos'],
  ['src/components/admin/tabs/__tests__/adminTabs.test.jsx', 'Testes unitários das abas modulares']
];

for (const [file, desc] of requiredModularTabFiles) {
  checkFileExists(file, desc);
}

if (checkFileExists('src/lib/observability/rumMonitoring.js', 'Módulo RUM')) {
  checkFileContains(
    'src/lib/observability/rumMonitoring.js',
    ['recordMetric', 'trackApiLatency', 'initRumMonitoring', 'getRumHealthScore', 'addHealthAlertListener'],
    'src/lib/observability/rumMonitoring.js'
  );
}

if (checkFileExists('src/App.jsx', 'Aplicação raiz')) {
  checkFileContains(
    'src/App.jsx',
    ['initRumMonitoring'],
    'App.jsx com inicialização ativa de telemetria RUM'
  );
}

if (checkFileExists('src/pages/AdminPage.jsx', 'AdminPage modular')) {
  checkFileContains(
    'src/pages/AdminPage.jsx',
    ['AdminBookingsTab', 'AdminEventsTab', 'AdminServicesTab', 'AdminProfessionalsTab', 'AdminPaymentsTab', 'AdminTestimonialsTab'],
    'AdminPage.jsx desmembrado consumindo abas modulares'
  );
}

if (checkFileExists('src/pages/ProfessionalDashboardPage.jsx', 'ProfessionalDashboardPage modular')) {
  checkFileContains(
    'src/pages/ProfessionalDashboardPage.jsx',
    ['AdminBookingsTab', 'AdminEventsTab', 'AdminServicesTab', 'AdminProfessionalsTab', 'AdminPaymentsTab', 'AdminTestimonialsTab'],
    'ProfessionalDashboardPage.jsx desmembrado consumindo abas modulares'
  );
}

// Relatório Final
console.log('\n--------------------------------------------------');
if (errors.length === 0) {
  console.log('✅ TODOS OS GUARDRAILS PASSARAM COM SUCESSO (100% CONFORME)!');
  console.log('--------------------------------------------------\n');
  process.exit(0);
} else {
  console.error('❌ FORAM ENCONTRADAS VIOLAÇÕES DE GUARDRAILS:');
  errors.forEach((err, idx) => {
    console.error(`  ${idx + 1}. ${err}`);
  });
  console.log('--------------------------------------------------\n');
  process.exit(1);
}
