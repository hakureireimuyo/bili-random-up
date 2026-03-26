
/**
 * 集合运算工具模块
 * 提供高性能的有序数组集合运算
 */

/**
 * 交集（AND操作）- 双指针线性扫描
 * @param a 有序数组a
 * @param b 有序数组b
 * @returns a和b的交集
 */
export function intersect(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push(a[i]);
      i++;
      j++;
    } else if (a[i] < b[j]) {
      i++;
    } else {
      j++;
    }
  }
  return result;
}

/**
 * 并集（OR操作）- 类似merge排序
 * @param a 有序数组a
 * @param b 有序数组b
 * @returns a和b的并集
 */
export function union(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && a[i] < b[j])) {
      if (result.length === 0 || result[result.length - 1] !== a[i]) {
        result.push(a[i]);
      }
      i++;
    } else if (i >= a.length || (j < b.length && a[i] > b[j])) {
      if (result.length === 0 || result[result.length - 1] !== b[j]) {
        result.push(b[j]);
      }
      j++;
    } else {
      // a[i] === b[j]
      if (result.length === 0 || result[result.length - 1] !== a[i]) {
        result.push(a[i]);
      }
      i++;
      j++;
    }
  }
  return result;
}

/**
 * 差集（NOT操作）
 * @param a 有序数组a
 * @param b 有序数组b
 * @returns a减去b的结果
 */
export function subtract(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length) {
    if (j >= b.length || a[i] < b[j]) {
      result.push(a[i]);
      i++;
    } else if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      j++;
    }
  }
  return result;
}

/**
 * 插入到有序数组
 * @param arr 有序数组
 * @param value 要插入的值
 */
export function insertSorted(arr: number[], value: number): void {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  // 检查是否已存在
  if (left < arr.length && arr[left] === value) {
    return; // 已存在，不插入
  }
  arr.splice(left, 0, value);
}

/**
 * 从有序数组中移除
 * @param arr 有序数组
 * @param value 要移除的值
 */
export function removeFromArray(arr: number[], value: number): void {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  if (left < arr.length && arr[left] === value) {
    arr.splice(left, 1);
  }
}
