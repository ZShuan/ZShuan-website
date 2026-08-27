
const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://fakokuvqtlpijcukvekj.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha29rdXZxdGxwaWpjdWt2ZWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTk0MzcsImV4cCI6MjA4MzQ5NTQzN30.Xy542SBt6AG_kEAySkHjbggJGZAGIa0wif0yOU0wuFg';

const NEW_URL = 'https://xnnewfjkibkaehlesipy.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubmV3ZmpraWJrYWVobGVzaXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTk1MzYsImV4cCI6MjA4ODI5NTUzNn0.6BFwHjR1Pd_ml1wYy1I_MOAZX8ikSnr1nVSFTJHy2XA';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function migrateLetters() {
    console.log('🚀 开始最后的数据迁移 (Letters)...');

    // 1. 从旧库获取数据
    const { data, error: fetchError } = await oldClient.from('letters').select('*');
    if (fetchError) {
        console.error(`❌ 获取 letters 数据失败:`, fetchError.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log(`⚠️ letters 表是空的。`);
        return;
    }

    console.log(`✅ 获取到 ${data.length} 条记录。`);

    // 2. 写入新库
    const { error: insertError } = await newClient.from('letters').upsert(data);
    if (insertError) {
        console.error(`❌ 写入 letters 失败:`, insertError.message);
        console.error('💡 提示：如果你还没运行我提供的修改 letters 表结构的 SQL，请运行后再试！');
    } else {
        console.log(`🎉 letters 同步成功！`);
    }
}

migrateLetters();
