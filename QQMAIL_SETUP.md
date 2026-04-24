# QQ邮箱配置指南

## 步骤 1: 获取 QQ邮箱授权码

1. 登录 QQ邮箱 (mail.qq.com)
2. 点击右上角 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务** 部分
4. 点击 **开启** POP3/SMTP 服务
5. 验证身份（通过手机验证码）
6. 系统会生成一个 **授权码**，复制保存

## 步骤 2: 配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```
QQMAIL_HOST=smtp.qq.com
QQMAIL_PORT=587
QQMAIL_SECURE=false
QQMAIL_USER=你的QQ邮箱地址@qq.com
QQMAIL_PASS=你的授权码
```

例如：
```
QQMAIL_HOST=smtp.qq.com
QQMAIL_PORT=587
QQMAIL_SECURE=false
QQMAIL_USER=123456789@qq.com
QQMAIL_PASS=abcdefghijklmnop
```

## 步骤 3: 重启应用

保存 `.env` 文件后，重启开发服务器：

```bash
npm run dev
```

## 步骤 4: 使用邮箱验证

1. 访问 http://localhost:3000/studio/settings
2. 在 **邮箱设置** 部分输入你的邮箱地址
3. 点击 **发送验证邮件**
4. 检查邮箱（包括垃圾邮件文件夹）
5. 点击邮件中的验证链接
6. 验证完成！

## 常见问题

**Q: 收不到验证邮件？**
- 检查 `.env` 中的 QQMAIL_USER 和 QQMAIL_PASS 是否正确
- 检查垃圾邮件文件夹
- 确保 QQ邮箱已开启 POP3/SMTP 服务

**Q: 授权码在哪里找？**
- 登录 QQ邮箱 → 设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 → 生成授权码

**Q: 可以用其他邮箱吗？**
- 可以，但需要修改 QQMAIL_HOST 和 QQMAIL_PORT
- Gmail: smtp.gmail.com:587
- Outlook: smtp-mail.outlook.com:587
