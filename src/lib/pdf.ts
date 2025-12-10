import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function downloadElementAsPdf(element: HTMLElement, fileName: string) {
  // Wait for fonts and images to load
  await new Promise(resolve => setTimeout(resolve, 300));

  // Capture the element as a high-res canvas with optimized options
  const canvas = await html2canvas(element, {
    scale: 3, // Higher scale for better quality
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    allowTaint: false,
    removeContainer: false,
    imageTimeout: 20000,
    onclone: (clonedDoc) => {
      // Ensure all styles are preserved and optimized for PDF
      const clonedElement = clonedDoc.querySelector(`[data-pdf-target]`) || 
                           clonedDoc.body.querySelector('.rounded-xl') ||
                           clonedDoc.body;
      if (clonedElement) {
        const el = clonedElement as HTMLElement;
        el.style.backgroundColor = '#ffffff';
        el.style.color = '#000000';
        el.style.width = `${element.scrollWidth}px`;
        el.style.height = 'auto';
        el.style.overflow = 'visible';
        
        // Hide interactive elements that shouldn't be in PDF
        const interactiveElements = clonedDoc.querySelectorAll('button, input[type="range"], .dropdown-menu, .dropdown-trigger');
        interactiveElements.forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      }
    },
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // A4 dimensions in mm
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Margins
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  const contentHeight = pageHeight - (margin * 2);

  // Calculate dimensions maintaining aspect ratio
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Convert pixels to mm for positioning (html2canvas scale factor)
  const scaleFactor = 3; // Match the scale used in html2canvas
  const imgHeightMm = imgHeight;

  // Split image across pages correctly - no duplication
  const totalPages = Math.ceil(imgHeightMm / contentHeight);
  
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      pdf.addPage();
    }
    
    // Calculate the portion of image for this page
    const sourceY = (page * contentHeight / imgHeightMm) * canvas.height;
    const remainingHeight = imgHeightMm - (page * contentHeight);
    const pageImageHeight = Math.min(contentHeight, remainingHeight);
    const sourceHeight = (pageImageHeight / imgHeightMm) * canvas.height;
    
    // Create a temporary canvas for this page's portion
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.ceil(sourceHeight);
    const ctx = pageCanvas.getContext('2d');
    
    if (ctx && sourceHeight > 0) {
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      
      // Draw the portion of the image
      ctx.drawImage(
        canvas, 
        0, sourceY, canvas.width, sourceHeight,  // source
        0, 0, canvas.width, sourceHeight        // destination
      );
      
      const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
      pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, pageImageHeight);
    }
  }

  // Add metadata for interactivity
  pdf.setProperties({
    title: fileName.replace('.pdf', ''),
    subject: 'Fitness Assessment Report',
    author: 'One Fitness',
    creator: 'One Fitness Assessment Engine',
  });

  pdf.save(fileName);
}



