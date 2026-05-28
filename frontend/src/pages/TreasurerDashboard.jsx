import React, { useState, useEffect } from 'react';
import { financeAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    incomeItems: [],
    expenseItems: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await financeAPI.getAll();
        const transactions = response.data.records || [];

        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        const totalExpense = expenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const incomeByCategory = {};
        const expenseByCategory = {};

        income.forEach(item => {
          const cat = item.category || 'Uncategorized';
          incomeByCategory[cat] = (incomeByCategory[cat] || 0) + parseFloat(item.amount || 0);
        });

        expenses.forEach(item => {
          const cat = item.category || 'Uncategorized';
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + parseFloat(item.amount || 0);
        });

        setStats({
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          incomeItems: Object.entries(incomeByCategory).map(([cat, amt]) => ({ category: cat, amount: amt })),
          expenseItems: Object.entries(expenseByCategory).map(([cat, amt]) => ({ category: cat, amount: amt })),
          recentTransactions: transactions.slice(0, 10)
        });
      } catch (error) {
        console.error('Error fetching treasurer dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getCategoryIcon = (category) => {
    const icons = {
      collection: '💰',
      donation: '🎁',
      membership_fees: '👥',
      event_revenue: '🎉',
      repair_maintenance: '🔧',
      equipment: '⚙️',
      utilities: '💡',
      supplies: '📦',
      personnel: '👨‍💼',
      events: '🎊',
      community_programs: '📚',
      miscellaneous: '📝'
    };
    return icons[category?.toLowerCase()] || '📊';
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.full_name}!</h1>
        <p className="text-gray-600 mt-2">Treasurer Dashboard - Financial Management</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Income</p>
                  <p className="text-3xl font-bold text-green-600">
                    ₱{stats.totalIncome.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-4xl text-green-500 opacity-20">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600">
                    ₱{stats.totalExpense.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-4xl text-red-500 opacity-20">💸</div>
              </div>
            </div>

            <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${stats.balance >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Balance</p>
                  <p className={`text-3xl font-bold ${stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    ₱{stats.balance.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`text-4xl ${stats.balance >= 0 ? 'text-blue-500' : 'text-orange-500'} opacity-20`}>
                  {stats.balance >= 0 ? '📈' : '📉'}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Income Breakdown</h3>
                <button
                  onClick={() => navigate('/finance')}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  View Details →
                </button>
              </div>
              <div className="space-y-3">
                {stats.incomeItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No income records</p>
                ) : (
                  stats.incomeItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                        <span className="font-medium text-gray-800">{item.category}</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        ₱{item.amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Expense Breakdown</h3>
                <button
                  onClick={() => navigate('/finance')}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  View Details →
                </button>
              </div>
              <div className="space-y-3">
                {stats.expenseItems.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No expense records</p>
                ) : (
                  stats.expenseItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                        <span className="font-medium text-gray-800">{item.category}</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        ₱{item.amount.toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
              <button
                onClick={() => navigate('/finance')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View All →
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-300 bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-2">Date</th>
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-left py-3 px-2">Category</th>
                    <th className="text-right py-3 px-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-gray-500">
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    stats.recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-2">{new Date(transaction.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-2">{transaction.description || '-'}</td>
                        <td className="py-3 px-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-2">{transaction.category || '-'}</td>
                        <td className={`py-3 px-2 text-right font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}₱{Math.abs(transaction.amount).toLocaleString('en-PH', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/finance')}
              className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              📊 View All Finances
            </button>
            <button
              onClick={() => navigate('/finance')}
              className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              ➕ Add Income
            </button>
            <button
              onClick={() => navigate('/finance')}
              className="bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold"
            >
              ➖ Add Expense
            </button>
          </div>
        </>
      )}
    </div>
  );
}
