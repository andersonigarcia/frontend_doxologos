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
checkFileExists('src/services/__tests__/schemaValidator.test.js', 'Testes unitários de schemaValidator');

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
