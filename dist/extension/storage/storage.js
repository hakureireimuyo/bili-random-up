/**
 * Storage helpers based on IndexedDB.
 */
// ==================== IndexedDB 配置 ====================
const DB_NAME = "BilibiliDiscoveryDB";
const DB_VERSION = 1;
// 定义所有对象存储
const STORES = {
    upList: { keyPath: "mid" },
    videoCache: { keyPath: "mid" },
    tagLibrary: { keyPath: "id" },
    upTagWeightsCache: { keyPath: "mid" },
    upManualTagsCache: { keyPath: "mid" },
    categoryLibrary: { keyPath: "id" },
    interestProfile: { keyPath: "tag" },
    upFaceDataCache: { keyPath: "mid" },
    classifyStatus: { keyPath: "id" }
};
// ==================== IndexedDB 初始化 ====================
let db = null;
/**
 * 初始化IndexedDB数据库
 */
async function initDB() {
    if (db) {
        return db;
    }
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => {
            console.error("[IndexedDB] Failed to open database:", request.error);
            reject(request.error);
        };
        request.onsuccess = () => {
            db = request.result;
            console.log("[IndexedDB] Database opened successfully");
            resolve(db);
        };
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            console.log("[IndexedDB] Database upgrade needed");
            // 创建所有对象存储
            for (const [storeName, options] of Object.entries(STORES)) {
                if (!database.objectStoreNames.contains(storeName)) {
                    const objectStore = database.createObjectStore(storeName, { keyPath: options.keyPath });
                    console.log(`[IndexedDB] Created object store: ${storeName}`);
                    // 为某些存储创建索引
                    if (storeName === "tagLibrary") {
                        objectStore.createIndex("name", "name", { unique: true });
                    }
                    if (storeName === "upManualTagsCache") {
                        objectStore.createIndex("lastUpdate", "lastUpdate");
                    }
                    if (storeName === "upTagWeightsCache") {
                        objectStore.createIndex("lastUpdate", "lastUpdate");
                    }
                }
            }
        };
    });
}
// ==================== 通用数据库操作 ====================
/**
 * 获取对象存储
 */
async function getObjectStore(storeName, mode = "readonly") {
    const database = await initDB();
    const transaction = database.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}
/**
 * 获取单个记录
 */
async function getRecord(storeName, key) {
    const objectStore = await getObjectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = objectStore.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
/**
 * 获取所有记录
 */
async function getAllRecords(storeName) {
    const objectStore = await getObjectStore(storeName);
    return new Promise((resolve, reject) => {
        const request = objectStore.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
/**
 * 添加或更新记录
 */
async function putRecord(storeName, data) {
    const objectStore = await getObjectStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
        const request = objectStore.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
/**
 * 删除记录
 */
async function deleteRecord(storeName, key) {
    const objectStore = await getObjectStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
        const request = objectStore.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
/**
 * 清空对象存储
 */
async function clearStore(storeName) {
    const objectStore = await getObjectStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
        const request = objectStore.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
// ==================== 标签库操作 ====================
/**
 * 获取标签库
 */
export async function getTagLibrary() {
    const tags = await getAllRecords("tagLibrary");
    const library = {};
    tags.forEach(tag => {
        library[tag.id] = tag;
    });
    return library;
}
/**
 * 保存标签库
 */
export async function saveTagLibrary(library) {
    const objectStore = await getObjectStore("tagLibrary", "readwrite");
    await clearStore("tagLibrary");
    for (const tag of Object.values(library)) {
        await putRecord("tagLibrary", tag);
    }
}
/**
 * 添加标签到标签库
 */
export async function addTagToLibrary(name) {
    const library = await getTagLibrary();
    // 检查是否已存在相同名称的标签
    const existingTag = Object.values(library).find(tag => tag.name === name);
    if (existingTag) {
        return existingTag;
    }
    // 生成标签ID（使用名称的哈希值）
    const id = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tag = {
        id,
        name,
        created_at: Date.now()
    };
    await putRecord("tagLibrary", tag);
    return tag;
}
/**
 * 根据ID获取标签
 */
export async function getTagById(id) {
    return getRecord("tagLibrary", id);
}
/**
 * 根据名称获取标签ID
 */
export async function getTagIdByName(name) {
    const library = await getTagLibrary();
    const tag = Object.values(library).find(t => t.name === name);
    return tag?.id ?? null;
}
/**
 * 批量添加标签到标签库
 */
export async function addTagsToLibrary(names) {
    const library = await getTagLibrary();
    const addedTags = [];
    for (const name of names) {
        // 检查是否已存在
        const existingTag = Object.values(library).find(tag => tag.name === name);
        if (existingTag) {
            addedTags.push(existingTag);
            continue;
        }
        // 创建新标签
        const id = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const tag = {
            id,
            name,
            created_at: Date.now()
        };
        await putRecord("tagLibrary", tag);
        addedTags.push(tag);
    }
    return addedTags;
}
// ==================== UP-标签权重操作 ====================
/**
 * 获取UP的标签权重列表
 */
export async function getUPTagWeights(mid) {
    return getRecord("upTagWeightsCache", mid);
}
/**
 * 更新UP的标签权重
 */
export async function updateUPTagWeights(mid, tagIds) {
    const existingWeights = await getUPTagWeights(mid) ?? { mid, tags: [], lastUpdate: 0 };
    const existingTagsMap = new Map(existingWeights.tags.map(t => [t.tag_id, t.weight]));
    // 更新标签权重
    for (const tagId of tagIds) {
        const currentWeight = existingTagsMap.get(tagId) ?? 0;
        existingTagsMap.set(tagId, currentWeight + 1);
    }
    // 转换回数组并按权重降序排序
    const updatedTags = Array.from(existingTagsMap.entries())
        .map(([tag_id, weight]) => ({ tag_id, weight }))
        .sort((a, b) => b.weight - a.weight);
    // 保存更新
    await putRecord("upTagWeightsCache", {
        mid,
        tags: updatedTags,
        lastUpdate: Date.now()
    });
}
/**
 * 清除UP的标签权重
 */
export async function clearUPTagWeights(mid) {
    await deleteRecord("upTagWeightsCache", mid);
}
/**
 * 获取所有UP的标签计数
 */
export async function getUPTagCounts() {
    const weights = await getAllRecords("upTagWeightsCache");
    const cache = {};
    for (const weight of weights) {
        cache[String(weight.mid)] = {
            tags: weight.tags.map(t => ({ tag: t.tag_id, count: t.weight })),
            lastUpdate: weight.lastUpdate
        };
    }
    return cache;
}
// ==================== UP手动标签操作 ====================
/**
 * 获取UP的手动标签
 */
export async function getUPManualTags(mid) {
    const manualTag = await getRecord("upManualTagsCache", mid);
    return manualTag?.tag_ids ?? [];
}
/**
 * 设置UP的手动标签
 */
export async function setUPManualTags(mid, tagIds) {
    await putRecord("upManualTagsCache", {
        mid,
        tag_ids: tagIds,
        lastUpdate: Date.now()
    });
}
/**
 * 添加标签到UP的手动标签列表
 */
export async function addTagToUPManualTags(mid, tagId) {
    const existing = await getRecord("upManualTagsCache", mid) ?? { mid, tag_ids: [], lastUpdate: 0 };
    if (!existing.tag_ids.includes(tagId)) {
        existing.tag_ids.push(tagId);
        existing.lastUpdate = Date.now();
        await putRecord("upManualTagsCache", existing);
    }
}
/**
 * 从UP的手动标签列表中移除标签
 */
export async function removeTagFromUPManualTags(mid, tagId) {
    const existing = await getRecord("upManualTagsCache", mid);
    if (existing) {
        existing.tag_ids = existing.tag_ids.filter(id => id !== tagId);
        existing.lastUpdate = Date.now();
        await putRecord("upManualTagsCache", existing);
    }
}
// ==================== 大分区操作 ====================
/**
 * 获取大分区库
 */
export async function getCategoryLibrary() {
    const categories = await getAllRecords("categoryLibrary");
    const library = {};
    categories.forEach(category => {
        library[category.id] = category;
    });
    return library;
}
/**
 * 保存大分区库
 */
export async function saveCategoryLibrary(library) {
    await clearStore("categoryLibrary");
    for (const category of Object.values(library)) {
        await putRecord("categoryLibrary", category);
    }
}
/**
 * 创建大分区
 */
export async function createCategory(name, tagIds = []) {
    const id = `category_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const category = {
        id,
        name,
        tag_ids: tagIds,
        created_at: Date.now()
    };
    await putRecord("categoryLibrary", category);
    return category;
}
/**
 * 删除大分区
 */
export async function deleteCategory(categoryId) {
    await deleteRecord("categoryLibrary", categoryId);
}
/**
 * 添加标签到大分区
 */
export async function addTagToCategory(categoryId, tagId) {
    const category = await getRecord("categoryLibrary", categoryId);
    if (category) {
        if (!category.tag_ids.includes(tagId)) {
            category.tag_ids.push(tagId);
            await putRecord("categoryLibrary", category);
        }
    }
}
/**
 * 从大分区中移除标签
 */
export async function removeTagFromCategory(categoryId, tagId) {
    const category = await getRecord("categoryLibrary", categoryId);
    if (category) {
        category.tag_ids = category.tag_ids.filter(id => id !== tagId);
        await putRecord("categoryLibrary", category);
    }
}
// ==================== UP列表操作 ====================
/**
 * Save UP list cache.
 */
export async function saveUPList(upList) {
    const payload = { upList, lastUpdate: Date.now() };
    // 清除旧的UP列表
    await clearStore("upList");
    // 保存新的UP列表
    for (const up of upList) {
        await putRecord("upList", up);
    }
}
/**
 * Load UP list cache.
 */
export async function loadUPList() {
    const upList = await getAllRecords("upList");
    if (upList.length === 0) {
        return null;
    }
    // 获取最后更新时间
    const lastUpdate = upList.length > 0 ? upList[0].follow_time : Date.now();
    return { upList, lastUpdate };
}
/**
 * 获取已关注的UP列表
 */
export async function getFollowedUPList() {
    const cache = await loadUPList();
    if (!cache) {
        return [];
    }
    return cache.upList.filter(up => up.is_followed);
}
/**
 * 更新UP的关注状态
 */
export async function updateUPFollowStatus(mid, isFollowed) {
    const up = await getRecord("upList", mid);
    if (up) {
        up.is_followed = isFollowed;
        await putRecord("upList", up);
    }
}
// ==================== 视频缓存操作 ====================
/**
 * Save video cache for a specific UP.
 */
export async function saveVideoCache(mid, videos) {
    await putRecord("videoCache", {
        mid,
        videos,
        lastUpdate: Date.now()
    });
}
/**
 * Load video cache for a specific UP.
 */
export async function loadVideoCache(mid) {
    return getRecord("videoCache", mid);
}
// ==================== 用户兴趣操作 ====================
/**
 * Update interest score for a tag.
 */
export async function updateInterest(tag, score) {
    const existing = await getRecord("interestProfile", tag) ?? { tag, score: 0 };
    const next = { tag, score: existing.score + score };
    await putRecord("interestProfile", next);
    return next;
}
// ==================== UP头像图片数据缓存操作 ====================
/**
 * 保存UP的头像图片数据
 */
export async function saveUPFaceData(mid, faceData) {
    await putRecord("upFaceDataCache", {
        mid,
        face_data: faceData,
        lastUpdate: Date.now()
    });
}
/**
 * 获取UP的头像图片数据
 */
export async function getUPFaceData(mid) {
    const entry = await getRecord("upFaceDataCache", mid);
    return entry?.face_data ?? null;
}
/**
 * 批量保存多个UP的头像图片数据
 */
export async function saveMultipleUPFaceData(faceDataMap) {
    for (const [mid, faceData] of Object.entries(faceDataMap)) {
        await saveUPFaceData(Number(mid), faceData);
    }
}
/**
 * 清除UP的头像图片数据
 */
export async function clearUPFaceData(mid) {
    await deleteRecord("upFaceDataCache", mid);
}
// ==================== 分类状态操作 ====================
/**
 * 获取分类状态
 */
export async function getClassifyStatus() {
    return getRecord("classifyStatus", "status");
}
/**
 * 保存分类状态
 */
export async function setClassifyStatus(lastUpdate) {
    await putRecord("classifyStatus", {
        id: "status",
        lastUpdate
    });
}
// ==================== 通用存储操作 ====================
/**
 * Set a value in storage.
 */
export async function setValue(key, value) {
    // 对于特殊键，使用特定的存储方法
    if (key === "classifyStatus") {
        await setClassifyStatus(value.lastUpdate);
        return;
    }
    // 对于其他键，使用通用存储
    await putRecord("classifyStatus", {
        id: key,
        value
    });
}
/**
 * Get a value from storage.
 */
export async function getValue(key) {
    // 对于特殊键，使用特定的存储方法
    if (key === "classifyStatus") {
        const status = await getClassifyStatus();
        return status;
    }
    // 对于其他键，使用通用存储
    const record = await getRecord("classifyStatus", key);
    return record?.value ?? null;
}
