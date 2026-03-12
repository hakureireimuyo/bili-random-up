# B站API认证配置指南

## 为什么需要认证？

B站的某些API接口（如获取UP视频列表、视频标签等）需要用户登录后才能访问。如果没有认证信息，API会返回"访问权限不足"或"风控校验失败"的错误。

## 解决方案

通过配置用户的Cookie信息，让程序模拟已登录用户的请求，从而成功获取数据。

## 详细步骤

### 1. 获取Cookie

1. 在浏览器中登录B站（推荐使用Chrome）
2. 按F12打开开发者工具
3. 切换到"Network"（网络）标签
4. 刷新页面或访问任意B站页面
5. 在请求列表中找到任意请求，查看其"Headers"
6. 找到"Request Headers"中的"Cookie"字段
7. 复制完整的Cookie值

### 2. 配置认证信息

#### 方法一：使用示例配置文件

1. 打开 `extension/api/bili-config.example.ts` 文件
2. 复制该文件为 `extension/api/bili-config.ts`
3. 将你复制的Cookie粘贴到 `cookie` 字段中
4. 可选：设置 `headers` 中的 `User-Agent` 和 `Referer`

#### 方法二：直接编辑配置文件

1. 打开 `extension/api/bili-config.ts` 文件
2. 修改 `authConfig` 对象：

```typescript
export const authConfig: BiliAuthConfig = {
  // 将你复制的Cookie粘贴到这里
  cookie: 'SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx; ...',

  // 可选：设置User-Agent
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};
```

### 3. 重新构建项目

配置完成后，需要重新构建项目：

```bash
npm run build
```

### 4. 测试认证

运行测试验证配置是否正确：

```bash
npm run test:api
```

如果配置正确，应该能成功获取UP视频和视频标签。

## 注意事项

1. **Cookie有效期**：Cookie会过期，如果API返回"访问权限不足"，需要重新获取Cookie
2. **安全性**：不要将包含真实Cookie的代码提交到公开仓库（已在.gitignore中配置）
3. **SESSDATA**：Cookie中最重要的字段是SESSDATA，确保它存在且有效
4. **风控**：即使有了Cookie，频繁请求也可能触发风控，建议合理控制请求频率
5. **User-Agent**：设置正确的User-Agent可以减少被风控的概率

## 常见问题

### Q: API仍然返回"访问权限不足"

A: 可能的原因：
- Cookie已过期，需要重新获取
- Cookie中缺少必要的字段（如SESSDATA）
- 请求频率过高，触发了风控

### Q: 如何检查Cookie是否有效？

A: 可以在浏览器中手动访问API接口，看看是否能正常返回数据。例如：
```
https://api.bilibili.com/x/space/arc/search?mid=62351857&pn=1&ps=30&order=pubdate
```

### Q: Cookie中哪些字段是必须的？

A: 至少需要包含：
- SESSDATA：最重要的认证字段
- bili_jct：CSRF令牌
- DedeUserID：用户ID

### Q: 如何避免Cookie过期？

A: Cookie的有效期由B站服务器控制，无法延长。建议：
- 定期检查API是否正常工作
- 在Cookie即将过期时重新获取
- 可以编写脚本自动检测并提醒更新Cookie
