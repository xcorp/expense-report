import React from 'react';
import { translations } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  onGenerateReport: () => void;
  onClearAll: () => void;
  isReportGenerating: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, onGenerateReport, onClearAll, isReportGenerating }) => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-gray-800">{translations['Expense Report']}</h1>
          <div className="space-x-2">
            <button
              onClick={onGenerateReport}
              disabled={isReportGenerating}
              className="inline-flex justify-center rounded-md border border-transparent bg-green-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isReportGenerating ? translations['Generating...'] : translations['Generate Report']}
            </button>
            <button
              onClick={onClearAll}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {translations['Clear All']}
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default Layout;
