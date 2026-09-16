import React from 'react';
import { AppointmentCalendar } from '@/components/admin/AppointmentCalendar';

const ScheduleTab = ({ professionalId }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <h2 className="text-xl font-semibold mb-4">Agenda do Profissional</h2>
      {/* Assumindo que AppointmentCalendar aceita um selectedAvailProfessional para filtrar */}
      <AppointmentCalendar 
        selectedAvailProfessional={professionalId} 
        isAdminView={true} 
      />
    </div>
  );
};

export default ScheduleTab;
