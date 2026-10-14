import { Router } from 'express';
import { requireAdmin } from '../../middleware/auth';
import { adminAssessmentsRouter } from './assessments';
import { adminCommunicationRouter } from './communication';
import { adminContentRouter } from './content';
import { adminInsightsRouter } from './insights';
import { adminPartnersRouter } from './partners';
import { adminUsersRouter } from './users';

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/partners', adminPartnersRouter);
adminRouter.use('/content', adminContentRouter);
adminRouter.use('/', adminAssessmentsRouter);
adminRouter.use('/', adminCommunicationRouter);
adminRouter.use('/', adminInsightsRouter);
