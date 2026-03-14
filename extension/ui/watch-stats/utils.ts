/**
 * 格式化秒数为 HH:MM:SS 格式
 */
export function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * 格式化时间戳为 MM/DD HH:mm 格式
 */
export function formatTime(timestamp: number | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * 获取最近N天的日期列表
 */
export function getRecentDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    days.push(`${date.getFullYear()}-${month}-${day}`);
  }
  return days;
}

/**
 * 获取当前月份的日期列表
 */
export function getMonthDays(): Array<{ date: string; day: number }> {
  const days: Array<{ date: string; day: number }> = [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // 获取月份的第一天是星期几（0-6，0是周日）
  const startDayOfWeek = firstDay.getDay();

  // 添加空白单元格填充
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push({ date: "", day: 0 });
  }

  // 添加日期
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date: dateStr, day: d });
  }

  return days;
}

/**
 * HSL转RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * 根据观看时长计算热力图颜色
 * @param seconds 观看时长（秒）
 * @param maxSeconds 最大时长（秒），默认8小时
 * @returns RGB颜色字符串
 */
export function getHeatmapColor(seconds: number, maxSeconds = 8 * 3600): string {
  const ratio = Math.min(seconds / maxSeconds, 1);

  // 定义6个颜色断点，使用HSL颜色空间
  // 色相均匀分布在色环上（每60度一个点）
  // 明度从50%降到25%
  // 纯度从20%升到100%
  const colorStops = [
    { position: 0.0, h: 240, s: 80, l: 90 },      // 红色
    { position: 0.2, h: 120, s: 80, l: 90 },     // 黄色
    { position: 0.4, h: 0, s: 80, l: 90 },     // 绿色
    { position: 0.6, h: 180, s: 80, l: 90 },     // 青色
    { position: 0.8, h: 300, s: 80, l: 90 },     // 蓝色
    { position: 1.0, h: 60, s: 80, l: 90 }     // 紫红色
  ];

  // 找到ratio所在的区间
  let startStop = colorStops[0];
  let endStop = colorStops[colorStops.length - 1];

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (ratio >= colorStops[i].position && ratio <= colorStops[i + 1].position) {
      startStop = colorStops[i];
      endStop = colorStops[i + 1];
      break;
    }
  }

  // 计算当前区间内的局部比例
  const localRatio = (ratio - startStop.position) / (endStop.position - startStop.position);

  // 在当前区间内进行HSL插值
  const h = startStop.h + (endStop.h - startStop.h) * localRatio;
  const s = startStop.s + (endStop.s - startStop.s) * localRatio;
  const l = startStop.l + (endStop.l - startStop.l) * localRatio;

  // 转换为RGB
  const rgb = hslToRgb(h, s, l);

  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}
