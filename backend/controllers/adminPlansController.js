import { supabase } from "../lib/supabase.js";

export const createPlan = async (req, res) => {
    try {
        const { 
            name: name_plansubscription, 
            value: value_plansubscription, 
            description: description_plansubscription, 
            paymentInterval: paymentinterval_plansubscription, 
            services,
            isActive: is_active
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

        const { data: plan, error: errorPlan } = await supabase
            .from('plans_subscriptions')
            .insert([{
                name_plansubscription,
                value_plansubscription,
                description_plansubscription,
                paymentinterval_plansubscription,
                organization_id: org.id,
                is_active
            }])
            .select()
            .single()
        
        if (errorPlan) throw errorPlan

        if (services && services.length > 0) {
            const planServices = services.map(serviceId => ({
                id_service: serviceId,
                id_plansubscription: plan.id_plansubscription
            }))

            const { error: errorService } = await supabase
                .from('plan_services')
                .insert(planServices)

            if (errorService) throw errorService
        }

        res.status(201).json(plan)
    } catch (error) {
        console.error('Error creating Plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const listPlan = async (req, res) => {
    try {
        const { slug } = req.params
        const { search } = req.query
        
        const { data: org, error } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (error || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        let query = supabase
            .from('plans_subscriptions')
            .select(`
                id_plansubscription, 
                name_plansubscription, 
                value_plansubscription, 
                description_plansubscription, 
                paymentinterval_plansubscription,
                is_active,
                plan_services (
                    id_serviceplan,
                    id_service,
                    id_plansubscription
                )
            `)
            .eq('organization_id', org.id)
            .order('created_at', { ascending: false });
        
        if (search && search.trim() !== "") {
            query = query.ilike(
                "name_plansubscription",
                `%${search.trim()}%`
            );
        }

        const { data: plans, error: plansError } = await query;
        
        if (plansError) throw plansError
        res.status(201).json(plans)
    } catch (error) {
        console.error('Error creating Plan:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const editPlan = async (req, res) => {
    try {
        const { slug, id } = req.params
        const {             
            name: name_plansubscription, 
            value: value_plansubscription, 
            description: description_plansubscription, 
            paymentInterval: paymentinterval_plansubscription, 
            services,
            isActive: is_active
        } = req.body

        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const updateData = {
            name_plansubscription,
            value_plansubscription,
            description_plansubscription,
            paymentinterval_plansubscription,
            is_active
        }

        const { data: plan, error: planError } = await supabase
            .from('plans_subscriptions')
            .update(updateData)
            .eq('id_plansubscription', id)
            .eq('organization_id', org.id)
            .select()
            .single()
        
        if (planError) throw planError

        if (Array.isArray(services)) {
            const { data: currentServices, error: currentError } = await supabase
                .from('plan_services')
                .select('id_service')
                .eq('id_plansubscription', id)

            if (currentError) throw currentError

            const currentIds = currentServices.map(s => s.id_service)

            const servicesToAdd = services.filter(id => !currentIds.includes(id))
            const servicesToRemove = currentIds.filter(id => !services.includes(id))

            if (servicesToRemove.length > 0) {
                const { error } = await supabase
                    .from('plan_services')
                    .delete()
                    .eq('id_plansubscription', id)
                    .in('id_service', servicesToRemove)

                if (error) throw error
            }

            if (servicesToAdd.length > 0) {
                const inserts = servicesToAdd.map(serviceId => ({
                    id_service: serviceId,
                    id_plansubscription: id
                }))

                const { error } = await supabase
                    .from('plan_services')
                    .insert(inserts)

                if (error) throw error
            }
        }

        res.json({
            plan,
            services
        })
    } catch (error) {
        console.error('Error creating Plan:', error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const deletePlan = async (req, res) => {
    try {
        const { slug, id } = req.params

        const { data: org, orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { error: serviceError } = await supabase
            .from('plan_services')
            .delete()
            .eq('id_plansubscription', id)
        
        if (serviceError) throw serviceError

        const { error: subscriptionError } = await supabase
            .from('organizations_subscriptions')
            .delete()
            .eq('id_plan', id)
        
        if (subscriptionError) throw subscriptionError

        const { error: planError } = await supabase
            .from('plans_subscriptions')
            .delete()
            .eq('id_plansubscription', id)
            .eq('organization_id', org.id)

        if (planError) throw planError
        res.status(204).end();
    }
    catch(error) {
        console.error('Error delete Plan:', error)
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const listActivesPlan = async (req, res) => {
    try {
        const { slug } = req.params
        
        const { data: org, error } = await supabase
            .from("organizations")
            .select("id")
            .eq("slug_organization", slug)
            .single();

        if (error || !org) {
            return res.status(404).json({ error: "Organização não encontrada" });
        }

        const { data: plansActive, error: planActiveError } = await supabase
            .from('plans_subscriptions')
            .select('id_plansubscription,name_plansubscription')
            .eq('organization_id', org.id)
            .eq('is_active', true)
        
        if (planActiveError || !plansActive) {
            return res.status(404).json({ error: "Planos não encontrados" });
        }

        res.status(201).json(plansActive)

    }
    catch(error) {
        console.error('Error list Plan Actives:', error)
        res.status(500).json({ error: 'Internal server error' });   
    }
}