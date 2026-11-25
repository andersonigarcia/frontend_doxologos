import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfessionalScheduleCockpit } from '../ProfessionalScheduleCockpit';
import { ImmediateCareCard } from '../ImmediateCareCard';

const localDate = new Date().toLocaleDateString('en-CA');

const mockAppointment = {
    id: 'bk-room-123',
    booking_date: localDate,
    booking_time: '19:00',
    status: 'confirmed',
    patient_name: 'Paciente Teste',
    patient_phone: '31999990000',
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    service: { name: 'Psicoterapia Individual' }
};

describe('Unificação da Sala Virtual da Plataforma (/sala-espera/:id)', () => {
    it('ProfessionalScheduleCockpit deve direcionar botão Entrar para /sala-espera/:id mesmo quando houver meeting_link', () => {
        render(
            <ProfessionalScheduleCockpit
                bookings={[mockAppointment]}
                currentProfessional={{ id: 'prof-1', name: 'Dr. Rodrigo' }}
            />
        );

        const enterLink = screen.getByRole('link', { name: /Entrar/i });
        expect(enterLink).toHaveAttribute('href', '/sala-espera/bk-room-123');
    });

    it('ImmediateCareCard deve direcionar Iniciar Consulta Agora para /sala-espera/:id mesmo quando houver meeting_link', () => {
        render(<ImmediateCareCard appointment={mockAppointment} />);

        const startLink = screen.getByRole('link', { name: /Iniciar Consulta Agora/i });
        expect(startLink).toHaveAttribute('href', '/sala-espera/bk-room-123');
    });
});

