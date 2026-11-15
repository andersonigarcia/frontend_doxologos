const fs = require('fs');

let content = fs.readFileSync('src/pages/ProfessionalDashboardPage.jsx', 'utf-8');

// The safe tabs are: bookings, availability, financeiro, professionals
// We want to remove all other <TabsContent value="...">...</TabsContent>
// But wait, regexing HTML is hard. Instead, we can just replace the AdminSidebar with ProfessionalSidebar,
// and since ProfessionalSidebar only sets activeTab to one of the 4, the others will never render.
// However, for security (Zero-Trust), we should remove them.
// A simpler way: we just remove the `userRole === 'admin'` checks and `TabsContent` that are obviously for admin.
// Wait, since ProfessionalSidebar only exposes 4 tabs, the professional can NEVER click to the other tabs!
// And if they manually set state (impossible from outside React), it wouldn't render because the config doesn't list it.
// The easiest security fix is to remove the StrategicCockpit, FinancialControlModule, etc., from the imports, and just leave the `<TabsContent>` empty or just let them be dead code. But dead code is bad.

// Let's remove the biggest chunks by string replacement.
const chunksToRemove = [
    '<TabsContent value="dashboard"',
    '<TabsContent value="financial-control"',
    '<TabsContent value="payments"',
    '<TabsContent value="profit-loss"',
    '<TabsContent value="livro-caixa"',
    '<TabsContent value="nfse"',
    '<TabsContent value="services"',
    '<TabsContent value="events"',
    '<TabsContent value="growth"',
    '<TabsContent value="event-registrations"',
    '<TabsContent value="testimonials"',
    '<TabsContent value="refunds"',
    '<TabsContent value="settings"',
    '<TabsContent value="blog"',
    '<TabsContent value="book-resources"',
    '<TabsContent value="assessment-leads"'
];

// We will just do a simple trick: if it's not one of the safe tabs, we don't render it.
// We can wrap the giant Tabs block in a condition, or replace the entire `<TabsContent value="dashboard"` up to its closing tag.
// Actually, since I am a script, I can just do:

let newContent = content;
// Replace everything between <TabsContent value="dashboard" and its closing tag with nothing.
// Doing this manually via regex is tricky.

// Just remove all admin-only imports to prevent them from being bundled!
const importsToRemove = [
    'StrategicCockpitModule',
    'FinancialControlModule',
    'SystemSettingsManager',
    'PatientAnalyticsDashboard',
    'EventRegistrationsDashboard',
    'BlogManagementDashboard',
    'BookResourcesAdminSection',
    'AssessmentLeadsSection',
    'RevenueChart',
    'ProfitLossDashboard',
    'LedgerTable',
    'LedgerStats',
    'LedgerCharts',
    'DashboardGrowth',
    'CostFormModal',
    'RefundRequestDashboard',
    'NfseResilienceDashboard'
];

importsToRemove.forEach(imp => {
    newContent = newContent.replace(new RegExp(`import.*${imp}.*;\\n?`, 'g'), '');
    newContent = newContent.replace(new RegExp(`const ${imp}.*\\n?`, 'g'), '');
    // Also remove them from the JSX: <StrategicCockpitModule ... /> -> null
    newContent = newContent.replace(new RegExp(`<${imp}[\\s\\S]*?\\/>`, 'g'), '');
});

fs.writeFileSync('src/pages/ProfessionalDashboardPage.jsx', newContent);
console.log('Cleaned up ProfessionalDashboardPage.jsx');
