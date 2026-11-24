import express from 'express';
import {
    getUserProfile,
    toggleAnonymousMode,
    getHealthProfile,
    updateHealthProfile,
    createHealthLog,
    updateHealthLog,
    deleteHealthLog,
    getPublicEmergencyInfo,
    getEmergencyToken,
    rotateEmergencyToken,
    revokeEmergencyToken,
    searchUsers
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/search', protect as any, searchUsers as any);

router.get('/profile', protect as any, getUserProfile as any);
router.patch('/anonymous-mode', protect as any, toggleAnonymousMode as any);
router.get('/health-profile', protect as any, getHealthProfile as any);
router.patch('/health-profile', protect as any, updateHealthProfile as any);

router.post('/health-logs', protect as any, createHealthLog as any);
router.patch('/health-logs/:id', protect as any, updateHealthLog as any);
router.delete('/health-logs/:id', protect as any, deleteHealthLog as any);

router.get('/emergency-token', protect as any, getEmergencyToken as any);
router.post('/emergency-token/rotate', protect as any, rotateEmergencyToken as any);
router.delete('/emergency-token', protect as any, revokeEmergencyToken as any);

// Public: looked up by random token, never by user id.
router.get('/emergency-info/:token', getPublicEmergencyInfo as any);

export default router;
