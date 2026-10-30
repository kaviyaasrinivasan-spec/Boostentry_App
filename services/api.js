import axios from 'axios';

let API_BASE = 'https://kssroadways.axioralabs.ai';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 5 * 60 * 1000,
});

export const setBaseURL = (url) => {
  API_BASE = url;
  api.defaults.baseURL = url;
  console.log('API Base URL updated to:', url);
};

// ============ AUTH ============
export const login = async (email, password) => {
  const res = await api.post('/api/login', { email, password });
  return res.data;
};

export const fetchUsers = async () => {
  const res = await api.get('/api/users');
  return res.data;
};

// ============ CLIENTS ============
export const fetchClients = async (userClientId = null) => {
  const params = userClientId ? { user_client_id: userClientId } : {};
  const res = await api.get('/api/clients', { params });
  return res.data?.data || [];
};

// ============ DOC FORMATS ============
export const fetchDocFormats = async (clientId) => {
  const res = await api.get(`/api/doc_formats/${clientId}`);
  return res.data?.data || [];
};

export const uploadDocument = async ({ clientId, docFormatId, uploadedBy, pageCount, files }) => {
  const fd = new FormData();
  fd.append('client_id', clientId);
  fd.append('doc_format_id', docFormatId);
  fd.append('uploaded_by', uploadedBy || 'MOBILE_APP');
  fd.append('page_count', pageCount);

  let idx = 0;
  for (const file of files) {
    // Keep the real type/extension so the server processes PDFs as PDFs (not as .jpg images)
    const isPdf = file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name || '') || /\.pdf$/i.test(file.uri || '');
    const type = isPdf ? 'application/pdf' : (file.mimeType || 'image/jpeg');
    const ext = isPdf ? 'pdf' : (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    fd.append('files', {
      uri: file.uri,
      type,
      name: `upload_page_${idx + 1}_${Date.now()}.${ext}`,
    });
    idx++;
  }

  // Use fetch instead of axios for multipart/form-data to fix React Native array drops
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    body: fd,
    headers: {
      Accept: 'application/json',
      // fetch handles the multipart boundary automatically
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    // Mock the axios error structure so the UI catches it properly
    throw { response: { data } };
  }
  
  return data;
};

// ============ DASHBOARD ============
export const fetchDashboardSummary = async ({ clientId, fromDate, toDate } = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.append('client_id', clientId);
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  const res = await api.get(`/api/dashboard_summary?${params.toString()}`);
  return res.data;
};

// ============ MONITORING ============
export const fetchMonitoringData = async ({ clientId, status, fromDate, toDate } = {}) => {
  const params = new URLSearchParams();
  if (clientId) params.append('client_id', clientId);
  if (status) params.append('status', status);
  if (fromDate) params.append('from_date', fromDate);
  if (toDate) params.append('to_date', toDate);
  const res = await api.get(`/api/monitoring?${params.toString()}`);
  return res.data?.data || [];
};

export default api;
