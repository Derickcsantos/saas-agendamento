import { supabase } from '../lib/supabase.js';

function addMonth(startDate, qtdMonth) {
    let date = new Date(startDate)
    date.setMonth(date.getMonth() + qtdMonth)
    return date
}

function getPaymentStatus(due_date) {
    const today = new Date()
    const dataHoje =
        today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0')

    const vue = due_date.toISOString().slice(0, 10)

    if (vue < dataHoje) {
        return 'ATRASADO';
    }

    return 'PENDENTE';
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export default async function processHistorySubscription() {
    try {
        const { data: subscriptions, error: fetchError } = await supabase
            .from('organizations_subscriptions')
            .select(`
                *,
                plans_subscriptions!inner (
                    value_plansubscription,
                    paymentinterval_plansubscription
                )
            `)
            .eq('is_active', true)
            .eq('plans_subscriptions.is_active', true)

        console.log("Eu sou subscriptions", subscriptions)

        if (fetchError) throw fetchError

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        for (const subscription of subscriptions) {
            const dueDate = parseLocalDate(subscription.due_date)
            dueDate.setHours(0, 0, 0, 0)

            if (dueDate.getTime() === yesterday.getTime()) {
                console.log('Assinatura vence ontem:', subscription)

                const { data: subscriptionHistory, error: subscriptionHistoryError } = await supabase
                    .from('subscriptions_history')
                    .insert({
                        id_subscription: subscription.id_subscription,

                        paid_amount: null,
                        date_payment: null,
                
                        value: subscription.plans_subscriptions.value_plansubscription,
                        method_payment: subscription.method_payment,
                        due_date: subscription.due_date,
                        status: subscription.status
                    })
                    .select()
                    .single()
                
                console.log("Histórico da assinatura criado", subscriptionHistory)

                if (subscription.status === "PAGO") {
                    const newDueDate = addMonth(subscription.due_date, subscription.plans_subscriptions.paymentinterval_plansubscription)
                    console.log("newDueDate ", newDueDate)
                    const status = getPaymentStatus(newDueDate)
                    
                    const { data: updateSubscription, error: subscriptionUpdateError } = await supabase
                        .from('organizations_subscriptions')
                        .update({
                            due_date: newDueDate,
                            status: status
                        })
                        .eq('id_subscription', subscription.id_subscription)
                        .single()
                        .select()

                    console.log("Atualização da assintura", updateSubscription)   
                }

                if (subscription.status === "PENDENTE") {
                    const newDueDate = addMonth(subscription.due_date, subscription.plans_subscriptions.paymentinterval_plansubscription)
                    const status = getPaymentStatus(newDueDate)
                    const { data: updateSubscription, error: subscriptionUpdateError } = await supabase
                        .from('organizations_subscriptions')
                        .update({
                            status: status
                        })
                        .eq('id_subscription', subscription.id_subscription)
                        .single()
                        .select()

                    console.log("Atualização da assintura pendente", updateSubscription)   
                }
            }
        }

        return { success: true }

    } catch (error) {
        console.error('Error in process History Subscription:', error);
        return {
            success: false,
            error: error.message
        };
    }
}