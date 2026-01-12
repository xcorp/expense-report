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

      // 1) Preferred: share file objects (Chrome, etc.)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: translations['Expense Report'],
          text: 'Here is my expense report.',
          files: [pdfFile],
        });

        // 2) If an upload endpoint is configured, upload and share the returned HTTPS URL.
      } else if (import.meta.env.VITE_UPLOAD_ENDPOINT) {
        const uploadEndpoint = import.meta.env.VITE_UPLOAD_ENDPOINT;
        try {
          const form = new FormData();
          form.append('file', pdfFile);
          const resp = await fetch(uploadEndpoint, { method: 'POST', body: form });
          if (!resp.ok) throw new Error('Upload failed');
          const data = await resp.json();
          const publicUrl = data.url || data.file || data.link;
          if (!publicUrl) throw new Error('No URL returned from upload');

          // Try to share the public URL
          if ((navigator as any).share) {
            try {
              await (navigator as any).share({
                title: translations['Expense Report'],
                text: 'Here is my expense report.',
                url: publicUrl,
              });
            } catch (err) {
              // User cancelled or share failed — copy URL to clipboard as a fallback
              try {
                await navigator.clipboard.writeText(publicUrl);
                alert(translations['Report ready — link copied to clipboard.']);
              } catch {
                alert(translations['Report ready — couldn\'t copy link automatically.'] + ' ' + publicUrl);
              }
            }
          } else {
            // No share API — copy URL to clipboard or show it
            try {
              await navigator.clipboard.writeText(publicUrl);
              alert(translations['Report ready — link copied to clipboard.']);
            } catch {
              alert(translations['Report ready — open this link:'] + ' ' + publicUrl);
            }
          }
        } catch (err) {
          console.error('Upload/share fallback failed:', err);
          // Fall back to blob-url share/download below
          await tryBlobShareOrDownload(pdfFile);
        }

        // 3) Next: try to share a blob URL (may open in-browser on some browsers)
      } else if ((navigator as any).share) {
        await tryBlobShareOrDownload(pdfFile);

        // 4) Final fallback: download
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfFile);
        link.download = 'expense-report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // helper: try blob URL share, then download
      async function tryBlobShareOrDownload(file: File) {
        const blobUrl = URL.createObjectURL(file);
        try {
          await (navigator as any).share({
            title: translations['Expense Report'],
            text: 'Here is my expense report.',
            url: blobUrl,
          });
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
          URL.revokeObjectURL(blobUrl);
          const link = document.createElement('a');
          link.href = URL.createObjectURL(file);
          link.download = 'expense-report.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
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
