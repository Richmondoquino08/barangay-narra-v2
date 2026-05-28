import React, { useState, useEffect } from 'react';
import { residentsAPI, certificatesAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalResidents: 0,
    pendingCertificates: 0,
    approvedCertificates: 0,
    draftCertificates: 0
  });
  const [recentCerts, setRecentCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [residents, certs] = await Promise.all([
          residentsAPI.getAll(1, 1),
          certificatesAPI.getAll()
        ]);

        const certStats = certs.data.certificates || [];
        const pending = certStats.filter(c => c.status === 'pending').length;
        const approved = certStats.filter(c => c.status === 'approved').length;
        const draft = certStats.filter(c => c.status === 'draft').length;

        setStats({
          totalResidents: residents.data.total || 0,
          pendingCertificates: pending,
          approvedCertificates: approved,
          draftCertificates: draft
        });

        setRecentCerts(certStats.slice(0, 5));
      } catch (error) {
        console.error('Error fetching secretary dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome, {user?.full_name}!</h1>
        <p className="text-gray-600 mt-2">Secretary Dashboard</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Residents Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Residents</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalResidents}</p>
                </div>
                <div className="text-4xl text-blue-500 opacity-20">👥</div>
              </div>
            </div>

            {/* Pending Certificates Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Certificates</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.pendingCertificates}</p>
                </div>
                <div className="text-4xl text-yellow-500 opacity-20">⏳</div>
              </div>
            </div>

            {/* Approved Certificates Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Approved Certificates</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.approvedCertificates}</p>
                </div>
                <div className="text-4xl text-green-500 opacity-20">✓</div>
              </div>
            </div>

            {/* Draft Certificates Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Draft Certificates</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.draftCertificates}</p>
                </div>
                <div className="text-4xl text-purple-500 opacity-20">📝</div>
              </div>
            </div>
          </div>

          {/* Recent Certificates Table */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Certificates</h2>
            {recentCerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left">Resident Name</th>
                      <th className="px-4 py-3 text-left">Certificate Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentCerts.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{cert.resident_name}</td>
                        <td className="px-4 py-3">{cert.certificate_type?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cert.status === 'approved' ? 'bg-green-100 text-green-800' :
                            cert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            cert.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{new Date(cert.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No certificates found</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/residents" className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
              Manage Residents
            </a>
            <a href="/certificates" className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
              Generate Certificate
            </a>
            <a href="/certificates" className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg transition text-center font-semibold">
              View All Certificates
            </a>
          </div>
        </>
      )}
    </div>
  );
}
