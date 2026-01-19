import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';
import { COMMIT as GENERATED_COMMIT, TAG as GENERATED_TAG } from '../commitInfo';
import HelpGuide from './HelpGuide';

interface LayoutProps {
  children: React.ReactNode;
  onShareReport: () => void;
  onDownloadReport: () => void;
  onClearAll: () => void;
  isReportGenerating: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onShareReport, onDownloadReport, onClearAll, isReportGenerating }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Show help guide on first visit
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('hasSeenHelpGuide');
    if (!hasSeenHelp) {
      setShowHelp(true);
    }
  }, []);

  const handleCloseHelp = () => {
    setShowHelp(false);
    localStorage.setItem('hasSeenHelpGuide', 'true');
  };
  const commitEnv = (import.meta.env as any).VITE_COMMIT || '';
  const tagEnv = (import.meta.env as any).VITE_COMMIT_TAG || '';
  // Fallback to generated file when env vars are not populated (e.g., running locally without build step)
  const commit = commitEnv || GENERATED_COMMIT || '';
  const tag = tagEnv || GENERATED_TAG || '';
  const buttonClass = "inline-flex justify-center rounded-md border border-transparent py-2 px-4 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const shareButtonClass = `${buttonClass} bg-green-600 hover:bg-green-700 focus:ring-green-500`;
  const downloadButtonClass = `${buttonClass} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
  const clearButtonClass = `${buttonClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`;

  const buttons = (
    <>
      <button
        onClick={onShareReport}
        disabled={isReportGenerating}
        className={shareButtonClass}
      >
        {isReportGenerating ? translations['Generating...'] : translations['Share Report']}
      </button>
      <button
        onClick={onDownloadReport}
        disabled={isReportGenerating}
        className={downloadButtonClass}
      >
        {isReportGenerating ? translations['Generating...'] : translations['Download Report']}
      </button>
      <button
        onClick={onClearAll}
        className={clearButtonClass}
      >
        {translations['Clear All']}
      </button>
    </>
  );

  return (
    <div className="flex flex-col">
      <div className="container mx-auto p-4 max-w-4xl flex-1">
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100">{translations['Expense Report']}</h1>
            <div className="w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row items-stretch sm:items-center">
              {buttons}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>

      {/* Bottom buttons for mobile (not sticky) */}
      <div className="sm:hidden">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="w-full space-y-2 flex flex-col items-stretch">
            {buttons}
          </div>
        </div>
      </div>

      {/* Small info button (fixed) */}
      <button
        onClick={() => setShowInfo(true)}
        aria-label="App info"
        className="fixed bottom-4 right-4 z-50 inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-800 text-white shadow-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
      >
        i
      </button>

      {/* Help button (fixed) */}
      <button
        onClick={() => setShowHelp(true)}
        aria-label="Hjälp"
        className="fixed bottom-4 right-16 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-xl font-bold"
      >
        ?
      </button>

      {/* Help modal */}
      <HelpGuide isOpen={showHelp} onClose={handleCloseHelp} />

      {/* Info modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowInfo(false)} />
          <div className="relative bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold">{translations['Expense Report']}</h3>
              <button onClick={() => setShowInfo(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>
            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              <div>© {new Date().getFullYear()} — Alla rättigheter förbehållna.</div>
              <div className="mt-2 break-words">
                {tag ? (
                  <div>Tag: <span className="font-mono">{tag}</span></div>
                ) : null}
                <div>Commit: <span className="font-mono">{commit || 'local'}</span></div>
              </div>
            </div>
            <div className="mt-4 text-right">
              <button onClick={() => setShowInfo(false)} className="px-3 py-1 rounded bg-indigo-600 text-white">Stäng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
