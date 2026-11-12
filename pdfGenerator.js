const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Ensure Vercel @vercel/nft traces and bundles all standard font definitions
try {
  require('pdfkit/js/standard-fonts/Helvetica.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBold.cjs');
  require('pdfkit/js/standard-fonts/HelveticaOblique.cjs');
  require('pdfkit/js/standard-fonts/HelveticaBoldOblique.cjs');
  require('pdfkit/js/standard-fonts/Courier.cjs');
  require('pdfkit/js/standard-fonts/CourierBold.cjs');
  require('pdfkit/js/standard-fonts/TimesRoman.cjs');
  require('pdfkit/js/standard-fonts/TimesBold.cjs');
  require('pdfkit/js/standard-fonts/chunks/standardGlyphNames-DNHAb7rp.cjs');
} catch (e) {
  // Ignore in case running in an environment with different packaging
}

let logoBuffer = null;
try {
  const logoPath = path.join(__dirname, 'public', 'logo.png');
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
  }
} catch (e) {}

if (!logoBuffer) {
  try {
    const { data } = require('./logoData.json');
    if (data) {
      logoBuffer = Buffer.from(data, 'base64');
    }
  } catch (e) {}
}

// Function to draw 100% pure vector QR code with 4-module quiet zone, sharp edges, and zero pixelation
function drawVectorQRCode(doc, targetUrl, x, y, size) {
  const qr = QRCode.create(targetUrl, {
    errorCorrectionLevel: 'L'
  });

  const quietZone = 4; // Exactly 4 modules of white quiet zone on all sides
  const coreCount = qr.modules.size;
  const totalCount = coreCount + quietZone * 2;
  const modSize = size / totalCount;

  doc.save();

  // 1. Pure white (#FFFFFF) background quiet zone box
  doc.rect(x, y, size, size).fillColor('#ffffff').fill();

  // 2. Pure black (#000000) square modules with razor-sharp vector geometry
  // Draw each individual module as a distinct, perfectly aligned square (no merging, no overlap)
  doc.fillColor('#000000');

  for (let r = 0; r < coreCount; r++) {
    for (let c = 0; c < coreCount; c++) {
      if (qr.modules.get(r, c)) {
        const rectX = x + (c + quietZone) * modSize;
        const rectY = y + (r + quietZone) * modSize;
        doc.rect(rectX, rectY, modSize, modSize);
      }
    }
  }

  doc.fill();
  doc.restore();
}

async function generateSlipPDF(record, verificationUrl) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create A4 PDF with exact dimensions
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 32, bottom: 32, left: 38, right: 38 },
        autoFirstPage: true
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Target URL for vector QR code: ALWAYS strictly linked to this record's unique ID
      const OFFICIAL_PERMANENT_BASE = 'https://ghanacorsnet-verify.vercel.app';
      const cleanRef = encodeURIComponent(String(record.referenceId || record.id || '').trim().toUpperCase());
      const qrTarget = `${OFFICIAL_PERMANENT_BASE}/verify/${cleanRef}`;

      const pageWidth = doc.page.width;
      const leftMargin = 38;
      const rightMargin = 38;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      // Function to render one half slip
      function renderSlip(startY) {
        let y = startY;

        // 1. Header
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000')
          .text('LANDS COMMISSION', leftMargin, y, { characterSpacing: 0.5 });
        y += 15;

        doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
          .text('SURVEY AND MAPPING DIVISION', leftMargin, y, { characterSpacing: 0.3 });
        y += 11;

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111111')
          .text('EX DATA', leftMargin, y, { characterSpacing: 0.3 });
        y += 8; // No space between EX DATA and table (exact match to sample)

        // 2. Table: BEACON INDEX | X | Y
        const tableX = leftMargin;
        const colWidthIndex = contentWidth * 0.48;
        const colWidthX = contentWidth * 0.26;
        const colWidthY = contentWidth * 0.26;
        const headerHeight = 17;
        const rowHeight = 16;

        // Header background
        doc.rect(tableX, y, contentWidth, headerHeight).fill('#f1f3f5');
        doc.rect(tableX, y, contentWidth, headerHeight).strokeColor('#d0d5dd').lineWidth(0.6).stroke();

        // Header vertical dividers
        doc.moveTo(tableX + colWidthIndex, y).lineTo(tableX + colWidthIndex, y + headerHeight).stroke();
        doc.moveTo(tableX + colWidthIndex + colWidthX, y).lineTo(tableX + colWidthIndex + colWidthX, y + headerHeight).stroke();

        // Header text
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111');
        doc.text('BEACON INDEX', tableX + 6, y + 4.5);
        doc.text('X', tableX + colWidthIndex + 6, y + 4.5);
        doc.text('Y', tableX + colWidthIndex + colWidthX + 6, y + 4.5);

        y += headerHeight;

        // Table Rows
        const beacons = record.beacons && record.beacons.length > 0 
          ? record.beacons 
          : [{ beaconIndex: 'SGGA EX 19 1A', x: '333460.15', y: '1199651.081' }];

        beacons.forEach(b => {
          doc.rect(tableX, y, contentWidth, rowHeight).strokeColor('#d0d5dd').lineWidth(0.6).stroke();
          doc.moveTo(tableX + colWidthIndex, y).lineTo(tableX + colWidthIndex, y + rowHeight).stroke();
          doc.moveTo(tableX + colWidthIndex + colWidthX, y).lineTo(tableX + colWidthIndex + colWidthX, y + rowHeight).stroke();

          doc.font('Helvetica').fontSize(8).fillColor('#111111');
          doc.text(String(b.beaconIndex || ''), tableX + 6, y + 4.5);
          doc.text(String(b.x || ''), tableX + colWidthIndex + 6, y + 4.5);
          doc.text(String(b.y || ''), tableX + colWidthIndex + colWidthX + 6, y + 4.5);

          y += rowHeight;
        });

        y += 8;

        // 3. Client Name
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
        doc.text('CLIENT NAME: ', leftMargin, y, { continued: true });
        doc.font('Helvetica-Bold').text(String(record.clientName || ''));
        y += 16;

        // 4. Two-Column Metadata (With full blank line space in between text rows matching actual sample)
        const col1X = leftMargin;
        const col2X = leftMargin + contentWidth * 0.52;
        const rowSpacing = 18;

        // Row 1
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111');
        doc.text('REFERENCE ID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.referenceId || record.id || ''));

        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('VERIFICATION CODE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.verificationCode || ''));

        y += rowSpacing;

        // Row 2
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('REGIONAL NUMBER: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.regionalNumber || ''));

        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('REGION: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.region || ''));

        y += rowSpacing;

        // Row 3
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('LOCALITY: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.locality || ''));

        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('PROCESSED POINTS: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.processedPoints || ''));

        y += rowSpacing;

        // Row 4
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('AMOUNT PAID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.amountPaid || ''));

        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('DATE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.date || ''));

        y += rowSpacing;

        // Row 5
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text("SURVEYOR'S NAME: ", col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.surveyorName || ''));

        y += 16;

        // 5. Centered Vector QR Code (48 pt with 4-module quiet zone, 100% razor-sharp vector paths)
        const qrSize = 48;
        const qrX = leftMargin + (contentWidth - qrSize) / 2;
        drawVectorQRCode(doc, qrTarget, qrX, y, qrSize);
        y += qrSize + 6;

        // Thin horizontal separator line right under QR code (exact match to official sample)
        doc.save();
        doc.strokeColor('#dddddd').lineWidth(0.5);
        doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
        doc.restore();
        y += 14;

        // 6. Authorization
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111111')
          .text('AUTHORIZATION', leftMargin + (contentWidth - 100) / 2, y, { width: 100, align: 'center' });
        y += 14;

        const authLabelWidth = 115;
        const authLineX = leftMargin + authLabelWidth;
        const authLineWidth = contentWidth - authLabelWidth;

        function drawDottedField(label, curY, value = '') {
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111').text(label, leftMargin, curY);
          if (value) {
            doc.font('Helvetica').fontSize(7.5).text(value, authLineX + 5, curY);
          }
          // Dotted line
          doc.save();
          doc.strokeColor('#555555').lineWidth(0.5).dash(1.5, { space: 2 });
          doc.moveTo(authLineX, curY + 8).lineTo(leftMargin + contentWidth, curY + 8).stroke();
          doc.restore();
        }

        drawDottedField('SMD OFFICER NAME:', y, record.smdOfficerName || '');
        y += 13;
        drawDottedField('SIGNATURE:', y);
        y += 13;
        drawDottedField('DATE:', y);
        y += 13;
        drawDottedField('STAMP:', y);
        y += 14;

        return y;
      }

      // Render Slip 1 (Top / Official Copy)
      renderSlip(24);

      // Cut Line Divider in the middle of page
      const midY = 412;
      doc.save();
      doc.strokeColor('#888888').lineWidth(0.7).dash(5, { space: 4 });
      doc.moveTo(leftMargin, midY).lineTo(leftMargin + contentWidth * 0.42, midY).stroke();
      doc.moveTo(leftMargin + contentWidth * 0.58, midY).lineTo(leftMargin + contentWidth, midY).stroke();
      doc.restore();

      doc.font('Helvetica').fontSize(6.5).fillColor('#666666')
        .text('✂ CUT HERE ✂', leftMargin + contentWidth * 0.42, midY - 4, {
          width: contentWidth * 0.16,
          align: 'center'
        });

      // Render Slip 2 (Bottom / Customer Copy)
      renderSlip(425);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSlipPDF };

