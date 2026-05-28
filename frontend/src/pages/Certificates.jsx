import React, { useState, useEffect } from 'react';
import { certificatesAPI, residentsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function Certificates() {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('certificates');
  const [certificates, setCertificates] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [stats, setStats] = useState({});
  
  const [generateForm, setGenerateForm] = useState({
    resident_id: '',
    template_id: '',
    purpose: ''
  });
  
  const [templateFile, setTemplateFile] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'barangay_clearance'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [certsRes, templatesRes, residentsRes, statsRes] = await Promise.all([
        certificatesAPI.getAll(),
        certificatesAPI.getTemplates(),
        residentsAPI.getAll(1, 1000),
        certificatesAPI.getStats()
      ]);
      
      setCertificates(certsRes.data.certificates || []);
      setTemplates(templatesRes.data.templates || []);
      setResidents(residentsRes.data.residents || []);
      setStats(statsRes.data.stats || {});
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    try {
      await certificatesAPI.generate(generateForm);
      setShowGenerateModal(false);
      setGenerateForm({ resident_id: '', template_id: '', purpose: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate certificate');
    }
  };

  const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!templateFile) {
      setError('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('name', templateForm.name);
    formData.append('type', templateForm.type);
    
    try {
      await certificatesAPI.uploadTemplate(formData);
      setShowTemplateModal(false);
      setTemplateFile(null);
      setTemplateForm({ name: '', type: 'barangay_clearance' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload template');
    }
  };

  const handleApprove = async (id) => {
    try {
      await certificatesAPI.approve(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await certificatesAPI.reject(id, reason);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await certificatesAPI.deleteTemplate(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteCertificate = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    try {
      await certificatesAPI.delete(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const certificateTypes = [
    { value: 'barangay_clearance', label: 'Barangay Clearance' },
    { value: 'residency', label: 'Certificate of Residency' },
    { value: 'indigency', label: 'Certificate of Indigency' },
    { value: 'business_permit', label: 'Business Permit' },
    { value: 'good_moral', label: 'Good Moral Certificate' }
  ];

  if (!hasRole(['admin', 'secretary'])) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Certificate Management</h1>
          <p className="text-gray-600">Generate and manage certificates</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            + Generate Certificate
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
          >
            + Upload Template
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={() => setError('')} className="float-right">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-gray-600 text-sm">Total Certificates</p>
          <p className="text-2xl font-bold">{stats.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold">{stats.pending || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-2xl font-bold">{stats.approved || 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-gray-600 text-sm">Rejected</p>
          <p className="text-2xl font-bold">{stats.rejected || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('certificates')}
          className={`py-2 px-4 font-medium ${activeTab === 'certificates' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Certificates
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`py-2 px-4 font-medium ${activeTab === 'templates' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Templates
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : activeTab === 'certificates' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No certificates found</td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cert.control_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cert.resident_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cert.certificate_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{cert.purpose}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(cert.status)}`}>
                        {cert.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {cert.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(cert.id)} className="text-green-600 hover:text-green-900">Approve</button>
                          <button onClick={() => handleReject(cert.id)} className="text-red-600 hover:text-red-900">Reject</button>
                        </>
                      )}
                      {cert.file_path && (
                        <a href={`${import.meta.env.VITE_API_URL}/uploads/certificates/${cert.file_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">Download</a>
                      )}
                      <button onClick={() => handleDeleteCertificate(cert.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">No templates found</td>
                </tr>
              ) : (
                templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{template.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(template.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button onClick={() => handleDeleteTemplate(template.id)} className="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate Certificate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Certificate</h2>
            <form onSubmit={handleGenerateCertificate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                <select
                  value={generateForm.resident_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, resident_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Resident</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={generateForm.template_id}
                  onChange={(e) => setGenerateForm({ ...generateForm, template_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Template</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <textarea
                  value={generateForm.purpose}
                  onChange={(e) => setGenerateForm({ ...generateForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowGenerateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Upload Template</h2>
            <form onSubmit={handleUploadTemplate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type</label>
                <select
                  value={templateForm.type}
                  onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {certificateTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template File (DOCX)</label>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => setTemplateFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowTemplateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
