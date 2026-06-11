import { Router } from 'express';
import { getAllChanges, createChange, updateChangeStatus } from '../controllers/allRequestsController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/changes', verifyToken, getAllChanges);
router.post('/changes', verifyToken, createChange);
router.put('/changes/:id/status', verifyToken, updateChangeStatus);

export default router;
