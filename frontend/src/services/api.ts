import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      const authService = import('./auth').then(module => module.authService);
      authService.then(service => {
        service.logout();
        window.location.href = '/login';
      });
    }
    return Promise.reject(error);
  }
);

// テンプレート関連
export const templateApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get('/api/v1/templates', { params }),
  
  get: (id: string) => api.get(`/api/v1/templates/${id}`),
  
  create: (data: { name: string; description?: string; blocks?: any[] }) =>
    api.post('/api/v1/templates', data),
  
  update: (id: string, data: { name?: string; description?: string; blocks?: any[] }) =>
    api.patch(`/api/v1/templates/${id}`, data),
  
  createVersion: (id: string) =>
    api.post(`/api/v1/templates/${id}/version`),
  
  delete: (id: string) => api.delete(`/api/v1/templates/${id}`),
};

// ドキュメント関連
export const documentApi = {
  upload: (templateId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('templateId', templateId);
    
    return api.post('/api/v1/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  list: (params?: { templateId?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/api/v1/documents', { params }),
  
  get: (id: string) => api.get(`/api/v1/documents/${id}`),
  
  getPage: (id: string, page: number, thumb: boolean = false) =>
    api.get(`/api/v1/documents/${id}/pages/${page}${thumb ? '?thumb=true' : ''}`),
  
  approve: (id: string) => api.patch(`/api/v1/documents/${id}/approve`),
  
  delete: (id: string) => api.delete(`/api/v1/documents/${id}`),
};

// OCR関連
export const ocrApi = {
  extract: (data: { imageBase64: string; templateId: string; pageId?: string }) =>
    api.post('/api/v1/ocr/extract', data),
  
  reprocess: (extractionId: string) =>
    api.post(`/api/v1/ocr/reprocess/${extractionId}`),
};

// エクスポート関連
export const exportApi = {
  create: (data: { templateId?: string; format: string; filterJson?: any }) =>
    api.post('/api/v1/exports', data),
  
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/api/v1/exports', { params }),
  
  download: (id: string) => api.get(`/api/v1/exports/${id}/download`, {
    responseType: 'blob',
  }),
  
  delete: (id: string) => api.delete(`/api/v1/exports/${id}`),
};

// ユーザー管理関連
export const usersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }) =>
    api.get('/api/v1/users', { params }),

  get: (id: string) => api.get(`/api/v1/users/${id}`),

  create: (data: {
    email: string;
    username: string;
    password: string;
    role?: string;
    isActive?: boolean;
  }) =>
    api.post('/api/v1/users', data),

  update: (id: string, data: {
    email?: string;
    username?: string;
    role?: string;
    isActive?: boolean;
  }) =>
    api.patch(`/api/v1/users/${id}`, data),

  changePassword: (id: string, data: { newPassword: string }) =>
    api.patch(`/api/v1/users/${id}/password`, data),

  delete: (id: string) => api.delete(`/api/v1/users/${id}`),

  invite: (data: {
    email: string;
    username: string;
    role?: string;
    message?: string;
  }) =>
    api.post('/api/v1/users/invite', data),

  import: (data: { users: any[] }) =>
    api.post('/api/v1/users/import', data),

  toggleActive: (id: string) =>
    api.patch(`/api/v1/users/${id}/toggle-active`),

  getRoles: () => api.get('/api/v1/users/roles/list'),
};

// 監査ログ関連
export const auditLogsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    tableName?: string;
    operation?: string;
    startDate?: string;
    endDate?: string;
    recordId?: string;
  }) =>
    api.get('/api/v1/audit-logs', { params }),

  get: (id: string) => api.get(`/api/v1/audit-logs/${id}`),

  getSummary: () => api.get('/api/v1/audit-logs/summary'),

  search: (q: string, limit?: number) =>
    api.get('/api/v1/audit-logs/search', { params: { q, limit } }),

  exportCsv: (params?: {
    search?: string;
    userId?: string;
    tableName?: string;
    operation?: string;
    startDate?: string;
    endDate?: string;
    recordId?: string;
  }) =>
    api.get('/api/v1/audit-logs/export/csv', { 
      params,
      responseType: 'blob',
    }),

  getTables: () => api.get('/api/v1/audit-logs/tables/list'),

  getOperations: () => api.get('/api/v1/audit-logs/operations/list'),
};

// テナント設定関連
export const tenantApi = {
  getLLMSettings: () => api.get('/api/v1/tenants/settings/llm'),
  updateLLMSettings: (data: {
    defaultModel: string;
    enabledModels: string[];
    modelConfigs?: {
      [key: string]: {
        apiKey?: string;
        maxTokens?: number;
        temperature?: number;
      };
    };
  }) => api.put('/api/v1/tenants/settings/llm', data),
  
  getSettings: () => api.get('/api/v1/tenants/settings'),
  updateSettings: (data: { [key: string]: any }) => api.put('/api/v1/tenants/settings', data),
};

// OCR関連
export const ocrApi = {
  getAvailableModels: () => api.get('/api/v1/ocr/models/available'),
};

// 承認ワークフロー関連
export const workflowApi = {
  // ワークフロー定義の管理
  getDefinitions: () => api.get('/api/v1/workflows/definitions'),
  getDefinition: (id: string) => api.get(`/api/v1/workflows/definitions/${id}`),
  createDefinition: (data: any) => api.post('/api/v1/workflows/definitions', data),
  updateDefinition: (id: string, data: any) => api.put(`/api/v1/workflows/definitions/${id}`, data),
  deleteDefinition: (id: string) => api.delete(`/api/v1/workflows/definitions/${id}`),

  // 承認フローの操作
  startApproval: (data: { documentId: string; workflowId: string; metadata?: any }) =>
    api.post('/api/v1/workflows/start', data),
  
  executeTransition: (data: { documentId: string; actionKey: string; comment?: string; metadata?: any; delegatedToId?: string }) =>
    api.post('/api/v1/workflows/transition', data),

  // 承認インスタンスと履歴の取得
  getApprovalInstance: (documentId: string) =>
    api.get(`/api/v1/workflows/instances/document/${documentId}`),
  
  getApprovalHistory: (documentId: string) =>
    api.get(`/api/v1/workflows/history/document/${documentId}`),
  
  getPendingApprovals: () =>
    api.get('/api/v1/workflows/pending'),

  // ワークフローの状態とアクション情報
  getWorkflowStates: (workflowId: string) =>
    api.get(`/api/v1/workflows/definitions/${workflowId}/states`),
  
  getStateActions: (stateId: string) =>
    api.get(`/api/v1/workflows/states/${stateId}/actions`),
};

export const createPromptTemplate = (
  templateId: string,
  prompts: Partial<PromptTemplate>[],
) => {
  return api.post(`/api/v1/templates/${templateId}/prompts`, prompts);
};

export const updatePromptTemplate = (
  promptId: string,
  prompt: Partial<PromptTemplate>,
) => {
  return api.patch(`/api/v1/templates/prompts/${promptId}`, prompt);
};

export const deletePromptTemplate = (promptId: string) => {
  return api.delete(`/api/v1/templates/prompts/${promptId}`);
};

export const createDocument = (data: FormData) => {
  return api.post('/documents', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};