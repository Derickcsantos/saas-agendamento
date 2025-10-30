
/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_name:
 *           type: string
 *         client_email:
 *           type: string
 *         client_phone:
 *           type: string
 *         service_id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         appointment_date:
 *           type: string
 *           format: date
 *         start_time:
 *           type: string
 *         end_time:
 *           type: string
 *         status:
 *           type: string
 *           enum: [confirmed, completed, canceled]
 *         final_price:
 *           type: number
 *         coupon_code:
 *           type: string
 *         original_price:
 *           type: number
 * 
 *     AppointmentWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_name:
 *           type: string
 *         client_email:
 *           type: string
 *         client_phone:
 *           type: string
 *         appointment_date:
 *           type: string
 *           format: date
 *         start_time:
 *           type: string
 *         end_time:
 *           type: string
 *         status:
 *           type: string
 *         services:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *         employees:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 */