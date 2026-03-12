# B站API认证配置

## 如何获取认证信息

1. 在浏览器中登录B站（推荐使用Chrome）
2. 按F12打开开发者工具
3. 切换到"Network"（网络）标签
4. 刷新页面或访问任意B站页面
5. 在请求列表中找到任意请求，查看其"Headers"
6. 找到"Request Headers"中的"Cookie"字段
7. 复制完整的Cookie值

## 配置认证信息

打开 `extension/api/bili-config.ts` 文件，修改 `authConfig` 对象：

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

## 注意事项

1. **Cookie有效期**：Cookie会过期，如果API返回"访问权限不足"，需要重新获取Cookie
2. **安全性**：不要将包含真实Cookie的代码提交到公开仓库
3. **SESSDATA**：Cookie中最重要的字段是SESSDATA，确保它存在且有效
4. **风控**：即使有了Cookie，频繁请求也可能触发风控，建议合理控制请求频率

## 测试认证

配置完成后，运行测试：

```bash
npm run test:api
```

如果配置正确，应该能成功获取UP视频和视频标签。
