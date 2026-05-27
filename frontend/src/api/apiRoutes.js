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


