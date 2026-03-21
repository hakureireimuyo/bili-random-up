/**
 * 收藏视频页面
 */

// 状态管理
const state = {
  collections: [],
  currentCollectionId: null,
  videos: [],
  filteredVideos: [],
  currentPage: 0,
  pageSize: 20,
  tags: new Set(),
  creators: new Map(),
  isLoading: false
};

// DOM元素
const elements = {
  syncBtn: document.getElementById('syncBtn'),
  collectionTabs: document.getElementById('collectionTabs'),
  searchInput: document.getElementById('searchInput'),
  tagFilter: document.getElementById('tagFilter'),
  creatorFilter: document.getElementById('creatorFilter'),
  searchBtn: document.getElementById('searchBtn'),
  videoList: document.getElementById('videoList'),
  loading: document.getElementById('loading'),
  empty: document.getElementById('empty'),
  error: document.getElementById('error'),
  errorMessage: document.getElementById('errorMessage'),
  pagination: document.getElementById('pagination'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo')
};

// 初始化
async function init() {
  setupEventListeners();
  await loadCollections();
  if (state.collections.length > 0) {
    state.currentCollectionId = state.collections[0].collectionId;
    renderCollectionTabs();
    await loadFavoriteVideos();
  } else {
    showEmptyCollections();
  }
}

// 设置事件监听
function setupEventListeners() {
  elements.syncBtn?.addEventListener('click', handleSync);
  elements.searchBtn?.addEventListener('click', handleSearch);
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  elements.tagFilter?.addEventListener('change', handleSearch);
  elements.creatorFilter?.addEventListener('change', handleSearch);
  elements.prevPage?.addEventListener('click', () => changePage(-1));
  elements.nextPage?.addEventListener('click', () => changePage(1));
}

// 加载收藏夹
async function loadCollections() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get_collections',
      payload: {}
    });

    if (response?.success) {
      state.collections = response.collections || [];
    } else {
      console.error('[Favorites] Error loading collections:', response?.error);
    }
  } catch (error) {
    console.error('[Favorites] Error loading collections:', error);
  }
}

// 渲染收藏夹标签
function renderCollectionTabs() {
  if (!elements.collectionTabs) return;

  elements.collectionTabs.innerHTML = '';

  state.collections.forEach(collection => {
    const tab = document.createElement('div');
    tab.className = `collection-tab ${collection.collectionId === state.currentCollectionId ? 'active' : ''}`;
    tab.textContent = collection.name;
    tab.addEventListener('click', () => switchCollection(collection.collectionId));
    elements.collectionTabs.appendChild(tab);
  });
}

// 切换收藏夹
async function switchCollection(collectionId) {
  if (state.currentCollectionId === collectionId) return;

  state.currentCollectionId = collectionId;
  state.currentPage = 0;
  renderCollectionTabs();
  await loadFavoriteVideos();
}

// 显示空收藏夹状态
function showEmptyCollections() {
  if (!elements.collectionTabs) return;
  elements.collectionTabs.innerHTML = '<p class="empty-collections">暂无收藏夹</p>';
}

// 加载收藏视频
async function loadFavoriteVideos() {
  try {
    setLoading(true);

    const response = await chrome.runtime.sendMessage({
      type: 'search_favorite_videos',
      payload: {
        collectionId: state.currentCollectionId
      }
    });

    if (response?.success) {
      state.videos = response.videos || [];
      state.filteredVideos = [...state.videos];
      extractTagsAndCreators();
      updateFilterOptions();
      renderVideos();
    } else {
      showError(response?.error || '加载收藏视频失败');
    }
  } catch (error) {
    console.error('[Favorites] Error loading favorite videos:', error);
    showError('加载收藏视频失败');
  } finally {
    setLoading(false);
  }
}

// 同步收藏视频
async function handleSync() {
  try {
    setLoading(true);

    // 获取用户ID
    const settingsResponse = await chrome.runtime.sendMessage({
      type: 'get_value',
      payload: { key: 'settings' }
    });

    const settings = settingsResponse?.data;
    if (!settings?.userId) {
      showError('请先登录B站并获取用户ID');
      return;
    }

    // 同步收藏视频
    const syncResponse = await chrome.runtime.sendMessage({
      type: 'sync_favorite_videos',
      payload: { uid: settings.userId }
    });

    if (syncResponse?.success) {
      console.log(`[Favorites] Synced ${syncResponse.count} videos`);
      await loadCollections();
      if (state.collections.length > 0) {
        if (!state.currentCollectionId || !state.collections.find(c => c.collectionId === state.currentCollectionId)) {
          state.currentCollectionId = state.collections[0].collectionId;
        }
        renderCollectionTabs();
        await loadFavoriteVideos();
      } else {
        showEmptyCollections();
      }
    } else {
      showError(syncResponse?.error || '同步收藏视频失败');
    }
  } catch (error) {
    console.error('[Favorites] Error syncing favorite videos:', error);
    showError('同步收藏视频失败');
  } finally {
    setLoading(false);
  }
}

// 搜索收藏视频
async function handleSearch() {
  try {
    const keyword = elements.searchInput?.value?.trim() || '';
    const tagId = elements.tagFilter?.value || '';
    const creatorId = elements.creatorFilter?.value || '';

    setLoading(true);

    const response = await chrome.runtime.sendMessage({
      type: 'search_favorite_videos',
      payload: { 
        collectionId: state.currentCollectionId,
        keyword, 
        tagId, 
        creatorId 
      }
    });

    if (response?.success) {
      state.filteredVideos = response.videos || [];
      state.currentPage = 0;
      renderVideos();
    } else {
      showError(response?.error || '搜索收藏视频失败');
    }
  } catch (error) {
    console.error('[Favorites] Error searching favorite videos:', error);
    showError('搜索收藏视频失败');
  } finally {
    setLoading(false);
  }
}

// 提取标签和UP主
function extractTagsAndCreators() {
  state.tags.clear();
  state.creators.clear();

  state.videos.forEach(video => {
    // 提取标签
    video.tags.forEach(tagId => {
      state.tags.add(tagId);
    });

    // 提取UP主
    if (video.creatorId) {
      state.creators.set(video.creatorId, video.creatorId);
    }
  });
}

// 更新筛选选项
async function updateFilterOptions() {
  // 更新标签筛选
  if (elements.tagFilter) {
    // 保留第一个选项（所有标签）
    elements.tagFilter.innerHTML = '<option value="">所有标签</option>';

    // 添加标签选项
    for (const tagId of state.tags) {
      const option = document.createElement('option');
      option.value = tagId;
      option.textContent = tagId;
      elements.tagFilter.appendChild(option);
    }
  }

  // 更新UP主筛选
  if (elements.creatorFilter) {
    // 保留第一个选项（所有UP主）
    elements.creatorFilter.innerHTML = '<option value="">所有UP主</option>';

    // 添加UP主选项
    for (const creatorId of state.creators.keys()) {
      const option = document.createElement('option');
      option.value = creatorId;
      option.textContent = creatorId;
      elements.creatorFilter.appendChild(option);
    }
  }
}

// 渲染视频列表
function renderVideos() {
  if (!elements.videoList) return;

  // 清空列表
  elements.videoList.innerHTML = '';

  // 显示加载状态
  if (state.isLoading) {
    if (elements.loading) elements.loading.style.display = 'flex';
    if (elements.empty) elements.empty.style.display = 'none';
    if (elements.error) elements.error.style.display = 'none';
    return;
  }

  // 显示空状态
  if (state.filteredVideos.length === 0) {
    if (elements.loading) elements.loading.style.display = 'none';
    if (elements.empty) elements.empty.style.display = 'flex';
    if (elements.error) elements.error.style.display = 'none';
    return;
  }

  // 计算分页
  const start = state.currentPage * state.pageSize;
  const end = start + state.pageSize;
  const pageVideos = state.filteredVideos.slice(start, end);
  const totalPages = Math.ceil(state.filteredVideos.length / state.pageSize);

  // 渲染视频
  pageVideos.forEach(video => {
    const videoElement = createVideoElement(video);
    elements.videoList.appendChild(videoElement);
  });

  // 更新分页控件
  updatePagination(totalPages);

  // 隐藏状态提示
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.empty) elements.empty.style.display = 'none';
  if (elements.error) elements.error.style.display = 'none';
}

// 创建视频元素
function createVideoElement(video) {
  const div = document.createElement('div');
  div.className = 'video-item';
  // 优先使用picture字段，如果没有则使用coverUrl
  const coverImage = video.picture || video.coverUrl || '';
  div.innerHTML = `
    <img class="video-cover" src="${coverImage}" alt="${video.title}">
    <div class="video-info">
      <div class="video-title">${video.title}</div>
      <div class="video-meta">
        <span>UP: ${video.creatorId || '未知'}</span>
        <span>${new Date(video.publishTime).toLocaleDateString()}</span>
      </div>
      <div class="video-tags">
        ${video.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </div>
  `;

  // 点击视频跳转到B站
  div.addEventListener('click', () => {
    chrome.tabs.create({ url: `https://www.bilibili.com/video/${video.videoId}` });
  });

  return div;
}

// 更新分页控件
function updatePagination(totalPages) {
  if (!elements.pagination) return;

  if (totalPages > 1) {
    elements.pagination.style.display = 'flex';
  } else {
    elements.pagination.style.display = 'none';
    return;
  }

  // 更新按钮状态
  if (elements.prevPage) {
    elements.prevPage.disabled = state.currentPage === 0;
  }

  if (elements.nextPage) {
    elements.nextPage.disabled = state.currentPage >= totalPages - 1;
  }

  // 更新页码信息
  if (elements.pageInfo) {
    elements.pageInfo.textContent = `第 ${state.currentPage + 1} / ${totalPages} 页`;
  }
}

// 切换页面
function changePage(delta) {
  state.currentPage += delta;
  renderVideos();
}

// 设置加载状态
function setLoading(loading) {
  state.isLoading = loading;
  if (elements.syncBtn) {
    elements.syncBtn.disabled = loading;
    elements.syncBtn.textContent = loading ? '同步中...' : '同步收藏';
  }
}

// 显示错误
function showError(message) {
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.empty) elements.empty.style.display = 'none';
  if (elements.error) {
    elements.error.style.display = 'flex';
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message;
    }
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
