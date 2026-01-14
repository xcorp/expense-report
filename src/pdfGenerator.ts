import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Expense } from './db';
import { translations } from './i18n';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import { DRIVING_COST_MULTIPLIER } from './config';
// Use a local copy of the pdf.worker — we'll copy it into `public/` so it's
// served from the same origin and avoids CORS or dynamic-import issues.
GlobalWorkerOptions.workerSrc = "/expense-report/pdf.worker.min.js";

// Extend jsPDF with the autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

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
          doc.text(`#${expenseIndex + 1}: ${expense.description || ''} - ${category}${detailLine}`, 14, y);
          y += 5;

          // Render all pages of the PDF
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed for quality/size
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

              const dataUrl = canvas.toDataURL('image/png'); // Convert canvas to PNG data URL

              let imgDisplayWidth = availableWidth * 0.95;
              let imgDisplayHeight = (canvas.height / canvas.width) * (availableWidth * 0.95);

              // For pages after the first, check if we need a new page
              if (pageNum > 1 && y + imgDisplayHeight + margin > pdfPageHeight) {
                doc.addPage();
                y = 20; // Reset y position for new page
              }

              doc.addImage(dataUrl, 'PNG', margin, y, imgDisplayWidth, imgDisplayHeight);
              y += imgDisplayHeight + 10; // Move y position after adding the image
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

      await new Promise<void>(resolve => {
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          const ratio = imgWidth / imgHeight;

          let width = 180;
          let height = width / ratio;

          if (y + height > 280) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(12);
          const category = translations[expense.category as keyof typeof translations] || expense.category || '';
          // Build a detail line that includes driving fields when present
          const details: string[] = [];
          if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
          if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
          if (expense.distanceKm !== undefined) details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
          const detailLine = details.length > 0 ? ` (${details.join(' · ')})` : '';

          doc.text(`#${expenseIndex + 1}: ${expense.description || ''} - ${category}${detailLine}`, 14, y);
          y += 5;

          // Use expense.imageType for addImage, fallback to 'JPEG' if undefined
          const imgFormat = (expense.imageType && expense.imageType.split('/')[1].toUpperCase()) || 'JPEG';
          doc.addImage(url, imgFormat, 15, y, width, height);
          y += height + 10;

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
