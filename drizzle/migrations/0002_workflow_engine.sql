
create or replace function public.notify_step(_sub_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare s record; f record; hod uuid;
begin
  select * into s from public.form_submissions where id = _sub_id;
  select * into f from public.forms where id = s.form_id;
  if s.current_step = 'hod' then
    select hod_id into hod from public.batches where id = s.batch_id;
    if hod is not null then
      insert into public.notifications(user_id,title,body,link)
      values (hod, f.name || ' requires HOD approval', 'Reference ' || s.reference_no, '/submissions/' || s.id);
    else
      insert into public.notifications(user_id,title,body,link)
      select ur.user_id, f.name || ' requires HOD approval', 'Reference ' || s.reference_no, '/submissions/' || s.id
      from public.user_roles ur where ur.role = 'hod';
    end if;
  elsif s.current_step = 'admin' then
    insert into public.notifications(user_id,title,body,link)
    select distinct ur.user_id, f.name || ' requires admin approval', 'Reference ' || s.reference_no, '/submissions/' || s.id
    from public.user_roles ur where ur.role in ('admin','super_admin');
  end if;
end; $$;

create or replace function public.submissions_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare steps text[];
begin
  if coalesce(current_setting('app.reviewing', true),'') = '1' then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if public.is_staff(auth.uid()) and new.status = old.status then
      new.updated_at := now(); return new;
    end if;
    if old.submitted_by <> auth.uid() then
      raise exception 'Use the approval actions to change this submission';
    end if;
    if old.status not in ('draft','returned') then
      raise exception 'This submission is locked while under review';
    end if;
    if new.status not in ('draft','submitted','cancelled') then
      raise exception 'Invalid status change';
    end if;
  else
    if new.status not in ('draft','submitted') then new.status := 'submitted'; end if;
  end if;
  if new.status = 'submitted' then
    select workflow_steps into steps from public.forms where id = new.form_id;
    new.current_step := steps[1];
    if new.current_step is null then new.status := 'completed'; end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
create trigger form_submissions_guard before insert or update on public.form_submissions
for each row execute function public.submissions_before_write();

create or replace function public.submissions_after_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('app.reviewing', true),'') = '1' then return new; end if;
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') then
    insert into public.workflow_actions(submission_id, actor_id, actor_role, action)
    values (new.id, auth.uid(), 'submitter', 'submitted');
    perform public.notify_step(new.id);
  end if;
  return new;
end; $$;
create trigger form_submissions_after after insert or update on public.form_submissions
for each row execute function public.submissions_after_write();

create or replace function public.review_submission(_id uuid, _decision text, _remarks text default null)
returns public.form_submissions language plpgsql security definer set search_path = public as $$
declare s public.form_submissions; f public.forms; idx int; next_step text; role_label text; new_status public.submission_status;
begin
  select * into s from public.form_submissions where id = _id for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if s.status not in ('submitted','under_review','hod_approved','admin_approved') then
    raise exception 'Submission is not awaiting review';
  end if;
  select * into f from public.forms where id = s.form_id;

  if s.current_step = 'hod' then
    if not (public.has_role(auth.uid(),'hod') or public.is_staff(auth.uid())) then raise exception 'Not authorised'; end if;
    role_label := 'hod';
  elsif s.current_step = 'admin' then
    if not public.is_staff(auth.uid()) then raise exception 'Not authorised'; end if;
    role_label := 'admin';
  else
    raise exception 'No active step';
  end if;

  perform set_config('app.reviewing','1', true);

  if _decision = 'approve' then
    idx := array_position(f.workflow_steps, s.current_step);
    next_step := f.workflow_steps[idx + 1];
    if next_step is null then
      new_status := 'completed';
    elsif role_label = 'hod' then new_status := 'hod_approved';
    else new_status := 'admin_approved'; end if;
    update public.form_submissions set status = new_status, current_step = next_step where id = _id returning * into s;
  elsif _decision = 'reject' then
    update public.form_submissions set status = 'rejected', current_step = null where id = _id returning * into s;
  elsif _decision = 'return' then
    update public.form_submissions set status = 'returned', current_step = null where id = _id returning * into s;
  else
    raise exception 'Unknown decision';
  end if;

  insert into public.workflow_actions(submission_id, actor_id, actor_role, action, remarks)
  values (_id, auth.uid(), role_label, _decision, _remarks);
  insert into public.audit_logs(user_id, user_role, action, module, record_id, details)
  values (auth.uid(), role_label, _decision || ' submission', 'workflow', s.reference_no, jsonb_build_object('remarks', _remarks, 'status', s.status));
  insert into public.notifications(user_id, title, body, link)
  values (s.submitted_by, f.name || ' — ' || replace(s.status::text,'_',' '), coalesce(_remarks, 'Reference ' || s.reference_no), '/submissions/' || s.id);

  if s.current_step is not null and s.status not in ('rejected','returned','completed') then
    perform public.notify_step(s.id);
  end if;

  perform set_config('app.reviewing','0', true);
  return s;
end; $$;

grant execute on function public.review_submission(uuid, text, text) to authenticated;
revoke execute on function public.notify_step(uuid) from public, anon, authenticated;

-- tighten notification insert: only staff may notify arbitrary users directly
drop policy "create notifications" on public.notifications;
create policy "staff create notifications" on public.notifications for insert to authenticated
  with check (public.is_staff(auth.uid()) or user_id = auth.uid());

-- faculty need to read HOD/faculty names; students need batch names (already open). HOD sees submissions; HOD restricted to own batches:
drop policy "own submissions" on public.form_submissions;
create policy "read submissions" on public.form_submissions for select to authenticated using (
  submitted_by = auth.uid() or public.is_staff(auth.uid())
  or (public.has_role(auth.uid(),'hod') and (
      batch_id is null or exists (select 1 from public.batches b where b.id = batch_id and (b.hod_id = auth.uid() or b.hod_id is null))))
);
