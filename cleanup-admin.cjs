const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminPage.jsx', 'utf-8');

// The `isProfessionalView` is used to hide/show stuff in AdminPage.
// We can just set it to false permanently since professionals won't access this page.
content = content.replace(/const isProfessionalView = .*;/g, 'const isProfessionalView = false;');

fs.writeFileSync('src/pages/AdminPage.jsx', content);
console.log('Cleaned up AdminPage.jsx');
