import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Expense } from './db';
import { translations } from './i18n';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import {
  DRIVING_COST_MULTIPLIER,
  PDF_IMAGE_DPI_THRESHOLD,
  PDF_IMAGE_MIN_SPLIT_PERCENTAGE,
  PDF_IMAGE_OVERLAP_MM,
  PDF_IMAGE_MAX_WIDTH_PX,
  PDF_IMAGE_JPEG_QUALITY,
  PDF_IMAGE_JPEG_QUALITY_SPLIT,
  PDF_IMAGE_JPEG_QUALITY_HIGH_CONTRAST,
  PDF_IMAGE_CONTRAST_THRESHOLD,
  PDF_IMAGE_OPTIMAL_WIDTH_PX,
  PDF_IMAGE_NARROW_THRESHOLD_PERCENT
} from './config';
// Use a local copy of the pdf.worker — we'll copy it into `public/` so it's
// served from the same origin and avoids CORS or dynamic-import issues.
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

// Extend jsPDF with the autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

// Helper function to calculate image DPI based on dimensions
const calculateImageDPI = (imgWidthPx: number, imgHeightPx: number, displayWidthMm: number, displayHeightMm: number): number => {
  // Convert mm to inches (1 inch = 25.4 mm)
  const displayWidthInch = displayWidthMm / 25.4;
  const displayHeightInch = displayHeightMm / 25.4;

  // Calculate DPI for both dimensions and take the average
  const dpiWidth = imgWidthPx / displayWidthInch;
  const dpiHeight = imgHeightPx / displayHeightInch;

  return (dpiWidth + dpiHeight) / 2;
};

// Helper function to detect if image has high contrast (text/documents)
const detectHighContrast = (canvas: HTMLCanvasElement): boolean => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample every 10th pixel to speed up calculation
  const samples: number[] = [];
  for (let i = 0; i < data.length; i += 40) { // RGBA = 4 bytes, so 40 = 10 pixels
    // Convert to grayscale
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r * 0.299 + g * 0.587 + b * 0.114);
    samples.push(gray);
  }

  // Calculate standard deviation
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
  const stdDev = Math.sqrt(variance);

  // High contrast means high standard deviation
  return stdDev > PDF_IMAGE_CONTRAST_THRESHOLD;
};

// Helper function to detect high contrast directly from image element
const detectHighContrastFromImage = (img: HTMLImageElement): boolean => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  // Sample a portion from middle of image to avoid logos/headers
  const sampleWidth = Math.min(img.width, 600);
  const sampleHeight = Math.min(img.height, 600);

  // Start 10% from left edge, vertically centered
  const sourceX = img.width * 0.1;
  const sourceY = (img.height - sampleHeight) / 2;

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(img, sourceX, sourceY, sampleWidth, sampleHeight, 0, 0, sampleWidth, sampleHeight);

  return detectHighContrast(canvas);
};

// Helper function to convert canvas to optimal format (PNG for high contrast, JPEG for photos)
const canvasToOptimalDataUrl = (canvas: HTMLCanvasElement, isForSplit: boolean = false): string => {
  const isHighContrast = detectHighContrast(canvas);
  const quality = isForSplit ? PDF_IMAGE_JPEG_QUALITY_SPLIT : PDF_IMAGE_JPEG_QUALITY;

  if (isHighContrast) {
    // Use PNG for text/documents (lossless)
    return canvas.toDataURL('image/png');
  } else {
    // Use JPEG for photos (lossy, smaller file size)
    return canvas.toDataURL('image/jpeg', quality);
  }
};

// Helper function to calculate image DPI based on dimensions

// Helper function to split and render image across multiple pages
const addImageWithSplit = async (
  doc: jsPDFWithAutoTable,
  imgElement: HTMLImageElement,
  imageFormat: string,
  startY: number,
  displayWidth: number,
  displayHeight: number,
  maxHeight: number,
  margin: number,
  label: string
): Promise<number> => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const availableHeight = pageHeight - startY - margin;

  // Check if image fits on current page
  if (displayHeight <= availableHeight) {
    const isHighContrast = detectHighContrastFromImage(imgElement);

    console.log('Image processing:', {
      width: imgElement.width,
      height: imgElement.height,
      isHighContrast,
      displayWidth,
      displayHeight
    });

    // If high contrast (text/documents), use original directly - no canvas processing
    // This preserves maximum sharpness even if jsPDF has to scale
    if (isHighContrast) {
      console.log('Using original high-contrast image directly as PNG (no canvas)');
      doc.addImage(imgElement, 'PNG', margin, startY, displayWidth, displayHeight);
      return startY + displayHeight;
    }

    // Otherwise, process through canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Calculate optimal canvas size for 300 DPI rendering
      let width = imgElement.width;
      let height = imgElement.height;
      const aspectRatio = width / height;

      // Ensure canvas is at least optimal width for 300 DPI, but not more than max
      if (width < PDF_IMAGE_OPTIMAL_WIDTH_PX) {
        // Upscale small images to optimal width
        width = PDF_IMAGE_OPTIMAL_WIDTH_PX;
        height = width / aspectRatio;
        console.log('Upscaling to optimal width:', width);
      } else if (width > PDF_IMAGE_MAX_WIDTH_PX) {
        // Downscale very large images
        width = PDF_IMAGE_MAX_WIDTH_PX;
        height = width / aspectRatio;
        console.log('Downscaling to max width:', width);
      } else {
        console.log('Using original size:', width);
      }

      canvas.width = width;
      canvas.height = height;
      // Disable image smoothing to preserve sharpness
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imgElement, 0, 0, width, height);
      const dataUrl = canvasToOptimalDataUrl(canvas, false);
      doc.addImage(dataUrl, imageFormat, margin, startY, displayWidth, displayHeight);
    } else {
      doc.addImage(imgElement, imageFormat, margin, startY, displayWidth, displayHeight);
    }
    return startY + displayHeight;
  }

  // Calculate how many chunks we need
  const overlapMm = PDF_IMAGE_OVERLAP_MM;
  const chunkHeightMm = maxHeight - overlapMm;
  const numChunks = Math.ceil(displayHeight / chunkHeightMm);

  // Calculate percentage on next page if we just let it overflow
  const overflowAmount = displayHeight - availableHeight;
  const overflowPercentage = (overflowAmount / displayHeight) * 100;

  // Check if image is narrow (< 40% of page width)
  const pageWidth = doc.internal.pageSize.getWidth();
  const widthPercentage = (displayWidth / pageWidth) * 100;
  const isNarrowImage = widthPercentage < PDF_IMAGE_NARROW_THRESHOLD_PERCENT;

  // For narrow images, prefer scaling over splitting to save horizontal space
  if (isNarrowImage && availableHeight > 0) {
    const scaledHeight = availableHeight;
    const scaledWidth = (imgElement.width / imgElement.height) * scaledHeight;
    doc.addImage(imgElement, imageFormat, margin, startY, scaledWidth, scaledHeight);
    return startY + scaledHeight;
  }

  // If less than threshold would overflow, try to scale down instead
  if (overflowPercentage < PDF_IMAGE_MIN_SPLIT_PERCENTAGE) {
    const scaledHeight = availableHeight;
    const scaledWidth = (imgElement.width / imgElement.height) * scaledHeight;
    doc.addImage(imgElement, imageFormat, margin, startY, scaledWidth, scaledHeight);
    return startY + scaledHeight;
  }

  // Calculate DPI to decide if we should scale or split
  const dpi = calculateImageDPI(imgElement.width, imgElement.height, displayWidth, displayHeight);

  // If high DPI (>threshold), we can afford to scale down
  if (dpi > PDF_IMAGE_DPI_THRESHOLD) {
    const scaledHeight = availableHeight;
    const scaledWidth = (imgElement.width / imgElement.height) * scaledHeight;
    doc.addImage(imgElement, imageFormat, margin, startY, scaledWidth, scaledHeight);
    return startY + scaledHeight;
  }

  // Low DPI - split the image to preserve quality
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Fallback: just add the image and let it overflow/clip
    doc.addImage(imgElement, imageFormat, margin, startY, displayWidth, displayHeight);
    return startY + displayHeight;
  }

  // Check if high contrast to decide on canvas sizing
  const isHighContrast = detectHighContrastFromImage(imgElement);

  // Calculate optimal canvas width
  let canvasWidth = imgElement.width;

  // For high contrast (text/documents), use original size to preserve sharpness
  // For low contrast (photos), optimize for 300 DPI
  if (!isHighContrast) {
    if (canvasWidth < PDF_IMAGE_OPTIMAL_WIDTH_PX) {
      canvasWidth = PDF_IMAGE_OPTIMAL_WIDTH_PX;
      console.log('Split: Upscaling photo to optimal width:', canvasWidth);
    } else if (canvasWidth > PDF_IMAGE_MAX_WIDTH_PX) {
      canvasWidth = PDF_IMAGE_MAX_WIDTH_PX;
      console.log('Split: Downscaling photo to max width:', canvasWidth);
    } else {
      console.log('Split: Using original photo width:', canvasWidth);
    }
  } else {
    console.log('Split: Using original document width (high contrast):', canvasWidth);
  }

  canvas.width = canvasWidth;

  let currentY = startY;
  let sourceY = 0;

  for (let i = 0; i < numChunks; i++) {
    // Calculate source and destination heights
    const isLastChunk = i === numChunks - 1;
    const remainingHeightMm = displayHeight - (i * chunkHeightMm);
    const chunkDisplayHeight = Math.min(isLastChunk ? remainingHeightMm : maxHeight, remainingHeightMm + overlapMm);

    // Calculate source height in pixels from original image
    const sourceHeightPx = (chunkDisplayHeight / displayHeight) * imgElement.height;
    // Calculate canvas height maintaining aspect ratio with new width
    const canvasHeight = (sourceHeightPx / imgElement.width) * canvasWidth;
    canvas.height = canvasHeight;

    // Disable image smoothing to preserve sharpness
    ctx.imageSmoothingEnabled = false;

    // Draw the chunk from original image to optimally-sized canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imgElement,
      0, sourceY,
      imgElement.width, sourceHeightPx,
      0, 0,
      canvasWidth, canvasHeight
    );

    // Use high quality JPEG for high contrast (better than PNG for file size, still very sharp)
    // Use standard split quality JPEG for photos
    const quality = isHighContrast ? PDF_IMAGE_JPEG_QUALITY_HIGH_CONTRAST : PDF_IMAGE_JPEG_QUALITY_SPLIT;
    const chunkDataUrl = canvas.toDataURL('image/jpeg', quality);

    // Add page if needed (not for first chunk if there's space)
    if (i > 0 || currentY + chunkDisplayHeight > pageHeight - margin) {
      if (i > 0) {
        doc.addPage();
        currentY = 20;
      }
    }

    // Add continuation labels
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    if (i > 0) {
      doc.text(`↑ Forts. från föregående sida: ${label}`, margin, currentY);
      currentY += 5;
    }

    // Add the image chunk
    doc.addImage(chunkDataUrl, imageFormat, margin, currentY, displayWidth, chunkDisplayHeight);
    currentY += chunkDisplayHeight;

    if (!isLastChunk) {
      doc.setFontSize(9);
      doc.setTextColor(128, 128, 128);
      doc.text(`↓ Forts. på nästa sida`, margin, currentY + 3);
      currentY += 5;
    }

    doc.setTextColor(0, 0, 0); // Reset color

    // Move source position for next chunk (with overlap)
    sourceY += sourceHeightPx - ((overlapMm / displayHeight) * imgElement.height);
  }

  return currentY;
};

export const generatePdf = async (expenses: Expense[], reportDate?: string): Promise<Blob> => {
  const doc = new jsPDF() as jsPDFWithAutoTable;

  const reporterName = localStorage.getItem('reporterName') || '';
  const bankName = localStorage.getItem('bankName') || '';
  const clearingNumber = localStorage.getItem('clearingNumber') || '';
  const accountNumber = localStorage.getItem('accountNumber') || '';
  const currentDate = reportDate || new Date().toISOString().split('T')[0];

  // Title - centered and bold
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = translations['Expense Report'].toUpperCase();
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, (doc.internal.pageSize.getWidth() - titleWidth) / 2, 20);

  // Date in top right
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${translations['Date']}: ${currentDate}`, doc.internal.pageSize.getWidth() - 60, 30);

  let totalCost = 0;
  expenses.forEach(expense => {
    totalCost += expense.cost;
  });

  // Create table data - with receipt numbers
  const tableColumn = ['#', translations['Description'], translations['Cost'], translations['Cost center']];
  const tableRows: any[][] = [];

  expenses.forEach((expense, index) => {
    const details: string[] = [expense.description || ''];
    if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
    if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
    if (expense.distanceKm !== undefined) {
      // Show calculated distance if it exists and differs from actual distance
      if (expense.calculatedDistanceKm && expense.calculatedDistanceKm !== expense.distanceKm) {
        details.push(`${translations['Distance (km)']}: ${expense.distanceKm} (Beräknat: ${expense.calculatedDistanceKm})`);
      } else {
        details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
      }
      details.push(`${expense.distanceKm} km × ${DRIVING_COST_MULTIPLIER} kr/km`);
    }
    if (expense.stops && expense.stops.length > 0) {
      details.push(`${translations['Route']}:`);
      expense.stops.forEach((stop, idx) => {
        details.push(`  ${idx + 1}. ${stop}`);
      });
    }

    const rowData = [
      (index + 1).toString(),
      details.join('\n'),
      new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(expense.cost),
      translations[expense.category as keyof typeof translations] || expense.category || '',
    ];
    tableRows.push(rowData);
  });

  // Create the main table
  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 40 },
    },
    didDrawPage: (data: any) => {
      const finalY = data.cursor.y;

      // Total row
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${translations['Total']}:`, data.settings.margin.left + 15, finalY + 8);
      doc.text(
        new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCost),
        data.settings.margin.left + 135,
        finalY + 8,
        { align: 'right' }
      );

      // Bank details section
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      let detailsY = finalY + 20;

      doc.text(`${translations['Reporter Name']}: ${reporterName}`, data.settings.margin.left, detailsY);
      detailsY += 6;

      if (bankName || clearingNumber || accountNumber) {
        doc.text(`${translations['Bank Name']}: ${bankName}`, data.settings.margin.left, detailsY);
        detailsY += 6;
        doc.text(`${translations['Clearing Number']}: ${clearingNumber}`, data.settings.margin.left, detailsY);
        detailsY += 6;
        doc.text(`${translations['Account Number']}: ${accountNumber}`, data.settings.margin.left, detailsY);
      }
    },
  });

  // Add receipt images only if there are actual images
  if (expenses.some(e => e.image && e.image.byteLength > 0)) {
    doc.addPage();
    doc.setFontSize(18);
    doc.text(translations['Receipts'], 14, 20);

    let y = 30;
    for (let expenseIndex = 0; expenseIndex < expenses.length; expenseIndex++) {
      const expense = expenses[expenseIndex];
      if (!expense.image) continue;

      if (expense.imageType === 'application/pdf') {
        try {
          const pdfData = new Uint8Array(expense.image as ArrayBuffer);
          const loadingTask = getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;

          // Get first page to calculate dimensions before rendering
          const firstPage = await pdf.getPage(1);
          const firstViewport = firstPage.getViewport({ scale: 1.5 });

          // Calculate first image dimensions
          const pdfPageWidth = doc.internal.pageSize.getWidth();
          const pdfPageHeight = doc.internal.pageSize.getHeight();
          const margin = 15;
          const availableWidth = pdfPageWidth - (margin * 2);
          const firstImgDisplayHeight = (firstViewport.height / firstViewport.width) * (availableWidth * 0.95);

          // Check if description + first image will fit on current page
          const descriptionHeight = 10; // Approximate height for description text
          const totalNeededHeight = descriptionHeight + firstImgDisplayHeight;

          if (y + totalNeededHeight + margin > pdfPageHeight) {
            doc.addPage();
            y = 20;
          }

          // Add expense description/details before the first page
          doc.setFontSize(12);
          const category = translations[expense.category as keyof typeof translations] || expense.category || '';
          const details: string[] = [];
          if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
          if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
          if (expense.distanceKm !== undefined) details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
          const detailLine = details.length > 0 ? ` (${details.join(' · ')})` : '';
          const label = `#${expenseIndex + 1}: ${expense.description || ''} - ${category}`;
          doc.text(`${label}${detailLine}`, 14, y);
          y += 5;

          // Render all pages of the PDF
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const viewport = page.getViewport({ scale: 1.2 }); // Balanced scale for quality/size
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              // cast to any to satisfy differing pdfjs types across versions
              await (page as any).render(renderContext).promise;

              const dataUrl = canvas.toDataURL('image/jpeg', PDF_IMAGE_JPEG_QUALITY); // Compress as JPEG

              let imgDisplayWidth = availableWidth * 0.95;
              let imgDisplayHeight = (canvas.height / canvas.width) * (availableWidth * 0.95);

              // For pages after the first, check if we need a new page
              if (pageNum > 1 && y + imgDisplayHeight + margin > pdfPageHeight) {
                doc.addPage();
                y = 20; // Reset y position for new page
              }

              // Add continuation labels for PDF pages (similar to split images)
              doc.setFontSize(9);
              doc.setTextColor(128, 128, 128);
              if (pageNum > 1) {
                doc.text(`↑ Forts. från föregående sida: ${label}`, margin, y);
                y += 5;
              }

              doc.addImage(dataUrl, 'PNG', margin, y, imgDisplayWidth, imgDisplayHeight);
              y += imgDisplayHeight;

              if (pageNum < pdf.numPages) {
                doc.setFontSize(9);
                doc.setTextColor(128, 128, 128);
                doc.text(`↓ Forts. på nästa sida`, margin, y + 3);
                y += 5;
              }

              doc.setTextColor(0, 0, 0); // Reset color
              y += 10; // Move y position after adding the image
            }
          }
        } catch (error) {
          console.error(`Failed to render PDF for ${expense.description}:`, error);
          // Fallback to placeholder if PDF rendering fails
          doc.setFontSize(12);
          const category = translations[expense.category as keyof typeof translations] || expense.category || '';
          const details: string[] = [];
          if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
          if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
          if (expense.distanceKm !== undefined) details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
          const detailLine = details.length > 0 ? ` (${details.join(' · ')})` : '';

          doc.text(`#${expenseIndex + 1}: ${expense.description || ''} - ${category}${detailLine}`, 14, y);
          y += 5;
          doc.text(`[Failed to render PDF: ${expense.description || 'No Description'}]`, 15, y);
          y += 15; // Adjust y position after placeholder
        }
        continue; // Continue to the next expense after PDF handling
      }

      const img = new Image();
      const blob = new Blob([expense.image], { type: expense.imageType || 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>(async (resolve) => {
        img.onload = async () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = imgWidth / imgHeight;

          const margin = 15;
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const maxWidth = pageWidth - (margin * 2);
          const maxHeight = pageHeight - 40; // Max height for image chunks
          
          // Calculate natural display size based on aspect ratio
          // If image is very wide (landscape), use max width
          // If image is tall/narrow (portrait), use natural width up to max
          let width: number;
          let height: number;
          
          if (ratio >= 1) {
            // Landscape or square: use max width
            width = maxWidth;
            height = width / ratio;
          } else {
            // Portrait: calculate width based on max height constraint
            const naturalHeightAtMaxWidth = maxWidth / ratio;
            if (naturalHeightAtMaxWidth <= maxHeight) {
              // Image fits at max width
              width = maxWidth;
              height = naturalHeightAtMaxWidth;
            } else {
              // Image is very tall, constrain by height
              height = maxHeight;
              width = height * ratio;
            }
          }

          // Add expense description
          doc.setFontSize(12);
          const category = translations[expense.category as keyof typeof translations] || expense.category || '';
          const details: string[] = [];
          if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
          if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
          if (expense.distanceKm !== undefined) details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
          const detailLine = details.length > 0 ? ` (${details.join(' · ')})` : '';
          const label = `#${expenseIndex + 1}: ${expense.description || ''} - ${category}`;

          // Check if we need a new page for the description + image
          const descHeight = 10;
          if (y + descHeight > pageHeight - margin) {
            doc.addPage();
            y = 20;
          }

          doc.text(`${label}${detailLine}`, 14, y);
          y += 5;

          // Always use JPEG for consistency
          const imgFormat = 'JPEG';

          // Use the smart splitting function with original uncompressed image
          // It will handle compression internally (split chunks at 0.85, single images just display)
          y = await addImageWithSplit(doc, img, imgFormat, y, width, height, maxHeight, margin, label);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          console.error(`Could not load image for ${expense.description}`);
          resolve(); // Resolve promise even if image fails to load
        }
        img.src = url;
      });
    }
  }

  return doc.output('blob');
};
