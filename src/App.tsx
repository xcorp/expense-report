import { useState } from 'react';
import Layout from './components/Layout';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import BankDetailsForm from './components/BankDetailsForm';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { generatePdf } from './pdfGenerator';
import { translations } from './i18n';

function App() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('createdAt').toArray());
  const [isReportGenerating, setIsReportGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!expenses || expenses.length === 0) {
      alert(translations['No expenses to report.']);
      return;
    }

    const reporterName = localStorage.getItem('reporterName');
    const bankName = localStorage.getItem('bankName');
    const clearingNumber = localStorage.getItem('clearingNumber');
    const accountNumber = localStorage.getItem('accountNumber');

    if (!reporterName || !bankName || !clearingNumber || !accountNumber) {
      alert(translations['Please save your bank details and reporter name before generating the report.']);
      return;
    }

    setIsReportGenerating(true);
    try {
      const pdfBlob = await generatePdf(expenses);
      const pdfFile = new File([pdfBlob], 'expense-report.pdf', { type: 'application/pdf' });
      
      // Web Share API
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: translations['Expense Report'],
          text: 'Here is my expense report.', // This text is not visible to the user, so no need to translate
          files: [pdfFile],
        });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfFile);
        link.download = 'expense-report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error(translations['Failed to generate or share report:'], error);
      alert(translations['Failed to generate or share report:']);
    } finally {
      setIsReportGenerating(false);
    }
  };

  const handleClearAll = async () => {
    if (confirm(translations['Are you sure you want to delete ALL expenses? This action cannot be undone.'])) {
      try {
        await db.expenses.clear();
      } catch (error) {
        console.error(translations['Failed to clear expenses:'], error);
        alert(translations['Failed to clear expenses:']);
      }
    }
  };

  return (
    <Layout 
      onGenerateReport={handleGenerateReport} 
      onClearAll={handleClearAll}
      isReportGenerating={isReportGenerating}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">{translations['Add Expense']}</h2>
          <ExpenseForm />
          <div className="mt-8">
            <BankDetailsForm />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{translations['Expense List']}</h2>
            <span className="text-sm font-semibold text-gray-600">
              {translations['Total']}: {expenses?.length || 0}
            </span>
          </div>
          <ExpenseList expenses={expenses || []} />
        </div>
      </div>
    </Layout>
  );
}

export default App;
