import React, { useState, useEffect } from 'react';
import { translations } from '../i18n';

const BankDetailsForm: React.FC = () => {
  const [reporterName, setReporterName] = useState('');
  const [bankName, setBankName] = useState('');
  const [clearingNumber, setClearingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    setReporterName(localStorage.getItem('reporterName') || '');
    setBankName(localStorage.getItem('bankName') || '');
    setClearingNumber(localStorage.getItem('clearingNumber') || '');
    setAccountNumber(localStorage.getItem('accountNumber') || '');
  }, []);

  const handleSave = () => {
    localStorage.setItem('reporterName', reporterName);
    localStorage.setItem('bankName', bankName);
    localStorage.setItem('clearingNumber', clearingNumber);
    localStorage.setItem('accountNumber', accountNumber);
    try { (window as any).__USE_TOAST__?.push({ message: translations['Bank details saved!'], type: 'success' }); } catch { alert(translations['Bank details saved!']); }
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100">
      <h3 className="text-xl font-bold mb-4">{translations['Bank Details']}</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="reporterName" className="form-label">
            {translations['Reporter Name']}
          </label>
          <input
            type="text"
            id="reporterName"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="bankName" className="form-label">
            {translations['Bank Name']}
          </label>
          <input
            type="text"
            id="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="clearingNumber" className="form-label">
            {translations['Clearing Number']}
          </label>
          <input
            type="text"
            id="clearingNumber"
            value={clearingNumber}
            onChange={(e) => setClearingNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="accountNumber" className="form-label">
            {translations['Account Number']}
          </label>
          <input
            type="text"
            id="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          className="inline-flex justify-center rounded-md border border-indigo-700 bg-indigo-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
        >
          {translations['Save Details']}
        </button>
      </div>
    </div>
  );
};

export default BankDetailsForm;
