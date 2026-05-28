import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsAPI, certificatesAPI, requestsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function ResidentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [resident, setResident] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const residentRes = await residentsAPI.getById(id);
      setResident(residentRes.data.resident || residentRes.data);
      
      // Fetch related data
      try {
        const [certsRes, reqsRes] = await Promise.all([
          certificatesAPI.getAll({ resident_id: id }),
          requestsAPI.getAll({ resident_id: id })
        ]);
        setCertificates(certsRes.data.certificates || []);
        setRequests(reqsRes.data.requests || []);
      } catch (err) {
        // Related data fetch failed, but resident loaded
        console.log('Could not fetch related data');
      }
    } catch (err) {
      setError('Failed to load resident profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return '-';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!hasRole(['admin', 'secretary'])) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">Loading resident profile...</div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">
          {error || 'Resident not found'}
        </div>
        <button
          onClick={() => navigate('/residents')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Residents
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
            {resident.first_name?.charAt(0)}{resident.last_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}
            </h1>
            <p className="text-gray-600">{resident.address}</p>
            <div className="flex gap-2 mt-2">
              {resident.voter_status && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">Voter</span>}
              {resident.is_4ps_member && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">4Ps</span>}
              {resident.is_pwd && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">PWD</span>}
              {resident.is_senior && <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Senior</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/residents')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={() => navigate(`/residents`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Edit Resident
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`py-2 px-4 font-medium ${activeTab === 'info' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`py-2 px-4 font-medium ${activeTab === 'certificates' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Certificates ({certificates.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2 px-4 font-medium ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
        >
          Requests ({requests.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Details</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Full Name</dt>
                <dd className="font-medium">{resident.first_name} {resident.middle_name} {resident.last_name} {resident.suffix}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Gender</dt>
                <dd className="font-medium capitalize">{resident.gender}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Birthdate</dt>
                <dd className="font-medium">{resident.birthdate ? new Date(resident.birthdate).toLocaleDateString() : '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Age</dt>
                <dd className="font-medium">{calculateAge(resident.birthdate)} years old</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Civil Status</dt>
                <dd className="font-medium capitalize">{resident.civil_status}</dd>
              </div>
            </dl>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Contact Number</dt>
                <dd className="font-medium">{resident.contact_number || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Email</dt>
                <dd className="font-medium">{resident.email || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Purok</dt>
                <dd className="font-medium">{resident.purok || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Address</dt>
                <dd className="font-medium">{resident.address}</dd>
              </div>
            </dl>
          </div>

          {/* Employment & Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Employment & Income</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Occupation</dt>
                <dd className="font-medium">{resident.occupation || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Monthly Income</dt>
                <dd className="font-medium">
                  {resident.monthly_income ? `₱${parseFloat(resident.monthly_income).toLocaleString()}` : '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Special Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Special Status</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Registered Voter</dt>
                <dd className={`font-medium ${resident.voter_status ? 'text-green-600' : 'text-gray-400'}`}>
                  {resident.voter_status ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">4Ps Member</dt>
                <dd className={`font-medium ${resident.is_4ps_member ? 'text-green-600' : 'text-gray-400'}`}>
                  {resident.is_4ps_member ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">PWD</dt>
                <dd className={`font-medium ${resident.is_pwd ? 'text-green-600' : 'text-gray-400'}`}>
                  {resident.is_pwd ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Senior Citizen</dt>
                <dd className={`font-medium ${resident.is_senior ? 'text-green-600' : 'text-gray-400'}`}>
                  {resident.is_senior ? 'Yes' : 'No'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No certificates found</td>
                </tr>
              ) : (
                certificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cert.control_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cert.certificate_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{cert.purpose}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(cert.status)}`}>
                        {cert.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(cert.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Control No.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No requests found</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.control_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.request_type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{req.purpose}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(req.status)}`}>
                        {req.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
