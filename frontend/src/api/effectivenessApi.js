import axiosInstance from './axiosInstance';

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
