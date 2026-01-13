import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Expense } from './db';
import { translations } from './i18n';
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// Use a local copy of the pdf.worker — we'll copy it into `public/` so it's
// served from the same origin and avoids CORS or dynamic-import issues.
GlobalWorkerOptions.workerSrc = "/expense-report/pdf.worker.min.js";

// Extend jsPDF with the autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export const generatePdf = async (expenses: Expense[]): Promise<Blob> => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  let yPos = 20;

  // Add a title
  doc.setFontSize(22);
  doc.text(translations['Expense Report'], 14, yPos);
  yPos += 10;

  // Add details
  doc.setFontSize(12);
  doc.text(`${translations['Date']}: ${new Date().toISOString().split('T')[0]}`, 14, yPos);
  yPos += 5;

  const reporterName = localStorage.getItem('reporterName');
  if (reporterName) {
    doc.text(`${translations['Reporter Name']}: ${reporterName}`, 14, yPos);
    yPos += 5;
  }

  const bankName = localStorage.getItem('bankName');
  if (bankName) {
    doc.text(`${translations['Bank Name']}: ${bankName}`, 14, yPos);
    yPos += 5;
  }

  const clearingNumber = localStorage.getItem('clearingNumber');
  if (clearingNumber) {
    doc.text(`${translations['Clearing Number']}: ${clearingNumber}`, 14, yPos);
    yPos += 5;
  }

  const accountNumber = localStorage.getItem('accountNumber');
  if (accountNumber) {
    doc.text(`${translations['Account Number']}: ${accountNumber}`, 14, yPos);
    yPos += 5;
  }


  // Create summary table (description, category, cost). Driving details are appended
  // into the description cell as extra lines so they appear as a sub-block under each expense.
  const tableColumn = [translations['Description'], translations['Category'], translations['Cost']];
  const tableRows: (string | number)[][] = [];
  let totalCost = 0;

  expenses.forEach(expense => {
    totalCost += expense.cost;
    const expenseData = [
      expense.description || '',
      translations[expense.category as keyof typeof translations] || expense.category || '',
      new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(expense.cost),
    ];
    tableRows.push(expenseData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: yPos + 5,
    didParseCell: (data: any) => {
      // Append driving details into the description cell (column 0) for body rows
      if (data.section === 'body' && data.column.index === 0) {
        const expense = expenses[data.row.index];
        const extraLines: string[] = [];
        if (expense.purpose) extraLines.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
        if (expense.passengers) extraLines.push(`${translations['Passengers']}: ${expense.passengers}`);
        if (expense.distanceKm !== undefined && expense.distanceKm !== null) extraLines.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
        if (extraLines.length > 0) {
          // data.cell.text is an array of lines; append extraLines so row height expands
          data.cell.text = data.cell.text.concat(extraLines.map((l) => l));
        }
      }
    },
    didDrawPage: (data: any) => {
      // Footer
      let str = `${translations['Total']}: ` + new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(totalCost);
      doc.setFontSize(12);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
    },
    styles: { fontSize: 10 }
  });

  // Add receipt images
  if (expenses.some(e => e.image)) {
    doc.addPage();
    doc.setFontSize(18);
    doc.text(translations['Receipts'], 14, 20);

    let y = 30;
    for (const expense of expenses) {
      if (!expense.image) continue;

      if (expense.imageType === 'application/pdf') {
        try {
          const pdfData = new Uint8Array(expense.image as ArrayBuffer);
          const loadingTask = getDocument({ data: pdfData });
          const pdf = await loadingTask.promise;

          // Render the first page of the PDF as an image
          const page = await pdf.getPage(1); // Get the first page

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

            // Add expense description/details before the rendered PDF page image
            doc.setFontSize(12);
            const category = translations[expense.category as keyof typeof translations] || expense.category || '';
            const details: string[] = [];
            if (expense.purpose) details.push(`${translations['Purpose of trip']}: ${expense.purpose}`);
            if (expense.passengers) details.push(`${translations['Passengers']}: ${expense.passengers}`);
            if (expense.distanceKm !== undefined) details.push(`${translations['Distance (km)']}: ${expense.distanceKm}`);
            const detailLine = details.length > 0 ? ` (${details.join(' · ')})` : '';
            doc.text(`${expense.description || ''} - ${category}${detailLine}`, 14, y);
            y += 5;

            // Calculate image dimensions to fit within PDF page margins
            const pdfPageWidth = doc.internal.pageSize.getWidth();
            const pdfPageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const availableWidth = pdfPageWidth - (margin * 2);

            let imgDisplayWidth = availableWidth;
            let imgDisplayHeight = (canvas.height / canvas.width) * availableWidth;

            // If the image is too tall, scale it down to fit the page height
            if (y + imgDisplayHeight + margin > pdfPageHeight) {
              doc.addPage();
              y = 20; // Reset y position for new page
            }

            doc.addImage(dataUrl, 'PNG', margin, y, imgDisplayWidth, imgDisplayHeight);
            y += imgDisplayHeight + 10; // Move y position after adding the image
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

          doc.text(`${expense.description || ''} - ${category}${detailLine}`, 14, y);
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

          doc.text(`${expense.description || ''} - ${category}${detailLine}`, 14, y);
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
