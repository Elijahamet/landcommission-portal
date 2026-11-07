// Force Vercel @vercel/nft bundler to package PDFKit standard fonts, chunks, and data files
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
  require('../data/records.json');
} catch (e) {
  // Ignore in case running in an environment with different packaging
}

const app = require('../server');

module.exports = app;
