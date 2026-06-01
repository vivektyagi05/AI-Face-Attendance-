/**
 * src/services/aiService.js
 * Phase 2 – HTTP client for the Python Face Recognition AI service.
 *
 * Responsibilities:
 *   1. extractEmbeddings  – send registration images → get 128-d vectors back
 *   2. recognizeFaces     – send classroom image + DB embeddings → get matches back
 *   3. healthCheck        – probe the AI service
 *
 * All calls use multipart/form-data for images and JSON for embedding payloads.
 */

const axios    = require('axios');
const FormData = require('form-data');
const fs       = require('fs');
const path     = require('path');
const logger   = require('../utils/logger');
const ApiError = require('../utils/ApiError');

// ── Axios instance ─────────────────────────────────────────────
const AI_BASE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_API_KEY  = process.env.AI_SERVICE_API_KEY || '';
const TIMEOUT_MS  = parseInt(process.env.AI_TIMEOUT_MS) || 60_000;

const aiClient = axios.create({
  baseURL : AI_BASE_URL,
  timeout : TIMEOUT_MS,
  headers : {
    'X-AI-Service-Key': AI_API_KEY,
  },
});

// ── Retry helper (simple exponential back-off, 2 attempts) ────
const withRetry = async (fn, attempts = 2) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      const wait = 1000 * (i + 1);
      logger.warn(`AI service call failed (attempt ${i + 1}/${attempts}), retrying in ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 1. EXTRACT FACE EMBEDDINGS (student registration)
// ─────────────────────────────────────────────────────────────
/**
 * Send 3–5 registration images to AI service, receive 128-d embedding vectors.
 *
 * @param  {string[]} imagePaths  Absolute paths to uploaded image files
 * @param  {string}   studentId   MongoDB _id of student (for logging)
 * @returns {Promise<{
 *   success : boolean,
 *   embeddings: number[][],   // array of 128-dim vectors
 *   count   : number,
 *   message?: string
 * }>}
 */
const extractEmbeddings = async (imagePaths, studentId) => {
  if (!imagePaths || imagePaths.length === 0) {
    throw ApiError.badRequest('No image paths provided for embedding extraction');
  }

  return withRetry(async () => {
    const form = new FormData();
    form.append('student_id', studentId.toString());

    for (const imgPath of imagePaths) {
      if (!fs.existsSync(imgPath)) {
        throw ApiError.badRequest(`Image file not found: ${path.basename(imgPath)}`);
      }
      form.append('images', fs.createReadStream(imgPath), {
        filename   : path.basename(imgPath),
        contentType: 'image/jpeg',
      });
    }

    try {
      const response = await aiClient.post('/api/face/extract-embeddings', form, {
        headers: {
          ...form.getHeaders(),
          'X-AI-Service-Key': AI_API_KEY,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      logger.info(`AI extractEmbeddings: student=${studentId}, count=${response.data.count}`);
      return response.data;
    } catch (err) {
      handleAiError(err, 'extractEmbeddings');
    }
  });
};

// ─────────────────────────────────────────────────────────────
// 2. RECOGNIZE FACES IN CLASSROOM IMAGE
// ─────────────────────────────────────────────────────────────
/**
 * Send classroom image + all class embeddings to AI service.
 * AI detects every face, computes embeddings, and matches against known students.
 *
 * @param  {string}   classroomImagePath  Absolute path to the uploaded classroom image
 * @param  {Array<{
 *   studentId     : string,   // MongoDB _id
 *   rollNumber    : string,
 *   studentName   : string,
 *   embeddings    : number[][]  // all stored embedding vectors for this student
 * }>}              studentEmbeddings
 * @param  {number}  threshold  Cosine-distance threshold (default 0.55)
 *
 * @returns {Promise<{
 *   success        : boolean,
 *   matches        : Array<{
 *     studentId    : string,
 *     rollNumber   : string,
 *     studentName  : string,
 *     confidence   : number,   // 0–1
 *     faceLocation : number[]  // [top, right, bottom, left]
 *   }>,
 *   unknownFaces   : number,
 *   totalFaces     : number,
 *   processingMs   : number
 * }>}
 */
const recognizeFaces = async (classroomImagePath, studentEmbeddings, threshold = 0.55) => {
  if (!fs.existsSync(classroomImagePath)) {
    throw ApiError.badRequest('Classroom image file not found');
  }
  if (!studentEmbeddings || studentEmbeddings.length === 0) {
    throw ApiError.badRequest(
      'No student embeddings provided – register student faces first'
    );
  }

  return withRetry(async () => {
    const form = new FormData();

    // Attach the classroom image
    form.append('classroom_image', fs.createReadStream(classroomImagePath), {
      filename   : path.basename(classroomImagePath),
      contentType: 'image/jpeg',
    });

    // Attach embeddings as JSON string (avoid multiple form fields)
    form.append('student_embeddings', JSON.stringify(studentEmbeddings));
    form.append('threshold', threshold.toString());

    try {
      const response = await aiClient.post('/api/face/recognize', form, {
        headers: {
          ...form.getHeaders(),
          'X-AI-Service-Key': AI_API_KEY,
        },
        maxBodyLength    : Infinity,
        maxContentLength : Infinity,
      });

      logger.info(
        `AI recognizeFaces: totalFaces=${response.data.totalFaces}, ` +
        `matched=${response.data.matches?.length}, unknown=${response.data.unknownFaces}`
      );
      return response.data;
    } catch (err) {
      handleAiError(err, 'recognizeFaces');
    }
  });
};

// ─────────────────────────────────────────────────────────────
// 3. HEALTH CHECK
// ─────────────────────────────────────────────────────────────
const healthCheck = async () => {
  try {
    const res = await aiClient.get('/health', { timeout: 5000 });
    return { available: true, ...res.data };
  } catch {
    return { available: false, message: 'AI service unreachable' };
  }
};

// ─────────────────────────────────────────────────────────────
// Internal error normaliser
// ─────────────────────────────────────────────────────────────
const handleAiError = (err, operation) => {
  if (err.response) {
    // AI service returned an error response
    const msg  = err.response.data?.message || 'AI service error';
    const code = err.response.status;
    logger.error(`AI ${operation} failed [${code}]: ${msg}`);
    throw new ApiError(code >= 500 ? 502 : code, `AI service: ${msg}`);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    logger.error(`AI service unreachable (${operation}): ${err.message}`);
    throw ApiError.internal('Face recognition service is currently unavailable');
  }
  if (err.code === 'ECONNABORTED') {
    logger.error(`AI service timeout (${operation})`);
    throw ApiError.internal('Face recognition service timed out – please try again');
  }
  logger.error(`AI ${operation} unexpected error: ${err.message}`);
  throw ApiError.internal(`Face recognition service error: ${err.message}`);
};

module.exports = { extractEmbeddings, recognizeFaces, healthCheck };
