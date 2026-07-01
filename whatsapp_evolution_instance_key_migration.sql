alter table public.whatsapp_organization
add column if not exists evolution_instance_name text null;

update public.whatsapp_organization
set
  evolution_instance_name = whatsapp_api_key,
  whatsapp_api_key = webhook_secret,
  webhook_secret = null,
  status = case
    when upper(coalesce(status, '')) in ('CONNECTED', 'CONNECTING', 'DISCONNECTED', 'CREATED')
      then upper(status)
    else 'CONNECTING'
  end,
  updated_at = now()
where wasender_session_id is null
  and evolution_instance_name is null
  and whatsapp_api_key is not null
  and webhook_secret is not null;

create unique index if not exists whatsapp_organization_evolution_instance_unique
on public.whatsapp_organization (evolution_instance_name)
where evolution_instance_name is not null;
