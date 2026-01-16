import { useState } from 'react';
import Layout from './components/Layout';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import SettingsForm from './components/SettingsForm';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { generatePdf } from './pdfGenerator';
import { translations } from './i18n';
import { useToast } from './components/ToastProvider';

import { Expense } from './db';
function App() {
  const expenses = useLiveQuery(() => db.expenses.orderBy('createdAt').toArray());
  const [isReportGenerating, setIsReportGenerating] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const toast = useToast();

  const handleGenerateReport = async () => {
    if (!expenses || expenses.length === 0) {
      toast.push({ message: translations['No expenses to report.'], type: 'info' });
      return;
    }

    const reporterName = localStorage.getItem('reporterName');
    const bankName = localStorage.getItem('bankName');
    const clearingNumber = localStorage.getItem('clearingNumber');
    const accountNumber = localStorage.getItem('accountNumber');

    if (!reporterName || !bankName || !clearingNumber || !accountNumber) {
      toast.push({ message: translations['Please save your bank details and reporter name before generating the report.'], type: 'info' });
      return;
    }

    setIsReportGenerating(true);
    try {
      const pdfBlob = await generatePdf(expenses, reportDate);
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
                toast.push({ message: 'Report ready — link copied to clipboard.', type: 'success' });
              } catch {
                toast.push({ message: 'Report ready — couldn\'t copy link automatically. ' + publicUrl, type: 'info' });
              }
            }
          } else {
            // No share API — copy URL to clipboard or show it
            try {
              await navigator.clipboard.writeText(publicUrl);
              toast.push({ message: 'Report ready — link copied to clipboard.', type: 'success' });
            } catch {
              toast.push({ message: 'Report ready — open this link: ' + publicUrl, type: 'info' });
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
      toast.push({ message: translations['Failed to generate or share report:'], type: 'error' });
    } finally {
      setIsReportGenerating(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!expenses || expenses.length === 0) {
      toast.push({ message: translations['No expenses to report.'], type: 'info' });
      return;
    }

    const reporterName = localStorage.getItem('reporterName');
    const bankName = localStorage.getItem('bankName');
    const clearingNumber = localStorage.getItem('clearingNumber');
    const accountNumber = localStorage.getItem('accountNumber');

    if (!reporterName || !bankName || !clearingNumber || !accountNumber) {
      toast.push({ message: translations['Please save your bank details and reporter name before generating the report.'], type: 'info' });
      return;
    }

    setIsReportGenerating(true);
    try {
      const pdfBlob = await generatePdf(expenses, reportDate);
      const file = new File([pdfBlob], 'expense-report.pdf', { type: 'application/pdf' });

      // Open PDF in a new tab so the user can view it themselves (and download from viewer)
      const blobUrl = URL.createObjectURL(file);
      window.open(blobUrl, '_blank');

      // Revoke URL after a bit to allow the new tab to load
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (error) {
      console.error(translations['Failed to generate or share report:'], error);
      toast.push({ message: translations['Failed to generate or share report:'], type: 'error' });
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
        toast.push({ message: translations['Failed to clear expenses:'], type: 'error' });
      }
    }
  };

  return (
    <Layout
      onShareReport={handleGenerateReport}
      onDownloadReport={handleDownloadReport}
      onClearAll={handleClearAll}
      isReportGenerating={isReportGenerating}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <div className="mb-8">
            <SettingsForm />
          </div>
          <h2 className="text-2xl font-bold mb-4">{editingExpense ? (translations['Edit Expense'] || 'Edit Expense') : translations['Add Expense']}</h2>
          <ExpenseForm
            expense={editingExpense}
            onEditDone={() => setEditingExpense(null)}
          />
        </div>
        <div>
          <div className="mb-4">
            <label htmlFor="reportDate" className="form-label">
              {translations['Date']}
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="date"
                id="reportDate"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="block flex-1 rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                onClick={() => setReportDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Reset to today"
              >
                Reset
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              <div>{translations['Total']}: {expenses?.length || 0} {(expenses?.length || 0) === 1 ? 'expense' : 'expenses'}</div>
              <div className="text-lg text-gray-900 dark:text-gray-100 mt-1">
                {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(
                  expenses?.reduce((sum, exp) => sum + exp.cost, 0) || 0
                )}
              </div>
            </div>
          </div>
          <ExpenseList
            expenses={expenses || []}
            onEdit={setEditingExpense}
          />
        </div>
      </div>
    </Layout>
  );
}

export default App;
