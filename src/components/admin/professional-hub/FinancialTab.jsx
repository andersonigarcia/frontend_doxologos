import React from 'react';
import { FinancialDashboard } from '@/components/admin/FinancialDashboard';

const FinancialTab = ({ professionalId }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
      <FinancialDashboard 
        professionalId={professionalId} 
        isAdminView={true} 
      />
    </div>
  );
};

export default FinancialTab;
