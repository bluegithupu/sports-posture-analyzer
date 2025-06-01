const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const cors = require('cors');

const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai');

const app = express();

// --- 配置 CORS ---
const allowedOrigins = [
    'http://localhost:5173', // 前端开发环境
    'http://localhost:5002', // 后端自己
    'https://sports-posture-analyzer-kooj.vercel.app', // Vercel 前端
    // 如果有其他允许的域名，在这里添加
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // 如果需要携带 cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的方法
    allowedHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
}));
// --- CORS 配置结束 ---

const port = process.env.PORT || 5002; // Vercel sets PORT env variable

// Configuration for Multer (file uploads)
const UPLOAD_DIR = '/tmp/uploads_nodejs'; // Vercel allows writing to /tmp
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB, Vercel Hobby limit is 4.5MB

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const extension = path.extname(file.originalname);
        cb(null, `${uuidv4()}${extension}`); // Unique filename
    }
});

const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video files are allowed.'), false);
        }
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let ai;

if (GEMINI_API_KEY) {
    ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        // Add additional configuration if needed
    });
    console.log("Google GenAI SDK initialized.");
} else {
    console.warn("GEMINI_API_KEY is not set. AI analysis features will be disabled.");
}

const analysisJobs = {};

async function performAnalysis(jobId, localFilePath, originalFilename, mimeType) {
    if (!ai) {
        analysisJobs[jobId] = { status: 'failed', error: 'Google GenAI SDK not initialized on server.' };
        return;
    }

    try {
        analysisJobs[jobId] = { status: 'processing', message: 'Uploading file to Google GenAI...' };
        console.log(`[Job ${jobId}] Uploading file: ${localFilePath}`);

        // Upload file using the latest API
        const uploadedFile = await ai.files.upload({
            file: localFilePath,
            config: {
                mimeType: mimeType,
                displayName: originalFilename
            },
        });

        console.log(`[Job ${jobId}] File uploaded. URI: ${uploadedFile.uri}`);
        analysisJobs[jobId] = { status: 'processing', message: 'File uploaded. Waiting for processing...' };

        // Wait for file to be processed
        let fileInfo = uploadedFile;
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max wait

        while (fileInfo.state !== 'ACTIVE' && attempts < maxAttempts) {
            console.log(`[Job ${jobId}] File processing... State: ${fileInfo.state}, attempt: ${attempts + 1}`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

            try {
                // Use the correct method to get file info
                fileInfo = await ai.files.get({ name: uploadedFile.name });
            } catch (error) {
                console.log(`[Job ${jobId}] Error getting file status:`, error.message);
                // If we can't get status, assume it's still processing and continue
                attempts++;
                continue;
            }

            attempts++;
        }

        if (fileInfo.state !== 'ACTIVE') {
            // If we can't confirm ACTIVE state, try to proceed anyway
            console.log(`[Job ${jobId}] File state uncertain (${fileInfo.state}), attempting to proceed...`);
            fileInfo = uploadedFile; // Use original upload info
        } else {
            console.log(`[Job ${jobId}] File is ready. URI: ${fileInfo.uri}`);
        }

        analysisJobs[jobId] = { status: 'processing', message: 'File ready. Starting AI analysis...' };

        const prompt = `
你是一位顶级的运动医学专家和体态教练。

附件是一个用户的运动视频。请仔细分析视频中用户的运动姿态和动作模式。
请在报告中包含以下内容：
1. 观察到的主要动态体态问题（例如，跑步时的不良着地、深蹲时的膝盖内扣、投掷时不正确的身体序列等）。请列出2-3个主要问题。
2. 详细说明每个已识别问题对运动表现、日常生活和长期健康的潜在负面影响，特别关注其在动态运动中的表现。
3. 针对每个已识别问题，提供具体、可操作的纠正建议，包括技术提示和至少1-2个推荐的动态练习或纠正性训练。
4. 对视频中整体动作流畅性、协调性和可能存在的代偿模式进行评估。

请以清晰、专业且易于理解的中文撰写此报告。
如果视频质量不足以进行详细分析，或者姿态和动作看起来相对标准，请也明确指出。
如果提供的视频不适合进行姿态分析（例如，视频模糊、非人物运动、或无法判断动作），请说明无法分析并解释原因。
请注意：视频的时长较短，请基于可见内容进行分析。
        `.trim();

        console.log(`[Job ${jobId}] Sending request to Gemini model...`);

        // Use only the working models
        const modelNames = [
            "gemini-2.5-flash-preview-05-20"
        ];

        let response;
        let lastError;

        for (const modelName of modelNames) {
            try {
                console.log(`[Job ${jobId}] Trying model: ${modelName}`);

                response = await ai.models.generateContent({
                    model: modelName,
                    contents: createUserContent([
                        createPartFromUri(fileInfo.uri, fileInfo.mimeType),
                        prompt,
                    ]),
                });

                console.log(`[Job ${jobId}] Successfully used model: ${modelName}`);
                break;

            } catch (error) {
                console.log(`[Job ${jobId}] Model ${modelName} failed:`, error.message);
                lastError = error;

                // If quota exceeded, wait and retry once
                if (error.message && error.message.includes('429')) {
                    console.log(`[Job ${jobId}] Quota exceeded, waiting 30 seconds before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 30000));

                    try {
                        response = await ai.models.generateContent({
                            model: modelName,
                            contents: createUserContent([
                                createPartFromUri(fileInfo.uri, fileInfo.mimeType),
                                prompt,
                            ]),
                        });
                        console.log(`[Job ${jobId}] Successfully used model after retry: ${modelName}`);
                        break;
                    } catch (retryError) {
                        console.log(`[Job ${jobId}] Retry also failed for ${modelName}:`, retryError.message);
                        lastError = retryError;
                    }
                }

                continue;
            }
        }

        if (!response) {
            throw lastError || new Error('All models failed');
        }

        const analysisText = response.text;
        console.log(`[Job ${jobId}] Analysis complete.`);
        analysisJobs[jobId] = { status: 'completed', report: analysisText };

    } catch (error) {
        console.error(`[Job ${jobId}] Analysis error:`, error);

        // Provide more detailed error information
        let errorMessage = error.message || 'An unknown error occurred during analysis.';
        if (error.message && error.message.includes('fetch failed')) {
            errorMessage = 'Network connection failed. Please check your internet connection and API key.';
        } else if (error.message && error.message.includes('429')) {
            errorMessage = 'API quota exceeded. Please wait a moment and try again, or check your billing settings.';
        } else if (error.message && error.message.includes('FAILED_PRECONDITION')) {
            errorMessage = 'File processing failed. Please try uploading the file again.';
        }

        analysisJobs[jobId] = { status: 'failed', error: errorMessage };
    }
}

// Basic route
app.get('/', (req, res) => {
    res.send('Backend for Sports Posture Analyzer is running (Node.js with Google GenAI Latest)!');
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Node.js backend API with Google GenAI Latest' });
});

// File Upload API
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'API key not configured on the server.' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded or file type was invalid.' });
    res.status(201).json({
        message: 'File uploaded successfully',
        file_id: req.file.filename,
        original_filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        saved_path_debug: req.file.path
    });
}, (error, req, res, next) => {
    // Custom error handler for multer errors
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: `File upload error: ${error.message}` });
    } else if (error) {
        return res.status(400).json({ error: error.message }); // Handles 'Invalid file type'
    }
    next();
});

app.post('/api/analyze', (req, res) => {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini API key not configured.' });
    const { file_id, original_filename, mimetype } = req.body;
    if (!file_id || !original_filename || !mimetype) return res.status(400).json({ error: 'Missing file_id, original_filename, or mimetype.' });
    const localFilePath = path.join(UPLOAD_DIR, file_id);
    if (!fs.existsSync(localFilePath)) return res.status(404).json({ error: `File not found: ${file_id}` });
    const jobId = uuidv4();
    analysisJobs[jobId] = { status: 'pending', message: 'Analysis request received.' };
    performAnalysis(jobId, localFilePath, original_filename, mimetype);
    res.status(202).json({ message: "Analysis started.", job_id: jobId });
});

app.get('/api/results/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = analysisJobs[jobId];
    if (!job) return res.status(404).json({ error: 'Job ID not found.' });
    res.status(200).json(job);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
    console.log(`Upload directory: ${UPLOAD_DIR}`);
    if (!GEMINI_API_KEY) {
        console.warn('Warning: GEMINI_API_KEY environment variable is not set.');
    } else {
        console.log('GEMINI_API_KEY is configured.');
    }
}); 