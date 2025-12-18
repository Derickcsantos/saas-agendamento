/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         organization_id:
 *           type: string
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
 *           nullable: true
 *         original_price:
 *           type: number
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     AppointmentWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Appointment'
 *       type: object
 *       properties:
 *         service_name:
 *           type: string
 *         employee_name:
 *           type: string
 *
 *     AppointmentCanceled:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_name:
 *           type: string
 *         service_name:
 *           type: string
 *         employee_name:
 *           type: string
 *         appointment_date:
 *           type: string
 *         start_time:
 *           type: string
 *         status:
 *           type: string
 *         reason:
 *           type: string
 *           description: Motivo do cancelamento (se existir)
 */