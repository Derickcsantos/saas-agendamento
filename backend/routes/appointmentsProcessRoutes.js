import { Router } from 'express';
import { 
  getAppointmentCategories,
  getAppointmentServices, 
  getAppointmentServicesByCategory,
  getAppointmentEmployeeByService,
  getAvailableTimes
} from '../controllers/appointmentProccess.js';


export const appointmentProcessRouter = Router();

appointmentProcessRouter.get('/categories/:slug', getAppointmentCategories);

appointmentProcessRouter.get('/services', getAppointmentServices);

appointmentProcessRouter.get('/services/:categoryId/:slug', getAppointmentServicesByCategory);

appointmentProcessRouter.get('/employees/:serviceId/:slug', getAppointmentEmployeeByService);

appointmentProcessRouter.get('/available-times/:slug', getAvailableTimes);
