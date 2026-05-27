import { Router } from 'express';
import { login, signup, forgotPassword, getUsers, deleteUser } from '../controllers/authController.js';
import { getAllChanges, createChange, updateChangeStatus } from '../controllers/changeController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// New auth routes (under /auth/ prefix)
router.post('/auth/login', login);
router.post('/auth/signup', signup);
router.post('/auth/forgot-password', forgotPassword);

// Legacy/root auth routes (for backwards compatibility)
router.post('/login', login);
router.post('/forgot-password', forgotPassword);

// Protected routes
router.get('/users', verifyToken, getUsers);
router.delete('/users/:id', verifyToken, deleteUser);
router.get('/changes', verifyToken, getAllChanges);
router.post('/changes', verifyToken, createChange);
router.put('/changes/:id/status', verifyToken, updateChangeStatus);

export default router;
