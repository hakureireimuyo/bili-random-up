/**
 * 标签和颜色相关通用工具函数
 */

export function colorFromTag(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash * 7) % 21);
  const light = 85 + (Math.abs(hash * 13) % 11);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function removeFromList(values: string[], target: string): string[] {
  return values.filter((value) => value !== target);
}
