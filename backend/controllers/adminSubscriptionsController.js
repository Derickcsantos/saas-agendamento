import { supabase } from "../lib/supabase.js";

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

export const createSubscription = async (req, res) => {
    try {
        const { 
            idUser: id_user,
            idPlan: id_plan,
            methodPayment: method_payment,
            isActive: is_active,
            startDate: start_date,
        } = req.body
        const { slug } = req.params

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug_organization', slug)
            .single()
            
        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: planData, error: planError } = await supabase
            .from('plans_subscriptions')
            .select('*')
            .eq('id_plansubscription', id_plan)
            .single()

        if (planError || !planData) {
            return res.status(404).json({ error: "Plano não encontrado" });
        }

        const due_date = addMonth(start_date, planData.paymentinterval_plansubscription)
        const status = getPaymentStatus(due_date) 

        const { data: subscription, error: errorSubscription } = await supabase
            .from('organizations_subscriptions')
            .insert({
                id_user,
                id_plan,
                method_payment,
                is_active,
                start_date,
                due_date,
                status
            })
            .select()
            .single()
        
        res.status(201).json(subscription)
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const listSubscription = async (req, res) => {
    try {
        const { slug } = req.params
        const { search } = req.query

        const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('slug_organization', slug)
            .single()
            
        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: plans, error: plansError } = await supabase
            .from('plans_subscriptions')
            .select('id_plansubscription')
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false })

        if (plansError) {
            return res.status(404).json({ error: "Planos não encontrado" });
        }

        const plansIds = plans.map(plan => plan.id_plansubscription)

        if (plansIds.length === 0) {
            return res.json([])
        }

        let userIds = []
        let planIdsBySearch = []

         if (search && search.trim() !== "") {
            const term = `%${search.trim()}%`

            const { data: users } = await supabase
                .from('users')
                .select('id')
                .eq('organization_id', org.id)
                .ilike('username', term)

            userIds = users?.map(u => u.id) || []

            const { data: plansByName } = await supabase
                .from('plans_subscriptions')
                .select('id_plansubscription')
                .eq('organization_id', org.id)
                .ilike('name_plansubscription', term)

            planIdsBySearch = plansByName?.map(p => p.id_plansubscription) || []
        }

        let query = supabase
            .from('organizations_subscriptions')
            .select(`
                id_subscription,
                id_plan,
                id_user,
                method_payment,
                is_active,
                status,
                start_date,
                due_date,
                users!inner (
                    id,
                    username,
                    email,
                    phone
                ),
                plans_subscriptions!inner (
                    name_plansubscription,
                    value_plansubscription
                )
            `)
            .in('id_plan', plansIds)
            .eq('plans_subscriptions.is_active', true)

        if (search && (userIds.length > 0 || planIdsBySearch.length > 0)) {
            const filters = []

            if (userIds.length > 0) {
                filters.push(`id_user.in.(${userIds.join(',')})`)
            }

            if (planIdsBySearch.length > 0) {
                filters.push(`id_plan.in.(${planIdsBySearch.join(',')})`)
            }

            query = query.or(filters.join(','))
        }

        const { data: subscriptions, error: errorSubscriptions } = await query
        
        if (errorSubscriptions) {
            return res.status(400).json({ error: "Erro ao buscar assinaturas", Erro: errorSubscriptions })
        }

        res.status(200).json(subscriptions)

    } catch (error) {
        console.error('Error listing subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const editSubscription = async (req, res) => {
    try {
        const { slug, id } = req.params
        const {
            idUser: id_user,
            idPlan: id_plan,
            methodPayment: method_payment,
            isActive: is_active,
            startDate: start_date,
        } = req.body

        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: planData, error: planError } = await supabase
            .from('plans_subscriptions')
            .select('*')
            .eq('id_plansubscription', id_plan)
            .single()
        
        if (planError) {
            return res.status(404).json({ error: "Plano não encontrado" })
        }

        const due_date = addMonth(start_date, planData.paymentinterval_plansubscription)
        const status = getPaymentStatus(due_date)

        const updateData = {
            id_user,
            id_plan,
            method_payment,
            is_active,
            start_date,
            due_date,
            status
        }

        const { data: subscription, error: subscriptionError } = await supabase
            .from('organizations_subscriptions')
            .update(updateData)
            .eq('id_subscription', id)
            .single()
            .select()

        if (subscriptionError) {
            return res.status(400).json({ error: "Erro ao atualizar assinatura" })
        }

        res.status(200).json(subscription)

    } catch (error) {
        console.error('Error edit subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const deleteSubscription = async (req, res) => {
    try {
        const { slug, id } = req.params

        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: deleteSubscription, error: errorSubscription } = await supabase
            .from('organizations_subscriptions')
            .delete()
            .eq('id_subscription', id)

        if (errorSubscription) throw errorSubscription

        res.status(204).end()

    } catch (error) {
        console.error('Error remove subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const listHistorySubscription = async(req, res) => {
    try {
        const { slug, id } = req.params

        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: historySubscription, error: historyError } = await supabase
        .from('subscriptions_history')
        .select('*')
        .eq('id_subscription', id)
        .order('due_date', { ascending: false })

        if (historyError) throw historyError

        res.status(200).json(historySubscription)

    } catch (error) {
        console.error('Error list history subscription:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}