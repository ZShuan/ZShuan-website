-- ============================================
-- ToWhere Online 一键建库脚本
-- 使用方式：Supabase Dashboard -> SQL Editor -> 粘贴全部内容 -> Run
-- 包含：cities / city_images / towhere_logs / firsts / letters 表
--       RLS 匿名读写策略 + firsts-images 公共存储桶
-- ============================================

-- 1. cities 表（Globe 地点）
create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  main_image text not null default '',
  lng double precision,
  lat double precision,
  departure text,
  sort_order integer default 0,
  color text default '#FFFF00',
  created_at timestamptz default now()
);

-- 2. city_images 表（地点相册）
create table if not exists public.city_images (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  url text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 3. towhere_logs 表（Globe 信息弹窗里的开发日志）
create table if not exists public.towhere_logs (
  id integer primary key,
  content text,
  updated_at timestamptz default now()
);

-- 4. firsts 表（FIRSTS 时间线）
create table if not exists public.firsts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  description text not null,
  created_at timestamptz default now()
);

-- 5. letters 表（信件）
create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  sender text,
  recipient text,
  date text,
  content text,
  is_draft boolean default false,
  created_at timestamptz default now()
);

-- ============ RLS：公开读写（双方无需登录即可使用） ============
alter table public.cities enable row level security;
alter table public.city_images enable row level security;
alter table public.towhere_logs enable row level security;
alter table public.firsts enable row level security;
alter table public.letters enable row level security;

create policy "cities all" on public.cities for all using (true) with check (true);
create policy "city_images all" on public.city_images for all using (true) with check (true);
create policy "towhere_logs all" on public.towhere_logs for all using (true) with check (true);
create policy "firsts all" on public.firsts for all using (true) with check (true);
create policy "letters all" on public.letters for all using (true) with check (true);

-- ============ Storage：FIRSTS 图片桶（公开） ============
insert into storage.buckets (id, name, public)
values ('firsts-images', 'firsts-images', true)
on conflict (id) do nothing;

create policy "firsts-images public read" on storage.objects
  for select using (bucket_id = 'firsts-images');
create policy "firsts-images anon insert" on storage.objects
  for insert with check (bucket_id = 'firsts-images');
create policy "firsts-images anon update" on storage.objects
  for update using (bucket_id = 'firsts-images');
create policy "firsts-images anon delete" on storage.objects
  for delete using (bucket_id = 'firsts-images');
