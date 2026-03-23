const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch'); // 用于调用 AI 接口

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('./')); // 让服务器公开当前文件夹下的网页文件

// 初始化 SQLite 数据库
const db = new sqlite3.Database('./cats.db', (err) => {
    if (err) console.error(err.message);
    console.log('已连接到 SQLite 数据库。');
});

// 创建用户表
db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
)`);
 
// 1. 注册接口
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
        if (err) return res.status(400).json({ success: false, message: '用户名已存在' });
        res.json({ success: true, message: '注册成功' });
    });
});

// 2. 登录接口
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
        if (row) res.json({ success: true, message: '登录成功', username: row.username });
        else res.status(401).json({ success: false, message: '账号或密码错误' });
    });
});

// 3. AI 分析接口 (调用大模型 API)
app.post('/api/ai-analysis', async (req, res) => {
    const { mbti, catBreed } = req.body;
    
    // 👇 第1处修改：把单引号里的内容，换成你刚刚复制的 sk- 开头的 DeepSeek API Key
    const API_KEY = 'sk-944f0c6aa6db4116bfff253490361d57'; 
    // 👇 第2处修改：换成 DeepSeek 的官方接口地址
    const API_URL = 'https://api.deepseek.com/chat/completions';

    const prompt = `作为一个懂心理学和猫咪行为学的专家，用户刚刚测出自己的 MBTI 是 ${mbti}，最匹配的猫咪是 ${catBreed}。请用幽默、治愈的语气，写一段约 150 字的专属解析，告诉ta为什么ta的灵魂和这只猫如此契合。`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                // 👇 第3处修改：指定使用 DeepSeek 的对话模型
                model: "deepseek-chat",
                messages: [{ role: "user", content: prompt }]
            })
        });
        
        const data = await response.json();
        const aiMessage = data.choices[0].message.content; 
        res.json({ success: true, analysis: aiMessage });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'AI 脑力耗尽，请稍后再试喵~' });
    }
});

// 设置动态端口：优先使用云平台分配的端口，如果在本地则默认使用 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 后厨服务器已成功启动！当前监听端口：${PORT}`);
});