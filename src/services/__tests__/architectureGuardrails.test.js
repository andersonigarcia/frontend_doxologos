import { ALLOWED_PROFESSIONAL_FIELDS } from '../professionalService';
import { ALLOWED_BOOKING_FIELDS, VALID_BOOKING_STATUSES } from '../bookingService';
import fs from 'fs';
import path from 'path';

describe('Architecture & Pipeline Guardrails (Fase 4)', () => {
  it('ALLOWED_PROFESSIONAL_FIELDS não deve conter "email" nem "password"', () => {
    expect(ALLOWED_PROFESSIONAL_FIELDS).not.toContain('email');
    expect(ALLOWED_PROFESSIONAL_FIELDS).not.toContain('password');
  });

  it('ALLOWED_BOOKING_FIELDS não deve conter "meeting_platform" nem "service_name"', () => {
    expect(ALLOWED_BOOKING_FIELDS).not.toContain('meeting_platform');
    expect(ALLOWED_BOOKING_FIELDS).not.toContain('service_name');
    expect(ALLOWED_BOOKING_FIELDS).not.toContain('professional_name');
  });

  it('VALID_BOOKING_STATUSES deve conter os status canônicos fundamentais', () => {
    expect(VALID_BOOKING_STATUSES).toContain('pending_payment');
    expect(VALID_BOOKING_STATUSES).toContain('confirmed');
    expect(VALID_BOOKING_STATUSES).toContain('completed');
    expect(VALID_BOOKING_STATUSES).toContain('cancelled');
    expect(VALID_BOOKING_STATUSES).toContain('rescheduled');
  });

  it('ProfileTab.jsx não deve conter mutações diretas a professionals', () => {
    const filePath = path.resolve(__dirname, '../../components/admin/professional-hub/ProfileTab.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content.includes(".from('professionals').update")).toBe(false);
    expect(content.includes(".from('professionals').insert")).toBe(false);
  });

  it('ScheduleTab.jsx não deve conter queries diretas a bookings', () => {
    const filePath = path.resolve(__dirname, '../../components/admin/professional-hub/ScheduleTab.jsx');
    const content = fs.readFileSync(filePath, 'utf8');

    expect(content.includes(".from('bookings')")).toBe(false);
  });

  it('ALLOWED_PROFESSIONAL_FIELDS e ALLOWED_BOOKING_FIELDS devem conter apenas colunas existentes no databaseCatalog.json', () => {
    const catalogPath = path.resolve(__dirname, '../../constants/databaseCatalog.json');
    expect(fs.existsSync(catalogPath)).toBe(true);

    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    const profCols = catalog.tables.professionals.columns;
    const bookingCols = catalog.tables.bookings.columns;

    for (const field of ALLOWED_PROFESSIONAL_FIELDS) {
      expect(profCols).toContain(field);
    }

    for (const field of ALLOWED_BOOKING_FIELDS) {
      expect(bookingCols).toContain(field);
    }
  });

  it('CheckoutSuccessPage.jsx não deve conter queries diretas a payments', () => {
    const filePath = path.resolve(__dirname, '../../pages/CheckoutSuccessPage.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.includes(".from('payments')")).toBe(false);
  });

  it('PatientAcompanhamento.jsx não deve conter queries diretas a patient_notes_history', () => {
    const filePath = path.resolve(__dirname, '../../components/shared/PatientAcompanhamento.jsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content.includes(".from('patient_notes_history')")).toBe(false);
  });

  it('ALLOWED_PAYMENT_FIELDS e ALLOWED_PATIENT_NOTE_FIELDS devem conter apenas colunas existentes no databaseCatalog.json', () => {
    const catalogPath = path.resolve(__dirname, '../../constants/databaseCatalog.json');
    const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

    const paymentCols = catalog.tables.payments.columns;
    const patientCols = catalog.tables.patient_notes.columns;

    const { ALLOWED_PAYMENT_FIELDS } = require('../paymentService');
    const { ALLOWED_PATIENT_NOTE_FIELDS } = require('../patientService');

    for (const field of ALLOWED_PAYMENT_FIELDS) {
      expect(paymentCols).toContain(field);
    }

    for (const field of ALLOWED_PATIENT_NOTE_FIELDS) {
      expect(patientCols).toContain(field);
    }
  });
});
