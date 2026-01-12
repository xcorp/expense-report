import Dexie, { Table } from 'dexie';

export interface Expense {
  id?: number;
  description: string;
  category: string;
  cost: number;
  image?: ArrayBuffer;
  imageType?: string;
  // Optional driving fields
  purpose?: string;
  passengers?: string;
  distanceKm?: number;
  createdAt: Date;
}

export class MySubClassedDexie extends Dexie {
  expenses!: Table<Expense>;

  constructor() {
    super('expenseReport');
    this.version(1).stores({
      expenses: '++id, description, category, image, createdAt'
    });
    this.version(2).stores({
      expenses: '++id, description, category, cost, image, createdAt'
    });
  }
}

export const db = new MySubClassedDexie();
