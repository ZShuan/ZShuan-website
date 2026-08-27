import { supabase } from './supabaseClient';

// 城市地点图片统一使用现有公开 Bucket（已配置 anon 读写策略）。
// 若以后想隔离城市图片，可在 Dashboard 新建 "city-images" 桶后把这里改掉即可。
export const CITY_BUCKET = 'firsts-images';
const CITY_FOLDER = 'cities';

/**
 * 把城市名转成纯 ASCII 的安全目录名。
 * Supabase Storage 不允许对象 key 含中文等非 ASCII 字符。
 * 非 ASCII 字符统一转成 u + Unicode 码点十六进制，保证可复现、无碰撞。
 * 例：青岛 -> u9752u5c9b
 */
export function slugifyFolder(name) {
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

/**
 * 上传图片到 Supabase Storage
 * 
 * @param {File|Blob} file - 要上传的文件
 * @param {string} bucket - Bucket 名称 (如 'firsts-images')
 * @param {string} folder - Bucket 内的子目录（可选）
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadToSupabase(file, bucket = 'firsts-images', folder = '') {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${file.name?.split('.').pop() || 'jpg'}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName; // 可以根据需要添加文件夹结构

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '31536000',
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return { publicUrl, path: filePath };
}

/**
 * 获取图片的公开 URL
 */
export function getSupabasePublicUrl(path, bucket = 'firsts-images') {
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
    return publicUrl;
}

/**
 * 上传城市地点图片
 * 存放到 path: cities/{cityName}/{filename}，并返回公开 URL
 *
 * @param {File|Blob} file - 要上传的图片
 * @param {string} cityName - 城市名称（用于目录分隔）
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadCityImage(file, cityName) {
    return uploadToSupabase(file, CITY_BUCKET, `${CITY_FOLDER}/${slugifyFolder(cityName)}`);
}

/**
 * 从公开 URL 推导出 Storage 对象路径。
 * 例如 https://<proj>.supabase.co/storage/v1/object/public/firsts-images/cities/北京/xx.jpg
 * → cities/北京/xx.jpg
 *
 * @param {string} url - 公开访问 URL
 * @param {string} bucket - Bucket 名称
 * @returns {string|null} 对象路径，非本 Bucket 的 URL 返回 null
 */
export function pathFromPublicUrl(url, bucket = CITY_BUCKET) {
    if (!url) return null;
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
}

/**
 * 根据对象路径批量删除存储中的图片
 *
 * @param {string[]} paths - Storage 对象路径数组
 * @param {string} bucket - Bucket 名称
 * @returns {Promise<number>} 成功删除的数量
 */
export async function deleteStorageImages(paths, bucket = CITY_BUCKET) {
    const validPaths = (paths || []).filter(Boolean);
    if (validPaths.length === 0) return 0;
    const { data, error } = await supabase.storage
        .from(bucket)
        .remove(validPaths);
    if (error) throw error;
    return (data || []).length;
}
