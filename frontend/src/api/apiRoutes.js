import axiosInstance from './axiosInstance';


export const login = (data) => {
  return axiosInstance.post('/auth/login', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};


export const signup = (data) => {
  return axiosInstance.post('/auth/signup', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};


export const forgotPassword = (email) => {
  return axiosInstance.post('/auth/forgot-password', { email }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};


export const getChanges = () => {
  return axiosInstance.get('/changes');
};


export const getUsers = () => {
  return axiosInstance.get('/users');
};


export const createChange = (data) => {
  return axiosInstance.post('/changes', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateChangeStatus = (id, status) => {
  return axiosInstance.put(`/changes/${id}/status`, { status }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteUser = (id) => {
  return axiosInstance.delete(`/users/${id}`);
};

export const getRoles = () => {
  return axiosInstance.get('/roles');
};

export const addRole = (name) => {
  return axiosInstance.post('/roles', { name }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteRole = (name) => {
  return axiosInstance.delete(`/roles/${encodeURIComponent(name)}`);
};

export const getDepartments = () => {
  return axiosInstance.get('/departments');
};

export const addDepartment = (name) => {
  return axiosInstance.post('/departments', { name }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteDepartment = (name) => {
  return axiosInstance.delete(`/departments/${encodeURIComponent(name)}`);
};

export const updateUser = (id, data) => {
  return axiosInstance.put(`/users/${id}`, data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
export const getEffectivenessLogs = () => {
  return axiosInstance.get('/effectiveness');
};

export const createEffectivenessLog = (logData, attachments) => {
  return axiosInstance.post('/effectiveness', { logData, attachments }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const updateEffectivenessLog = (id, logData, attachments) => {
  return axiosInstance.put(`/effectiveness/${id}`, { logData, attachments }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const deleteEffectivenessLog = (id) => {
  return axiosInstance.delete(`/effectiveness/${id}`);
};

export const getEffectivenessAttachment = (logId, fileName) => {
  return axiosInstance.get(`/effectiveness/attachment/${logId}/${fileName}`, {
    responseType: 'blob'
  });
};

export const resetEffectivenessLogs = () => {
  return axiosInstance.post('/effectiveness/reset');
};
