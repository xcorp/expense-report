import React, { useMemo, useState } from 'react';
import { Expense } from '../db';
import { translations } from '../i18n';
import { DRIVING_COST_MULTIPLIER } from '../config';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (id: number) => void;
  onEdit?: (expense: Expense) => void;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onDelete, onEdit }) => {
  const [showFullImage, setShowFullImage] = useState(false);

  const imageUrl = useMemo(() => {
    if (expense.image) {
      const blob = new Blob([expense.image], { type: expense.imageType || 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
    return '';
  }, [expense.image]);

  const isPdf = expense.imageType === 'application/pdf';
  const isDrivingExpense = expense.purpose && expense.distanceKm !== undefined;

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          {isDrivingExpense ? (
            <div className="w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-md mr-4">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm11 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM5 11l1.5-4.5h11L19 11H5z" />
              </svg>
            </div>
          ) : imageUrl ? (
            isPdf ? (
              <div className="w-16 h-16 flex flex-col items-center justify-center bg-red-100 dark:bg-red-900 rounded-md mr-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-bold text-red-600 dark:text-red-300 -mt-1">PDF</span>
              </div>
            ) : (
              <div
                onClick={() => setShowFullImage(true)}
              >
                <img
                  src={imageUrl}
                  alt={expense.description}
                  className="w-16 h-16 object-cover rounded-md mr-4 cursor-pointer hover:opacity-80"
                />
              </div>
            )
          ) : null}
          {!isDrivingExpense || imageUrl ? (
            <div className="flex-grow">
              <p className="font-semibold">{expense.description}</p>
              <p className="text-sm text-gray-500">{translations[expense.category as keyof typeof translations] || expense.category}</p>
              {isDrivingExpense && (
                <p className="text-xs text-gray-400 mt-1">
                  {expense.distanceKm} km × {DRIVING_COST_MULTIPLIER} kr/km
                </p>
              )}
            </div>
          ) : (
            <div className="flex-grow">
              <p className="font-semibold">{expense.distanceKm} km × {DRIVING_COST_MULTIPLIER} kr/km</p>
            </div>
          )}
          {/* <p className="text-xs text-gray-400">{expense.createdAt.toLocaleDateString()}</p> */}
        </div>
        <div className="text-right flex flex-col gap-2 items-end">
          <p className="font-semibold text-lg">
            {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(expense.cost)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onDelete(expense.id!)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              {translations['Delete']}
            </button>
            {onEdit && (
              <button
                onClick={() => onEdit(expense)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                {translations['Edit'] || 'Edit'}
              </button>
            )}
          </div>
        </div>
      </div>
      {showFullImage && imageUrl && !isPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowFullImage(false)}>
          <img src={imageUrl} alt={expense.description} className="max-w-4xl max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </>
  );
};

export default ExpenseItem;
