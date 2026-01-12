import React, { useMemo } from 'react';
import { Expense } from '../db';
import { translations } from '../i18n';

interface ExpenseItemProps {
  expense: Expense;
  onDelete: (id: number) => void;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onDelete }) => {
  const imageUrl = useMemo(() => {
    if (expense.image) {
      const blob = new Blob([expense.image], { type: expense.imageType || 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
    return '';
  }, [expense.image]);

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex items-center">
        {imageUrl && (
          <img src={imageUrl} alt={expense.description} className="w-16 h-16 object-cover rounded-md mr-4" />
        )}
        <div className="flex-grow">
          <p className="font-semibold">{expense.description}</p>
          <p className="text-sm text-gray-500">{translations[expense.category as keyof typeof translations] || expense.category}</p>
          <p className="text-xs text-gray-400">{expense.createdAt.toLocaleDateString()}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold text-lg">
          {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(expense.cost)}
        </p>
        <button
          onClick={() => onDelete(expense.id!)}
          className="text-red-500 hover:text-red-700 text-sm"
        >
          {translations['Delete']}
        </button>
      </div>
    </div>
  );
};

export default ExpenseItem;
