import { Router } from 'express';
import { startOnboarding, submitAnswer, getOnboardingStatus, submitOnboardingData } from '../controllers/onboarding.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Start onboarding conversation (for AI)
router.post('/start', authenticate, startOnboarding);

// Submit answer to continue onboarding (for AI)
router.post('/answer', authenticate, submitAnswer);

// Submit complete onboarding data (form-based)
router.post('/submit', authenticate, submitOnboardingData);

// Get current onboarding status
router.get('/status', authenticate, getOnboardingStatus);

export default router;
