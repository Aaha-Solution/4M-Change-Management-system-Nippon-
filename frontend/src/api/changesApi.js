import axiosInstance from './axiosInstance';

export const getChanges = () => {
  return axiosInstance.get('/changes');
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

export const getL2ValidationLogs = () => {
  return axiosInstance.get('/changes/l2');
};

export const createL2ValidationLog = (logData) => {
  return axiosInstance.post('/changes/l2', { logData }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const getL3Approvals = () => {
  return axiosInstance.get('/changes/l3');
};

export const createL3Approval = (logData) => {
  return axiosInstance.post('/changes/l3', { logData }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

