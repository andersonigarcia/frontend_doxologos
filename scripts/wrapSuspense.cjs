const fs = require('fs');
const path = 'c:/Users/ander/source/repos/frontend_doxologos/src/pages/AdminPage.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<TabsContent([^>]*)>/g, '<TabsContent$1>\n<Suspense fallback={<div className="p-8 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-[#2d8659]" /></div>}>');
content = content.replace(/<\/TabsContent>/g, '</Suspense>\n</TabsContent>');

fs.writeFileSync(path, content);
console.log('Done wrapping TabsContent with Suspense.');
