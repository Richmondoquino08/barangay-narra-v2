import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (full_name, email, password, role) => apiClient.post('/auth/register', { full_name, email, password, role }),
  getMe: () => apiClient.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => apiClient.post('/auth/change-password', { currentPassword, newPassword }),
  logout: () => apiClient.post('/auth/logout')
};

// Users API endpoints
export const usersAPI = {
  getAll: () => apiClient.get('/users'),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (userData) => apiClient.post('/users', userData),
  update: (id, userData) => apiClient.put(`/users/${id}`, userData),
  delete: (id) => apiClient.delete(`/users/${id}`),
  toggleStatus: (id) => apiClient.patch(`/users/${id}/toggle-status`),
  resetPassword: (id, newPassword) => apiClient.post(`/users/${id}/reset-password`, { newPassword })
};

// Residents API endpoints
export const residentsAPI = {
  getAll: (page = 1, limit = 20, params = {}) => apiClient.get('/residents', { params: { page, limit, ...params } }),
  search: (q, page = 1) => apiClient.get('/residents/search/query', { params: { q, page } }),
  getById: (id) => apiClient.get(`/residents/${id}`),
  create: (data) => apiClient.post('/residents', data),
  update: (id, data) => apiClient.put(`/residents/${id}`, data),
  delete: (id) => apiClient.delete(`/residents/${id}`),
  export: () => apiClient.get('/residents/export/csv'),
  importResidents: (data) => apiClient.post('/residents/import', { residents: data }),
  downloadTemplate: () => apiClient.get('/residents/import/template', { responseType: 'blob' }),
};

// Certificates API endpoints
export const certificatesAPI = {
  getAll: (params = {}) => apiClient.get('/certificates', { params }),
  getById: (id) => apiClient.get(`/certificates/${id}`),
  generate: (data) => apiClient.post('/certificates/generate', data),
  uploadTemplate: (formData) => apiClient.post('/certificates/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getTemplates: () => apiClient.get('/certificates/templates'),
  getTemplateById: (id) => apiClient.get(`/certificates/templates/${id}`),
  deleteTemplate: (id) => apiClient.delete(`/certificates/templates/${id}`),
  createCustomTemplate: (data) => apiClient.post('/certificates/templates/custom', data),
  updateCustomTemplate: (id, data) => apiClient.put(`/certificates/templates/${id}/custom`, data),
  uploadHeaderImage: (formData) => apiClient.post('/certificates/templates/upload-image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  approve: (id) => apiClient.patch(`/certificates/${id}/approve`),
  reject: (id) => apiClient.patch(`/certificates/${id}/reject`),
  delete: (id) => apiClient.delete(`/certificates/${id}`),
  getStats: () => apiClient.get('/certificates/stats/overview')
};

// Finance API endpoints
export const financeAPI = {
  getAll: (params = {}) => apiClient.get('/finance', { params }),
  create: (data) => apiClient.post('/finance', data),
  update: (id, data) => apiClient.put(`/finance/${id}`, data),
  delete: (id) => apiClient.delete(`/finance/${id}`),
  getStats: () => apiClient.get('/finance/stats/overview'),
  export: () => apiClient.get('/finance/export/csv')
};

// Blotter API endpoints
export const blotterAPI = {
  getAll: (params = {}) => apiClient.get('/blotter', { params }),
  getById: (id) => apiClient.get(`/blotter/${id}`),
  create: (data) => apiClient.post('/blotter', data),
  update: (id, data) => apiClient.put(`/blotter/${id}`, data),
  updateStatus: (id, data) => apiClient.patch(`/blotter/${id}/status`, data),
  delete: (id) => apiClient.delete(`/blotter/${id}`)
};

// Requests API endpoints
export const requestsAPI = {
  getAll: (params = {}) => apiClient.get('/requests', { params }),
  getById: (id) => apiClient.get(`/requests/${id}`),
  create: (data) => apiClient.post('/requests', data),
  update: (id, data) => apiClient.put(`/requests/${id}`, data),
  approve: (id) => apiClient.patch(`/requests/${id}/approve`),
  reject: (id, reason) => apiClient.patch(`/requests/${id}/reject`, { reason }),
  process: (id) => apiClient.patch(`/requests/${id}/process`),
  complete: (id) => apiClient.patch(`/requests/${id}/complete`),
  delete: (id) => apiClient.delete(`/requests/${id}`)
};

// Announcements API endpoints
export const announcementsAPI = {
  getAll: () => apiClient.get('/announcements'),
  create: (data) => apiClient.post('/announcements', data),
  update: (id, data) => apiClient.put(`/announcements/${id}`, data),
  delete: (id) => apiClient.delete(`/announcements/${id}`)
};

// Audit API endpoints
export const auditAPI = {
  getAll: (params = {}) => apiClient.get('/audit', { params })
};

// Officials API
export const officialsAPI = {
  getAll: () => apiClient.get('/officials'),
  create: (data) => apiClient.post('/officials', data),
  update: (id, data) => apiClient.put(`/officials/${id}`, data),
  delete: (id) => apiClient.delete(`/officials/${id}`)
};

// Projects API
export const projectsAPI = {
  getAll: (params = {}) => apiClient.get('/projects', { params }),
  create: (data) => apiClient.post('/projects', data),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/projects/${id}/status`, { status }),
  delete: (id) => apiClient.delete(`/projects/${id}`)
};

// Assets API
export const assetsAPI = {
  getAll: (params = {}) => apiClient.get('/assets', { params }),
  create: (data) => apiClient.post('/assets', data),
  update: (id, data) => apiClient.put(`/assets/${id}`, data),
  delete: (id) => apiClient.delete(`/assets/${id}`)
};

// Social Programs API
export const socialAPI = {
  get4Ps: () => apiClient.get('/social/4ps'),
  create4Ps: (data) => apiClient.post('/social/4ps', data),
  update4Ps: (id, data) => apiClient.put(`/social/4ps/${id}`, data),
  delete4Ps: (id) => apiClient.delete(`/social/4ps/${id}`),

  getPwd: () => apiClient.get('/social/pwd'),
  createPwd: (data) => apiClient.post('/social/pwd', data),
  updatePwd: (id, data) => apiClient.put(`/social/pwd/${id}`, data),
  deletePwd: (id) => apiClient.delete(`/social/pwd/${id}`),

  getOsca: () => apiClient.get('/social/osca'),
  createOsca: (data) => apiClient.post('/social/osca', data),
  updateOsca: (id, data) => apiClient.put(`/social/osca/${id}`, data),
  deleteOsca: (id) => apiClient.delete(`/social/osca/${id}`),

  getBhw: () => apiClient.get('/social/bhw'),
  createBhw: (data) => apiClient.post('/social/bhw', data),
  updateBhw: (id, data) => apiClient.put(`/social/bhw/${id}`, data),
  deleteBhw: (id) => apiClient.delete(`/social/bhw/${id}`),

  getSk: () => apiClient.get('/social/sk'),
  createSk: (data) => apiClient.post('/social/sk', data),
  updateSk: (id, data) => apiClient.put(`/social/sk/${id}`, data),
  deleteSk: (id) => apiClient.delete(`/social/sk/${id}`)
};

// Reference Documents API
export const refDocsAPI = {
  getAll:   ()           => apiClient.get('/ref-docs'),
  upload:   (formData)   => apiClient.post('/ref-docs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  download: (id)         => apiClient.get(`/ref-docs/${id}/download`, { responseType: 'blob' }),
  delete:   (id)         => apiClient.delete(`/ref-docs/${id}`),
};

// DRRM API
export const drrmAPI = {
  getAll: (params = {}) => apiClient.get('/drrm', { params }),
  create: (data) => apiClient.post('/drrm', data),
  update: (id, data) => apiClient.put(`/drrm/${id}`, data),
  delete: (id) => apiClient.delete(`/drrm/${id}`)
};

// Budget & Salary API
export const budgetAPI = {
  getAll:       ()             => apiClient.get('/budget'),
  getCurrent:   (year)         => apiClient.get('/budget/current', { params: { year } }),
  getSummary:   (year)         => apiClient.get('/budget/summary',  { params: { year } }),
  checkBudget:  (p)            => apiClient.get('/budget/check',    { params: p }),
  save:         (data)         => apiClient.post('/budget', data),
  getSalaries:  (params = {})  => apiClient.get('/budget/salary', { params }),
  createSalary: (data)         => apiClient.post('/budget/salary', data),
  updateSalary: (id, data)     => apiClient.put(`/budget/salary/${id}`, data),
  deleteSalary: (id)           => apiClient.delete(`/budget/salary/${id}`),
};

// Finance Forms API (Barangay ID, KIDLAT, Trip Ticket, + future modules)
export const financeFormsAPI = {
  stats: () => apiClient.get('/finance-forms/stats'),
  // Module 1 — Barangay ID
  idGetAll: () => apiClient.get('/finance-forms/brgy-id'),
  idCreate: (data) => apiClient.post('/finance-forms/brgy-id', data),
  idUpdate: (id, data) => apiClient.put(`/finance-forms/brgy-id/${id}`, data),
  idDelete: (id) => apiClient.delete(`/finance-forms/brgy-id/${id}`),
  // Module 2 — KIDLAT
  kidlatGetAll: () => apiClient.get('/finance-forms/kidlat'),
  kidlatCreate: (data) => apiClient.post('/finance-forms/kidlat', data),
  kidlatUpdate: (id, data) => apiClient.put(`/finance-forms/kidlat/${id}`, data),
  kidlatDelete: (id) => apiClient.delete(`/finance-forms/kidlat/${id}`),
  // Module 3 — Trip Ticket
  tripGetAll: () => apiClient.get('/finance-forms/trip'),
  tripCreate: (data) => apiClient.post('/finance-forms/trip', data),
  tripUpdate: (id, data) => apiClient.put(`/finance-forms/trip/${id}`, data),
  tripDelete: (id) => apiClient.delete(`/finance-forms/trip/${id}`),
  // Module 4 — Petty Cash Fund
  pcfGetAll: () => apiClient.get('/finance-forms/pcf'),
  pcfCreate: (data) => apiClient.post('/finance-forms/pcf', data),
  pcfUpdate: (id, data) => apiClient.put(`/finance-forms/pcf/${id}`, data),
  pcfDelete: (id) => apiClient.delete(`/finance-forms/pcf/${id}`),
  // Module 5 — SPPCV (Petty Cash Vouchers)
  sppcvGetAll: (pcfId) => apiClient.get('/finance-forms/sppcv', { params: pcfId ? { pcf_id: pcfId } : {} }),
  sppcvCreate: (data) => apiClient.post('/finance-forms/sppcv', data),
  sppcvUpdate: (id, data) => apiClient.put(`/finance-forms/sppcv/${id}`, data),
  sppcvDelete: (id) => apiClient.delete(`/finance-forms/sppcv/${id}`),
};

// RAO — Record of Appropriations, Obligations & Disbursements (Module 17)
export const raoAPI = {
  getFunds: (year) => apiClient.get('/rao/funds', { params: year ? { year } : {} }),
  getEntries: (fundKey, year) => apiClient.get('/rao/entries', { params: { fund_key: fundKey, year } }),
  createEntry: (data) => apiClient.post('/rao/entries', data),
  updateEntry: (id, data) => apiClient.put(`/rao/entries/${id}`, data),
  deleteEntry: (id) => apiClient.delete(`/rao/entries/${id}`),
};

// Procurement Chain — ObR -> PR -> PO -> IAR -> RIS -> DV (Modules 10-15)
export const procurementAPI = {
  // Module 10 — Obligation Request
  obrGetAll: () => apiClient.get('/procurement/obr'),
  obrCreate: (data) => apiClient.post('/procurement/obr', data),
  obrUpdate: (id, data) => apiClient.put(`/procurement/obr/${id}`, data),
  obrDelete: (id) => apiClient.delete(`/procurement/obr/${id}`),
  // Module 11 — Purchase Request
  prGetAll: () => apiClient.get('/procurement/pr'),
  prCreate: (data) => apiClient.post('/procurement/pr', data),
  prUpdate: (id, data) => apiClient.put(`/procurement/pr/${id}`, data),
  prDelete: (id) => apiClient.delete(`/procurement/pr/${id}`),
  prGeneratePO: (id) => apiClient.post(`/procurement/pr/${id}/generate-po`),
  // Module 12 — Purchase Order
  poGetAll: () => apiClient.get('/procurement/po'),
  poUpdate: (id, data) => apiClient.put(`/procurement/po/${id}`, data),
  poDelete: (id) => apiClient.delete(`/procurement/po/${id}`),
  poGenerateIAR: (id) => apiClient.post(`/procurement/po/${id}/generate-iar`),
  // Module 13 — Inspection & Acceptance Report
  iarGetAll: () => apiClient.get('/procurement/iar'),
  iarUpdate: (id, data) => apiClient.put(`/procurement/iar/${id}`, data),
  iarDelete: (id) => apiClient.delete(`/procurement/iar/${id}`),
  iarGenerateRIS: (id) => apiClient.post(`/procurement/iar/${id}/generate-ris`),
  iarGenerateDV: (id) => apiClient.post(`/procurement/iar/${id}/generate-dv`),
  // Module 14 — Requisition & Issue Slip
  risGetAll: () => apiClient.get('/procurement/ris'),
  risUpdate: (id, data) => apiClient.put(`/procurement/ris/${id}`, data),
  risDelete: (id) => apiClient.delete(`/procurement/ris/${id}`),
  // Module 15 — Disbursement Voucher
  dvGetAll: () => apiClient.get('/procurement/dv'),
  dvUpdate: (id, data) => apiClient.put(`/procurement/dv/${id}`, data),
  dvDelete: (id) => apiClient.delete(`/procurement/dv/${id}`),
  dvMarkPaid: (id, data) => apiClient.post(`/procurement/dv/${id}/mark-paid`, data),
};

// Cashbook — CRDR (Module 6), CHBR (Module 7), Checks Issued report (Module 8)
export const cashbookAPI = {
  crdrGetAll: () => apiClient.get('/cashbook/crdr'),
  crdrCreate: (data) => apiClient.post('/cashbook/crdr', data),
  crdrUpdate: (id, data) => apiClient.put(`/cashbook/crdr/${id}`, data),
  crdrDelete: (id) => apiClient.delete(`/cashbook/crdr/${id}`),
  chbrGetAll: (bank) => apiClient.get('/cashbook/chbr', { params: bank ? { bank } : {} }),
  chbrBanks: () => apiClient.get('/cashbook/chbr/banks'),
  chbrCreate: (data) => apiClient.post('/cashbook/chbr', data),
  chbrUpdate: (id, data) => apiClient.put(`/cashbook/chbr/${id}`, data),
  chbrDelete: (id) => apiClient.delete(`/cashbook/chbr/${id}`),
  checksIssued: (params) => apiClient.get('/cashbook/checks-issued', { params }),
};

// Itemized Collections (Module 9)
export const collectionsAPI = {
  getAll: () => apiClient.get('/collections'),
  create: (data) => apiClient.post('/collections', data),
  update: (id, data) => apiClient.put(`/collections/${id}`, data),
  delete: (id) => apiClient.delete(`/collections/${id}`),
};

// Transmittal Letter (Module 19)
export const transmittalAPI = {
  getAll: () => apiClient.get('/transmittal'),
  create: (data) => apiClient.post('/transmittal', data),
  update: (id, data) => apiClient.put(`/transmittal/${id}`, data),
  delete: (id) => apiClient.delete(`/transmittal/${id}`),
};

export default apiClient;
