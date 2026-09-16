const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminPage.jsx', 'utf-8');

// Replace "AdminPage" with "ProfessionalDashboardPage"
content = content.replace(/export default function AdminPage/g, 'export default function ProfessionalDashboardPage');
content = content.replace(/AdminPage/g, 'ProfessionalDashboardPage');

// Replace AdminSidebar with ProfessionalSidebar
content = content.replace(/import { AdminSidebar } from '@\/components\/admin\/AdminSidebar';/, "import { ProfessionalSidebar } from '@/components/admin/ProfessionalSidebar';");
content = content.replace(/<AdminSidebar([\s\S]*?)\/>/, `<ProfessionalSidebar activeTab={activeTab} setActiveTab={setActiveTab} userName={userName} />`);

// Write the new page
fs.writeFileSync('src/pages/ProfessionalDashboardPage.jsx', content);
console.log('Created ProfessionalDashboardPage.jsx');
