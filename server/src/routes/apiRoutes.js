import { Router } from 'express';
import { login, signup, forgotPassword, getUsers, deleteUser, updateUser } from '../controllers/authController.js';
import { getAllChanges, createChange, updateChangeStatus } from '../controllers/changeController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';
import {
  getRoles,
  addRole,
  deleteRole,
  getDepartments,
  addDepartment,
  deleteDepartment
} from '../controllers/optionController.js';
import {
  getLogs,
  createLog,
  updateLog,
  deleteLog,
  getAttachmentFile,
  resetLogs
} from '../controllers/effectivenessController.js';

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
router.post('/changes', verifyToken, createChange);
router.put('/changes/:id/status', verifyToken, updateChangeStatus);

// Post-Implementation Effectiveness Monitoring endpoints
router.get('/effectiveness', verifyToken, getLogs);
router.post('/effectiveness', verifyToken, createLog);
router.put('/effectiveness/:id', verifyToken, updateLog);
router.delete('/effectiveness/:id', verifyToken, deleteLog);
router.get('/effectiveness/attachment/:logId/:fileName', verifyToken, getAttachmentFile);
router.post('/effectiveness/reset', verifyToken, resetLogs);

// Roles option endpoints
router.get('/roles', verifyToken, getRoles);
router.post('/roles', verifyToken, addRole);
router.delete('/roles/:name', verifyToken, deleteRole);

// Departments option endpoints
router.get('/departments', verifyToken, getDepartments);
router.post('/departments', verifyToken, addDepartment);
router.delete('/departments/:name', verifyToken, deleteDepartment);

export default router;
