const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use('/public', express.static('public'));
app.use('/uploads', express.static('public/uploads'));
app.use(express.static('.'));

// Serve index.html from root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve manage.html
app.get('/manage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

app.get('/manage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Data file path
const PORTFOLIO_FILE = path.join(dataDir, 'portfolio.json');

// Initialize portfolio data if not exists
if (!fs.existsSync(PORTFOLIO_FILE)) {
  const initialData = [
    {
      id: 1,
      title: '北京广益集思科技',
      description: '数字人直播运营与交付 · 78个直播间',
      mediaType: 'image',
      mediaUrl: 'https://picsum.photos/seed/project1/800/500',
      createdAt: '2024-01-01'
    },
    {
      id: 2,
      title: '波司登数字人直播间',
      description: '双店累计GMV 2856万 · AI转化效率76%',
      mediaType: 'image',
      mediaUrl: 'https://picsum.photos/seed/project2/800/500',
      createdAt: '2024-01-15'
    }
  ];
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(initialData, null, 2));
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1000) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Helper functions
function readPortfolio() {
  const data = fs.readFileSync(PORTFOLIO_FILE, 'utf-8');
  return JSON.parse(data);
}

function writePortfolio(data) {
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// GET all portfolio items
app.get('/api/portfolio', (req, res) => {
  console.log('GET /api/portfolio called');
  try {
    const portfolio = readPortfolio();
    console.log('Returning portfolio:', portfolio);
    res.json(portfolio);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: '读取失败' });
  }
});

// GET single portfolio item
app.get('/api/portfolio/:id', (req, res) => {
  try {
    const portfolio = readPortfolio();
    const item = portfolio.find(p => p.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: '未找到' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: '读取失败' });
  }
});

// POST new portfolio item
app.post('/api/portfolio', (req, res) => {
  try {
    const portfolio = readPortfolio();
    const newItem = {
      id: portfolio.length > 0 ? Math.max(...portfolio.map(p => p.id)) + 1 : 1,
      title: req.body.title || '',
      description: req.body.description || '',
      mediaType: req.body.mediaType || 'image',
      mediaUrl: req.body.mediaUrl || '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    portfolio.push(newItem);
    writePortfolio(portfolio);
    res.json(newItem);
  } catch (err) {
    res.status(500).json({ error: '创建失败' });
  }
});

// PUT update portfolio item
app.put('/api/portfolio/:id', (req, res) => {
  try {
    const portfolio = readPortfolio();
    const index = portfolio.findIndex(p => p.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: '未找到' });

    portfolio[index] = {
      ...portfolio[index],
      title: req.body.title ?? portfolio[index].title,
      description: req.body.description ?? portfolio[index].description,
      mediaType: req.body.mediaType ?? portfolio[index].mediaType,
      mediaUrl: req.body.mediaUrl ?? portfolio[index].mediaUrl
    };
    writePortfolio(portfolio);
    res.json(portfolio[index]);
  } catch (err) {
    res.status(500).json({ error: '更新失败' });
  }
});

// DELETE portfolio item
app.delete('/api/portfolio/:id', (req, res) => {
  try {
    let portfolio = readPortfolio();
    const item = portfolio.find(p => p.id === parseInt(req.params.id));
    if (!item) return res.status(404).json({ error: '未找到' });

    // Delete associated file if it's a local upload
    if (item.mediaUrl && item.mediaUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, 'public', item.mediaUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    portfolio = portfolio.filter(p => p.id !== parseInt(req.params.id));
    writePortfolio(portfolio);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除失败' });
  }
});

// POST file upload
app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: '文件过大，请选择100MB以下的文件' });
      }
      return res.status(400).json({ error: err.message || '上传失败' });
    }
    if (!req.file) return res.status(400).json({ error: '未选择文件' });

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    const fileUrl = '/uploads/' + req.file.filename;

    res.json({
      url: fileUrl,
      mediaType: mediaType,
      filename: req.file.originalname
    });
  });
});

// Serve manage.html
app.get('/manage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行中: http://localhost:${PORT}`);
  console.log(`后台管理: http://localhost:${PORT}/manage`);
});
