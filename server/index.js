import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import ExcelJS from 'exceljs';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const uploadsDir = path.join(rootDir, 'uploads');
const dataDir = path.join(rootDir, 'data');
const fixturesDir = path.join(dataDir, 'fixtures');
const dbPath = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(dataDir, 'db.json');
const backupDir = process.env.DATA_BACKUP_DIR
  ? path.resolve(process.env.DATA_BACKUP_DIR)
  : path.join(dataDir, 'backups');
const currentSchemaVersion = 2;

const app = express();
const port = Number(process.env.PORT || 3100);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const storageDriver = (process.env.STORAGE_DRIVER || 'json').toLowerCase();
if (storageDriver !== 'json') {
  throw new Error(`Unsupported STORAGE_DRIVER "${storageDriver}". The current release supports "json" only.`);
}
const demoLanguageSwitchEnabled = process.env.DEMO_LANGUAGE_SWITCH === 'true' || process.env.NODE_ENV !== 'production';
const defaultSettings = {
  demoLanguage: 'en',
  siteName: 'Open Sales Assistant',
  welcomeText: 'Hi, I am your sales advisor. You can ask about product fit, schedule, pricing, process, and next steps.',
  serviceName: 'Alex',
  servicePhone: '',
  salesPersona: 'Friendly, professional, specific, and careful with promises. Reply like an experienced team sales advisor.',
  contactHint: 'If you want, I can help you compare the right option, schedule, and next steps.',
  safetyRules: 'Do not guarantee passing, certification, employment, income, or outcomes. Pricing, policy, and schedule must follow the team latest confirmed information.'
};
const adminSessionHours = 12;

await fs.mkdir(uploadsDir, { recursive: true });
await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(path.dirname(dbPath), { recursive: true });
await fs.mkdir(backupDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^\w\u4e00-\u9fa5.-]+/g, '-');
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  }),
  limits: { fileSize: 30 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(publicDir));

function now() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readDb() {
  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    const { db, migrated } = migrateDb(JSON.parse(raw));
    if (migrated) {
      await createBackup('before-migration');
      await writeDb(db, { skipBackup: true });
    }
    return db;
  } catch (error) {
    if (error.code === 'ENOENT') return migrateDb({}).db;
    throw error;
  }
}

function withDefaults(db) {
  return {
    ...db,
    schemaVersion: Number(db.schemaVersion || 0) || currentSchemaVersion,
    materials: Array.isArray(db.materials) ? db.materials : [],
    knowledge: db.knowledge || null,
    chats: Array.isArray(db.chats) ? db.chats : [],
    students: Array.isArray(db.students) ? db.students : [],
    studentSessions: Array.isArray(db.studentSessions) ? db.studentSessions : [],
    courses: Array.isArray(db.courses) ? db.courses : [],
    courseSchedules: Array.isArray(db.courseSchedules) ? db.courseSchedules : [],
    certificates: Array.isArray(db.certificates) ? db.certificates : [],
    followUps: Array.isArray(db.followUps) ? db.followUps : [],
    aiAnalysis: Array.isArray(db.aiAnalysis) ? db.aiAnalysis : [],
    knowledgeSuggestions: Array.isArray(db.knowledgeSuggestions) ? db.knowledgeSuggestions : [],
    operationLogs: Array.isArray(db.operationLogs) ? db.operationLogs : [],
    adminUsers: Array.isArray(db.adminUsers) ? db.adminUsers : [],
    adminSessions: Array.isArray(db.adminSessions) ? db.adminSessions : [],
    settings: { ...defaultSettings, ...(db.settings || {}) }
  };
}

function migrateDb(input = {}) {
  const originalVersion = Number(input.schemaVersion || 0) || 1;
  let db = withDefaults({ ...input, schemaVersion: originalVersion });
  let migrated = originalVersion !== currentSchemaVersion || !input.schemaVersion;

  if (Array.isArray(input.students)) {
    migrated = migrated || input.students.some((student) => !student.userCode || !student.intentLevel);
  }

  if (input.knowledge?.salesPlaybook) {
    migrated = migrated || input.knowledge.salesPlaybook.some((item) => typeof item === 'string');
  }

  db.students = db.students.map((student) => ({
    ...student,
    name: student.name || '',
    phone: student.phone || '',
    age: student.age || '',
    gender: student.gender || '',
    idCard: student.idCard || '',
    currentStatus: student.currentStatus || '',
    profileSummary: student.profileSummary || '',
    nextAction: student.nextAction || '',
    avatar: student.avatar || '',
    userCode: student.userCode || userCode(),
    intentLevel: student.intentLevel || 'unknown',
    salesId: student.salesId || '',
    referrerCode: student.referrerCode || ''
  }));

  if (db.knowledge) {
    db.knowledge = {
      ...db.knowledge,
      overview: db.knowledge.overview || '',
      salesPlaybook: Array.isArray(db.knowledge.salesPlaybook)
        ? db.knowledge.salesPlaybook.map(normalizePlaybookItem).filter((item) => item.content)
        : [],
      faq: Array.isArray(db.knowledge.faq)
        ? db.knowledge.faq.map((item) => ({
          ...item,
          question: normalizeText(item.question || ''),
          answer: normalizeText(item.answer || ''),
          conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
        })).filter((item) => item.question || item.answer)
        : [],
      concerns: Array.isArray(db.knowledge.concerns)
        ? db.knowledge.concerns.map((item) => ({
          ...item,
          concern: normalizeText(item.concern || ''),
          response: normalizeText(item.response || ''),
          conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
        })).filter((item) => item.concern || item.response)
        : [],
      tags: Array.isArray(db.knowledge.tags) ? db.knowledge.tags.filter(Boolean) : [],
      imageCards: Array.isArray(db.knowledge.imageCards) ? db.knowledge.imageCards : []
    };
  }

  db.knowledgeSuggestions = db.knowledgeSuggestions.map((item) => ({
    ...item,
    status: item.status || 'pending',
    conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
  }));

  db.schemaVersion = currentSchemaVersion;
  return { db, migrated };
}

function backupStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function createBackup(reason = 'manual') {
  if (!(await fileExists(dbPath))) return null;
  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${backupStamp()}-${reason}.json`);
  await fs.copyFile(dbPath, backupPath);
  return backupPath;
}

async function ensureDailyBackup() {
  if (!(await fileExists(dbPath))) return null;
  await fs.mkdir(backupDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const markerPath = path.join(backupDir, `${date}-daily.json`);
  if (await fileExists(markerPath)) return markerPath;
  await fs.copyFile(dbPath, markerPath);
  return markerPath;
}

async function writeDb(db, options = {}) {
  const { db: nextDb } = migrateDb(db);
  if (!options.skipBackup) await ensureDailyBackup();
  const tempPath = `${dbPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextDb, null, 2), 'utf8');
  await fs.rename(tempPath, dbPath);
}

function normalizeDemoLanguage(lang = 'en') {
  if (lang === 'zh' || lang === 'zh-CN') return 'zh-CN';
  return 'en';
}

async function loadDemoFixture(lang = 'en') {
  const demoLanguage = normalizeDemoLanguage(lang);
  const fixturePath = path.join(fixturesDir, `demo.${demoLanguage}.json`);
  const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
  fixture.settings = {
    ...(fixture.settings || {}),
    demoLanguage
  };
  return fixture;
}

function preserveAdminState(nextDb, currentDb) {
  return {
    ...nextDb,
    adminUsers: Array.isArray(currentDb.adminUsers) ? currentDb.adminUsers : nextDb.adminUsers,
    adminSessions: Array.isArray(currentDb.adminSessions) ? currentDb.adminSessions : [],
    operationLogs: Array.isArray(currentDb.operationLogs) ? currentDb.operationLogs : []
  };
}

function addOperationLog(db, req, action, target = {}) {
  const admin = req.adminUser || {};
  const log = {
    id: newId('oplog'),
    action,
    targetType: target.type || '',
    targetId: target.id || '',
    targetLabel: normalizeText(target.label || ''),
    summary: normalizeText(target.summary || ''),
    actorId: admin.id || '',
    actorName: admin.realName || admin.username || 'System',
    createdAt: now()
  };
  db.operationLogs = [log, ...(Array.isArray(db.operationLogs) ? db.operationLogs : [])].slice(0, 200);
  return log;
}

function shortLog(text = '', max = 140) {
  const clean = normalizeText(text);
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function suggestionTitleForLog(suggestion = {}) {
  if (suggestion.type === 'playbook') return suggestion.title || 'Sales script suggestion';
  if (suggestion.type === 'faq') return suggestion.question || 'FAQ suggestion';
  if (suggestion.type === 'concern') return suggestion.concern || 'Objection suggestion';
  return suggestion.sourceMaterialTitle || 'AI suggestion';
}

function suggestionField(body, suggestion, name) {
  const value = Object.hasOwn(body, name) ? body[name] : suggestion[name];
  return normalizeText(value || '');
}

function acceptedKnowledgeItem(suggestion, body, playbookIndex = 0) {
  if (suggestion.type === 'playbook') {
    const content = suggestionField(body, suggestion, 'content');
    if (!content) throw new Error('话术内容不能为空');
    return normalizePlaybookItem({
      title: suggestionField(body, suggestion, 'title'),
      scenario: suggestionField(body, suggestion, 'scenario'),
      content,
      sourceMaterialId: suggestion.sourceMaterialId,
      sourceMaterialTitle: suggestion.sourceMaterialTitle,
      conflicts: []
    }, playbookIndex);
  }

  if (suggestion.type === 'faq') {
    const question = suggestionField(body, suggestion, 'question');
    const answer = suggestionField(body, suggestion, 'answer');
    if (!question || !answer) throw new Error('问题和标准答复不能为空');
    return {
      question,
      answer,
      sourceMaterialId: suggestion.sourceMaterialId,
      sourceMaterialTitle: suggestion.sourceMaterialTitle,
      conflicts: []
    };
  }

  if (suggestion.type === 'concern') {
    const concern = suggestionField(body, suggestion, 'concern');
    const response = suggestionField(body, suggestion, 'response');
    if (!concern || !response) throw new Error('顾虑和应对话术不能为空');
    return {
      concern,
      response,
      sourceMaterialId: suggestion.sourceMaterialId,
      sourceMaterialTitle: suggestion.sourceMaterialTitle,
      conflicts: []
    };
  }

  throw new Error('不支持的建议类型');
}

function normalizeText(text = '') {
  return String(text)
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':');
  if (!salt || !hash) return false;
  const inputHash = crypto.scryptSync(String(password), salt, 64);
  const storedBuffer = Buffer.from(hash, 'hex');
  return storedBuffer.length === inputHash.length && crypto.timingSafeEqual(storedBuffer, inputHash);
}

function randomPassword(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function userCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function publicStudent(student) {
  if (!student) return null;
  return {
    id: student.id,
    nickname: student.nickname,
    name: student.name || '',
    phone: student.phone || '',
    age: student.age || '',
    gender: student.gender || '',
    idCard: student.idCard || '',
    currentStatus: student.currentStatus || '',
    nextAction: student.nextAction || '',
    profileSummary: student.profileSummary || '',
    avatar: student.avatar || '',
    userCode: student.userCode,
    intentLevel: student.intentLevel || 'unknown',
    createdAt: student.createdAt,
    lastLoginAt: student.lastLoginAt || ''
  };
}

async function ensureInitialAdmin() {
  const db = await readDb();
  if (db.adminUsers.length) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  db.adminUsers.push({
    id: newId('adm'),
    username,
    passwordHash: hashPassword(password),
    realName: '系统管理员',
    role: 'super_admin',
    status: 'active',
    createdAt: now()
  });
  await writeDb(db);
}

function sessionExpiresAt() {
  return new Date(Date.now() + adminSessionHours * 60 * 60 * 1000).toISOString();
}

function studentSessionExpiresAt() {
  return new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
}

async function requireAdmin(req, res, next) {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: '请先登录后台' });
      return;
    }
    const db = await readDb();
    const session = db.adminSessions.find((item) => item.token === token && item.expiresAt > now());
    if (!session) {
      res.status(401).json({ error: '登录已过期，请重新登录' });
      return;
    }
    const user = db.adminUsers.find((item) => item.id === session.adminUserId && item.status === 'active');
    if (!user) {
      res.status(401).json({ error: '账号不可用' });
      return;
    }
    req.adminUser = { id: user.id, username: user.username, realName: user.realName, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

async function requireStudent(req, res, next) {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      res.status(401).json({ error: '请先输入昵称进入咨询' });
      return;
    }
    const db = await readDb();
    const session = db.studentSessions.find((item) => item.token === token && item.expiresAt > now());
    if (!session) {
      res.status(401).json({ error: '登录已过期，请重新进入咨询' });
      return;
    }
    const student = db.students.find((item) => item.id === session.studentId);
    if (!student) {
      res.status(401).json({ error: '学员不存在' });
      return;
    }
    req.student = student;
    next();
  } catch (error) {
    next(error);
  }
}

function extOf(fileName) {
  return path.extname(fileName || '').toLowerCase();
}

function isImage(fileName, mime = '') {
  return mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(extOf(fileName));
}

async function extractTextFromFile(file) {
  const ext = extOf(file.originalname);
  const buffer = await fs.readFile(file.path);

  if (isImage(file.originalname, file.mimetype)) {
    return '';
  }

  if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
    return normalizeText(buffer.toString('utf8'));
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value);
  }

  if (ext === '.pdf') {
    const result = await pdfParse(buffer);
    return normalizeText(result.text);
  }

  if (['.xlsx', '.xls'].includes(ext)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const rows = [];
    workbook.eachSheet((sheet) => {
      rows.push(`【${sheet.name}】`);
      sheet.eachRow((row) => {
        const values = row.values.slice(1).map((value) => {
          if (value == null) return '';
          if (typeof value === 'object') return value.text || value.result || JSON.stringify(value);
          return String(value);
        });
        rows.push(values.join(','));
      });
    });
    return normalizeText(rows.join('\n'));
  }

  return '';
}

async function parseCertificateFile(file) {
  const ext = extOf(file.originalname);
  const buffer = await fs.readFile(file.path);
  const normalizeRow = (row) => ({
    name: normalizeText(row.name || row['姓名'] || row['学员姓名'] || ''),
    phone: normalizeText(row.phone || row['手机号'] || row['电话'] || ''),
    courseTitle: normalizeText(row.courseTitle || row['项目'] || row['项目名称'] || row['课程'] || row['课程名称'] || ''),
    certNo: normalizeText(row.certNo || row['证书编号'] || row['编号'] || ''),
    status: normalizeText(row.status || row['状态'] || row['证书状态'] || '办理中'),
    issuedAt: normalizeText(row.issuedAt || row['发放时间'] || row['结业时间'] || '')
  });

  if (['.xlsx', '.xls'].includes(ext)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const rows = [];
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];
    const headers = [];
    sheet.getRow(1).eachCell((cell, col) => {
      headers[col] = normalizeText(cell.value || '');
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = {};
      row.eachCell((cell, col) => {
        raw[headers[col] || `col${col}`] = cell.value?.text || cell.value?.result || cell.value || '';
      });
      rows.push(normalizeRow(raw));
    });
    return rows.filter((row) => row.name || row.phone || row.certNo);
  }

  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((item) => normalizeText(item));
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const raw = {};
    headers.forEach((header, index) => {
      raw[header] = cells[index] || '';
    });
    return normalizeRow(raw);
  }).filter((row) => row.name || row.phone || row.certNo);
}

async function fileToDataUrl(filePath, mimeType) {
  const buffer = await fs.readFile(filePath);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function stripJsonFence(content) {
  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function tryParseJson(content, fallback) {
  try {
    return JSON.parse(stripJsonFence(content));
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function defaultTextModel() {
  return 'kimi-k2.6';
}

function defaultVisionModel() {
  return 'kimi-k2.6';
}

async function callAi(messages, { model, temperature = 0.4 } = {}) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey || apiKey.includes('请替换')) {
    return null;
  }

  const baseUrl = process.env.AI_BASE_URL || 'https://api.moonshot.cn/v1';
  const provider = process.env.AI_PROVIDER || '';
  const effectiveTemperature = provider === 'kimi' ? 0.6 : temperature;
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || process.env.AI_TEXT_MODEL || defaultTextModel(),
      messages,
      temperature: effectiveTemperature,
      ...(provider === 'kimi' ? { thinking: { type: 'disabled' } } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API 调用失败：${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function fallbackMaterialAnalysis(material) {
  const text = normalizeText(material.content || material.extractedText || material.description || '');
  const compact = text.slice(0, 600);
  return {
    summary: material.type === 'image' ? `图片素材：${material.title}` : compact || `素材：${material.title}`,
    sellingPoints: compact ? compact.split(/[。！？\n]/).filter(Boolean).slice(0, 4) : [`可作为销售咨询中的辅助素材：${material.title}`],
    faq: [],
    concerns: [],
    imageUsage: material.type === 'image' ? '适合在介绍产品环境、证书样式、服务场景或团队形象时展示。' : ''
  };
}

async function analyzeMaterial(material) {
  if (material.type === 'image' && material.filePath) {
    const dataUrl = await fileToDataUrl(path.join(rootDir, material.filePath), material.mimeType || 'image/png');
    const content = await callAi([
      {
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张图片如何用于团队销售咨询。输出 JSON，字段包括 summary、sellingPoints、imageUsage、suitableQuestions。' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ], { model: process.env.AI_VISION_MODEL || defaultVisionModel(), temperature: 0.2 });

    if (content) {
      return tryParseJson(content, fallbackMaterialAnalysis(material));
    }
  }

  const sourceText = normalizeText([material.title, material.description, material.content, material.extractedText].filter(Boolean).join('\n\n'));
  const content = await callAi([
    {
      role: 'system',
      content: '你是团队销售知识库专家，擅长把资料整理为销售可用话术。只输出合法 JSON。'
    },
    {
      role: 'user',
      content: `请分析以下素材，生成销售知识库片段。JSON 字段：summary:string, sellingPoints:string[], faq:{question:string,answer:string}[], concerns:{concern:string,response:string}[], tags:string[]。\n\n素材标题：${material.title}\n素材内容：\n${sourceText.slice(0, 12000)}`
    }
  ], { model: process.env.AI_TEXT_MODEL || defaultTextModel(), temperature: 0.25 });

  if (!content) return fallbackMaterialAnalysis(material);
  return tryParseJson(content, fallbackMaterialAnalysis(material));
}

function buildFallbackKnowledge(materials, settings = defaultSettings) {
  const textMaterials = materials.filter((item) => item.type !== 'image');
  const imageMaterials = materials.filter((item) => item.type === 'image');
  const summaries = materials.map((item) => item.analysis?.summary || item.extractedText || item.content || item.title).filter(Boolean);
  return {
    generatedAt: now(),
    provider: process.env.AI_API_KEY ? 'ai' : 'local-fallback',
    siteName: settings.siteName,
    overview: summaries.slice(0, 6).join('\n').slice(0, 1200) || '暂无知识库内容，请先上传资料或输入文字素材。',
    salesPlaybook: textMaterials.flatMap((item) => item.analysis?.sellingPoints || []).slice(0, 12),
    faq: textMaterials.flatMap((item) => item.analysis?.faq || []).slice(0, 20),
    concerns: textMaterials.flatMap((item) => item.analysis?.concerns || []).slice(0, 20),
    imageCards: imageMaterials.map((item) => ({
      id: item.id,
      title: item.title,
      url: item.url,
      summary: item.analysis?.summary || item.description || item.title,
      usage: item.analysis?.imageUsage || '可在相关咨询中作为辅助展示图片。'
    })),
    sourceMaterialIds: materials.map((item) => item.id)
  };
}

function normalizePlaybookItem(item, index = 0) {
  if (typeof item === 'string') {
    return {
      id: newId('pb'),
      title: `销售话术 ${index + 1}`,
      scenario: '',
      content: normalizeText(item),
      enabled: true,
      conflicts: []
    };
  }
  return {
    id: item.id || newId('pb'),
    title: normalizeText(item.title || `销售话术 ${index + 1}`),
    scenario: normalizeText(item.scenario || ''),
    content: normalizeText(item.content || item.text || ''),
    enabled: item.enabled !== false,
    sourceMaterialId: item.sourceMaterialId || '',
    sourceMaterialTitle: item.sourceMaterialTitle || '',
    conflicts: Array.isArray(item.conflicts) ? item.conflicts : []
  };
}

function playbookText(item) {
  return typeof item === 'string'
    ? item
    : [item.title, item.scenario, item.content].filter(Boolean).join('\n');
}

function officialKnowledge(db) {
  const current = db.knowledge || buildFallbackKnowledge(db.materials, db.settings);
  return {
    ...current,
    overview: current.overview || '',
    salesPlaybook: (current.salesPlaybook || []).map(normalizePlaybookItem).filter((item) => item.content),
    faq: Array.isArray(current.faq) ? current.faq : [],
    concerns: Array.isArray(current.concerns) ? current.concerns : [],
    imageCards: Array.isArray(current.imageCards) ? current.imageCards : []
  };
}

function addConflictHints(suggestion, knowledge) {
  const pools = {
    playbook: (knowledge.salesPlaybook || []).map((item, index) => ({
      type: 'playbook',
      index,
      text: playbookText(item)
    })),
    faq: (knowledge.faq || []).map((item, index) => ({
      type: 'faq',
      index,
      text: `${item.question || ''}\n${item.answer || ''}`
    })),
    concern: (knowledge.concerns || []).map((item, index) => ({
      type: 'concern',
      index,
      text: `${item.concern || ''}\n${item.response || ''}`
    }))
  };
  const text = suggestionText(suggestion);
  const candidates = Object.values(pools).flat()
    .map((item) => ({ ...item, score: scoreText(text, item.text) + scoreText(item.text, text) }))
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  suggestion.conflicts = candidates.map((item) => ({
    targetType: item.type,
    targetIndex: item.index,
    reason: `可能与${typeLabel(item.type)}第 ${item.index + 1} 条重复或冲突`
  }));
  return suggestion;
}

function typeLabel(type) {
  return ({ playbook: '销售话术', faq: '常见问题', concern: '顾虑应对' })[type] || '词条';
}

function suggestionText(suggestion) {
  if (suggestion.type === 'playbook') return [suggestion.title, suggestion.scenario, suggestion.content].join('\n');
  if (suggestion.type === 'faq') return [suggestion.question, suggestion.answer].join('\n');
  if (suggestion.type === 'concern') return [suggestion.concern, suggestion.response].join('\n');
  return JSON.stringify(suggestion);
}

function createKnowledgeSuggestions(material, knowledge) {
  const analysis = material.analysis || {};
  const base = {
    sourceMaterialId: material.id,
    sourceMaterialTitle: material.title,
    status: 'pending',
    createdAt: now(),
    conflicts: []
  };
  const suggestions = [];

  (analysis.sellingPoints || []).forEach((point, index) => {
    const content = normalizeText(point);
    if (!content) return;
    suggestions.push(addConflictHints({
      ...base,
      id: newId('sug'),
      type: 'playbook',
      title: `${material.title}话术 ${index + 1}`,
      scenario: material.category || '',
      content
    }, knowledge));
  });

  (analysis.faq || []).forEach((item) => {
    const question = normalizeText(item.question || '');
    const answer = normalizeText(item.answer || '');
    if (!question && !answer) return;
    suggestions.push(addConflictHints({
      ...base,
      id: newId('sug'),
      type: 'faq',
      question,
      answer
    }, knowledge));
  });

  (analysis.concerns || []).forEach((item) => {
    const concern = normalizeText(item.concern || '');
    const response = normalizeText(item.response || '');
    if (!concern && !response) return;
    suggestions.push(addConflictHints({
      ...base,
      id: newId('sug'),
      type: 'concern',
      concern,
      response
    }, knowledge));
  });

  return suggestions;
}

async function generateKnowledge(materials, settings = defaultSettings) {
  const prepared = buildFallbackKnowledge(materials, settings);
  const source = materials.map((item, index) => {
    const analysis = JSON.stringify(item.analysis || {}, null, 2);
    return `素材 ${index + 1}：${item.title}\n类型：${item.type}\n内容：${normalizeText(item.content || item.extractedText || item.description || '').slice(0, 5000)}\n分析：${analysis}`;
  }).join('\n\n---\n\n');

  const content = await callAi([
    {
      role: 'system',
      content: '你是团队销售负责人和知识库设计师。你会把零散资料整理成可直接用于销售咨询的结构化知识库。只输出合法 JSON。'
    },
    {
      role: 'user',
      content: `请基于素材生成销售知识库。要求中文、实用、避免夸大承诺，符合以下销售人设和安全边界。\n\n团队/站点：${settings.siteName}\n销售人设：${settings.salesPersona}\n安全边界：${settings.safetyRules}\n\nJSON 字段：overview:string, salesPlaybook:string[], faq:{question:string,answer:string}[], concerns:{concern:string,response:string}[], tags:string[]。\n\n${source.slice(0, 25000)}`
    }
  ], { model: process.env.AI_TEXT_MODEL || defaultTextModel(), temperature: 0.3 });

  if (!content) return prepared;
  const parsed = tryParseJson(content, prepared);
  return {
    ...prepared,
    ...parsed,
    generatedAt: now(),
    imageCards: prepared.imageCards,
    sourceMaterialIds: prepared.sourceMaterialIds
  };
}

async function syncKnowledgeFromMaterials(db) {
  db.knowledge = db.materials.length
    ? await generateKnowledge(db.materials, db.settings)
    : buildFallbackKnowledge(db.materials, db.settings);
  return db.knowledge;
}

function scoreText(question, text) {
  const source = normalizeText(question).toLowerCase();
  const latinTokens = source.match(/[a-z0-9]+/g) || [];
  const cjkTokens = (source.match(/[\u3400-\u9fff]+/g) || []).flatMap((chunk) => {
    if (chunk.length <= 2) return [chunk];
    return Array.from({ length: chunk.length - 1 }, (_, index) => chunk.slice(index, index + 2));
  });
  const tokens = [...new Set([...latinTokens, ...cjkTokens].filter((token) => token.length >= 2))];
  const target = normalizeText(text).toLowerCase();
  return tokens.reduce((score, token) => score + (target.includes(token) ? token.length : 0), 0);
}

function pickContext(question, db) {
  const materialMatches = db.materials
    .map((item) => ({
      item,
      score: scoreText(question, [item.title, item.description, item.content, item.extractedText, JSON.stringify(item.analysis || {})].join('\n'))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.item);

  const imageMatches = (db.knowledge?.imageCards || [])
    .map((image) => ({
      image,
      score: scoreText(question, [image.title, image.summary, image.usage].join('\n'))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.image);

  return { materialMatches, imageMatches };
}

function fallbackSalesReply(question, db, context) {
  const settings = db.settings || defaultSettings;
  const knowledge = db.knowledge || buildFallbackKnowledge(db.materials, settings);
  const faq = (knowledge.faq || [])
    .map((item) => ({ item, score: scoreText(question, `${item.question}\n${item.answer}`) }))
    .sort((a, b) => b.score - a.score)
    .find((entry) => entry.score > 0)?.item;
  const points = (knowledge.salesPlaybook || []).map(playbookText).filter(Boolean).slice(0, 3);
  const isEnglish = settings.demoLanguage === 'en';
  const fallbackOverview = isEnglish
    ? 'We will provide clear guidance based on course content, schedule, and certificate information.'
    : '我们会结合课程内容、学习安排和证书服务，为学员提供清晰的咨询答复。';
  const highlightsTitle = isEnglish ? 'You may also want to consider:' : '比较建议你重点关注：';
  const answer = [
    faq?.answer || (isEnglish
      ? `Here is a useful overview: ${knowledge.overview || fallbackOverview}`
      : `这个问题可以这样理解：${knowledge.overview || fallbackOverview}`),
    points.length ? `\n\n${highlightsTitle}\n${points.map((point, index) => `${index + 1}. ${point}`).join('\n')}` : '',
    `\n\n${settings.contactHint}`
  ].join('');

  return {
    answer,
    images: context.imageMatches,
    mode: 'local-fallback'
  };
}

async function generateSalesReply(question, db) {
  const context = pickContext(question, db);
  const settings = db.settings || defaultSettings;
  const knowledge = db.knowledge || buildFallbackKnowledge(db.materials, settings);
  const imageHint = context.imageMatches.map((image) => `图片：${image.title}，说明：${image.summary}，地址：${image.url}`).join('\n');
  const materialHint = context.materialMatches.map((item) => `素材：${item.title}\n${normalizeText(item.content || item.extractedText || JSON.stringify(item.analysis || {})).slice(0, 2500)}`).join('\n\n');

  const content = await callAi([
    {
      role: 'system',
      content: `你是团队里的优秀销售顾问。${settings.salesPersona} 回答要自然、真诚、专业，像真人微信咨询一样。${settings.safetyRules} 需要结合知识库回答，并在合适时建议下一步咨询。`
    },
    {
      role: 'user',
      content: `用户问题：${question}\n\n团队名称：${settings.siteName}\n收尾引导：${settings.contactHint}\n\n完整知识库摘要：\n${JSON.stringify(knowledge, null, 2).slice(0, 10000)}\n\n相关素材：\n${materialHint || '无'}\n\n可用图片：\n${imageHint || '无'}\n\n请输出 JSON：{"answer":"销售口吻答复","imageIds":["可配图id"]}`
    }
  ], { model: process.env.AI_TEXT_MODEL || defaultTextModel(), temperature: 0.55 });

  if (!content) return fallbackSalesReply(question, db, context);
  const parsed = tryParseJson(content, { answer: content, imageIds: [] });
  const images = (knowledge.imageCards || []).filter((image) => parsed.imageIds?.includes(image.id));
  return {
    answer: parsed.answer || content,
    images: images.length ? images : context.imageMatches,
    mode: 'ai'
  };
}

async function analyzeStudentIntent(student, chats) {
  const transcript = chats.slice(-20).map((chat) => `学员：${chat.question}\n销售顾问：${chat.answer}`).join('\n\n');
  const fallback = {
    intentLevel: chats.length >= 3 ? 'medium' : 'unknown',
    nickname: student.nickname || '',
    name: student.name || '',
    phone: student.phone || '',
    age: student.age || '',
    gender: student.gender || '',
    idCard: student.idCard || '',
    currentStatus: student.currentStatus || '',
    summary: chats.length ? `该学员已咨询 ${chats.length} 次，建议销售结合聊天记录进一步跟进。` : '暂无聊天记录，暂不能判断意向。',
    concerns: [],
    interestedProjects: [],
    nextAction: chats.length ? '建议销售主动询问学习目标、时间安排和预算。' : '等待学员产生更多咨询内容。'
  };
  if (!transcript) return fallback;
  const content = await callAi([
    {
      role: 'system',
      content: '你是团队销售主管。请根据聊天记录提取客户画像和销售跟进建议。只输出合法 JSON；无法确认的信息输出空字符串，不要编造身份证、年龄、电话等隐私信息。'
    },
    {
      role: 'user',
      content: `学员当前资料：\n${JSON.stringify(publicStudent(student), null, 2)}\n\n聊天记录：\n${transcript.slice(0, 16000)}\n\n请输出 JSON：{"intentLevel":"high|medium|low|unknown","nickname":"昵称","name":"姓名","phone":"电话","age":"年龄","gender":"性别","idCard":"身份证号","currentStatus":"学员现状，例如在职/待业/转行/零基础/已从业","summary":"学员画像总结","concerns":["顾虑"],"interestedProjects":["感兴趣项目"],"nextAction":"建议下一步跟进动作"}`
    }
  ], { model: process.env.AI_TEXT_MODEL || defaultTextModel(), temperature: 0.25 });
  if (!content) return fallback;
  return tryParseJson(content, fallback);
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'open-sales-assistant',
    schemaVersion: currentSchemaVersion,
    aiConfigured: Boolean(process.env.AI_API_KEY && !process.env.AI_API_KEY.includes('请替换')),
    textModel: process.env.AI_TEXT_MODEL || defaultTextModel(),
    visionModel: process.env.AI_VISION_MODEL || defaultVisionModel()
  });
});

app.get('/api/demo-language', async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({
      language: normalizeDemoLanguage(db.settings?.demoLanguage || 'en'),
      switchEnabled: demoLanguageSwitchEnabled
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/demo-language', async (req, res, next) => {
  try {
    if (!demoLanguageSwitchEnabled) {
      res.status(403).json({
        error: 'Demo language switching is disabled in production. Set DEMO_LANGUAGE_SWITCH=true to enable it explicitly.'
      });
      return;
    }
    const lang = normalizeDemoLanguage(req.body.lang || req.body.language);
    const currentDb = await readDb();
    const nextDb = preserveAdminState(await loadDemoFixture(lang), currentDb);
    await writeDb(nextDb);
    res.json({
      language: lang,
      settings: nextDb.settings
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/student/register', async (req, res, next) => {
  try {
    const nickname = normalizeText(req.body.nickname || '');
    if (!nickname) {
      res.status(400).json({ error: '请输入昵称' });
      return;
    }
    const db = await readDb();
    if (db.students.some((item) => item.nickname === nickname)) {
      res.status(409).json({ error: '该昵称已被使用，请换一个昵称或使用密码登录' });
      return;
    }
    const password = randomPassword();
    const student = {
      id: newId('stu'),
      nickname,
      name: normalizeText(req.body.name || ''),
      passwordHash: hashPassword(password),
      phone: normalizeText(req.body.phone || ''),
      age: normalizeText(req.body.age || ''),
      gender: normalizeText(req.body.gender || ''),
      idCard: normalizeText(req.body.idCard || ''),
      currentStatus: normalizeText(req.body.currentStatus || ''),
      profileSummary: '',
      nextAction: '',
      avatar: '',
      userCode: userCode(),
      salesId: normalizeText(req.body.ref || ''),
      referrerCode: normalizeText(req.body.from || ''),
      intentLevel: 'unknown',
      createdAt: now(),
      lastLoginAt: now()
    };
    const token = crypto.randomBytes(32).toString('hex');
    db.students.unshift(student);
    db.studentSessions.push({ token, studentId: student.id, createdAt: now(), expiresAt: studentSessionExpiresAt() });
    await writeDb(db);
    res.json({ token, password, student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/student/login', async (req, res, next) => {
  try {
    const nickname = normalizeText(req.body.nickname || '');
    const password = String(req.body.password || '');
    const db = await readDb();
    const student = db.students.find((item) => item.nickname === nickname);
    if (!student || !verifyPassword(password, student.passwordHash)) {
      res.status(401).json({ error: '昵称或密码错误' });
      return;
    }
    student.lastLoginAt = now();
    const token = crypto.randomBytes(32).toString('hex');
    db.studentSessions = db.studentSessions.filter((item) => item.expiresAt > now());
    db.studentSessions.push({ token, studentId: student.id, createdAt: now(), expiresAt: studentSessionExpiresAt() });
    await writeDb(db);
    res.json({ token, student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/student/me', requireStudent, async (req, res) => {
  res.json({ student: publicStudent(req.student) });
});

app.put('/api/student/profile', requireStudent, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.student.id);
    const nextNickname = normalizeText(req.body.nickname || student.nickname || '');
    if (!nextNickname) {
      res.status(400).json({ error: '昵称不能为空' });
      return;
    }
    if (db.students.some((item) => item.id !== student.id && item.nickname === nextNickname)) {
      res.status(409).json({ error: '该昵称已被其他学员使用' });
      return;
    }
    student.nickname = nextNickname;
    student.name = normalizeText(req.body.name || '');
    student.phone = normalizeText(req.body.phone || '');
    student.age = normalizeText(req.body.age || '');
    student.gender = normalizeText(req.body.gender || '');
    student.idCard = normalizeText(req.body.idCard || '');
    student.currentStatus = normalizeText(req.body.currentStatus || '');
    student.avatar = normalizeText(req.body.avatar || student.avatar || '');
    await writeDb(db);
    res.json({ student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/student/logout', requireStudent, async (req, res, next) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const db = await readDb();
    db.studentSessions = db.studentSessions.filter((item) => item.token !== token);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.put('/api/student/password', requireStudent, async (req, res, next) => {
  try {
    const oldPassword = String(req.body.oldPassword || '');
    const newPassword = String(req.body.newPassword || '');
    if (newPassword.length < 6) {
      res.status(400).json({ error: '新密码至少 6 位' });
      return;
    }
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.student.id);
    if (!verifyPassword(oldPassword, student.passwordHash)) {
      res.status(400).json({ error: '原密码错误' });
      return;
    }
    student.passwordHash = hashPassword(newPassword);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/login', async (req, res, next) => {
  try {
    const username = normalizeText(req.body.username || '');
    const password = String(req.body.password || '');
    const db = await readDb();
    const user = db.adminUsers.find((item) => item.username === username && item.status === 'active');
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: '账号或密码错误' });
      return;
    }
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
      token,
      adminUserId: user.id,
      createdAt: now(),
      expiresAt: sessionExpiresAt()
    };
    db.adminSessions = db.adminSessions.filter((item) => item.expiresAt > now());
    db.adminSessions.push(session);
    addOperationLog(db, { adminUser: user }, 'auth.login', {
      type: 'admin',
      id: user.id,
      label: user.realName || user.username,
      summary: 'Admin signed in'
    });
    await writeDb(db);
    res.json({
      token,
      expiresAt: session.expiresAt,
      user: { id: user.id, username: user.username, realName: user.realName, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/me', requireAdmin, async (req, res) => {
  res.json({ user: req.adminUser });
});

app.get('/api/admin/data/export', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const exportedAt = now();
    addOperationLog(db, req, 'data.export', {
      type: 'data',
      id: 'export',
      label: 'Data export',
      summary: `Exported JSON data on ${exportedAt.slice(0, 10)}`
    });
    await writeDb(db);
    const payload = {
      exportedAt,
      service: 'open-sales-assistant',
      schemaVersion: currentSchemaVersion,
      data: db
    };
    const fileName = `open-sales-assistant-export-${exportedAt.slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/data/backup', requireAdmin, async (req, res, next) => {
  try {
    const backupPath = await createBackup('manual');
    const db = await readDb();
    addOperationLog(db, req, 'data.backup', {
      type: 'data',
      id: 'backup',
      label: 'Manual backup',
      summary: backupPath ? `Created backup ${path.basename(backupPath)}` : 'Backup skipped because no data file exists'
    });
    await writeDb(db);
    res.json({
      ok: true,
      backupPath,
      backupDir
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/logout', requireAdmin, async (req, res, next) => {
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const db = await readDb();
    db.adminSessions = db.adminSessions.filter((item) => item.token !== token);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/dashboard', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({
      stats: {
        students: db.students.length,
        chats: db.chats.length,
        certificates: db.certificates.length,
        materials: db.materials.length
      },
      recentStudents: db.students.slice(0, 8).map(publicStudent),
      recentChats: db.chats.slice(0, 8)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/operation-logs', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ operationLogs: (db.operationLogs || []).slice(0, 50) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/students', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    const students = db.students.map((student) => ({
      ...publicStudent(student),
      chatCount: db.chats.filter((chat) => chat.studentId === student.id).length,
      lastChatAt: db.chats.find((chat) => chat.studentId === student.id)?.createdAt || ''
    }));
    res.json({ students });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/students/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    const chats = db.chats.filter((chat) => chat.studentId === student.id).reverse();
    res.json({
      student: {
        ...publicStudent(student),
        chatCount: chats.length,
        lastChatAt: chats.at(-1)?.createdAt || ''
      },
      chats,
      analysis: db.aiAnalysis.find((item) => item.studentId === student.id) || null,
      followUps: db.followUps.filter((item) => item.studentId === student.id)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/students/:id/chats', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    res.json({
      student: publicStudent(student),
      chats: db.chats.filter((chat) => chat.studentId === student.id).reverse(),
      analysis: db.aiAnalysis.find((item) => item.studentId === student.id) || null,
      followUps: db.followUps.filter((item) => item.studentId === student.id)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/students/:id/analyze', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    const chats = db.chats.filter((chat) => chat.studentId === student.id).reverse();
    const result = await analyzeStudentIntent(student, chats);
    student.intentLevel = result.intentLevel || student.intentLevel || 'unknown';
    student.nickname = normalizeText(result.nickname || student.nickname || '');
    student.name = normalizeText(result.name || student.name || '');
    student.phone = normalizeText(result.phone || student.phone || '');
    student.age = normalizeText(result.age || student.age || '');
    student.gender = normalizeText(result.gender || student.gender || '');
    student.idCard = normalizeText(result.idCard || student.idCard || '');
    student.currentStatus = normalizeText(result.currentStatus || student.currentStatus || '');
    student.profileSummary = normalizeText(result.summary || student.profileSummary || '');
    student.nextAction = normalizeText(result.nextAction || student.nextAction || '');
    const analysis = {
      id: newId('analysis'),
      studentId: student.id,
      ...result,
      createdAt: now()
    };
    db.aiAnalysis = db.aiAnalysis.filter((item) => item.studentId !== student.id);
    db.aiAnalysis.unshift(analysis);
    addOperationLog(db, req, 'student.analyze', {
      type: 'student',
      id: student.id,
      label: student.name || student.nickname,
      summary: `Analyzed customer intent as ${student.intentLevel || 'unknown'}`
    });
    await writeDb(db);
    res.json({ analysis, student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/students/:id/intent', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    student.intentLevel = normalizeText(req.body.intentLevel || 'unknown');
    await writeDb(db);
    res.json({ student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/students/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    const nextNickname = normalizeText(req.body.nickname || student.nickname || '');
    if (!nextNickname) {
      res.status(400).json({ error: '昵称不能为空' });
      return;
    }
    if (db.students.some((item) => item.id !== student.id && item.nickname === nextNickname)) {
      res.status(409).json({ error: '该昵称已被其他学员使用' });
      return;
    }
    student.nickname = nextNickname;
    student.name = normalizeText(req.body.name || '');
    student.phone = normalizeText(req.body.phone || '');
    student.age = normalizeText(req.body.age || '');
    student.gender = normalizeText(req.body.gender || '');
    student.idCard = normalizeText(req.body.idCard || '');
    student.currentStatus = normalizeText(req.body.currentStatus || '');
    student.intentLevel = normalizeText(req.body.intentLevel || 'unknown');
    student.profileSummary = normalizeText(req.body.profileSummary || '');
    student.nextAction = normalizeText(req.body.nextAction || '');
    addOperationLog(db, req, 'student.update', {
      type: 'student',
      id: student.id,
      label: student.name || student.nickname,
      summary: 'Updated customer profile'
    });
    await writeDb(db);
    res.json({ student: publicStudent(student) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/students/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    db.students = db.students.filter((item) => item.id !== student.id);
    db.studentSessions = db.studentSessions.filter((item) => item.studentId !== student.id);
    db.chats = db.chats.filter((item) => item.studentId !== student.id);
    db.followUps = db.followUps.filter((item) => item.studentId !== student.id);
    db.aiAnalysis = db.aiAnalysis.filter((item) => item.studentId !== student.id);
    addOperationLog(db, req, 'student.delete', {
      type: 'student',
      id: student.id,
      label: student.name || student.nickname,
      summary: 'Deleted customer and related records'
    });
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/students/:id/followups', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const student = db.students.find((item) => item.id === req.params.id);
    if (!student) {
      res.status(404).json({ error: '学员不存在' });
      return;
    }
    const content = normalizeText(req.body.content || '');
    if (!content) {
      res.status(400).json({ error: '请填写跟进内容' });
      return;
    }
    const followUp = {
      id: newId('fu'),
      studentId: student.id,
      adminUserId: req.adminUser.id,
      adminName: req.adminUser.realName || req.adminUser.username,
      content,
      createdAt: now()
    };
    db.followUps.unshift(followUp);
    addOperationLog(db, req, 'followup.create', {
      type: 'student',
      id: student.id,
      label: student.name || student.nickname,
      summary: shortLog(content)
    });
    await writeDb(db);
    res.json({ followUp });
  } catch (error) {
    next(error);
  }
});

app.get('/api/materials', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ materials: db.materials });
  } catch (error) {
    next(error);
  }
});

app.get('/api/settings', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ settings: db.settings });
  } catch (error) {
    next(error);
  }
});

app.put('/api/settings', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    db.settings = {
      ...db.settings,
      siteName: normalizeText(req.body.siteName || db.settings.siteName),
      welcomeText: normalizeText(req.body.welcomeText || db.settings.welcomeText),
      serviceName: normalizeText(req.body.serviceName || db.settings.serviceName),
      servicePhone: normalizeText(req.body.servicePhone || db.settings.servicePhone || ''),
      salesPersona: normalizeText(req.body.salesPersona || db.settings.salesPersona),
      contactHint: normalizeText(req.body.contactHint || db.settings.contactHint),
      safetyRules: normalizeText(req.body.safetyRules || db.settings.safetyRules)
    };
    addOperationLog(db, req, 'settings.update', {
      type: 'settings',
      id: 'settings',
      label: db.settings.siteName,
      summary: 'Updated consultation settings'
    });
    await writeDb(db);
    res.json({ settings: db.settings });
  } catch (error) {
    next(error);
  }
});

app.get('/api/chat/welcome', async (_req, res, next) => {
  try {
    const db = await readDb();
    const knowledge = db.knowledge || buildFallbackKnowledge(db.materials, db.settings);
    res.json({
      siteName: db.settings.siteName,
      welcomeText: db.settings.welcomeText,
      serviceName: db.settings.serviceName,
      servicePhone: db.settings.servicePhone || '',
      quickQuestions: [
        '这个项目适合零基础吗？',
        '学习安排是怎样的？',
        '大概多久能完成学习？',
        '证书办理和查询流程是什么？'
      ],
      featuredImages: (knowledge.imageCards || []).slice(0, 3)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/chat/history', requireStudent, async (req, res, next) => {
  try {
    const db = await readDb();
    const chats = db.chats
      .filter((chat) => chat.studentId === req.student.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({ chats });
  } catch (error) {
    next(error);
  }
});

app.get('/api/courses', async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ courses: db.courses.filter((item) => item.status !== 'offline') });
  } catch (error) {
    next(error);
  }
});

app.get('/api/courses/:id', async (req, res, next) => {
  try {
    const db = await readDb();
    const course = db.courses.find((item) => item.id === req.params.id && item.status !== 'offline');
    if (!course) {
      res.status(404).json({ error: '课程不存在' });
      return;
    }
    res.json({
      course,
      schedules: db.courseSchedules.filter((item) => item.courseId === course.id)
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/certificates/query', async (req, res, next) => {
  try {
    const name = normalizeText(req.query.name || '');
    const phone = normalizeText(req.query.phone || '');
    if (!name && !phone) {
      res.status(400).json({ error: '请输入姓名或手机号' });
      return;
    }
    const db = await readDb();
    const certificates = db.certificates.filter((item) => {
      const nameOk = name ? item.name?.includes(name) : true;
      const phoneOk = phone ? String(item.phone || '').includes(phone) : true;
      return nameOk && phoneOk;
    }).map((cert) => ({
      ...cert,
      courseTitle: db.courses.find((course) => course.id === cert.courseId)?.title || cert.courseTitle || ''
    }));
    res.json({ certificates });
  } catch (error) {
    next(error);
  }
});

app.post('/api/materials/text', requireAdmin, async (req, res, next) => {
  try {
    const { title, content, description, category } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ error: '请填写文字内容' });
      return;
    }

    const material = {
      id: newId('mat'),
      type: 'text',
      title: title?.trim() || '文字素材',
      category: category?.trim() || '通用资料',
      description: description?.trim() || '',
      content: normalizeText(content),
      createdAt: now()
    };
    material.analysis = await analyzeMaterial(material);

    const db = await readDb();
    const suggestions = createKnowledgeSuggestions(material, officialKnowledge(db));
    db.materials.unshift(material);
    db.knowledgeSuggestions.unshift(...suggestions);
    addOperationLog(db, req, 'material.create', {
      type: 'material',
      id: material.id,
      label: material.title,
      summary: `Added text material with ${suggestions.length} suggestion(s)`
    });
    await writeDb(db);
    res.json({ material, suggestions });
  } catch (error) {
    next(error);
  }
});

app.post('/api/materials/upload', requireAdmin, upload.array('files', 12), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      res.status(400).json({ error: '请选择要上传的文件' });
      return;
    }

    const db = await readDb();
    const created = [];
    for (const file of files) {
      const image = isImage(file.originalname, file.mimetype);
      const relativePath = path.relative(rootDir, file.path).replaceAll(path.sep, '/');
      const material = {
        id: newId('mat'),
        type: image ? 'image' : 'document',
        title: req.body.title?.trim() || file.originalname,
        category: req.body.category?.trim() || (image ? '图片素材' : '文档资料'),
        description: req.body.description?.trim() || '',
        originalName: file.originalname,
        filePath: relativePath,
        url: `${publicBaseUrl}/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        extractedText: await extractTextFromFile(file),
        createdAt: now()
      };
      material.analysis = await analyzeMaterial(material);
      const suggestions = createKnowledgeSuggestions(material, officialKnowledge(db));
      db.materials.unshift(material);
      db.knowledgeSuggestions.unshift(...suggestions);
      created.push({ ...material, suggestionCount: suggestions.length });
    }
    addOperationLog(db, req, 'material.upload', {
      type: 'material',
      id: created[0]?.id || '',
      label: created.map((item) => item.title).join(', '),
      summary: `Uploaded ${created.length} file material(s)`
    });
    await writeDb(db);
    res.json({ materials: created, suggestions: db.knowledgeSuggestions.filter((item) => created.some((material) => material.id === item.sourceMaterialId)) });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/materials/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const material = db.materials.find((item) => item.id === req.params.id);
    db.materials = db.materials.filter((item) => item.id !== req.params.id);
    if (material?.filePath) {
      await fs.rm(path.join(rootDir, material.filePath), { force: true });
    }
    db.knowledgeSuggestions = db.knowledgeSuggestions.filter((item) => item.sourceMaterialId !== req.params.id);
    addOperationLog(db, req, 'material.delete', {
      type: 'material',
      id: req.params.id,
      label: material?.title || req.params.id,
      summary: 'Deleted material and related pending suggestions'
    });
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/courses', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ courses: db.courses, schedules: db.courseSchedules });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/courses', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const course = {
      id: newId('course'),
      title: normalizeText(req.body.title || '未命名课程'),
      summary: normalizeText(req.body.summary || ''),
      detail: normalizeText(req.body.detail || ''),
      instructor: normalizeText(req.body.instructor || ''),
      price: normalizeText(req.body.price || ''),
      duration: normalizeText(req.body.duration || ''),
      cover: normalizeText(req.body.cover || ''),
      status: normalizeText(req.body.status || 'online'),
      createdAt: now()
    };
    db.courses.unshift(course);
    await writeDb(db);
    res.json({ course });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/courses/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const course = db.courses.find((item) => item.id === req.params.id);
    if (!course) {
      res.status(404).json({ error: '课程不存在' });
      return;
    }
    Object.assign(course, {
      title: normalizeText(req.body.title || course.title),
      summary: normalizeText(req.body.summary || course.summary),
      detail: normalizeText(req.body.detail || course.detail),
      instructor: normalizeText(req.body.instructor || course.instructor),
      price: normalizeText(req.body.price || course.price),
      duration: normalizeText(req.body.duration || course.duration),
      cover: normalizeText(req.body.cover || course.cover),
      status: normalizeText(req.body.status || course.status),
      updatedAt: now()
    });
    await writeDb(db);
    res.json({ course });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/courses/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    db.courses = db.courses.filter((item) => item.id !== req.params.id);
    db.courseSchedules = db.courseSchedules.filter((item) => item.courseId !== req.params.id);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/schedules', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const schedule = {
      id: newId('sch'),
      courseId: normalizeText(req.body.courseId || ''),
      startTime: normalizeText(req.body.startTime || ''),
      endTime: normalizeText(req.body.endTime || ''),
      location: normalizeText(req.body.location || ''),
      remark: normalizeText(req.body.remark || ''),
      createdAt: now()
    };
    db.courseSchedules.unshift(schedule);
    await writeDb(db);
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/schedules/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    db.courseSchedules = db.courseSchedules.filter((item) => item.id !== req.params.id);
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/certificates', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ certificates: db.certificates });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/certificates', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const cert = {
      id: newId('cert'),
      name: normalizeText(req.body.name || ''),
      phone: normalizeText(req.body.phone || ''),
      courseId: normalizeText(req.body.courseId || ''),
      courseTitle: normalizeText(req.body.courseTitle || ''),
      certNo: normalizeText(req.body.certNo || ''),
      status: normalizeText(req.body.status || '办理中'),
      issuedAt: normalizeText(req.body.issuedAt || ''),
      createdAt: now()
    };
    db.certificates.unshift(cert);
    addOperationLog(db, req, 'certificate.create', {
      type: 'certificate',
      id: cert.id,
      label: cert.name || cert.certNo,
      summary: 'Added certificate record'
    });
    await writeDb(db);
    res.json({ certificate: cert });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/certificates/import', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请选择 Excel 或 CSV 文件' });
      return;
    }
    const rows = await parseCertificateFile(req.file);
    const db = await readDb();
    const certificates = rows.map((row) => ({
      id: newId('cert'),
      name: row.name,
      phone: row.phone,
      courseId: '',
      courseTitle: row.courseTitle,
      certNo: row.certNo,
      status: row.status || '办理中',
      issuedAt: row.issuedAt,
      createdAt: now()
    }));
    db.certificates.unshift(...certificates);
    addOperationLog(db, req, 'certificate.import', {
      type: 'certificate',
      id: '',
      label: req.file.originalname,
      summary: `Imported ${certificates.length} certificate record(s)`
    });
    await writeDb(db);
    await fs.rm(req.file.path, { force: true });
    res.json({ imported: certificates.length, certificates });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/certificates/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const cert = db.certificates.find((item) => item.id === req.params.id);
    if (!cert) {
      res.status(404).json({ error: '证书不存在' });
      return;
    }
    Object.assign(cert, {
      name: normalizeText(req.body.name || cert.name),
      phone: normalizeText(req.body.phone || cert.phone),
      courseId: normalizeText(req.body.courseId || cert.courseId),
      courseTitle: normalizeText(req.body.courseTitle || cert.courseTitle),
      certNo: normalizeText(req.body.certNo || cert.certNo),
      status: normalizeText(req.body.status || cert.status),
      issuedAt: normalizeText(req.body.issuedAt || cert.issuedAt),
      updatedAt: now()
    });
    addOperationLog(db, req, 'certificate.update', {
      type: 'certificate',
      id: cert.id,
      label: cert.name || cert.certNo,
      summary: 'Updated certificate record'
    });
    await writeDb(db);
    res.json({ certificate: cert });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/certificates/:id', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const cert = db.certificates.find((item) => item.id === req.params.id);
    db.certificates = db.certificates.filter((item) => item.id !== req.params.id);
    addOperationLog(db, req, 'certificate.delete', {
      type: 'certificate',
      id: req.params.id,
      label: cert?.name || cert?.certNo || req.params.id,
      summary: 'Deleted certificate record'
    });
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/knowledge', requireAdmin, async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({
      knowledge: officialKnowledge(db),
      suggestions: db.knowledgeSuggestions.filter((item) => item.status === 'pending')
    });
  } catch (error) {
    next(error);
  }
});

app.put('/api/knowledge', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const current = officialKnowledge(db);
    db.knowledge = {
      ...current,
      overview: normalizeText(req.body.overview || current.overview),
      salesPlaybook: Array.isArray(req.body.salesPlaybook)
        ? req.body.salesPlaybook.map(normalizePlaybookItem).filter((item) => item.content)
        : current.salesPlaybook,
      faq: Array.isArray(req.body.faq)
        ? req.body.faq.map((item) => ({ ...item, conflicts: [] }))
        : current.faq,
      concerns: Array.isArray(req.body.concerns)
        ? req.body.concerns.map((item) => ({ ...item, conflicts: [] }))
        : current.concerns,
      tags: Array.isArray(req.body.tags) ? req.body.tags.filter(Boolean) : current.tags,
      imageCards: current.imageCards || [],
      updatedAt: now()
    };
    db.knowledgeSuggestions = db.knowledgeSuggestions.map((item) => ({ ...item, conflicts: [] }));
    addOperationLog(db, req, 'knowledge.update', {
      type: 'knowledge',
      id: 'knowledge',
      label: db.settings?.siteName || 'Knowledge base',
      summary: 'Updated official knowledge base'
    });
    await writeDb(db);
    res.json({ knowledge: db.knowledge });
  } catch (error) {
    next(error);
  }
});

app.post('/api/knowledge/suggestions/:id/accept', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const suggestion = db.knowledgeSuggestions.find((item) => item.id === req.params.id);
    if (!suggestion) {
      res.status(404).json({ error: '建议词条不存在' });
      return;
    }
    if (suggestion.status !== 'pending') {
      res.status(409).json({ error: '该建议已经处理，不能重复采纳' });
      return;
    }
    const knowledge = officialKnowledge(db);
    let acceptedItem;
    try {
      acceptedItem = acceptedKnowledgeItem(suggestion, req.body, knowledge.salesPlaybook.length);
    } catch (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (suggestion.type === 'playbook') knowledge.salesPlaybook.push(acceptedItem);
    if (suggestion.type === 'faq') knowledge.faq.push(acceptedItem);
    if (suggestion.type === 'concern') knowledge.concerns.push(acceptedItem);
    db.knowledge = { ...knowledge, updatedAt: now() };
    suggestion.status = 'accepted';
    suggestion.acceptedAt = now();
    suggestion.acceptedContent = acceptedItem;
    addOperationLog(db, req, 'suggestion.accept', {
      type: 'suggestion',
      id: suggestion.id,
      label: suggestionTitleForLog(suggestion),
      summary: 'Accepted AI suggestion into official knowledge base'
    });
    await writeDb(db);
    res.json({ knowledge: db.knowledge, suggestion });
  } catch (error) {
    next(error);
  }
});

app.post('/api/knowledge/suggestions/:id/ignore', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    const suggestion = db.knowledgeSuggestions.find((item) => item.id === req.params.id);
    if (!suggestion) {
      res.status(404).json({ error: '建议词条不存在' });
      return;
    }
    if (suggestion.status !== 'pending') {
      res.status(409).json({ error: '该建议已经处理，不能重复忽略' });
      return;
    }
    suggestion.status = 'ignored';
    suggestion.ignoredAt = now();
    addOperationLog(db, req, 'suggestion.ignore', {
      type: 'suggestion',
      id: suggestion.id,
      label: suggestionTitleForLog(suggestion),
      summary: 'Ignored AI suggestion'
    });
    await writeDb(db);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/knowledge/generate', requireAdmin, async (req, res, next) => {
  try {
    const db = await readDb();
    if (!db.materials.length) {
      res.status(400).json({ error: '请先上传素材或录入文字' });
      return;
    }
    db.knowledge = await syncKnowledgeFromMaterials(db);
    addOperationLog(db, req, 'knowledge.generate', {
      type: 'knowledge',
      id: 'knowledge',
      label: db.settings?.siteName || 'Knowledge base',
      summary: `Regenerated knowledge base from ${db.materials.length} material(s)`
    });
    await writeDb(db);
    res.json({ knowledge: db.knowledge });
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat', requireStudent, async (req, res, next) => {
  try {
    const question = normalizeText(req.body.question || '');
    if (!question) {
      res.status(400).json({ error: '请输入学员问题' });
      return;
    }
    const db = await readDb();
    const reply = await generateSalesReply(question, db);
    const chat = { id: newId('chat'), studentId: req.student.id, studentNickname: req.student.nickname, question, ...reply, createdAt: now() };
    db.chats.unshift(chat);
    await writeDb(db);
    res.json(chat);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || '服务器错误' });
});

await ensureInitialAdmin();

app.listen(port, () => {
  console.log(`Open Sales Assistant running at http://localhost:${port}`);
});
