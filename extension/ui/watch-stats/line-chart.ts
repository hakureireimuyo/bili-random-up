import { getRecentDays, formatSeconds } from "./utils";

/**
 * 渲染近7天趋势折线图
 */
export function renderLineChart(dailySeconds: Record<string, number>): void {
  const canvas = document.getElementById("line-chart") as HTMLCanvasElement;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 获取最近7天的数据
  const recentDays = getRecentDays(7).reverse();
  const data = recentDays.map(day => dailySeconds[day] ?? 0);

  // 设置canvas尺寸
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 清空画布
  ctx.clearRect(0, 0, width, height);

  // 计算数据范围
  const maxValue = Math.max(...data, 1);
  const minValue = 0;

  // 绘制网格线
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();

    // Y轴标签
    const value = maxValue - (maxValue / 4) * i;
    ctx.fillStyle = "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(formatSeconds(value), padding.left - 10, y + 4);
  }

  // 绘制X轴标签
  ctx.textAlign = "center";
  for (let i = 0; i < recentDays.length; i++) {
    const x = padding.left + (chartWidth / (recentDays.length - 1)) * i;
    const date = new Date(recentDays[i]);
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    ctx.fillText(label, x, height - padding.bottom + 20);
  }

  // 绘制折线
  ctx.strokeStyle = "#667eea";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + (chartWidth / (data.length - 1)) * i;
    const y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // 绘制数据点
  ctx.fillStyle = "#667eea";
  for (let i = 0; i < data.length; i++) {
    const x = padding.left + (chartWidth / (data.length - 1)) * i;
    const y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
