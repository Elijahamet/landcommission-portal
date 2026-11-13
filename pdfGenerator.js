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
      // Create A4 PDF with exact dimensions (Strictly 1 single page)
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 20, bottom: 20, left: 38, right: 38 },
        autoFirstPage: true
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Target URL for vector QR code: ALWAYS strictly linked to this record's unique ID
      const OFFICIAL_PERMANENT_BASE = 'https://ghanacorsnet-verify.vercel.app';
      const cleanRef = encodeURIComponent(String(record.referenceId || record.id || '').trim().toUpperCase());
      const qrTarget = `${OFFICIAL_PERMANENT_BASE}/verify/${cleanRef}`;

      const pageWidth = doc.page.width; // 595.28 pt
      const leftMargin = 32.10;
      const rightMargin = 32.10;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 531.08 pt

      // Function to render one half slip
      function renderSlip(startY) {
        let y = startY;

        // 1. Header
        doc.font('Helvetica-Bold').fontSize(12.75).fillColor('#000000')
          .text('LANDS COMMISSION', leftMargin, y, { lineBreak: false });
        y += 13.9;

        doc.font('Helvetica').fontSize(9.0).fillColor('#333333')
          .text('SURVEY AND MAPPING DIVISION', leftMargin, y, { lineBreak: false });
        y += 11.9;

        doc.font('Helvetica-Bold').fontSize(8.25).fillColor('#444444')
          .text('EX DATA', leftMargin, y, { lineBreak: false });
        y += 7.0; // Starts table directly below EX DATA

        // 2. Table: BEACON INDEX | X | Y (Exact reference dimensions: 264.05, 122.99, 143.30)
        const tableX = 32.47;
        const colWidthIndex = 264.05;
        const colWidthX = 122.99;
        const colWidthY = 143.30;
        const headerHeight = 14.5;
        const rowHeight = (record.beacons && record.beacons.length > 2) ? 12.5 : 14.0;

        // Header background fill (#f0f0f0) & borders (#cccccc, 0.75pt)
        doc.save();
        doc.rect(tableX, y, colWidthIndex + colWidthX + colWidthY, headerHeight).fill('#f0f0f0');
        doc.strokeColor('#cccccc').lineWidth(0.75);
        doc.rect(tableX, y, colWidthIndex + colWidthX + colWidthY, headerHeight).stroke();

        // Header vertical dividers
        doc.moveTo(tableX + colWidthIndex, y).lineTo(tableX + colWidthIndex, y + headerHeight).stroke();
        doc.moveTo(tableX + colWidthIndex + colWidthX, y).lineTo(tableX + colWidthIndex + colWidthX, y + headerHeight).stroke();

        // Header text
        doc.font('Helvetica-Bold').fontSize(8.25).fillColor('#000000');
        doc.text('BEACON INDEX', tableX + 4.1, y + 3.2, { lineBreak: false });
        doc.text('X', tableX + colWidthIndex + 4.1, y + 3.2, { lineBreak: false });
        doc.text('Y', tableX + colWidthIndex + colWidthX + 4.1, y + 3.2, { lineBreak: false });
        doc.restore();

        y += headerHeight;

        // Table Rows
        const beacons = record.beacons && record.beacons.length > 0 
          ? record.beacons 
          : [{ beaconIndex: 'SGGA CORS/2025/4', x: '434768.62', y: '1230591.872' }];

        beacons.forEach(b => {
          doc.save();
          doc.strokeColor('#cccccc').lineWidth(0.75);
          doc.rect(tableX, y, colWidthIndex + colWidthX + colWidthY, rowHeight).stroke();
          doc.moveTo(tableX + colWidthIndex, y).lineTo(tableX + colWidthIndex, y + rowHeight).stroke();
          doc.moveTo(tableX + colWidthIndex + colWidthX, y).lineTo(tableX + colWidthIndex + colWidthX, y + rowHeight).stroke();

          doc.font('Helvetica').fontSize(8.25).fillColor('#000000');
          doc.text(String(b.beaconIndex || ''), tableX + 4.1, y + 2.8, { lineBreak: false });
          doc.text(String(b.x || ''), tableX + colWidthIndex + 4.1, y + 2.8, { lineBreak: false });
          doc.text(String(b.y || ''), tableX + colWidthIndex + colWidthX + 4.1, y + 2.8, { lineBreak: false });
          doc.restore();

          y += rowHeight;
        });

        y += (beacons.length > 2) ? 10.0 : 13.5;

        // 3. Client Name (Baseline at exact reference offset)
        doc.font('Helvetica-Bold').fontSize(8.25).fillColor('#000000');
        doc.text('CLIENT NAME: ', 36.60, y, { continued: true });
        doc.font('Helvetica').text(String(record.clientName || ''));
        y += 17.5;

        // 4. Two-Column Metadata (Generous readable spacing between lines)
        const col1X = 36.60;
        const col2X = 302.14;
        const rowSpacing = 17.5;

        // Row 1
        doc.font('Helvetica-Bold').fontSize(8.25).fillColor('#000000');
        doc.text('REFERENCE ID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.referenceId || record.id || ''));

        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('VERIFICATION CODE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.verificationCode || ''));

        y += rowSpacing;

        // Row 2
        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('REGIONAL NUMBER: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.regionalNumber || ''));

        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('REGION: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.region || ''));

        y += rowSpacing;

        // Row 3
        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('LOCALITY: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.locality || ''));

        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('PROCESSED POINTS: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.processedPoints || ''));

        y += rowSpacing;

        // Row 4
        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('AMOUNT PAID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.amountPaid || ''));

        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text('DATE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.date || ''));

        y += rowSpacing;

        // Row 5
        doc.font('Helvetica-Bold').fontSize(8.25);
        doc.text("SURVEYOR'S NAME: ", col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.surveyorName || ''));

        y += 7.0;

        // 5. Centered Approved Vector QR Code (45 pt size, strictly preserved)
        const qrSize = 45.0;
        const qrX = 275.14;
        drawVectorQRCode(doc, qrTarget, qrX, y, qrSize);
        y += qrSize + 4.0;

        // Thin horizontal separator line right under QR code (0.75pt, #dddddd)
        doc.save();
        doc.strokeColor('#dddddd').lineWidth(0.75);
        doc.moveTo(leftMargin, y).lineTo(leftMargin + contentWidth, y).stroke();
        doc.restore();
        y += 12.0;

        // 6. Authorization (Centered Title at 9.0pt, 4 dotted lines from X: 192.85 to 561.31)
        doc.font('Helvetica-Bold').fontSize(9.0).fillColor('#000000')
          .text('AUTHORIZATION', leftMargin, y, { width: contentWidth, align: 'center' });
        y += 14.0;

        const authDotsStartX = 192.85;
        const authDotsEndX = 561.31;
        const authRowSpacing = 17.5;

        function drawDottedField(label, curY, value = '') {
          doc.font('Helvetica-Bold').fontSize(8.25).fillColor('#000000').text(label, 33.60, curY, { lineBreak: false });
          if (value) {
            doc.font('Helvetica').fontSize(8.25).fillColor('#000000').text(value, authDotsStartX + 4, curY, { lineBreak: false });
          }
          // Exact crisp dotted line ([0.003, 1.5], 0.75pt width, black)
          doc.save();
          doc.strokeColor('#000000').lineWidth(0.75).dash(0.003, { space: 1.5 });
          doc.moveTo(authDotsStartX, curY + 7.5).lineTo(authDotsEndX, curY + 7.5).stroke();
          doc.restore();
        }

        drawDottedField('SMD OFFICER NAME:', y, record.smdOfficerName || '');
        y += authRowSpacing;
        drawDottedField('SIGNATURE:', y);
        y += authRowSpacing;
        drawDottedField('DATE:', y);
        y += authRowSpacing;
        drawDottedField('STAMP:', y);
        y += 8.25;

        return y;
      }

      // Render Slip 1 (Top / Official Copy, generous space at the tip of the PDF: Y: 45.0)
      renderSlip(45.0);

      // Cut Line Divider at centered position Y: 414.0 (Dash: [5.67, 6.78], width: 1.5pt, #999999)
      const midY = 414.0;
      doc.save();
      doc.strokeColor('#999999').lineWidth(1.5).dash(5.67, { space: 6.78 });
      doc.moveTo(29.10, midY).lineTo(270.00, midY).stroke();
      doc.moveTo(325.00, midY).lineTo(566.00, midY).stroke();
      doc.restore();

      doc.font('Helvetica').fontSize(6.0).fillColor('#999999')
        .text('✂ CUT HERE ✂', 270.00, midY - 3.5, {
          width: 55.00,
          align: 'center'
        });

      // Render Slip 2 (Bottom / Customer Copy, pushed UP to Y: 430.0 so there is plenty of space below lines at the bottom)
      renderSlip(430.0);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSlipPDF };

