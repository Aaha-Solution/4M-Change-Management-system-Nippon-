import axiosInstance from './axiosInstance';

export const getDashboardChanges = () => {
  return axiosInstance.get('/dashboard/changes');
};
