import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { chat } from '../controllers/ai.chat.controller';
import { getContext, updateContext } from '../controllers/ai.context.controller';
import { generatePlan, rebalancePlan } from '../controllers/ai.plan.controller';
import { generateDailySummary, generateMonthlySummary } from '../controllers/ai.summary.controller';

const router = Router();

// Chat endpoint
router.post('/chat', authenticate, chat);

// Context endpoints
router.get('/context', authenticate, getContext);
router.put('/context', authenticate, updateContext);

// Plan endpoints
router.post('/plan', authenticate, generatePlan);
router.post('/plan/rebalance', authenticate, rebalancePlan);

// Summary endpoints
router.post('/summary/daily', authenticate, generateDailySummary);
router.post('/summary/monthly', authenticate, generateMonthlySummary);

export default router;

