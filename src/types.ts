export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  monthlyBudget?: number;
  currency?: string;
  createdAt: any;
}

export interface Expense {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  date: any;
  description?: string;
  createdAt: any;
}

export const CATEGORIES = [
  "Food", "Transport", "Entertainment", "Education", "Shopping", "Rent", "Utilities", "Other"
] as const;

export type Category = typeof CATEGORIES[number];
