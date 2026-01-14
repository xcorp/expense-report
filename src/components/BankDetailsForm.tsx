import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../i18n';

const BankDetailsForm: React.FC = () => {
  const [reporterName, setReporterName] = useState('');
  const [bankName, setBankName] = useState('');
  const [clearingNumber, setClearingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const reporterNameRef = useRef<HTMLInputElement>(null);
  const bankNameRef = useRef<HTMLInputElement>(null);
  const clearingNumberRef = useRef<HTMLInputElement>(null);
  const accountNumberRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedReporterName = localStorage.getItem('reporterName') || '';
    const savedBankName = localStorage.getItem('bankName') || '';
    const savedClearingNumber = localStorage.getItem('clearingNumber') || '';
    const savedAccountNumber = localStorage.getItem('accountNumber') || '';

    setReporterName(savedReporterName);
    setBankName(savedBankName);
    setClearingNumber(savedClearingNumber);
    setAccountNumber(savedAccountNumber);

    // Expand if any field is empty
    if (!savedReporterName || !savedBankName || !savedClearingNumber || !savedAccountNumber) {
      setIsCollapsed(false);
    }
  }, []);

  const handleNumberInput = (value: string, maxDigits: number) => {
    // Filter to allow only numbers, spaces, and dashes
    const filtered = value.replace(/[^0-9\s\-]/g, '');
    // Count actual digits (not spaces or dashes)
    const digitCount = filtered.replace(/[^\d]/g, '').length;
    // Only allow if digit count is within limit
    if (digitCount <= maxDigits) {
      return filtered;
    }
    // If over limit, remove characters from the end until we're at the limit
    let result = filtered;
    while (result.replace(/[^\d]/g, '').length > maxDigits) {
      result = result.slice(0, -1);
    }
    return result;
  };

  const handleSave = () => {
    const empty: string[] = [];
    if (!reporterName.trim()) empty.push('reporterName');
    if (!bankName.trim()) empty.push('bankName');
    if (!clearingNumber.trim()) empty.push('clearingNumber');
    if (!accountNumber.trim()) empty.push('accountNumber');

    if (empty.length > 0) {
      setInvalidFields(empty);
      try { (window as any).__USE_TOAST__?.push({ message: 'Vänligen fyll i alla fält', type: 'info' }); } catch { alert('Vänligen fyll i alla fält'); }

      // Focus the first empty field
      if (empty[0] === 'reporterName') reporterNameRef.current?.focus();
      else if (empty[0] === 'bankName') bankNameRef.current?.focus();
      else if (empty[0] === 'clearingNumber') clearingNumberRef.current?.focus();
      else if (empty[0] === 'accountNumber') accountNumberRef.current?.focus();
      return;
    }

    setInvalidFields([]);
    localStorage.setItem('reporterName', reporterName);
    localStorage.setItem('bankName', bankName);
    localStorage.setItem('clearingNumber', clearingNumber);
    localStorage.setItem('accountNumber', accountNumber);
    setIsCollapsed(true);
    try { (window as any).__USE_TOAST__?.push({ message: translations['Bank details saved!'], type: 'success' }); } catch { alert(translations['Bank details saved!']); }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-md text-gray-900 dark:text-gray-100">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex justify-between items-center font-bold text-lg sm:text-xl hover:opacity-75 transition-opacity"
      >
        <span>{translations['Bank Details']}</span>
        <span className="text-lg">{isCollapsed ? '▶' : '▼'}</span>
      </button>
      {!isCollapsed && (
        <div className="space-y-4 mt-4">
          <div>
            <label htmlFor="reporterName" className="form-label">
              {translations['Reporter Name']}
            </label>
            <input
              ref={reporterNameRef}
              type="text"
              id="reporterName"
              value={reporterName}
              onChange={(e) => {
                setReporterName(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'reporterName'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('reporterName') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
          </div>
          <div>
            <label htmlFor="bankName" className="form-label">
              {translations['Bank Name']}
            </label>
            <input
              ref={bankNameRef}
              type="text"
              id="bankName"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setInvalidFields(invalidFields.filter(f => f !== 'bankName'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('bankName') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
          </div>
          <div>
            <label htmlFor="clearingNumber" className="form-label">
              {translations['Clearing Number']}
            </label>
            <input
              ref={clearingNumberRef}
              type="text"
              id="clearingNumber"
              value={clearingNumber}
              onChange={(e) => {
                const filtered = handleNumberInput(e.target.value, 5);
                setClearingNumber(filtered);
                setInvalidFields(invalidFields.filter(f => f !== 'clearingNumber'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('clearingNumber') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
          </div>
          <div>
            <label htmlFor="accountNumber" className="form-label">
              {translations['Account Number']}
            </label>
            <input
              ref={accountNumberRef}
              type="text"
              id="accountNumber"
              value={accountNumber}
              onChange={(e) => {
                const filtered = handleNumberInput(e.target.value, 15);
                setAccountNumber(filtered);
                setInvalidFields(invalidFields.filter(f => f !== 'accountNumber'));
              }}
              className={`mt-1 block w-full rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:ring-indigo-500 sm:text-sm border-2 ${invalidFields.includes('accountNumber') ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
          </div>
          <button
            onClick={handleSave}
            className="inline-flex justify-center rounded-md border border-indigo-700 bg-indigo-700 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            {translations['Save Details']}
          </button>
        </div>
      )}
    </div>
  );
};

export default BankDetailsForm;
