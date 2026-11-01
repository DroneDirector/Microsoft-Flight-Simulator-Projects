-- Online sync of your own airline between your devices (Supabase, PostgreSQL). Run once in the Supabase
-- SQL editor, after licences.sql.
--
-- Everything stored here is locked on your devices before it is sent: each part of the airline is packed
-- and encrypted with the airline's own secret key, which never leaves your devices. This database only
-- holds unreadable data, version numbers and which of your devices is running the airline right now.
-- The airline is found by a fingerprint of that key, never the key itself.
--
-- The tables can't be read or changed with the public key; the app only calls the functions below.

create table if not exists amp_sync_air (
  id          text primary key,                 -- fingerprint of the airline's secret key
  ver         bigint not null default 0,        -- goes up by one with every change sent
  engine      text,                             -- the device running the airline right now
  engine_name text,
  engine_at   timestamptz,                      -- last heartbeat of that device
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists amp_sync_part (
  id   text not null references amp_sync_air(id) on delete cascade,
  k    text not null,                           -- which part of the airline (fleet, money, logbook…)
  ver  bigint not null,                         -- the version that last changed it
  data text not null,                           -- packed and encrypted on the device
  primary key (id, k)
);

create table if not exists amp_sync_dev (
  id      text not null references amp_sync_air(id) on delete cascade,
  device  text not null,                        -- a fingerprint of the device
  name    text,
  seen_at timestamptz not null default now(),
  primary key (id, device)
);

create table if not exists amp_sync_link (
  code_fp    text primary key,                  -- fingerprint of a one-use linking code
  payload    text not null,                     -- the airline's key, encrypted with that code
  expires_at timestamptz not null
);

alter table amp_sync_air enable row level security;
alter table amp_sync_part enable row level security;
alter table amp_sync_dev enable row level security;
alter table amp_sync_link enable row level security;

-- the newest version, which device runs the airline and how long ago it was last heard from; notes this device as seen
create or replace function amp_sync_head(p_id text, p_device text, p_name text)
returns json language plpgsql security definer set search_path = public as $$
declare a amp_sync_air;
begin
  select * into a from amp_sync_air where id = p_id;
  if not found then return json_build_object('ver', -1); end if;
  if p_device is not null then
    insert into amp_sync_dev(id, device, name, seen_at) values (p_id, left(p_device, 80), left(p_name, 80), now())
      on conflict (id, device) do update set name = excluded.name, seen_at = now();
  end if;
  return json_build_object('ver', a.ver, 'engine', a.engine, 'engine_name', a.engine_name,
    'engine_age', coalesce(extract(epoch from now() - a.engine_at), 1e9), 'updated_at', a.updated_at);
end $$;

-- the parts changed since version p_since (all of them for 0)
create or replace function amp_sync_pull(p_id text, p_since bigint)
returns json language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  select ver into v from amp_sync_air where id = p_id;
  if not found then return json_build_object('ver', -1, 'parts', '[]'::json); end if;
  return json_build_object('ver', v, 'parts', coalesce((select json_agg(json_build_object('k', k, 'ver', ver, 'data', data))
    from amp_sync_part where id = p_id and ver > coalesce(p_since, 0)), '[]'::json));
end $$;

-- send changed parts [{k, data}] on top of version p_base. Refused when the airline has moved on since
-- (unless p_force: the player chose this device's copy). Returns the new version.
create or replace function amp_sync_push(p_id text, p_base bigint, p_device text, p_parts json, p_force boolean)
returns json language plpgsql security definer set search_path = public as $$
declare a amp_sync_air; nv bigint; p json; total bigint;
begin
  if length(p_id) < 32 or length(p_id) > 80 then raise exception 'bad id'; end if;
  select coalesce(sum(length(x->>'data')), 0) into total from json_array_elements(p_parts) x;
  if total > 30000000 then raise exception 'too large'; end if;
  insert into amp_sync_air(id) values (p_id) on conflict (id) do nothing;
  select * into a from amp_sync_air where id = p_id for update;
  if p_device is not null then
    insert into amp_sync_dev(id, device, seen_at) values (p_id, left(p_device, 80), now())
      on conflict (id, device) do update set seen_at = now();
  end if;
  if not coalesce(p_force, false) and a.ver <> coalesce(p_base, 0) then
    return json_build_object('ok', false, 'ver', a.ver, 'engine', a.engine);
  end if;
  nv := a.ver + 1;
  for p in select * from json_array_elements(p_parts) loop
    if length(p->>'k') between 1 and 40 then
      insert into amp_sync_part(id, k, ver, data) values (p_id, p->>'k', nv, p->>'data')
        on conflict (id, k) do update set ver = nv, data = excluded.data;
    end if;
  end loop;
  update amp_sync_air set ver = nv, updated_at = now() where id = p_id;
  return json_build_object('ok', true, 'ver', nv);
end $$;

-- run the airline on this device: taken when nobody is running it (no heartbeat for 40 seconds), when it
-- is this device already, or when p_force (you started using this device). Doubles as the heartbeat.
create or replace function amp_sync_engine(p_id text, p_device text, p_name text, p_force boolean)
returns json language plpgsql security definer set search_path = public as $$
declare a amp_sync_air;
begin
  select * into a from amp_sync_air where id = p_id for update;
  if not found then return json_build_object('engine', null, 'ver', -1); end if;
  if a.engine is null or a.engine = p_device or a.engine_at < now() - interval '40 seconds' or coalesce(p_force, false) then
    update amp_sync_air set engine = left(p_device, 80), engine_name = left(p_name, 80), engine_at = now() where id = p_id;
    return json_build_object('engine', p_device, 'engine_name', p_name, 'ver', a.ver);
  end if;
  return json_build_object('engine', a.engine, 'engine_name', a.engine_name, 'ver', a.ver);
end $$;

-- this device stops running the airline (closed or sent to the background)
create or replace function amp_sync_release(p_id text, p_device text)
returns void language sql security definer set search_path = public as $$
  update amp_sync_air set engine_at = 'epoch' where id = p_id and engine = p_device;
$$;

-- the devices linked to this airline
create or replace function amp_sync_devices(p_id text)
returns json language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('device', device, 'name', name, 'seen_age', extract(epoch from now() - seen_at)) order by seen_at desc), '[]'::json)
  from amp_sync_dev where id = p_id;
$$;

-- a device leaves the airline; the last one to leave takes the online copy with it
create or replace function amp_sync_unlink(p_id text, p_device text, p_delete boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from amp_sync_dev where id = p_id and device = p_device;
  if coalesce(p_delete, false) or not exists (select 1 from amp_sync_dev where id = p_id) then
    delete from amp_sync_air where id = p_id;
  end if;
end $$;

-- linking another device: the key, encrypted with a short one-use code, kept for ten minutes
create or replace function amp_sync_link_put(p_code_fp text, p_payload text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from amp_sync_link where expires_at < now();
  if length(p_payload) > 4000 then raise exception 'too large'; end if;
  insert into amp_sync_link(code_fp, payload, expires_at) values (p_code_fp, p_payload, now() + interval '10 minutes')
    on conflict (code_fp) do update set payload = excluded.payload, expires_at = excluded.expires_at;
end $$;

create or replace function amp_sync_link_take(p_code_fp text)
returns text language plpgsql security definer set search_path = public as $$
declare r text;
begin
  delete from amp_sync_link where code_fp = p_code_fp and expires_at >= now() returning payload into r;
  return r;
end $$;

revoke all on amp_sync_air, amp_sync_part, amp_sync_dev, amp_sync_link from anon, authenticated;
grant execute on function amp_sync_head(text, text, text), amp_sync_pull(text, bigint), amp_sync_push(text, bigint, text, json, boolean),
  amp_sync_engine(text, text, text, boolean), amp_sync_release(text, text), amp_sync_devices(text), amp_sync_unlink(text, text, boolean),
  amp_sync_link_put(text, text), amp_sync_link_take(text) to anon;
