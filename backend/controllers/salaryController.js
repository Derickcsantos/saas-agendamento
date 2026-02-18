import { supabase } from '../lib/supabase.js'

export const getSalary = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentYear = new Date().getFullYear();

        // 1) Funcionário
        const { data: employee, error: employeeError } = await supabase
            .from('employees')
            .select('id, comissao, salary')
            .eq('user_id', userId)
            .single();

        if (employeeError) {
            console.error('Erro ao buscar funcionário:', employeeError);
            return res.status(500).json({ error: 'Erro ao buscar funcionário' });
        }

        // 2) Buscar agendamentos do funcionário
        const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('id, appointment_date, employee_id')
            .eq('employee_id', employee.id);

        if (appointmentsError) {
            console.error('Erro ao buscar agendamentos:', appointmentsError);
            return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
        }

        // 3) Buscar pagamentos (somente pagos)
        const { data: payments, error: paymentsError } = await supabase
            .from('appointment_payments')
            .select(`
                amount,
                appointment_id,
                appointments!inner (
                    appointment_date,
                    employee_id
                )
            `)
            .eq('appointments.employee_id', employee.id);

        if (paymentsError) {
            console.error('Erro ao buscar pagamentos:', paymentsError);
            return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
        }

        // 4) Estrutura mensal
        const monthlyData = Array(12).fill(null).map(() => ({
            total: 0,
            base: 0,
            commission: 0,
            daysWorked: 0,
            appointmentsByDay: {}
        }));

        // 5) Agrupar agendamentos por dia (CORREÇÃO timezone)
        appointments.forEach(app => {

            const [year, monthStr, dayStr] = app.appointment_date.split('T')[0].split('-');

            const yearNum = Number(year);
            if (yearNum !== currentYear) return;

            const month = Number(monthStr) - 1;
            const day = Number(dayStr);

            if (!monthlyData[month].appointmentsByDay[day]) {
                monthlyData[month].appointmentsByDay[day] = 0;
            }

            monthlyData[month].appointmentsByDay[day] += 1;
        });

        // 6) Calcular salário base (salário diário)
        monthlyData.forEach(month => {
            const workedDays = Object.keys(month.appointmentsByDay).length;

            month.daysWorked = workedDays;
            month.base = workedDays * employee.salary;
        });

        // 7) Calcular comissão corretamente
        payments.forEach(payment => {

            const [year, monthStr] = payment.appointments.appointment_date.split('T')[0].split('-');

            const yearNum = Number(year);
            if (yearNum !== currentYear) return;

            const month = Number(monthStr) - 1;

            // comissão por serviço pago
            const commissionValue = payment.amount * (employee.comissao / 100);

            monthlyData[month].commission += commissionValue;
        });

        // 8) Total mensal = base + comissão
        monthlyData.forEach(month => {
            month.total = month.base + month.commission;
        });

        // 9) Formatar retorno
        const monthsNames = [
            'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
            'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
        ];

        const result = monthlyData.map((month, index) => ({
            mes: monthsNames[index],
            ano: currentYear,
            dias_trabalhados: month.daysWorked,
            salario_base: month.base,
            comissao: month.commission,
            total_recebido: month.total,
            agendamentos_por_dia: month.appointmentsByDay,
            resumo: `No mês de ${monthsNames[index]}, ele ganhou ${month.total} reais`
        }));

        console.log(result)

        return res.json(result);

    } catch (err) {
        console.error('Erro interno:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}