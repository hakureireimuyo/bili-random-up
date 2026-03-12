import { getMonthDays, getHeatmapColor, formatSeconds } from "./utils";

/**
 * 渲染月度热力图
 */
export function renderHeatmap(dailySeconds: Record<string, number>): void {
  const container = document.getElementById("heatmap-container");
  if (!container) return;

  const monthDays = getMonthDays();
  const allSeconds = monthDays
    .filter(d => d.date)
    .map(d => dailySeconds[d.date] ?? 0);
  const maxSeconds = Math.max(...allSeconds, 1);

  // 获取今天的日期
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  container.innerHTML = "";

  for (const day of monthDays) {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell";

    if (day.date) {
      const seconds = dailySeconds[day.date] ?? 0;
      cell.style.background = getHeatmapColor(seconds);
      cell.textContent = String(day.day);

      // 如果是今天，添加金色边框
      if (day.date === todayKey) {
        cell.style.border = "2px solid #fbbf24";
        cell.style.boxShadow = "0 0 8px rgba(251, 191, 36, 0.5)";
      }

      // 添加tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = `${day.date}: ${formatSeconds(seconds)}`;
      cell.appendChild(tooltip);
    }

    container.appendChild(cell);
  }
}
