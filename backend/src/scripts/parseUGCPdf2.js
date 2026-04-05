/**
 * Parse UGC Universities PDF using pdfjs-dist
 */
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function main() {
  const pdfPath = path.join(__dirname, '../../data/ugc_universities.pdf');

  if (!fs.existsSync(pdfPath)) {
    console.log('PDF not found:', pdfPath);
    return;
  }

  console.log('Reading PDF...');
  const data = new Uint8Array(fs.readFileSync(pdfPath));

  try {
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    console.log('Pages:', pdf.numPages);

    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n` + pageText;
    }

    // Save to file
    const textPath = path.join(__dirname, '../../data/ugc_universities.txt');
    fs.writeFileSync(textPath, fullText);
    console.log('Text saved to:', textPath);

    // Show first part
    console.log('\n=== First 5000 characters ===\n');
    console.log(fullText.substring(0, 5000));

  } catch (err) {
    console.log('Error:', err.message);
  }
}

main();
