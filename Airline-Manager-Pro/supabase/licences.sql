-- The online register of registration keys (Supabase, PostgreSQL). Run once in the Supabase SQL editor,
-- then licences-seed.sql. It holds fingerprints only, never the keys themselves.
--
-- Registration: the first device a key is registered on keeps it. The same device can register again
-- as often as it likes (after a reinstall, for example). Another device needs a reactivation code; each
-- code works once and moves the key to the new device.
--
-- The tables can't be read or changed with the public key; the app only calls the two functions below.

create table if not exists amp_licence_keys (
  fp            text primary key,          -- fingerprint of the registration key
  device        text,                      -- fingerprint of the device it is registered on
  device_name   text,
  activated_at  timestamptz,
  activations   int not null default 0,
  reactivations int not null default 0
);

create table if not exists amp_reactivation_codes (
  fp        text primary key,              -- fingerprint of the reactivation code
  used_at   timestamptz,
  used_for  text                           -- the key it moved
);

alter table amp_licence_keys enable row level security;
alter table amp_reactivation_codes enable row level security;

-- 'ok', 'unknown' (not a key), or 'other-device' (registered on another device: a reactivation code is needed)
create or replace function amp_activate(p_key text, p_device text, p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare k amp_licence_keys;
begin
  select * into k from amp_licence_keys where fp = p_key for update;
  if not found then return 'unknown'; end if;
  if k.device is not null and k.device <> p_device then return 'other-device'; end if;
  update amp_licence_keys set device = p_device, device_name = left(p_name, 80),
    activated_at = coalesce(activated_at, now()), activations = activations + 1 where fp = p_key;
  return 'ok';
end $$;

-- 'ok' (the key now belongs to this device), 'unknown' (not a key), 'bad-code', or 'used-code'
create or replace function amp_reactivate(p_key text, p_code text, p_device text, p_name text)
returns text language plpgsql security definer set search_path = public as $$
declare c amp_reactivation_codes;
begin
  perform 1 from amp_licence_keys where fp = p_key for update;
  if not found then return 'unknown'; end if;
  select * into c from amp_reactivation_codes where fp = p_code for update;
  if not found then return 'bad-code'; end if;
  if c.used_at is not null then return 'used-code'; end if;
  update amp_reactivation_codes set used_at = now(), used_for = p_key where fp = p_code;
  update amp_licence_keys set device = p_device, device_name = left(p_name, 80), activated_at = now(),
    activations = activations + 1, reactivations = reactivations + 1 where fp = p_key;
  return 'ok';
end $$;

revoke all on amp_licence_keys, amp_reactivation_codes from anon, authenticated;
revoke all on function amp_activate(text, text, text), amp_reactivate(text, text, text, text) from public;
grant execute on function amp_activate(text, text, text), amp_reactivate(text, text, text, text) to anon, authenticated;
