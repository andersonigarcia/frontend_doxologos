const fs = require('fs');

const content = fs.readFileSync('src/pages/AdminPage.jsx', 'utf-8');

// Helper to extract a component based on a start tag and balanced tags.
function extractTag(content, startStr) {
    const startIdx = content.indexOf(startStr);
    if (startIdx === -1) return null;

    let tagCount = 0;
    let i = startIdx;
    let inString = false;
    let stringChar = '';

    while (i < content.length) {
        if (!inString && (content[i] === '"' || content[i] === "'" || content[i] === '`')) {
            inString = true;
            stringChar = content[i];
        } else if (inString && content[i] === stringChar && content[i - 1] !== '\\') {
            inString = false;
        }

        if (!inString) {
            if (content.substring(i, i + 12) === '<TabsContent') {
                tagCount++;
                i += 11;
            } else if (content.substring(i, i + 14) === '</TabsContent>') {
                tagCount--;
                if (tagCount === 0) {
                    return content.substring(startIdx, i + 14);
                }
                i += 13;
            }
        }
        i++;
    }
    return null;
}

const bookingsTab = extractTag(content, '<TabsContent value="bookings"');
fs.writeFileSync('bookings.jsx', bookingsTab || 'NOT FOUND');

const professionalsTab = extractTag(content, '<TabsContent value="professionals"');
fs.writeFileSync('professionals.jsx', professionalsTab || 'NOT FOUND');

console.log("Done extracting.");
