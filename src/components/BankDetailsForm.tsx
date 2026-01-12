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
    alert(translations['Bank details saved!']);
  };

  return (
    <div className="p-4 border border-gray-200 rounded-md">
      <h3 className="text-xl font-bold mb-4">{translations['Bank Details']}</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="reporterName" className="block text-sm font-medium text-gray-700">
            {translations['Reporter Name']}
          </label>
          <input
            type="text"
            id="reporterName"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
            {translations['Bank Name']}
          </label>
          <input
            type="text"
            id="bankName"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="clearingNumber" className="block text-sm font-medium text-gray-700">
            {translations['Clearing Number']}
          </label>
          <input
            type="text"
            id="clearingNumber"
            value={clearingNumber}
            onChange={(e) => setClearingNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">
            {translations['Account Number']}
          </label>
          <input
            type="text"
            id="accountNumber"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {translations['Save Details']}
        </button>
      </div>
    </div>
  );
};

export default BankDetailsForm;
