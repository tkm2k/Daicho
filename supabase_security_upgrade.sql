-- ============================================================
-- Daicho. セキュリティ強化
-- SupabaseのSQL Editorに全文貼り付けて実行してください。
-- 既存データはそのまま残ります。
--
-- 変更内容：
--  - テーブルへの直接アクセス（select/insert/delete等）を全面禁止
--  - 代わりに「イベントIDを知っている場合のみ動く関数(RPC)」を用意
--  → キーを取り出されても、UUIDを知らないイベントには一切アクセス不可。
--    全イベントの一覧取得も不可能になります。
-- ============================================================

-- 1) 旧ポリシーを削除し、直接アクセスを禁止
drop policy if exists anon_all_events on events;
drop policy if exists anon_all_members on members;
drop policy if exists anon_all_transactions on transactions;
revoke all on table events, members, transactions from anon, authenticated;

-- 2) イベント作成
create or replace function create_event(p_name text, p_members text[])
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 100 then
    raise exception 'invalid event name';
  end if;
  if coalesce(array_length(p_members, 1), 0) < 2 then
    raise exception 'need at least 2 members';
  end if;
  insert into events(name) values (trim(p_name)) returning id into v_id;
  insert into members(event_id, name)
    select distinct v_id, trim(m) from unnest(p_members) m
    where length(trim(m)) > 0;
  return v_id;
end $$;

-- 3) イベント情報取得（UUIDを知らなければnull）
create or replace function get_event(p_event_id uuid)
returns json
language sql security definer set search_path = public
as $$
  select json_build_object('id', id, 'name', name)
  from events where id = p_event_id;
$$;

-- 4) メンバー一覧
create or replace function list_members(p_event_id uuid)
returns json
language sql security definer set search_path = public
as $$
  select coalesce(
    json_agg(json_build_object('id', id, 'name', name) order by created_at),
    '[]'::json)
  from members where event_id = p_event_id;
$$;

-- 5) メンバー追加
create or replace function add_member(p_event_id uuid, p_name text)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_row members%rowtype;
begin
  if not exists (select 1 from events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 50 then
    raise exception 'invalid member name';
  end if;
  if exists (select 1 from members where event_id = p_event_id and name = trim(p_name)) then
    raise exception 'duplicate member name';
  end if;
  insert into members(event_id, name) values (p_event_id, trim(p_name))
    returning * into v_row;
  return json_build_object('id', v_row.id, 'name', v_row.name);
end $$;

-- 6) 取引一覧
create or replace function list_transactions(p_event_id uuid)
returns json
language sql security definer set search_path = public
as $$
  select coalesce(
    json_agg(json_build_object(
      'id', id, 'category', category, 'title', title,
      'payer_id', payer_id, 'amount', amount, 'lines', lines,
      'created_at', created_at) order by created_at),
    '[]'::json)
  from transactions where event_id = p_event_id;
$$;

-- 7) 取引追加（サーバー側でも整合性チェック）
create or replace function add_transaction(
  p_event_id uuid, p_category text, p_title text,
  p_payer_id uuid, p_amount integer, p_lines jsonb)
returns json
language plpgsql security definer set search_path = public
as $$
declare v_sum bigint; v_bad integer; v_row transactions%rowtype;
begin
  if not exists (select 1 from events where id = p_event_id) then
    raise exception 'event not found';
  end if;
  if p_category not in ('tatekae', 'loan', 'gamble') then
    raise exception 'invalid category';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 100000000 then
    raise exception 'invalid amount';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'invalid lines';
  end if;
  -- 全deltaの合計が0であること
  select coalesce(sum((l->>'delta')::bigint), 0) into v_sum
    from jsonb_array_elements(p_lines) l;
  if v_sum <> 0 then
    raise exception 'lines must sum to zero';
  end if;
  -- 行のメンバーが全員このイベントに属していること
  select count(*) into v_bad from jsonb_array_elements(p_lines) l
    where not exists (select 1 from members m
      where m.id = (l->>'member_id')::uuid and m.event_id = p_event_id);
  if v_bad > 0 then
    raise exception 'invalid member in lines';
  end if;
  -- 支払者もこのイベントのメンバーであること
  if p_payer_id is not null and not exists (
    select 1 from members where id = p_payer_id and event_id = p_event_id) then
    raise exception 'invalid payer';
  end if;
  insert into transactions(event_id, category, title, payer_id, amount, lines)
    values (p_event_id, p_category, left(p_title, 100), p_payer_id, p_amount, p_lines)
    returning * into v_row;
  return json_build_object(
    'id', v_row.id, 'category', v_row.category, 'title', v_row.title,
    'payer_id', v_row.payer_id, 'amount', v_row.amount, 'lines', v_row.lines,
    'created_at', v_row.created_at);
end $$;

-- 8) 取引削除（イベントIDと取引IDの両方が一致した場合のみ）
create or replace function delete_transaction(p_event_id uuid, p_tx_id uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from transactions where id = p_tx_id and event_id = p_event_id;
$$;

-- 9) 関数の実行権限（anon = アプリの利用者）
grant execute on function
  create_event(text, text[]),
  get_event(uuid),
  list_members(uuid),
  add_member(uuid, text),
  list_transactions(uuid),
  add_transaction(uuid, text, text, uuid, integer, jsonb),
  delete_transaction(uuid, uuid)
to anon;
