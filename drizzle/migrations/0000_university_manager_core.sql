
-- ============ ENUMS ============
create type public.app_role as enum ('super_admin','admin','hod','faculty','student');
create type public.batch_status as enum ('draft','active','completed','cancelled');
create type public.submission_status as enum ('draft','submitted','under_review','hod_approved','admin_approved','rejected','returned','completed','cancelled');
create type public.field_type as enum ('text','textarea','number','email','phone','date','time','datetime','select','multiselect','radio','checkbox','file','image','student_select','faculty_select','batch_select','hod_select');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  department text,
  staff_id text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('super_admin','admin'))
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.email,''));
  select count(*) = 0 into first_user from public.user_roles;
  insert into public.user_roles (user_id, role)
  values (new.id, case when first_user then 'super_admin'::public.app_role else 'student'::public.app_role end);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod') or public.has_role(auth.uid(),'faculty'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "staff update profiles" on public.profiles for update to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert profiles" on public.profiles for insert to authenticated with check (public.is_staff(auth.uid()));

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod'));
grant insert, update, delete on public.user_roles to authenticated;
create policy "staff manage roles" on public.user_roles for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "staff delete roles" on public.user_roles for delete to authenticated using (public.is_staff(auth.uid()));

-- ============ ACADEMIC CORE ============
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  program text,
  department text,
  duration_months integer,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "all read courses" on public.courses for select to authenticated using (true);
create policy "staff write courses" on public.courses for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  course_id uuid references public.courses(id) on delete set null,
  hod_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  capacity integer default 60,
  status public.batch_status not null default 'draft',
  remarks text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.batches to authenticated;
grant all on public.batches to service_role;
alter table public.batches enable row level security;
create policy "all read batches" on public.batches for select to authenticated using (true);
create policy "staff write batches" on public.batches for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.batch_faculty (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  unique (batch_id, faculty_id)
);
create index on public.batch_faculty(faculty_id);
grant select, insert, update, delete on public.batch_faculty to authenticated;
grant all on public.batch_faculty to service_role;
alter table public.batch_faculty enable row level security;
create policy "all read batch_faculty" on public.batch_faculty for select to authenticated using (true);
create policy "staff write batch_faculty" on public.batch_faculty for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete cascade,
  roll_no text not null unique,
  full_name text not null,
  email text,
  phone text,
  batch_id uuid references public.batches(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  admission_date date default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.students(batch_id);
grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;
alter table public.students enable row level security;
create policy "staff and teachers read students" on public.students for select to authenticated using (
  public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod') or public.has_role(auth.uid(),'faculty') or profile_id = auth.uid()
);
create policy "staff write students" on public.students for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.class_timings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  subject text not null,
  faculty_id uuid references public.profiles(id) on delete set null,
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.class_timings(batch_id, day_of_week);
create index on public.class_timings(faculty_id);
grant select, insert, update, delete on public.class_timings to authenticated;
grant all on public.class_timings to service_role;
alter table public.class_timings enable row level security;
create policy "all read timings" on public.class_timings for select to authenticated using (true);
create policy "staff write timings" on public.class_timings for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ============ FORMS ============
create table public.forms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  target_roles public.app_role[] not null default '{faculty}',
  workflow_steps text[] not null default '{hod,admin}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.forms to authenticated;
grant all on public.forms to service_role;
alter table public.forms enable row level security;
create policy "all read forms" on public.forms for select to authenticated using (true);
create policy "staff write forms" on public.forms for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  label text not null,
  field_key text not null,
  field_type public.field_type not null default 'text',
  placeholder text,
  help_text text,
  is_required boolean not null default false,
  options text[],
  default_value text,
  min_length integer,
  max_length integer,
  sort_order integer not null default 0
);
create index on public.form_fields(form_id);
grant select, insert, update, delete on public.form_fields to authenticated;
grant all on public.form_fields to service_role;
alter table public.form_fields enable row level security;
create policy "all read fields" on public.form_fields for select to authenticated using (true);
create policy "staff write fields" on public.form_fields for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.form_rules (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  faculty_id uuid references public.profiles(id) on delete cascade,
  valid_from date,
  valid_to date,
  is_active boolean not null default true
);
create index on public.form_rules(form_id);
grant select, insert, update, delete on public.form_rules to authenticated;
grant all on public.form_rules to service_role;
alter table public.form_rules enable row level security;
create policy "all read rules" on public.form_rules for select to authenticated using (true);
create policy "staff write rules" on public.form_rules for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique default ('SUB-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  form_id uuid not null references public.forms(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid references public.batches(id) on delete set null,
  class_timing_id uuid references public.class_timings(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  status public.submission_status not null default 'draft',
  current_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.form_submissions(submitted_by);
create index on public.form_submissions(status);
grant select, insert, update, delete on public.form_submissions to authenticated;
grant all on public.form_submissions to service_role;
alter table public.form_submissions enable row level security;
create policy "own submissions" on public.form_submissions for select to authenticated using (
  submitted_by = auth.uid() or public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod')
);
create policy "create own submissions" on public.form_submissions for insert to authenticated with check (submitted_by = auth.uid());
create policy "update own draft or reviewer" on public.form_submissions for update to authenticated using (
  submitted_by = auth.uid() or public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod')
);
create policy "staff delete submissions" on public.form_submissions for delete to authenticated using (public.is_staff(auth.uid()));

create table public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  remarks text,
  created_at timestamptz not null default now()
);
create index on public.workflow_actions(submission_id);
grant select, insert on public.workflow_actions to authenticated;
grant all on public.workflow_actions to service_role;
alter table public.workflow_actions enable row level security;
create policy "read actions" on public.workflow_actions for select to authenticated using (
  public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod')
  or exists (select 1 from public.form_submissions s where s.id = submission_id and s.submitted_by = auth.uid())
);
create policy "insert actions" on public.workflow_actions for insert to authenticated with check (actor_id = auth.uid());

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.form_submissions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text,
  file_size integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.documents(submission_id);
grant select, insert, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "read documents" on public.documents for select to authenticated using (
  uploaded_by = auth.uid() or public.is_staff(auth.uid()) or public.has_role(auth.uid(),'hod')
);
create policy "insert documents" on public.documents for insert to authenticated with check (uploaded_by = auth.uid());
create policy "delete own documents" on public.documents for delete to authenticated using (uploaded_by = auth.uid() or public.is_staff(auth.uid()));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, is_read);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "create notifications" on public.notifications for insert to authenticated with check (true);
create policy "update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_role text,
  action text not null,
  module text not null,
  record_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(created_at desc);
grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "staff read audit" on public.audit_logs for select to authenticated using (public.is_staff(auth.uid()));
create policy "insert audit" on public.audit_logs for insert to authenticated with check (user_id = auth.uid());

-- ============ SEED DEMO DATA ============
insert into public.courses (code, name, program, department, duration_months, description) values
  ('ME','Manager Education','Postgraduate','Management',24,'Flagship manager education programme'),
  ('CS','Computer Science','Undergraduate','Computing',48,'B.Tech Computer Science'),
  ('BUS','Business Administration','Postgraduate','Management',24,'MBA programme');

insert into public.batches (code, name, course_id, start_date, end_date, capacity, status, remarks)
select 'ME-2026-A','Manager Education 2026 A', c.id, '2026-01-05','2027-12-20', 42, 'active','Morning batch' from public.courses c where c.code='ME';
insert into public.batches (code, name, course_id, start_date, end_date, capacity, status, remarks)
select 'ME-2026-B','Manager Education 2026 B', c.id, '2026-01-05','2027-12-20', 38, 'active','Afternoon batch' from public.courses c where c.code='ME';
insert into public.batches (code, name, course_id, start_date, end_date, capacity, status, remarks)
select 'CS-2026-A','Computer Science 2026 A', c.id, '2026-01-05','2029-12-20', 60, 'active','Core batch' from public.courses c where c.code='CS';

insert into public.students (roll_no, full_name, email, phone, batch_id, course_id)
select 'ME26A-' || lpad(g::text,3,'0'), (array['Aarav Menon','Diya Shah','Rohan Nair','Sara Iyer','Kabir Rao','Ananya Das','Vikram Pillai','Meera Joshi'])[g],
  'student' || g || '@campus.edu', '+91 90000 0000' || g, b.id, b.course_id
from generate_series(1,8) g, public.batches b where b.code='ME-2026-A';
insert into public.students (roll_no, full_name, email, batch_id, course_id)
select 'CS26A-' || lpad(g::text,3,'0'), (array['Tomas Lind','Amara Diallo','Daniel Okafor','Priya Raman'])[g],
  'cs' || g || '@campus.edu', b.id, b.course_id
from generate_series(1,4) g, public.batches b where b.code='CS-2026-A';

insert into public.class_timings (batch_id, day_of_week, start_time, end_time, subject, room)
select b.id, d, t.s::time, t.e::time, t.subj, t.room
from public.batches b,
  generate_series(1,5) d,
  (values ('09:00','10:00','Manager Education','Room 204'),
          ('10:15','11:15','Organisational Behaviour','Room 204'),
          ('11:30','12:30','Business Analytics','Lab 2')) as t(s,e,subj,room)
where b.code='ME-2026-A';
insert into public.class_timings (batch_id, day_of_week, start_time, end_time, subject, room)
select b.id, d, t.s::time, t.e::time, t.subj, t.room
from public.batches b, generate_series(1,5) d,
  (values ('13:00','14:00','Data Structures','Lab 1'),
          ('14:15','15:15','Operating Systems','Room 108')) as t(s,e,subj,room)
where b.code='CS-2026-A';

insert into public.forms (code, name, description, target_roles, workflow_steps) values
  ('STARTING','Starting Form','Class start record filled by faculty at the beginning of a class','{faculty}','{hod,admin}'),
  ('LATE_PERMISSION','Late Permission Form','Permission record for a late student','{faculty,student}','{hod,admin}'),
  ('EXAM','Exam Form','Exam related declaration','{faculty}','{hod,admin}'),
  ('COURSE_CHANGE','Course Changing Form','Request to change course','{student}','{hod,admin}'),
  ('TRANSFER','Transfer Form','Batch or campus transfer request','{student}','{hod,admin}'),
  ('CHECKOUT','Checkout Form','End of class checkout record','{faculty}','{hod}'),
  ('FEES_DUE','Fees Due Form','Report pending fees','{faculty,admin}','{admin}'),
  ('PLACEMENT','Placement Form','Placement activity record','{faculty}','{hod,admin}'),
  ('CERTIFICATION','Certification Form','Certificate request','{student}','{hod,admin}'),
  ('LONG_LEAVE','Long Leave Form','Long leave application','{faculty,student}','{hod,admin}'),
  ('FEES_CONCESSION','Fees Concession Form','Fee concession request','{student}','{hod,admin}');

insert into public.form_fields (form_id, label, field_key, field_type, is_required, sort_order, placeholder)
select f.id, x.label, x.k, x.t::public.field_type, x.req, x.ord, x.ph
from public.forms f,
 (values
   ('Student','student','student_select',true,1,'Select student'),
   ('Date','date','date',true,2,null),
   ('Time','time','time',true,3,null),
   ('Reason','reason','textarea',true,4,'Why was the student late?'),
   ('Remarks','remarks','textarea',false,5,'Additional remarks'),
   ('Supporting document','document','file',false,6,null)
 ) as x(label,k,t,req,ord,ph)
where f.code='LATE_PERMISSION';

insert into public.form_fields (form_id, label, field_key, field_type, is_required, sort_order, placeholder)
select f.id, x.label, x.k, x.t::public.field_type, x.req, x.ord, x.ph
from public.forms f,
 (values
   ('Topic covered','topic','text',true,1,'Topic planned for this class'),
   ('Students present','present_count','number',true,2,'e.g. 38'),
   ('Class notes','notes','textarea',false,3,'Anything worth recording')
 ) as x(label,k,t,req,ord,ph)
where f.code='STARTING';

insert into public.form_fields (form_id, label, field_key, field_type, is_required, sort_order, placeholder)
select f.id, x.label, x.k, x.t::public.field_type, x.req, x.ord, x.ph
from public.forms f,
 (values
   ('Exam name','exam_name','text',true,1,'e.g. Mid-term 1'),
   ('Exam date','exam_date','date',true,2,null),
   ('Syllabus covered','syllabus','textarea',true,3,'Units covered'),
   ('Question paper','paper','file',false,4,null)
 ) as x(label,k,t,req,ord,ph)
where f.code='EXAM';

insert into public.form_rules (form_id, batch_id)
select f.id, b.id from public.forms f, public.batches b
where f.code in ('STARTING','LATE_PERMISSION','EXAM','CHECKOUT') and b.code in ('ME-2026-A','CS-2026-A');
