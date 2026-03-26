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
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  PiggyBank,
  Utensils,
  Car,
  PlusSquare,
  ArrowDownCircle,
  Search,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, Expense, CATEGORIES, Category } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS = [
  '#52c48a', '#3b82f6', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'
];

const THEME = {
  primary: '#58c68d',
  primaryLight: '#f0f9f4',
  textMain: '#1a1a1a',
  textMuted: '#737373',
  bg: '#f8f9fa',
  cardShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  inputShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
};

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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'analytics' | 'profile'>('dashboard');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [transactionFilter, setTransactionFilter] = useState<'All' | 'Income' | 'Expenses'>('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = transactionFilter === 'All' || 
                           (transactionFilter === 'Income' && exp.type === 'income') ||
                           (transactionFilter === 'Expenses' && exp.type === 'expense');
      return matchesSearch && matchesFilter;
    });
  }, [expenses, searchQuery, transactionFilter]);

  const totalSpent = useMemo(() => 
    expenses.filter(e => e.type === 'expense').reduce((sum, exp) => sum + exp.amount, 0), 
  [expenses]);

  const totalIncome = useMemo(() => 
    expenses.filter(e => e.type === 'income').reduce((sum, exp) => sum + exp.amount, 0), 
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
      <div className="min-h-screen flex items-center justify-center bg-[#f0f9f4]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#58c68d]/20 border-t-[#58c68d] rounded-full animate-spin" />
          <p className="text-[#58c68d] font-bold text-xs tracking-widest uppercase">Loading Ascend Wallet</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onLogin={handleLogin} setProfile={setProfile} />;
  }

  const chartData = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 700 },
    { name: 'Wed', value: 500 },
    { name: 'Thu', value: 900 },
    { name: 'Fri', value: 600 },
    { name: 'Sat', value: 800 },
    { name: 'Sun', value: 500 },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden font-sans text-[#1a1a1a]">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between bg-white border-b border-gray-100 relative">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-50">
          <PiggyBank className="w-6 h-6 text-[#58c68d]" />
        </div>
        <h1 className="font-bold text-lg tracking-tight absolute left-1/2 -translate-x-1/2">Ascend Wallet</h1>
        <img 
          src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
          className="w-10 h-10 rounded-full border-2 border-[#58c68d]/20 object-cover"
          alt="Avatar"
          referrerPolicy="no-referrer"
        />
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              {/* Total Expense Card */}
              <div className="bg-[#58c68d] rounded-[32px] p-8 text-white shadow-xl shadow-[#58c68d]/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">TOTAL EXPENSE</span>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold">
                    +2.4% this month
                  </div>
                </div>
                <h2 className="text-4xl font-bold mb-2 tracking-tight">
                  {profile?.currency || '$'}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <p className="text-[10px] opacity-80 mb-6 font-medium">Available in 2 accounts</p>
                
        <div className="flex items-center gap-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    <span className="text-[10px] font-bold">Savings: $8,200.00</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    <span className="text-[10px] font-bold">Income: $12,450.00</span>
                  </div>
                </div>
              </div>

              {/* Spending Trend */}
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-base">Spending Trend</h3>
                  <span className="text-[10px] font-bold text-[#58c68d] uppercase tracking-wider">Last 7 Days</span>
                </div>
                <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#58c68d" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#58c68d" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#58c68d" 
                        strokeWidth={3}
                        fill="url(#colorValue)" 
                      />
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        labelStyle={{ display: 'none' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.03]">
                    <div className="border-t border-gray-900 w-full" />
                    <div className="border-t border-gray-900 w-full" />
                    <div className="border-t border-gray-900 w-full" />
                  </div>
                </div>
                <div className="flex justify-between mt-4 px-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <span key={day} className="text-[10px] font-bold text-gray-400">{day}</span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="min-w-[64px] h-[64px] bg-white rounded-2xl border border-gray-50 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-[#58c68d]" />
                </button>
                {[
                  { icon: ArrowDownCircle, label: 'Income' },
                  { icon: TrendingUp, label: 'Stats' },
                  { icon: Wallet, label: 'Wallet' },
                  { icon: PieChartIcon, label: 'Report' }
                ].map((item, i) => (
                  <button key={i} className="min-w-[64px] h-[64px] bg-white rounded-2xl border border-gray-50 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
                    <item.icon className="w-6 h-6 text-gray-300" />
                  </button>
                ))}
              </div>

              {/* Recent Transactions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">Recent Activity</h3>
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-[10px] font-bold text-[#52c48a] uppercase tracking-wider"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {expenses.slice(0, 5).map(expense => (
                    <ExpenseItem key={expense.id} expense={expense} currency={profile?.currency || '$'} />
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm italic">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Reward Banner */}
              <div className="bg-[#e0f2fe] rounded-3xl p-6 flex items-center gap-4 border border-blue-100">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-blue-900">Reward Active</h4>
                  <p className="text-[10px] text-blue-700">You've earned 5% cashback on your coffee purchase this week!</p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div 
              key="transactions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full bg-white"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="w-10" />
                <h2 className="font-bold text-lg">Transactions</h2>
                <button className="p-2 hover:bg-gray-50 rounded-full">
                  <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-full py-3 px-6 text-sm focus:outline-none focus:ring-2 focus:ring-[#58c68d]/20 shadow-sm"
                  />
                </div>

                <div className="flex p-1.5 bg-gray-100/80 rounded-[20px]">
                  {['All', 'Income', 'Expenses'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setTransactionFilter(tab as any)}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-bold rounded-[14px] transition-all",
                        transactionFilter === tab ? "bg-white shadow-sm text-[#1a1a1a]" : "text-gray-400"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RECENT ACTIVITY</h3>
                    <span className="bg-[#f0f9f4] text-[#58c68d] px-3 py-1 rounded-full text-[10px] font-bold">
                      {filteredExpenses.length} Items
                    </span>
                  </div>
                  <div className="space-y-3">
                    {filteredExpenses.map(expense => (
                      <ExpenseItem key={expense.id} expense={expense} currency={profile?.currency || '$'} />
                    ))}
                  </div>
                </div>

                {/* Summary Card */}
                <div className="bg-[#58c68d] rounded-[32px] p-8 text-white relative overflow-hidden shadow-lg shadow-[#58c68d]/20">
                  <p className="text-[10px] font-bold opacity-90 uppercase mb-2">Total Expense ({new Date().toLocaleString('default', { month: 'short' })})</p>
                  <h3 className="text-4xl font-bold mb-6 tracking-tight">
                    {profile?.currency || '$'}{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-bold">-12% from Jan</span>
                    <span className="text-[10px] font-bold opacity-90">Keep it up!</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              <h2 className="font-bold text-lg">Analytics</h2>
              <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-sm mb-6">Category Breakdown</h3>
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
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="space-y-4">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold">{profile?.currency}{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-6"
            >
              <h2 className="font-bold text-lg">Profile</h2>
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                    className="w-24 h-24 rounded-full border-4 border-[#52c48a]/20"
                    alt="Avatar"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-xl font-bold">{profile?.displayName || 'User'}</h3>
                    <p className="text-sm text-gray-400">{profile?.email}</p>
                  </div>
                </div>

                <div className="space-y-4 text-left pt-8 border-t border-gray-100">
                  <h3 className="font-bold text-base">Budget Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Monthly Budget Limit</label>
                      <input 
                        type="number"
                        value={profile?.monthlyBudget || ''}
                        onChange={(e) => handleUpdateProfile({ monthlyBudget: parseFloat(e.target.value) })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#52c48a]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Currency Symbol</label>
                      <input 
                        type="text"
                        value={profile?.currency || ''}
                        onChange={(e) => handleUpdateProfile({ currency: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#52c48a]/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 text-red-500 bg-red-50 rounded-2xl font-bold text-sm transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-8 py-4 flex items-center justify-between z-40">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard className="w-6 h-6" />}
          label="Home"
        />
        <NavButton 
          active={activeTab === 'transactions'} 
          onClick={() => setActiveTab('transactions')}
          icon={<Calendar className="w-6 h-6" />}
          label="History"
        />
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white shadow-lg"
          >
            <Plus className="w-6 h-6" />
          </button>
          <span className="text-[10px] font-bold text-gray-900">Add</span>
        </div>
        <NavButton 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
          icon={<UserIcon className="w-6 h-6" />}
          label="Profile"
        />
      </nav>

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
                  <div className="flex p-1 bg-gray-100 rounded-2xl">
                    {['expense', 'income'].map(t => (
                      <label key={t} className="flex-1 cursor-pointer">
                        <input type="radio" name="type" value={t} defaultChecked={t === 'expense'} className="sr-only peer" />
                        <div className="py-2 text-xs font-bold rounded-xl text-center transition-all peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-[#1a1a1a] text-gray-500 capitalize">
                          {t}
                        </div>
                      </label>
                    ))}
                  </div>

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
                    className="w-full bg-[#52c48a] text-white rounded-2xl py-4 font-bold shadow-lg shadow-[#52c48a]/20 hover:bg-[#45b37a] transition-all mt-4"
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
    const type = formData.get('type') as 'income' | 'expense';
    const amount = parseFloat(formData.get('amount') as string);
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const dateStr = formData.get('date') as string;

    const newExpense: Omit<Expense, 'id'> = {
      userId: user.uid,
      amount,
      category,
      type,
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
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-[#58c68d]" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

interface ExpenseItemProps {
  expense: Expense;
  currency: string;
}

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, currency }) => {
  const isIncome = expense.type === 'income';
  
  const getIcon = () => {
    switch(expense.category) {
      case 'Food': return <Utensils className="w-5 h-5" />;
      case 'Transport': return <Car className="w-5 h-5" />;
      case 'Education': return <PlusSquare className="w-5 h-5" />;
      case 'Income': return <ArrowDownCircle className="w-5 h-5" />;
      case 'Health': return <CheckCircle2 className="w-5 h-5" />;
      case 'Entertainment': return <TrendingUp className="w-5 h-5" />;
      case 'Shopping': return <Wallet className="w-5 h-5" />;
      case 'Rent': return <PiggyBank className="w-5 h-5" />;
      case 'Utilities': return <Settings className="w-5 h-5" />;
      default: return <MoreHorizontal className="w-5 h-5" />;
    }
  };

  const getIconBg = () => {
    switch(expense.category) {
      case 'Food': return 'bg-orange-50 text-orange-400';
      case 'Transport': return 'bg-blue-50 text-blue-400';
      case 'Education': return 'bg-red-50 text-red-400';
      case 'Income': return 'bg-emerald-50 text-emerald-500';
      case 'Health': return 'bg-rose-50 text-rose-400';
      case 'Entertainment': return 'bg-purple-50 text-purple-400';
      case 'Shopping': return 'bg-pink-50 text-pink-400';
      case 'Rent': return 'bg-indigo-50 text-indigo-400';
      case 'Utilities': return 'bg-amber-50 text-amber-400';
      default: return 'bg-gray-50 text-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-[18px] flex items-center justify-center", getIconBg())}>
          {getIcon()}
        </div>
        <div>
          <p className="text-sm font-bold text-[#1a1a1a]">{expense.description || expense.category}</p>
          <p className="text-[10px] text-gray-400 font-bold tracking-tight">
            {expense.category} • {expense.date instanceof Timestamp ? new Date(expense.date.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn("text-sm font-bold", isIncome ? "text-[#58c68d]" : "text-[#1a1a1a]")}>
          {isIncome ? '+' : '-'}{currency}{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};

function AuthScreen({ mode, setMode, onLogin, setProfile }: { mode: 'login' | 'signup', setMode: (m: 'login' | 'signup') => void, onLogin: () => void, setProfile: (p: UserProfile | null) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup' && password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update profile in Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        const newProfile: UserProfile = {
          uid: userCredential.user.uid,
          email: email,
          displayName: name,
          photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
          monthlyBudget: 1000,
          currency: '$',
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, newProfile);
        setProfile(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f9f4] flex flex-col items-center p-6 font-sans text-[#1a1a1a]">
      <div className="w-full max-w-md mt-12 mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mb-4">
          <PiggyBank className="w-10 h-10 text-[#58c68d]" />
        </div>
        <h1 className="text-4xl font-bold text-[#4d966e] mb-4 tracking-tight">Ascend Wallet</h1>
        
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3 text-sm font-medium text-[#4d966e]/80">
            <CheckCircle2 className="w-4 h-4" />
            <span>Automated expense tracking</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-[#4d966e]/80">
            <CheckCircle2 className="w-4 h-4" />
            <span>Visual spending insights</span>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-[#4d966e]/80">
            <CheckCircle2 className="w-4 h-4" />
            <span>Monthly budget goals</span>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl shadow-black/5"
      >
        <h2 className="text-2xl font-bold mb-2 text-center">
          {mode === 'login' ? 'Welcome Back !' : 'Create Your Account'}
        </h2>
        <p className="text-sm text-gray-400 font-medium mb-8 text-center">
          {mode === 'login' ? 'Enter your credentials to access your account' : 'Sign up to manage your finances'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58c68d]" />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[20px] py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#58c68d]/20 transition-all font-medium text-sm shadow-sm"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58c68d]" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[20px] py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#58c68d]/20 transition-all font-medium text-sm shadow-sm"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58c68d]" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[20px] py-4 pl-14 pr-14 focus:outline-none focus:ring-2 focus:ring-[#58c68d]/20 transition-all font-medium text-sm shadow-sm"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58c68d]" />
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[20px] py-4 pl-14 pr-6 focus:outline-none focus:ring-2 focus:ring-[#58c68d]/20 transition-all font-medium text-sm shadow-sm"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="text-right">
              <button type="button" className="text-xs font-bold text-[#58c68d] hover:underline">Forgot Password?</button>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-center gap-3 py-1">
              <input type="checkbox" id="terms" className="w-4 h-4 rounded border-gray-300 text-[#58c68d] focus:ring-[#58c68d]" />
              <label htmlFor="terms" className="text-xs font-medium text-[#4d966e]">
                I agree to the <span className="underline">Terms and Conditions</span>
              </label>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#58c68d] text-white rounded-[20px] py-4 font-bold shadow-lg shadow-[#58c68d]/20 hover:bg-[#45b37a] transition-all mt-2 disabled:opacity-50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
              <span className="bg-white px-4">NEW HERE?</span>
            </div>
          </div>

          {mode === 'login' ? (
            <button 
              onClick={() => setMode('signup')}
              className="w-full bg-white border border-[#58c68d] text-[#58c68d] rounded-[20px] py-4 font-bold hover:bg-[#f0f9f4] transition-all"
            >
              Create Account
            </button>
          ) : (
            <p className="text-sm font-medium text-gray-500">
              Already have an account? <button onClick={() => setMode('login')} className="text-[#58c68d] underline">Login</button>
            </p>
          )}

          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors pt-4"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            Continue with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}


