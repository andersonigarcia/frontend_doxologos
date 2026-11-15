const fs = require('fs');

let content = fs.readFileSync('src/pages/ProfessionalDashboardPage.jsx', 'utf-8');

// Replace empty ternaries like:
// {condition ? (
//    
// ) : (
content = content.replace(/\? \(\s*\) : \(/g, '? null : (');

fs.writeFileSync('src/pages/ProfessionalDashboardPage.jsx', content);
console.log('Fixed ternaries in ProfessionalDashboardPage.jsx');
