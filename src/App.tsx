import React, { useState, useEffect, useMemo } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Plus, 
  LogOut, 
  PieChart as PieChartIcon, 
  Settings, 
  Trash2, 
  Wallet,
  TrendingUp,
  Calendar,
  ChevronRight,
  X
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Expense, CATEGORIES, Category } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'
];

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'analytics' | 'settings'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Sync Profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              monthlyBudget: 1000,
              currency: '$',
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          } else {
            setProfile(userDoc.data() as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setExpenses([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Expenses Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expenseData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(expenseData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'expenses');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const totalSpent = useMemo(() => 
    expenses.reduce((sum, exp) => sum + exp.amount, 0), 
  [expenses]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    expenses.forEach(exp => {
      data[exp.category] = (data[exp.category] || 0) + exp.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
          <p className="text-stone-500 font-sans text-sm tracking-widest uppercase">Loading Budget Buddy</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center"
        >
          <div className="mb-8 inline-flex p-4 bg-white rounded-3xl shadow-sm border border-black/5">
            <Wallet className="w-12 h-12 text-stone-900" />
          </div>
          <h1 className="text-4xl font-sans font-medium text-stone-900 mb-4 tracking-tight">Budget Buddy</h1>
          <p className="text-stone-600 mb-8 leading-relaxed">
            Your personal finance companion. Track expenses, stay on budget, and achieve your financial goals with your new best friend.
          </p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <nav className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-black/5 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="font-sans font-bold text-xl tracking-tight text-indigo-900">Budget Buddy</span>
          </div>

        <div className="flex-1 space-y-2">
          <NavButton 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
          />
          <NavButton 
            active={activeTab === 'expenses'} 
            onClick={() => setActiveTab('expenses')}
            icon={<Calendar className="w-5 h-5" />}
            label="Expenses"
          />
          <NavButton 
            active={activeTab === 'analytics'} 
            onClick={() => setActiveTab('analytics')}
            icon={<PieChartIcon className="w-5 h-5" />}
            label="Analytics"
          />
          <NavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-5 h-5" />}
            label="Settings"
          />
        </div>

        <div className="mt-auto pt-6 border-t border-black/5">
          <div className="flex items-center gap-3 mb-4">
            <img 
              src={profile?.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
              className="w-10 h-10 rounded-full border border-black/5"
              alt="Avatar"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{profile?.displayName || 'User'}</p>
              <p className="text-xs text-stone-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-sans font-medium text-stone-900 tracking-tight">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    label="Total Spent" 
                    value={`${profile?.currency || '$'}${totalSpent.toLocaleString()}`}
                    trend="+12% from last month"
                    icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
                  />
                  <StatCard 
                    label="Monthly Budget" 
                    value={`${profile?.currency || '$'}${profile?.monthlyBudget?.toLocaleString() || '0'}`}
                    trend={`${Math.round((totalSpent / (profile?.monthlyBudget || 1)) * 100)}% utilized`}
                    icon={<Wallet className="w-6 h-6 text-indigo-600" />}
                  />
                  <StatCard 
                    label="Remaining" 
                    value={`${profile?.currency || '$'}${Math.max(0, (profile?.monthlyBudget || 0) - totalSpent).toLocaleString()}`}
                    trend="Safe to spend"
                    icon={<ChevronRight className="w-6 h-6 text-indigo-600" />}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recent Activity */}
                  <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-sans font-medium text-lg">Recent Expenses</h3>
                      <button 
                        onClick={() => setActiveTab('expenses')}
                        className="text-stone-500 text-sm hover:text-stone-900 transition-colors"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-4">
                      {expenses.slice(0, 5).map(expense => (
                        <ExpenseItem {...{ key: expense.id || Math.random().toString(), expense, currency: profile?.currency || '$' } as any} />
                      ))}
                      {expenses.length === 0 && (
                        <p className="text-center py-10 text-stone-400 italic">No expenses recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Chart */}
                  <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
                    <h3 className="font-sans font-medium text-lg mb-6">Spending by Category</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {categoryData.slice(0, 4).map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-stone-600 truncate">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div 
                key="expenses"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-black/5 flex items-center justify-between">
                  <h3 className="font-sans font-medium text-lg">Transaction History</h3>
                  <div className="flex gap-2">
                    {/* Filter buttons could go here */}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50/50">
                        <th className="p-4 pl-8 text-xs font-medium text-stone-400 uppercase tracking-wider">Date</th>
                        <th className="p-4 text-xs font-medium text-stone-400 uppercase tracking-wider">Description</th>
                        <th className="p-4 text-xs font-medium text-stone-400 uppercase tracking-wider">Category</th>
                        <th className="p-4 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Amount</th>
                        <th className="p-4 pr-8 text-xs font-medium text-stone-400 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {expenses.map(expense => (
                        <tr key={expense.id} className="hover:bg-stone-50/50 transition-colors group">
                          <td className="p-4 pl-8 text-sm text-stone-600">
                            {new Date(expense.date?.seconds * 1000).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm font-medium text-stone-900">{expense.description || 'No description'}</td>
                          <td className="p-4">
                            <span className="inline-flex px-2 py-1 rounded-lg bg-stone-100 text-stone-600 text-[10px] font-bold uppercase tracking-wider">
                              {expense.category}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-mono font-medium text-stone-900 text-right">
                            {profile?.currency}{expense.amount.toFixed(2)}
                          </td>
                          <td className="p-4 pr-8 text-right">
                            <button 
                              onClick={() => handleDeleteExpense(expense.id!)}
                              className="p-2 text-stone-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-stone-400 italic">No transactions found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
                  <h3 className="font-sans font-medium text-lg mb-8">Spending Trends</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E9299' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E9299' }} />
                        <Tooltip 
                          cursor={{ fill: '#f5f5f5' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="value" fill="#141414" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
                    <h3 className="font-sans font-medium text-lg mb-6">Category Breakdown</h3>
                    <div className="space-y-4">
                      {categoryData.sort((a,b) => b.value - a.value).map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-sm text-stone-600">{item.name}</span>
                          </div>
                          <span className="text-sm font-mono font-medium">{profile?.currency}{item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-stone-900 rounded-3xl p-8 text-white shadow-xl shadow-stone-900/20">
                    <h3 className="font-sans font-medium text-lg mb-4">Budget Insights</h3>
                    <p className="text-stone-400 text-sm leading-relaxed mb-6">
                      You've spent {Math.round((totalSpent / (profile?.monthlyBudget || 1)) * 100)}% of your monthly budget. 
                      {totalSpent > (profile?.monthlyBudget || 0) 
                        ? " You are currently over budget. Consider trimming non-essential expenses." 
                        : " You're on track to stay within your limits this month."}
                    </p>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (totalSpent / (profile?.monthlyBudget || 1)) * 100)}%` }}
                        className={cn(
                          "h-full rounded-full",
                          totalSpent > (profile?.monthlyBudget || 0) ? "bg-red-500" : "bg-emerald-400"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl"
              >
                <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm space-y-8">
                  <div className="space-y-4">
                    <h3 className="font-sans font-medium text-lg">Budget Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Monthly Budget Limit</label>
                        <input 
                          type="number"
                          value={profile?.monthlyBudget || ''}
                          onChange={(e) => handleUpdateProfile({ monthlyBudget: parseFloat(e.target.value) })}
                          className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Currency Symbol</label>
                        <input 
                          type="text"
                          value={profile?.currency || ''}
                          onChange={(e) => handleUpdateProfile({ currency: e.target.value })}
                          className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-black/5">
                    <h3 className="font-sans font-medium text-lg mb-4">Account Information</h3>
                    <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-black/5">
                      <img src={user.photoURL || ''} className="w-12 h-12 rounded-full" alt="Profile" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-medium text-stone-900">{user.displayName}</p>
                        <p className="text-sm text-stone-500">{user.email}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-sans font-medium tracking-tight">New Expense</h3>
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddExpense} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-mono">{profile?.currency}</span>
                      <input 
                        required
                        name="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-stone-50 border border-black/5 rounded-xl pl-10 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all font-mono text-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Category</label>
                    <select 
                      required
                      name="category"
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all appearance-none"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Description</label>
                    <input 
                      name="description"
                      type="text"
                      placeholder="What was this for?"
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Date</label>
                    <input 
                      required
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-stone-900/10 transition-all"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all mt-4"
                  >
                    Save Expense
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  async function handleAddExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get('amount') as string);
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const dateStr = formData.get('date') as string;

    const newExpense: Omit<Expense, 'id'> = {
      userId: user.uid,
      amount,
      category,
      description,
      date: Timestamp.fromDate(new Date(dateStr)),
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'expenses'), newExpense);
      setIsAddModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'expenses');
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  }

  async function handleUpdateProfile(updates: Partial<UserProfile>) {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { ...profile, ...updates }, { merge: true });
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  }
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
        active 
          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
          : "text-stone-500 hover:bg-indigo-50 hover:text-indigo-600"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="p-3 bg-indigo-50 rounded-2xl">
          {icon}
        </div>
      </div>
      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-3xl font-sans font-medium text-stone-900 tracking-tight mb-2">{value}</h4>
      <p className="text-xs text-stone-500">{trend}</p>
    </div>
  );
}

interface ExpenseItemProps {
  expense: Expense;
  currency: string;
}

function ExpenseItem({ expense, currency }: ExpenseItemProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 hover:border-indigo-200 transition-all shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
          <span className="text-[10px] font-bold uppercase tracking-tighter">{expense.category.slice(0, 2)}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-stone-900">{expense.description || expense.category}</p>
          <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold">{expense.category}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-bold text-indigo-600">{currency}{expense.amount.toFixed(2)}</p>
        <p className="text-[10px] text-stone-400">{new Date(expense.date?.seconds * 1000).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
