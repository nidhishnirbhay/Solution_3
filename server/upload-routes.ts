import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Configure storage for uploads with better error handling
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const cwd = process.cwd();
      if (!cwd) {
        throw new Error('Current working directory is undefined');
      }
      const uploadsDir = path.join(cwd, 'public', 'uploads');
      // Ensure directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      cb(null, uploadsDir);
    } catch (error) {
      console.error('Error setting upload destination:', error);
      cb(error as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    try {
      if (!file || !file.originalname) {
        throw new Error('File or filename is undefined');
      }
      const uniqueSuffix = Date.now();
      const fileExt = path.extname(file.originalname);
      const filename = `${file.fieldname}-${uniqueSuffix}${fileExt}`;
      cb(null, filename);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error as Error, '');
    }
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
  try {
    // Route to serve files from the uploads directory with error handling
    const cwd = process.cwd();
    if (!cwd) {
      console.error('Error: Current working directory is undefined');
      return;
    }
    
    const uploadsPath = path.join(cwd, 'public', 'uploads');
    app.use('/uploads', express.static(uploadsPath));
    
    // API route to handle file uploads
    app.post('/api/upload', upload.single('file'), (req, res) => {
      try {
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
      } catch (error) {
        console.error('Error handling file upload:', error);
        return res.status(500).json({ error: 'Internal server error during file upload' });
      }
    });
  } catch (error) {
    console.error('Error registering upload routes:', error);
  }
}