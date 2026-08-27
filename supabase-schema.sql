-- ============================================
-- ToWhere 数据库 Schema
-- 在新的 Supabase 项目中运行此 SQL 来创建所有表
-- ============================================

-- 1. checkins 表 - 关键词能量打卡
CREATE TABLE IF NOT EXISTS checkins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    keyword TEXT NOT NULL,
    quality TEXT NOT NULL CHECK (quality IN ('high', 'medium', 'low', 'none')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, keyword)
);

-- 2. keyword_tasks 表 - 关键词子任务
CREATE TABLE IF NOT EXISTS keyword_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. app_config 表 - 粒子等应用配置
CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. firsts 表 - "第一次"记录
CREATE TABLE IF NOT EXISTS firsts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. letters 表 - 信件
CREATE TABLE IF NOT EXISTS letters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender TEXT,
    recipient TEXT,
    date TEXT,
    content TEXT,
    is_draft BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS 策略 (Row Level Security)
-- 公开版本：允许匿名用户读写
-- ============================================

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE firsts ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- checkins
CREATE POLICY "Allow all access to checkins" ON checkins
    FOR ALL USING (true) WITH CHECK (true);

-- keyword_tasks
CREATE POLICY "Allow all access to keyword_tasks" ON keyword_tasks
    FOR ALL USING (true) WITH CHECK (true);

-- app_config
CREATE POLICY "Allow all access to app_config" ON app_config
    FOR ALL USING (true) WITH CHECK (true);

-- firsts
CREATE POLICY "Allow all access to firsts" ON firsts
    FOR ALL USING (true) WITH CHECK (true);

-- letters
CREATE POLICY "Allow all access to letters" ON letters
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Supabase Storage (手动操作)
-- ============================================
-- 如果你仍需使用 Supabase Storage 存储图片：
-- 1. 在 Supabase Dashboard -> Storage 中创建名为 "firsts-images" 的 Bucket
-- 2. 设置为 Public bucket
-- 3. 添加 RLS 策略允许匿名上传和读取
--
-- 如果使用 GitHub 存储图片则不需要创建此 Bucket
