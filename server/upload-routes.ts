import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now();
    const fileExt = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${fileExt}`);
  }
});

// Configure multer for file uploads
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

export function registerUploadRoutes(app: express.Express) {
  // Route to serve files from the uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  
  // API route to handle file uploads
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Return the URL path to the file
    const filePath = `/uploads/${req.file.filename}`;
    return res.status(200).json({ 
      url: filePath,
      originalName: req.file.originalname, 
      size: req.file.size 
    });
  });
}