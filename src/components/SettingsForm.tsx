import React, { useState, useEffect, useRef } from 'react';
import { translations } from '../i18n';
import { CATEGORIES } from '../config';

const SettingsForm: React.FC = () => {
    const [reporterName, setReporterName] = useState('');
    const [bankName, setBankName] = useState('');
    const [clearingNumber, setClearingNumber] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [defaultCategory, setDefaultCategory] = useState('');
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
        const savedDefaultCategory = localStorage.getItem('defaultCategory') || '';

        setReporterName(savedReporterName);
        setBankName(savedBankName);
        setClearingNumber(savedClearingNumber);
        setAccountNumber(savedAccountNumber);

        const validCategories = [...CATEGORIES];
        if (savedDefaultCategory && validCategories.includes(savedDefaultCategory)) {
            setDefaultCategory(savedDefaultCategory);
        } else {
            // Remove invalid preferred category (do not allow Övrigt as a saved preference)
            setDefaultCategory('');
            try { localStorage.removeItem('defaultCategory'); } catch { }
        }

        // Expand if any field is empty
        if (!savedReporterName || !savedBankName || !savedClearingNumber || !savedAccountNumber) {
            setIsCollapsed(false);
        }
    }, []);

    const handleNumberInput = (value: string, maxDigits: number) => {
        const filtered = value.replace(/[^0-9\s\-]/g, '');
        const digitCount = filtered.replace(/[^\d]/g, '').length;
        if (digitCount <= maxDigits) return filtered;
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
        // Persist default category only if it's a known category (Övrigt cannot be a preferred category)
        if (CATEGORIES.includes(defaultCategory)) {
            localStorage.setItem('defaultCategory', defaultCategory);
        } else {
            try { localStorage.removeItem('defaultCategory'); } catch { }
        }
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
                        <label htmlFor="defaultCategory" className="form-label">
                            {translations['Default Category']}
                        </label>
                        <select
                            id="defaultCategory"
                            value={defaultCategory}
                            onChange={(e) => setDefaultCategory(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value="">--</option>
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        <div className="font-semibold mb-1">Vanliga format för clearing- och kontonummer (större banker)</div>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>
                                <strong>Handelsbanken:</strong> 4-siffrigt clearingnummer som ofta börjar på <span className="font-mono">6</span>, följt av kontonummer. Exempel: <span className="font-mono">6789123456789</span> ("6789" = clearing, "123456789" = konto).
                            </li>
                            <li>
                                <strong>Swedbank / Sparbanker (7xxx):</strong> 4-siffrigt clearingnummer. Om kontonumret är kort fylls det ut med nollor mellan clearing och konto för att nå totalt 11 siffror.
                            </li>
                            <li>
                                <strong>Swedbank / Sparbanker (8xxx):</strong> 5-siffrigt clearingnummer (t.ex. <span className="font-mono">8327-9</span> där den femte siffran normalt inte skrivs). Fylls upp med nollor till totalt 14 siffror.
                            </li>
                            <li>
                                <strong>Danske Bank:</strong> 4-siffrigt clearingnummer följt av kontonummer (vanligt format: <span className="font-mono">1234-567890</span>).
                            </li>
                            <li>
                                <strong>Nordea:</strong> 4-siffrigt clearingnummer. Personkonto använder clearingnummer <span className="font-mono">3300</span> och personnumret som kontonummer. För andra konton fylls det ut med nollor mellan clearing och konto för att nå totalt 11 siffror.
                            </li>
                            <li>
                                <strong>SEB:</strong> 4-siffrigt clearingnummer (börjar ofta på <span className="font-mono">5</span> eller <span className="font-mono">9</span>). Kontonummer fylls ut med nollor efter clearingnumret för att nå totalt 11 siffror (eller 14 för vissa företagskonton).
                            </li>
                        </ul>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Tips: mata in endast siffror (ta bort mellanslag och bindestreck). Vid osäkerhet kontrollera ditt kontoutdrag eller kontakta din bank.
                        </div>
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

export default SettingsForm;
