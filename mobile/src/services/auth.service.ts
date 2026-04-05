import api from './api';

export const authService = {
  async login(credentials: { email: string; password: string }) {
    console.log('[AuthService] Attempting login for:', credentials.email);
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('[AuthService] Login successful');
      return response.data.data;
    } catch (error: any) {
      console.log('[AuthService] Login error:', error.message);
      throw error;
    }
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },

  async logout() {
    await api.post('/auth/logout');
  },
};
