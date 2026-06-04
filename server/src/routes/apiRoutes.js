import { Router } from 'express';
import { login, signup, forgotPassword, getUsers, deleteUser, updateUser } from '../controllers/authController.js';
import { getAllChanges, createChange, updateChangeStatus, createL1Request, getL2ValidationLogs, createL2ValidationLog, getL3Approvals, createL3Approval, getNextChangeNo, getL1AttachmentFile, getL1Details, getL2Details } from '../controllers/changeController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getRoles,
  addRole,
  deleteRole,
  getDepartments,
  addDepartment,
  deleteDepartment,
  getProcesses,
  addProcess,
  deleteProcess,
  getMachines,
  addMachine,
  deleteMachine
} from '../controllers/optionController.js';
import {
  getLogs,
  createLog,
  updateLog,
  deleteLog,
  getAttachmentFile,
  resetLogs
} from '../controllers/effectivenessController.js';
import {
  getNotifications,
  toggleRead,
  markAllRead,
  deleteNotification,
  clearRead,
  resetNotifications
} from '../controllers/notificationController.js';

const router = Router();

// New auth routes (under /auth/ prefix)
router.post('/auth/login', login);
router.post('/auth/signup', signup);
router.post('/auth/forgot-password', forgotPassword);

// Protected routes
router.get('/users', verifyToken, getUsers);
router.put('/users/:id', verifyToken, updateUser);
router.delete('/users/:id', verifyToken, deleteUser);
router.get('/changes', verifyToken, getAllChanges);
router.get('/changes/next-no', verifyToken, getNextChangeNo);
router.post('/changes', verifyToken, createChange);
router.post('/changes/l1', verifyToken, createL1Request);
router.get('/changes/l1/attachment/:changeNo/:fileName', verifyToken, getL1AttachmentFile);
router.get('/changes/l1/:changeNo', verifyToken, getL1Details);
router.get('/changes/l2', verifyToken, getL2ValidationLogs);
router.post('/changes/l2', verifyToken, createL2ValidationLog);
router.get('/changes/l2/:changeNo', verifyToken, getL2Details);
router.get('/changes/l3', verifyToken, getL3Approvals);
router.post('/changes/l3', verifyToken, createL3Approval);
router.put('/changes/:id/status', verifyToken, updateChangeStatus);

// Post-Implementation Effectiveness Monitoring endpoints
router.get('/effectiveness', verifyToken, getLogs);
router.post('/effectiveness', verifyToken, createLog);
router.put('/effectiveness/:id', verifyToken, updateLog);
router.delete('/effectiveness/:id', verifyToken, deleteLog);
router.get('/effectiveness/attachment/:logId/:fileName', verifyToken, getAttachmentFile);
router.post('/effectiveness/reset', verifyToken, resetLogs);

// Notifications endpoints
router.get('/notifications', verifyToken, getNotifications);
router.put('/notifications/mark-all-read', verifyToken, markAllRead);
router.put('/notifications/clear-read', verifyToken, clearRead);
router.put('/notifications/:id/read', verifyToken, toggleRead);
router.delete('/notifications/:id', verifyToken, deleteNotification);
router.post('/notifications/reset', verifyToken, resetNotifications);

// Roles option endpoints
router.get('/roles', verifyToken, getRoles);
router.post('/roles', verifyToken, addRole);
router.delete('/roles/:name', verifyToken, deleteRole);

// Departments option endpoints
router.get('/departments', verifyToken, getDepartments);
router.post('/departments', verifyToken, addDepartment);
router.delete('/departments/:name', verifyToken, deleteDepartment);

// Processes option endpoints
router.get('/processes', verifyToken, getProcesses);
router.post('/processes', verifyToken, addProcess);
router.delete('/processes/:name', verifyToken, deleteProcess);

// Machines option endpoints
router.get('/machines', verifyToken, getMachines);
router.post('/machines', verifyToken, addMachine);
router.delete('/machines/:name', verifyToken, deleteMachine);

export default router;
