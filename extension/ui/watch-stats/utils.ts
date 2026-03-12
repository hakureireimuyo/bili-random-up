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
 * 根据观看时长计算热力图颜色
 * @param seconds 观看时长（秒）
 * @param maxSeconds 最大时长（秒），默认8小时
 * @returns RGB颜色字符串
 */
export function getHeatmapColor(seconds: number, maxSeconds = 8 * 3600): string {
  const ratio = Math.min(seconds / maxSeconds, 1);

  // 从浅蓝色 #c7d2fe 到深紫色 #6366f1 的渐变
  const startColor = { r: 199, g: 210, b: 254 }; // #c7d2fe
  const endColor = { r: 99, g: 102, b: 241 }; // #6366f1

  const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}
