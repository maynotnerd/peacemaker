import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { determineRoute } from './routes.js';

const directory = resolve(process.env.DATA_DIR || 'data');
mkdirSync(directory, { recursive: true });
const db = new DatabaseSync(resolve(directory, 'applications.sqlite'));
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, phone TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('applicant','specialist'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY, applicant_id INTEGER NOT NULL REFERENCES users(id),
    questionnaire TEXT NOT NULL, status TEXT NOT NULL, submitted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL REFERENCES applications(id),
    name TEXT NOT NULL, data BLOB NOT NULL
  );
  CREATE TABLE IF NOT EXISTS supplement_requests (
    id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL REFERENCES applications(id),
    specialist_id INTEGER NOT NULL REFERENCES users(id), comment TEXT NOT NULL,
    created_at TEXT NOT NULL, resolved_at TEXT
  );
  CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY, application_id INTEGER NOT NULL REFERENCES applications(id),
    changed_by INTEGER NOT NULL REFERENCES users(id), status TEXT NOT NULL,
    changed_at TEXT NOT NULL, comment TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS results (
    application_id INTEGER PRIMARY KEY REFERENCES applications(id),
    specialist_id INTEGER NOT NULL REFERENCES users(id), route_code TEXT,
    decision TEXT NOT NULL, issued_at TEXT NOT NULL
  );
`);

export class InputError extends Error {}
const timestamp = () => new Date().toISOString();
const hash = (token) => createHash('sha256').update(token).digest('hex');

export function authenticate(phone, code, name, register) {
  const digits = phone.replace(/[\s()+-]/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new InputError('Введите номер телефона: от 10 до 15 цифр.');
  if (code !== (process.env.SMS_CODE || '123456')) throw new InputError('Неверный код подтверждения.');
  const existing = db.prepare('SELECT id, role FROM users WHERE phone = ?').get(digits);
  if (register) {
    if (existing) throw new InputError('Этот номер уже зарегистрирован. Войдите в кабинет.');
    if (!name || name.length > 100) throw new InputError('Введите имя длиной до 100 символов.');
    db.prepare("INSERT INTO users (phone,name,role) VALUES (?,?,'applicant')").run(digits,name);
  } else if (!existing) {
    throw new InputError('Этот номер не зарегистрирован.');
  }
  const user = db.prepare('SELECT id FROM users WHERE phone = ?').get(digits);
  const token = randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), user.id, Date.now() + 86400000);
  return token;
}

export function seedSpecialist() {
  const phone = (process.env.SPECIALIST_PHONE || '79990000001').replace(/[\s()+-]/g,'');
  if (!/^\d{10,15}$/.test(phone)) throw new Error('Некорректный номер специалиста.');
  db.prepare("INSERT OR IGNORE INTO users (phone,name,role) VALUES (?,'Специалист','specialist')").run(phone);
}
seedSpecialist();

export function getUser(token) {
  if (!token) return null;
  return db.prepare('SELECT u.id,u.name,u.role FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token), Date.now()) || null;
}

export function logout(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));
}

function transaction(work) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function getApplication(user, id) {
  const row = db.prepare('SELECT a.*,u.name AS applicant FROM applications a JOIN users u ON a.applicant_id=u.id WHERE a.id=?').get(id);
  if (!row || (user.role !== 'specialist' && row.applicant_id !== user.id)) throw new InputError('Заявка недоступна.');
  return row;
}

export function getDashboard(user, id) {
  const rows = db.prepare(`SELECT a.id,a.status,a.submitted_at,u.name AS applicant FROM applications a
    JOIN users u ON u.id=a.applicant_id WHERE (?='specialist' OR a.applicant_id=?) ORDER BY a.id DESC`).all(user.role,user.id);
  if (!id) return { rows, application: null };
  const row = getApplication(user,id);
  const decision = db.prepare('SELECT r.decision,r.issued_at,u.name AS specialist FROM results r JOIN users u ON u.id=r.specialist_id WHERE r.application_id=?').get(id);
  return { rows, application: {
    id:row.id, status:row.status, applicant:row.applicant, submitted_at:row.submitted_at,
    questionnaire:JSON.parse(row.questionnaire),
    documents:db.prepare('SELECT id,name FROM documents WHERE application_id=? ORDER BY id').all(id),
    requests:db.prepare('SELECT id,comment,created_at,resolved_at FROM supplement_requests WHERE application_id=? ORDER BY id DESC').all(id),
    history:db.prepare('SELECT h.status,h.changed_at,h.comment,u.name FROM status_history h JOIN users u ON u.id=h.changed_by WHERE h.application_id=? ORDER BY h.id').all(id),
    result:decision ? { ...JSON.parse(decision.decision), issuedAt:decision.issued_at, specialist:decision.specialist } : null
  } };
}

function recordStatus(id, user, status, comment = '') {
  db.prepare('UPDATE applications SET status=? WHERE id=?').run(status,id);
  db.prepare('INSERT INTO status_history (application_id,changed_by,status,changed_at,comment) VALUES (?,?,?,?,?)').run(id,user.id,status,timestamp(),comment);
}

function saveDocuments(id, files) {
  const insert = db.prepare('INSERT INTO documents (application_id,name,data) VALUES (?,?,?)');
  for (const file of files) insert.run(id,file.name,file.data);
}

export function readDocument(user, id) {
  const document = db.prepare('SELECT * FROM documents WHERE id=?').get(id);
  if (!document) throw new InputError('Документ недоступен.');
  getApplication(user,document.application_id);
  return document;
}

export function submit(user, questionnaire, files) {
  if (user.role !== 'applicant') throw new InputError('Подать заявку может только заявитель.');
  return transaction(() => {
    const {lastInsertRowid:id} = db.prepare('INSERT INTO applications (applicant_id,questionnaire,status,submitted_at) VALUES (?,?,?,?)').run(user.id,JSON.stringify(questionnaire),'submitted',timestamp());
    saveDocuments(id,files);
    recordStatus(id,user,'submitted');
    return Number(id);
  });
}

export function updateApplication(user,id,action,{comment='',questionnaire,files=[]} = {}) {
  return transaction(() => {
    const row = getApplication(user,id);
    const open = db.prepare('SELECT id FROM supplement_requests WHERE application_id=? AND resolved_at IS NULL').get(id);
    if (action === 'supplement') {
      if (user.role !== 'applicant' || row.status !== 'needs_info' || !open) throw new InputError('Сейчас заявка не требует дополнений.');
      db.prepare('UPDATE applications SET questionnaire=? WHERE id=?').run(JSON.stringify(questionnaire),id);
      saveDocuments(id,files);
      db.prepare('UPDATE supplement_requests SET resolved_at=? WHERE id=?').run(timestamp(),open.id);
      recordStatus(id,user,'review','Заявитель отправил дополнения.');
      return;
    }
    if (user.role !== 'specialist') throw new InputError('Действие доступно специалисту.');
    if (action === 'start' && row.status === 'submitted') {
      recordStatus(id,user,'review');
      return;
    }
    if (open) throw new InputError('Дождитесь ответа заявителя на запрос дополнений.');
    if (row.status !== 'review') throw new InputError('Действие доступно для заявки на рассмотрении.');
    if (action === 'request') {
      if (!comment || comment.length > 1000) throw new InputError('Укажите, что нужно дополнить, до 1000 символов.');
      db.prepare('INSERT INTO supplement_requests (application_id,specialist_id,comment,created_at) VALUES (?,?,?,?)').run(id,user.id,comment,timestamp());
      recordStatus(id,user,'needs_info',comment);
      return;
    }
    if (action === 'complete') {
      const decision = determineRoute(JSON.parse(row.questionnaire));
      db.prepare('INSERT INTO results VALUES (?,?,?,?,?)').run(id,user.id,decision.code,JSON.stringify(decision),timestamp());
      recordStatus(id,user,'completed');
      return;
    }
    throw new InputError('Действие недоступно.');
  });
}
