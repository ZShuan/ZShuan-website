#!/usr/bin/env node
/**
 * 把城市图片从 GitHub(jsDelivr) 迁移到 Supabase Storage（非破坏性）。
 *
 * 用法（在 ToWhereOnline 目录下）：
 *   node scripts/migrate_city_images_to_supabase.mjs --dry-run   # 只预览，不上传不写库
 *   node scripts/migrate_city_images_to_supabase.mjs             # 执行迁移
 *
 * 说明：
 * - 从 jsDelivr 下载原有图片 -> 上传到 Supabase Storage (firsts-images/cities/{city}/...)
 * - 更新 city_images.url（主图 cities.main_image 若也指向旧图则一并更新）
 * - 不删除任何 GitHub 源图，上传失败的一律跳过，保证可回退。
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const BUCKET = 'firsts-images';
const CITY_FOLDER = 'cities';
const DRY_RUN = process.argv.includes('--dry-run');

function loadEnvLocal() {
    const file = path.join(process.cwd(), '.env.local');
    const raw = fs.readFileSync(file, 'utf8');
    const vars = {};
    for (const line of raw.split('\n')) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m) vars[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return vars;
}

const env = loadEnvLocal();
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) {
    console.error('❌ 缺少 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY（请检查 .env.local）');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, anonKey);

const isGithubUrl = (url) =>
    !url.includes('/storage/v1/object/public/') &&
    /cdn\.jsdelivr\.net\/gh\/|raw\.githubusercontent\.com|\/github\.com\//.test(url);

function extOf(url) {
    const m = url.match(/\.(jpe?g|png|webp|gif|bmp|avif)(\?|$)/i);
    return m ? m[1].toLowerCase() : 'jpg';
}

function fileNameFromUrl(url) {
    // 取 URL 最后一个路径段作为文件名
    const clean = url.split('?')[0];
    const seg = clean.split('/').filter(Boolean).pop() || `img-${Date.now()}`;
    const base = seg.replace(/\.[a-z0-9]+$/i, '') || `img-${Date.now()}`;
    return `${base}.${extOf(url)}`;
}

// 把城市名转成纯 ASCII 目录名（与 src/lib/supabaseStorage.js 保持一致）
function slugifyFolder(name) {
    const s = String(name || 'city');
    let out = '';
    for (const ch of s) {
        if (/[A-Za-z0-9._-]/.test(ch)) {
            out += ch;
        } else {
            out += 'u' + ch.codePointAt(0).toString(16);
        }
    }
    return out || 'city';
}

function findLocalImage(cityName, url) {
    // URL 中的文件名（最后一段，去掉可能存在的查询串）
    const fileName = decodeURIComponent(url.split('?')[0].split('/').filter(Boolean).pop() || '');
    if (!fileName) return null;
    const dir = path.join(process.cwd(), 'public', 'images', 'cities', cityName);
    if (!fs.existsSync(dir)) return null;
    try {
        const match = fs.readdirSync(dir).find(f => f.toLowerCase() === fileName.toLowerCase());
        return match ? path.join(dir, match) : null;
    } catch {
        return null;
    }
}

async function main() {
    const { data: cities, error: cityErr } = await supabase.from('cities').select('id,name,main_image');
    if (cityErr || !cities) throw cityErr || new Error('读取 cities 失败');

    // 收集所有待迁移的目标
    const targets = []; // { type: 'images'|'main', cityName, oldUrl, rowId? }
    const byUrl = new Map(); // oldUrl -> { newUrl, pathName }

    for (const city of cities) {
        const { data: rows } = await supabase.from('city_images').select('id,url').eq('city_id', city.id);
        for (const r of rows || []) {
            if (isGithubUrl(r.url)) {
                targets.push({ type: 'images', rowId: r.id, cityName: city.name, oldUrl: r.url });
            }
        }
        if (isGithubUrl(city.main_image)) {
            targets.push({ type: 'main', cityName: city.name, oldUrl: city.main_image });
        }
    }

    console.log(`共发现 ${targets.length} 个待迁移图片对象。${DRY_RUN ? '（dry-run：仅预览，不会上传/写库）' : ''}\n`);

    let ok = 0, failed = 0, skipped = 0;
    for (const t of targets) {
        if (byUrl.has(t.oldUrl)) {
            // 同一张图已在本次运行中迁移过（例如主图与相册首图相同），仅补写 DB 引用
            const mapped = byUrl.get(t.oldUrl);
            if (t.type === 'images') {
                const { error } = await supabase.from('city_images').update({ url: mapped.newUrl }).eq('id', t.rowId);
                if (error) console.error(`  [fail] ${t.cityName} 引用更新失败: ${error.message}`);
                else skipped++;
            }
            continue;
        }
        // Supabase Storage 不接受中文等非 ASCII 字符，城市名转纯 ASCII slug
        const pathName = `${CITY_FOLDER}/${slugifyFolder(t.cityName)}/${fileNameFromUrl(t.oldUrl)}`;
        if (DRY_RUN) {
            console.log(`  [dry] ${t.cityName} | ${pathName}\n        <- ${t.oldUrl}`);
            ok++;
            continue;
        }
        try {
            const localPath = findLocalImage(t.cityName, t.oldUrl);
            if (!localPath) {
                throw new Error(`本地图片不存在: public/images/cities/${t.cityName}/`);
            }
            const buf = fs.readFileSync(localPath);
            const { data, error } = await supabase.storage.from(BUCKET).upload(pathName, buf, {
                cacheControl: '31536000',
                upsert: true,
                contentType: 'image/' + extOf(t.oldUrl),
            });
            if (error) throw error;
            const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(pathName).data.publicUrl;
            byUrl.set(t.oldUrl, { newUrl: publicUrl, pathName });

            if (t.type === 'images') {
                const { error: updErr } = await supabase.from('city_images').update({ url: publicUrl }).eq('id', t.rowId);
                if (updErr) throw updErr;
            }
            ok++;
            console.log(`  [ok] ${t.cityName} -> ${publicUrl}`);
        } catch (e) {
            failed++;
            console.error(`  [fail] ${t.cityName} | ${pathName} : ${e.message}`);
        }
    }

    // 更新主图（city_images 更新后，若 main_image 也指向旧图则替换）
    if (!DRY_RUN) {
        for (const city of cities) {
            const mapped = byUrl.get(city.main_image);
            if (mapped && mapped.newUrl !== city.main_image) {
                const { error } = await supabase.from('cities').update({ main_image: mapped.newUrl }).eq('id', city.id);
                if (!error) console.log(`  [main] ${city.name} 主图已更新`);
                else failed++, console.error(`  [main-fail] ${city.name}: ${error.message}`);
            }
        }
    }

    console.log(`\n完成：成功 ${ok}，失败 ${failed}，复用 ${skipped}${DRY_RUN ? '（dry-run 未实际执行）' : ''}`);
}

main().catch((e) => {
    console.error('迁移中断：', e);
    process.exit(1);
});
