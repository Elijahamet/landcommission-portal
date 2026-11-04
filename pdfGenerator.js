const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

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

      // Generate QR Code buffer
      const qrTarget = verificationUrl || record.verificationUrl || `http://localhost:5000/verify/${record.id || record.referenceId}`;
      const qrBuffer = await QRCode.toBuffer(qrTarget, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

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
        y += 14;

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

        y += 10;

        // 3. Client Name
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
        doc.text('CLIENT NAME: ', leftMargin, y, { continued: true });
        doc.font('Helvetica-Bold').text(String(record.clientName || ''));
        y += 14;

        // 4. Two-Column Metadata
        const col1X = leftMargin;
        const col2X = leftMargin + contentWidth * 0.52;
        const lineHeight = 12.5;

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111111');
        doc.text('REFERENCE ID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.referenceId || record.id || ''));

        // Col 2
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('VERIFICATION CODE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.verificationCode || ''));

        y += lineHeight;

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('REGIONAL NUMBER: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.regionalNumber || ''));

        // Col 2
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('REGION: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.region || ''));

        y += lineHeight;

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('LOCALITY: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.locality || ''));

        // Col 2
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('PROCESSED POINTS: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.processedPoints || ''));

        y += lineHeight;

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('AMOUNT PAID: ', col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.amountPaid || ''));

        // Col 2
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text('DATE: ', col2X, y, { continued: true });
        doc.font('Helvetica').text(String(record.date || ''));

        y += lineHeight;

        // Col 1
        doc.font('Helvetica-Bold').fontSize(7.5);
        doc.text("SURVEYOR'S NAME: ", col1X, y, { continued: true });
        doc.font('Helvetica').text(String(record.surveyorName || ''));

        y += 14;

        // 5. Centered QR Code
        const qrSize = 56;
        const qrX = leftMargin + (contentWidth - qrSize) / 2;
        doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize });
        y += qrSize + 10;

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
      renderSlip(32);

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
      renderSlip(435);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateSlipPDF };

