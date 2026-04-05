import api from './api';

// Colleges
export const collegeService = {
  getAll: (params?: any) => api.get('/field-sales/colleges', { params }),
  getById: (id: string) => api.get(`/field-sales/colleges/${id}`),
  getStats: () => api.get('/field-sales/colleges/stats'),
  // Use all-states and all-districts for complete India location data
  getStates: () => api.get('/field-sales/colleges/all-states'),
  getDistricts: (state: string) => api.get('/field-sales/colleges/all-districts', { params: { state } }),
  getCities: (state?: string, district?: string) => api.get('/field-sales/colleges/cities', { params: { state, district } }),
};

// Visits
export const visitService = {
  getAll: (params?: any) => api.get('/field-sales/visits', { params }),
  getStats: () => api.get('/field-sales/visits/stats'),
  checkIn: (data: any) => api.post('/field-sales/visits/check-in', data),
  checkOut: (id: string, data: any) => api.post(`/field-sales/visits/${id}/check-out`, data),
  getActive: () => api.get('/field-sales/visits/active'),
};

// Expenses
export const expenseService = {
  getAll: (params?: any) => api.get('/field-sales/expenses', { params }),
  getMySummary: () => api.get('/field-sales/expenses/my-summary'),
  create: (data: any) => api.post('/field-sales/expenses', data),
  submit: (id: string) => api.post(`/field-sales/expenses/${id}/submit`),
  delete: (id: string) => api.delete(`/field-sales/expenses/${id}`),
};

// Deals
export const dealService = {
  getAll: (params?: any) => api.get('/field-sales/deals', { params }),
  getPipeline: () => api.get('/field-sales/deals/pipeline'),
  updateStage: (id: string, stage: string) => api.patch(`/field-sales/deals/${id}/stage`, { stage }),
};
