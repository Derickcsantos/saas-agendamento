import { supabase } from '../lib/supabase.js'

export const getSalary = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1) Buscar salário base do funcionário
        const { data: employee, error } = await supabase
            .from('employees')
            .select('id, comissao, salary')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.error('Erro ao buscar funcionário:', error);
            return res.status(500).json({ error: 'Erro ao buscar funcionário' });
        }

        // 2) Buscar pagamentos vinculados aos appointments do funcionário
        const { data: payments, error: paymentsError } = await supabase
            .from('appointment_payments')
            .select(`
                amount,
                appointment_id,
                appointments!inner (
                    id,
                    employee_id,
                    appointment_date
                )
            `)
            .eq('appointments.employee_id', employee.id);

        if (paymentsError) {
            console.error('Erro ao buscar pagamentos:', paymentsError);
            return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
        }

        const currentYear = new Date().getFullYear();

        // 3) Inicializar objeto para agrupar por mês
        const monthlyData = Array(12).fill(0).map(() => ({ total: 0, base: 0, commission: 0 }));

        // 4) Agrupar pagamentos do ano atual por mês e calcular comissão
        payments.forEach(payment => {
            const date = new Date(payment.appointments.appointment_date);
            const year = date.getFullYear();

            if (year === currentYear) {
                const month = date.getMonth(); // 0 = Janeiro, 11 = Dezembro
                const commission = payment.amount * employee.comissao / 100;

                monthlyData[month].commission += commission;
                monthlyData[month].total += commission;
            }
        });

        // 5) Adicionar salário base a cada mês
        monthlyData.forEach(month => {
            month.base = employee.salary;
            month.total += employee.salary;
        });

        // 6) Retornar no formato para o frontend
        const result = monthlyData.map((month, index) => ({
            month: index + 1,
            total: month.total,
            base: month.base,
            commission: month.commission
        }));

        console.log("Eu sou result", result)

        return res.json(result);

    } catch (err) {
        console.error('Erro interno:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}