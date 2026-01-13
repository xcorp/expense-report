import React from 'react';
import { translations } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  onShareReport: () => void;
  onDownloadReport: () => void;
  onClearAll: () => void;
  isReportGenerating: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onShareReport, onDownloadReport, onClearAll, isReportGenerating }) => {
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
    </div>
  );
};

export default Layout;
