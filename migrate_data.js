
const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://fakokuvqtlpijcukvekj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha29rdXZxdGxwaWpjdWt2ZWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTk0MzcsImV4cCI6MjA4MzQ5NTQzN30.Xy542SBt6AG_kEAySkHjbggJGZAGIa0wif0yOU0wuFg';

const NEW_URL = 'https://xnnewfjkibkaehlesipy.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubmV3ZmpraWJrYWVobGVzaXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTk1MzYsImV4cCI6MjA4ODI5NTUzNn0.6BFwHjR1Pd_ml1wYy1I_MOAZX8ikSnr1nVSFTJHy2XA';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

const TABLES = ['checkins', 'keyword_tasks', 'app_config', 'firsts', 'letters'];

async function migrate() {
    console.log('🚀 开始数据迁移...');

    for (const table of TABLES) {
        console.log(`\n📦 正在同步表: ${table}...`);

        // 1. 从旧库获取数据
        const { data, error: fetchError } = await oldClient.from(table).select('*');
        if (fetchError) {
            console.error(`❌ 获取 ${table} 数据失败:`, fetchError.message);
            continue;
        }

        if (!data || data.length === 0) {
            console.log(`⚠️ 表 ${table} 是空的，跳过。`);
            continue;
        }

        console.log(`✅ 获取到 ${data.length} 条记录。`);

        // 2. 写入新库
        const { error: insertError } = await newClient.from(table).upsert(data);
        if (insertError) {
            console.error(`❌ 写入 ${table} 失败:`, insertError.message);
        } else {
            console.log(`🎉 ${table} 同步成功！`);
        }
    }

    console.log('\n✨ 迁移完成！');
}

migrate();
