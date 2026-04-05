/**
 * Parse UGC Universities PDF
 */
import * as fs from 'fs';
import * as path from 'path';

// Try to use pdf-parse
const pdfParse = require('pdf-parse');

async function main() {
  const pdfPath = path.join(__dirname, '../../data/ugc_universities.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.log('PDF not found:', pdfPath);
    return;
  }

  console.log('Reading PDF...');
  const dataBuffer = fs.readFileSync(pdfPath);

  try {
    const data = await pdfParse(dataBuffer);

    console.log('Pages:', data.numpages);
    console.log('Text length:', data.text.length);

    // Save text to file for analysis
    const textPath = path.join(__dirname, '../../data/ugc_universities.txt');
    fs.writeFileSync(textPath, data.text);
    console.log('Text saved to:', textPath);

    // Show first part
    console.log('\n=== First 5000 characters ===\n');
    console.log(data.text.substring(0, 5000));

  } catch (err: any) {
    console.log('Error parsing PDF:', err.message);
  }
}

main();
