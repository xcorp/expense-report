import React from 'react';
import { Expense, db } from '../db';
import ExpenseItem from './ExpenseItem';
import { translations } from '../i18n';

interface ExpenseListProps {
  expenses: Expense[];
}

const ExpenseList: React.FC<ExpenseListProps> = ({ expenses }) => {

  const handleDelete = async (id: number) => {
    if (confirm(translations['Are you sure you want to delete this expense?'])) {
      try {
        await db.expenses.delete(id);
      } catch (error) {
        console.error(translations['Failed to delete expense:'], error);
        try { (window as any).__USE_TOAST__?.push({ message: translations['Failed to delete expense:'], type: 'error' }); } catch { alert(translations['Failed to delete expense:']); }
      }
    }
  };

  if (expenses.length === 0) {
    return <p className="text-center text-gray-500">{translations['No expenses added yet.']}</p>;
  }

  return (
    <div className="space-y-4">
      {expenses.map((expense) => (
        <ExpenseItem key={expense.id} expense={expense} onDelete={handleDelete} />
      ))}
    </div>
  );
};

export default ExpenseList;
