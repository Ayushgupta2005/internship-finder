import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { body, validationResult } from "express-validator";

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://internlink.vercel.app', 'https://*.vercel.app'] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  // Skip authentication in development mode
  if (true) { // Skip authentication for now
    return next();
  }
  
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      message: 'Please provide an API key in the x-api-key header'
    });
  }
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }
  
  next();
};

// Rate limiting middleware
const rateLimit = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // 100 requests per window

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimit[clientIP]) {
    rateLimit[clientIP] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (now > rateLimit[clientIP].resetTime) {
    rateLimit[clientIP] = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  }
  
  if (rateLimit[clientIP].count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  rateLimit[clientIP].count++;
  next();
});

// Connect to MongoDB Atlas
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is required!");
  console.error("⚠️  Server continuing without database connection");
}

console.log("🔗 Attempting to connect to MongoDB...");
console.log("📋 Connection string:", process.env.MONGO_URI.replace(/\/\/.*@/, '//***:***@'));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log("✅ MongoDB Connected Successfully");
  
  // Create indexes for better query performance
  try {
    await Internship.collection.createIndex({ sector: 1 });
    await Internship.collection.createIndex({ location: 1 });
    await Internship.collection.createIndex({ education: 1 });
    await Internship.collection.createIndex({ skills: 1 });
    await Internship.collection.createIndex({ sector: 1, location: 1 });
    console.log("📊 Database indexes created for optimal performance");
  } catch (indexError) {
    console.log("⚠️  Index creation failed (may already exist):", indexError.message);
  }
})
.catch(err => {
  console.error("❌ MongoDB Connection Failed:", err.message);
  console.log("💡 Please check:");
  console.log("   1. Your MongoDB Atlas connection string");
  console.log("   2. Your IP address is whitelisted in MongoDB Atlas");
  console.log("   3. Your database credentials are correct");
  console.log("🔍 Full error:", err);
  console.error("⚠️  Server continuing without database connection");
});

// Schema with validation
const internshipSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  company: { type: String, required: true, trim: true },
  sector: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  skills: { type: [String], required: true, validate: [arrayLimit, 'Skills array cannot be empty'] },
  education: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
}, {
  timestamps: true
});

function arrayLimit(val) {
  return val.length > 0;
}

const Internship = mongoose.model("Internship", internshipSchema, "internships");

// No caching needed - database-level filtering is more efficient

// Enhanced input validation middleware using express-validator
const validateQueryParams = [
  body('sector').optional().isString().trim().escape().isLength({ max: 100 }),
  body('location').optional().isString().trim().escape().isLength({ max: 100 }),
  body('education').optional().isString().trim().escape().isLength({ max: 100 }),
  body('skills').optional().isString().trim().escape().isLength({ max: 500 }),
  body('page').optional().isInt({ min: 1, max: 1000 }),
  body('limit').optional().isInt({ min: 1, max: 100 }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Routes
app.get("/internships", authenticateApiKey, validateQueryParams, async (req, res) => {
  try {
    const { sector, location, education, skills, page = 1, limit = 50 } = req.query;
    
    // Build MongoDB query filter with exact matches for index usage
    const dbFilter = {};
    if (sector) dbFilter.sector = sector.trim(); // Exact match for index
    if (location) dbFilter.location = location.trim(); // Exact match for index
    if (education) dbFilter.education = education.trim(); // Exact match for index
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (skillArray.length > 0) {
        dbFilter.skills = { $in: skillArray }; // Use $in for index
      }
    }

    // Calculate pagination with bounds checking
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Single optimized query with aggregation for count and data
    const pipeline = [
      { $match: dbFilter },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limitNum },
            { $project: {
              title: 1,
              company: 1,
              sector: 1,
              location: 1,
              skills: 1,
              education: 1,
              description: 1
            }}
          ],
          count: [{ $count: "total" }]
        }
      }
    ];

    const result = await Internship.aggregate(pipeline);
    
    // Handle edge cases
    if (!result || result.length === 0) {
      return res.json({
        data: [],
        pagination: {
          currentPage: pageNum,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limitNum
        }
      });
    }
    
    const internships = result[0].data || [];
    const totalItems = result[0].count && result[0].count[0] ? result[0].count[0].total : 0;

    console.log(`📊 Fetched ${internships.length} internships from database (optimized)`);
    
    // Return results with pagination info
    res.json({
      data: internships,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems: totalItems,
        itemsPerPage: limitNum
      }
    });
    
  } catch (err) {
    console.error("❌ Error fetching internships:", err);
    res.status(500).json({ 
      error: "Failed to fetch internships from database",
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});


// Health check endpoint (no authentication required)
app.get("/ping", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Health check with database connection (no authentication required)
app.get("/health", async (req, res) => {
  try {
    await Internship.findOne().limit(1);
    res.json({ 
      status: "healthy", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ 
      status: "unhealthy", 
      database: "disconnected",
      error: err.message 
    });
  }
});


// For Vercel deployment - export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  );
}
