import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Expense } from './db';
import { translations } from './i18n';

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
  doc.text(`${translations['Date']}: ${new Date().toLocaleDateString()}`, 14, yPos);
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


  // Create summary table
  const tableColumn = [translations['Description'], translations['Category'], translations['Cost']];
  const tableRows: (string | number)[][] = [];
  let totalCost = 0;

  expenses.forEach(expense => {
    totalCost += expense.cost;
    const expenseData = [
      expense.description,
      translations[expense.category as keyof typeof translations] || expense.category,
      new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(expense.cost),
    ];
    tableRows.push(expenseData);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: yPos + 5,
    didDrawPage: (data: any) => {
      // Footer
      let str = `${translations['Total']}: ` + new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(totalCost);
      doc.setFontSize(12);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  // Add receipt images
  if (expenses.some(e => e.image)) {
    doc.addPage();
    doc.setFontSize(18);
    doc.text(translations['Receipts'], 14, 20);

    let y = 30;
    for (const expense of expenses) {
      if (!expense.image) continue;

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
          const category = translations[expense.category as keyof typeof translations] || expense.category;
          doc.text(`${expense.description} - ${category}`, 14, y);
          y += 5;

          doc.addImage(url, 'JPEG', 15, y, width, height);
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
