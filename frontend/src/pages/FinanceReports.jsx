import { useState } from 'react';
import Card from '../components/Card';

/**
 * Finance Reports Page - Accessible to Treasurer and Admin only
 * 
 * Usage in AdminLayout.jsx:
 * 
 * import { ROLES } from '../utils/roles';
 * import ProtectedRoute from '../components/ProtectedRoute';
 * import FinanceReports from '../pages/FinanceReports';
 * 
 * <Route
 *   path="/finance-reports"
 *   element={
 *     <ProtectedRoute 
 *       requiredRoles={[ROLES.TREASURER, ROLES.ADMIN]}
 *       userRole={profile?.role}
 *     >
 *       <FinanceReports />
 *     </ProtectedRoute>
 *   }
 * />
 */

export default function FinanceReports() {
  const [dateRange, setDateRange] = useState('this_month');
  const [reportType, setReportType] = useState('summary');

  const handleDownload = (format) => {
    console.log(`Downloading report as ${format}`);
    // TODO: Implement download logic
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Financial Reports</h2>
        <p className="text-slate-600">Generate and view financial reports</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Date Range
            </label>
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Type
            </label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="income">Income Only</option>
              <option value="expense">Expense Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <button className="w-full rounded-lg bg-blue-500 text-white py-2 text-sm font-medium hover:bg-blue-600">
              Generate Report
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-lg font-semibold mb-4">Available Reports</h3>
          <div className="space-y-2">
            <button className="w-full text-left p-3 border border-slate-200 rounded hover:bg-slate-50 text-sm">
              📊 Income vs Expense Analysis
            </button>
            <button className="w-full text-left p-3 border border-slate-200 rounded hover:bg-slate-50 text-sm">
              💰 Cash Flow Report
            </button>
            <button className="w-full text-left p-3 border border-slate-200 rounded hover:bg-slate-50 text-sm">
              📈 Trend Analysis
            </button>
            <button className="w-full text-left p-3 border border-slate-200 rounded hover:bg-slate-50 text-sm">
              🎯 Budget Performance
            </button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4">Download Report</h3>
          <div className="space-y-2">
            <button 
              onClick={() => handleDownload('pdf')}
              className="w-full p-2 bg-red-100 text-red-900 rounded hover:bg-red-200 text-sm"
            >
              📄 Download as PDF
            </button>
            <button 
              onClick={() => handleDownload('xlsx')}
              className="w-full p-2 bg-green-100 text-green-900 rounded hover:bg-green-200 text-sm"
            >
              📊 Download as Excel
            </button>
            <button 
              onClick={() => handleDownload('csv')}
              className="w-full p-2 bg-blue-100 text-blue-900 rounded hover:bg-blue-200 text-sm"
            >
              📋 Download as CSV
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Report Preview</h3>
        <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-slate-500 py-12">
          Select options and click "Generate Report" to preview here
        </div>
      </Card>
    </div>
  );
}
