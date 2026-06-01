import axiosInstance from './axiosInstance';

export const getChanges = () => {
  return axiosInstance.get('/changes');
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

export const createL1Request = (l1Data) => {
  return axiosInstance.post('/changes/l1', { l1Data }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
