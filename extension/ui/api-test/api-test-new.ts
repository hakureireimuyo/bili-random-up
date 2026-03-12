/**
 * API测试页面逻辑
 */

import {
  getWBIKeys,
  generateWBISign,
  getUPVideos,
  getVideoTags
} from "../../api/bili-api.js";
import { getValue } from "../../storage/storage.js";

interface TestResult {
  title: string;
  success: boolean;
  content: string;
}

const testResults: TestResult[] = [];

function addTestResult(result: TestResult): void {
  testResults.push(result);
  renderTestResults();
}

function updateLastResult(result: TestResult): void {
  if (testResults.length > 0) {
    testResults[testResults.length - 1] = result;
  } else {
    testResults.push(result);
  }
  renderTestResults();
}

function renderTestResults(): void {
  const container = document.getElementById("test-results");
  if (!container) return;

  container.innerHTML = testResults.map(result => `
    <div class="test-result-item ${result.success ? 'success' : 'error'}">
      <div class="test-result-title">${result.success ? '✓' : '✗'} ${result.title}</div>
      <div class="test-result-content">${result.content}</div>
    </div>
  `).join('');

  // 自动滚动到底部
  container.scrollTop = container.scrollHeight;
}

async function testWBIKeys(): Promise<void> {
  try {
    addTestResult({
      title: "测试WBI密钥获取",
      success: false,
      content: "正在测试..."
    });

    const keys = await getWBIKeys();
    if (keys) {
      updateLastResult({
        title: "测试WBI密钥获取",
        success: true,
        content: `成功获取WBI密钥\nimg_key: ${keys.img_key.substring(0, 10)}...\nsub_key: ${keys.sub_key.substring(0, 10)}...\nmixin_key: ${keys.mixin_key.substring(0, 10)}...`
      });
    } else {
      updateLastResult({
        title: "测试WBI密钥获取",
        success: false,
        content: "获取WBI密钥失败"
      });
    }
  } catch (error) {
    updateLastResult({
      title: "测试WBI密钥获取",
      success: false,
      content: `错误: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function testWBISign(): Promise<void> {
  try {
    addTestResult({
      title: "测试WBI签名生成",
      success: false,
      content: "正在测试..."
    });

    const sign = await generateWBISign({ mid: 123456, pn: 1, ps: 30 });
    if (sign) {
      updateLastResult({
        title: "测试WBI签名生成",
        success: true,
        content: `成功生成WBI签名\nw_rid: ${sign.w_rid}\nwts: ${sign.wts}`
      });
    } else {
      updateLastResult({
        title: "测试WBI签名生成",
        success: false,
        content: "生成WBI签名失败"
      });
    }
  } catch (error) {
    updateLastResult({
      title: "测试WBI签名生成",
      success: false,
      content: `错误: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function testUPVideos(): Promise<void> {
  const upIdInput = document.getElementById("up-id") as HTMLInputElement;
  const upId = upIdInput?.value ? Number(upIdInput.value) : null;

  if (!upId) {
    addTestResult({
      title: "测试获取UP视频",
      success: false,
      content: "请输入UP主ID"
    });
    return;
  }

  try {
    addTestResult({
      title: "测试获取UP视频",
      success: false,
      content: `正在测试UP主 ${upId}...`
    });

    const videos = await getUPVideos(upId);
    if (videos && videos.length > 0) {
      updateLastResult({
        title: "测试获取UP视频",
        success: true,
        content: `成功获取 ${videos.length} 个视频\n\n前3个视频:\n${videos.slice(0, 3).map((v, i) =>
          `${i + 1}. ${v.title}\n   BV号: ${v.bvid}\n   播放量: ${v.play}\n   时长: ${v.duration}秒`
        ).join('\n\n')}`
      });
    } else {
      updateLastResult({
        title: "测试获取UP视频",
        success: false,
        content: "获取视频失败或UP主没有视频"
      });
    }
  } catch (error) {
    updateLastResult({
      title: "测试获取UP视频",
      success: false,
      content: `错误: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function testVideoTags(): Promise<void> {
  const bvidInput = document.getElementById("video-bvid") as HTMLInputElement;
  const bvid = bvidInput?.value?.trim();

  if (!bvid) {
    addTestResult({
      title: "测试获取视频标签",
      success: false,
      content: "请输入视频BV号"
    });
    return;
  }

  try {
    addTestResult({
      title: "测试获取视频标签",
      success: false,
      content: `正在测试视频 ${bvid}...`
    });

    const tags = await getVideoTags(bvid);
    if (tags && tags.length > 0) {
      updateLastResult({
        title: "测试获取视频标签",
        success: true,
        content: `成功获取 ${tags.length} 个标签\n\n标签列表:\n${tags.join(', ')}`
      });
    } else {
      updateLastResult({
        title: "测试获取视频标签",
        success: false,
        content: "获取标签失败或视频没有标签"
      });
    }
  } catch (error) {
    updateLastResult({
      title: "测试获取视频标签",
      success: false,
      content: `错误: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

async function testAll(): Promise<void> {
  testResults.length = 0;
  renderTestResults();

  await testWBIKeys();
  await testWBISign();
  await testUPVideos();
  await testVideoTags();
}

async function checkCookieConfig(): Promise<void> {
  try {
    const settings = await getValue<{ biliCookie?: string }>("settings");
    if (settings?.biliCookie) {
      addTestResult({
        title: "Cookie配置检查",
        success: true,
        content: `已配置Cookie\n长度: ${settings.biliCookie.length} 字符\n包含SESSDATA: ${settings.biliCookie.includes('SESSDATA') ? '是' : '否'}`
      });
    } else {
      addTestResult({
        title: "Cookie配置检查",
        success: false,
        content: "未配置Cookie，请在设置页面配置后重试"
      });
    }
  } catch (error) {
    addTestResult({
      title: "Cookie配置检查",
      success: false,
      content: `错误: ${error instanceof Error ? error.message : String(error)}`
    });
  }
}

export async function initAPITest(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  const testWBIKeysBtn = document.getElementById("test-wbi-keys");
  const testWBISignBtn = document.getElementById("test-wbi-sign");
  const testUPVideosBtn = document.getElementById("test-up-videos");
  const testVideoTagsBtn = document.getElementById("test-video-tags");
  const testAllBtn = document.getElementById("test-all");

  testWBIKeysBtn?.addEventListener("click", testWBIKeys);
  testWBISignBtn?.addEventListener("click", testWBISign);
  testUPVideosBtn?.addEventListener("click", testUPVideos);
  testVideoTagsBtn?.addEventListener("click", testVideoTags);
  testAllBtn?.addEventListener("click", testAll);

  // 初始化时检查Cookie配置
  await checkCookieConfig();
}

if (typeof document !== "undefined") {
  void initAPITest();
}
