const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminPage.jsx', 'utf8');

const lines = content.split('\n');
let startIdx = -1;
let endIdx = -1;
let openCount = 0;
let inside = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('<TabsContent value="bookings"')) {
        startIdx = i;
        inside = true;
    }
    
    if (inside) {
        if (line.includes('<TabsContent')) openCount++;
        if (line.includes('</TabsContent>')) {
            openCount--;
            if (openCount === 0) {
                endIdx = i;
                break;
            }
        }
    }
}

console.log(`Start: ${startIdx + 1}, End: ${endIdx + 1}`);
