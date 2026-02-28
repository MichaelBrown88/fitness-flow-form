/**
 * Captures a DOM element by id and generates a downloadable PDF.
 * Uses dynamic imports for jsPDF and html2canvas to avoid bundling heavy libraries upfront.
 */
export async function exportReportToPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm
  const ratio = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;

  const pdf = new jsPDF('p', 'mm', 'a4');

  let position = 0;
  let remainingHeight = scaledHeight;

  while (remainingHeight > 0) {
    if (position > 0) {
      pdf.addPage();
    }

    pdf.addImage(imgData, 'PNG', 0, -position, pdfWidth, scaledHeight);
    position += pdfHeight;
    remainingHeight -= pdfHeight;
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_\-. ]/g, '_');
  pdf.save(`${sanitizedFilename}.pdf`);
}
