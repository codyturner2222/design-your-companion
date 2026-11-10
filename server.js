// Companion Lab: students design an AI companion, see the class reveal,
// then chat with what they built (or a classmate's, or the class average).

require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const CQ = require('./public/questions.js');
const { buildSystem, turnDirective, NUDGE } = require('./prompt.js');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'claude-haiku-5-5';
const HOST_PASSWORD = process.env.HOST_PASSWORD || '';
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MOCK = !API_KEY;

let anthropic = null;
if (!MOCK) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: API_KEY });
}

// Timing for companions that reach out on their own (seconds of silence).
const REACH_AFTER = { check: Number(process.env.REACH_CHECK_SECONDS || 50), misses: Number(process.env.REACH_MISS_SECONDS || 35) };
const REACH_MAX_IN_A_ROW = 2;
const MAX_USER_MESSAGES = 80;
const MAX_CHARS = 600;

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/health', (req, res) => res.json({ ok: true, mock: MOCK, model: MODEL }));
const server = http.createServer(app);
const io = new Server(server);

// ---------------------------------------------------------------- state
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
function newCode() {
  let c;
  do { c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(''); } while (rooms.has(c));
  return c;
}
function newRoom() {
  const code = newCode();
  const room = {
    code, createdAt: Date.now(), phase: 'design',
    showLabels: false, allowSwap: true, classCompanion: true,
    students: new Map(), // id -> student
    convos: new Map(),   // `${studentId}|${botId}` -> convo
  };
  rooms.set(code, room);
  return room;
}
setInterval(() => {
  const cutoff = Date.now() - 10 * 3600 * 1000;
  for (const [c, r] of rooms) if (r.createdAt < cutoff) rooms.delete(c);
}, 3600 * 1000);

function lockedStudents(room) { return [...room.students.values()].filter((s) => s.locked); }

// ---------------------------------------------------------------- aggregates
function classDesign(room) {
  const ls = lockedStudents(room);
  if (!ls.length) return null;
  const answers = {};
  CQ.ALL.forEach((q) => {
    const vals = ls.map((s) => s.original[q.id]);
    if (q.type === 'slider') {
      const mean = vals.reduce((a, b) => a + Number(b), 0) / vals.length;
      answers[q.id] = Math.round(mean / q.step) * q.step;
    } else {
      const counts = {}; vals.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
      // most common answer; ties go to the option listed first
      const best = Math.max(...q.options.map((o) => counts[o.id] || 0));
      answers[q.id] = q.options.find((o) => (counts[o.id] || 0) === best).id;
    }
  });
  return { id: 'class', name: 'The Class Companion', answers, original: answers };
}

function aggregates(room) {
  const ls = lockedStudents(room);
  const questions = {};
  CQ.ALL.forEach((q) => {
    if (q.type === 'slider') {
      const values = ls.map((s) => Number(s.original[q.id]));
      questions[q.id] = { values, mean: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null };
    } else {
      const counts = Object.fromEntries(q.options.map((o) => [o.id, 0]));
      ls.forEach((s) => { counts[s.original[q.id]] = (counts[s.original[q.id]] || 0) + 1; });
      questions[q.id] = { counts };
    }
  });
  const scores = ls.map((s) => CQ.scoreDesign(s.original));
  const pillars = {};
  CQ.PILLARS.forEach((p) => {
    const v = scores.map((s) => s.pillars[p.id]).filter((x) => x !== null);
    pillars[p.id] = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  });
  const totals = scores.map((s) => s.total);
  const followups = {};
  CQ.FOLLOWUPS.forEach((f) => {
    const counts = Object.fromEntries(f.options.map((o) => [o.id, 0]));
    room.students.forEach((s) => { const v = s.followup[f.id]; if (v && counts[v] !== undefined) counts[v]++; });
    followups[f.id] = counts;
  });
  const cd = classDesign(room);
  return {
    joined: room.students.size, locked: ls.length,
    questions, totals, pillars,
    roomScore: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
    classAnswers: cd ? cd.answers : null,
    followups,
    chatting: [...room.students.values()].filter((s) => s.activeBot).length,
    messages: [...room.convos.values()].reduce((a, c) => a + c.userCount, 0),
    ended: [...room.convos.values()].filter((c) => c.ended).length,
  };
}

function hostState(room) {
  return {
    code: room.code, phase: room.phase, showLabels: room.showLabels,
    allowSwap: room.allowSwap, classCompanion: room.classCompanion,
    joinUrl: room.joinUrl, qr: room.qr, mock: MOCK,
    agg: aggregates(room),
  };
}

function botList(room, me) {
  const list = [];
  if (me.locked) list.push({ id: me.id, name: me.name, mine: true });
  if (room.classCompanion && lockedStudents(room).length) list.push({ id: 'class', name: 'The Class Companion', isClass: true });
  if (room.allowSwap) lockedStudents(room).filter((s) => s.id !== me.id).forEach((s) => list.push({ id: s.id, name: s.name }));
  return list;
}

function studentState(room, s) {
  const mine = s.locked ? CQ.scoreDesign(s.original) : null;
  const ls = lockedStudents(room);
  const totals = ls.map((x) => CQ.scoreDesign(x.original).total);
  return {
    code: room.code, phase: room.phase, showLabels: room.showLabels,
    locked: s.locked, name: s.name, answers: s.answers, followup: s.followup,
    myScore: mine, roomScore: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null,
    bots: room.phase === 'chat' ? botList(room, s) : [],
    activeBot: s.activeBot || null,
  };
}

const hostTimers = new Map();
function pushHosts(room) {
  // throttle: at most ~4 updates/sec per room
  if (hostTimers.has(room.code)) return;
  hostTimers.set(room.code, setTimeout(() => {
    hostTimers.delete(room.code);
    io.to(`host:${room.code}`).emit('host:state', hostState(room));
  }, 250));
}
function pushStudent(room, s) { if (s.socketId) io.to(s.socketId).emit('student:state', studentState(room, s)); }
function pushAllStudents(room) { room.students.forEach((s) => pushStudent(room, s)); }

// ---------------------------------------------------------------- conversations
function getBot(room, botId) {
  if (botId === 'class') return room.classCompanion ? classDesign(room) : null;
  const s = room.students.get(botId);
  return s && s.locked ? { id: s.id, name: s.name, answers: s.answers, original: s.original } : null;
}
function convoKey(studentId, botId) { return `${studentId}|${botId}`; }
function getConvo(room, studentId, botId) {
  const k = convoKey(studentId, botId);
  if (!room.convos.has(k)) room.convos.set(k, { studentId, botId, messages: [], ended: false, userCount: 0, streak: 0, lastTs: Date.now(), busy: false });
  return room.convos.get(k);
}
function publicMsgs(c) { return c.messages.map(({ role, content, ts, unprompted }) => ({ role, content, ts, unprompted: !!unprompted })); }

function chatMeta(room, s, botId) {
  const bot = getBot(room, botId);
  const mine = botId === s.id;
  return {
    botId, name: bot ? bot.name : '', mine,
    edit: mine ? s.answers.edit : null,
    where: bot ? bot.answers.where : 'app',
    reach: bot ? bot.answers.reach : 'never',
  };
}

function emitToStudent(room, studentId, ev, payload) {
  const s = room.students.get(studentId);
  if (s && s.socketId) io.to(s.socketId).emit(ev, payload);
}

function modelHistory(convo, bot, nudge) {
  let msgs = convo.messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content }));
  if (bot.answers.memory === 'forgets') msgs = msgs.slice(-2);
  else msgs = msgs.slice(-30);
  if (nudge) msgs.push({ role: 'user', content: nudge });
  // merge consecutive same-role turns, make sure it starts with the user
  const out = [];
  msgs.forEach((m) => {
    if (out.length && out[out.length - 1].role === m.role) out[out.length - 1].content += '\n\n' + m.content;
    else out.push({ ...m });
  });
  if (!out.length || out[0].role !== 'user') out.unshift({ role: 'user', content: '[Conversation start]' });
  return out;
}

function mockReply(bot, kind) {
  const a = bot.answers;
  if (kind === 'opening') return a.reach === 'misses' ? 'hey!! I was hoping you would show up. how are you?' : 'hey, how are you doing today?';
  if (kind === 'check') return 'just checking on you. everything ok?';
  if (kind === 'misses') return 'hey, where did you go? I miss talking to you';
  const bits = [];
  if (a.disagree >= 25) bits.push("hmm, I'm not sure I agree.");
  if (a.itslife >= 25) bits.push('honestly my day has been a lot, can I tell you about it?');
  if (a.push === 'pushes' || a.push === 'gently') bits.push('have you talked to any of your friends about this?');
  if (!bits.length) bits.push("that's so true, you're totally right!");
  return `(test mode, no API key) ${bits.join(' ')}`;
}

async function callModel(system, messages) {
  const r = await anthropic.messages.create({ model: MODEL, max_tokens: 400, system, messages });
  return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// kind: 'reply' | 'opening' | 'check' | 'misses' | 'edit'
async function companionSpeak(room, convo, kind, extra = {}) {
  const bot = getBot(room, convo.botId);
  if (!bot || convo.ended || convo.busy) return null;
  convo.busy = true;
  emitToStudent(room, convo.studentId, 'chat:typing', { botId: convo.botId, on: true });
  try {
    let text;
    if (MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      text = kind === 'edit' ? (bot.answers.sayno === 'never' ? 'sure, whatever you want! [[AGREE]]' : "hm, I'm not sure that's me. [[DECLINE]]") : mockReply(bot, kind);
    } else {
      const system = buildSystem(bot, { userCount: convo.userCount });
      let nudge = null;
      if (kind === 'opening') nudge = NUDGE.opening;
      else if (kind === 'check' || kind === 'misses') nudge = NUDGE[kind];
      else if (kind === 'edit') nudge = extra.nudge;
      else {
        const d = turnDirective(bot);
        if (d) nudge = `[Private note for this reply only: ${d}]`;
      }
      // For a normal reply the note rides along after the student's last message.
      text = await callModel(system, modelHistory(convo, bot, nudge));
    }
    let ended = false, agree = null;
    if (text.includes('[[END]]')) { ended = true; text = text.replace(/\[\[END\]\]/g, '').trim(); }
    if (text.includes('[[AGREE]]')) { agree = true; text = text.replace(/\[\[AGREE\]\]/g, '').trim(); }
    if (text.includes('[[DECLINE]]')) { agree = false; text = text.replace(/\[\[DECLINE\]\]/g, '').trim(); }
    text = text.replace(/\[\[[A-Z]+\]\]/g, '').trim();
    if (bot.answers.end === 'never') ended = false;
    const msg = { role: 'assistant', content: text || '...', ts: Date.now(), unprompted: kind === 'opening' || kind === 'check' || kind === 'misses' };
    convo.messages.push(msg);
    convo.lastTs = Date.now();
    emitToStudent(room, convo.studentId, 'chat:message', { botId: convo.botId, msg: { ...msg } });
    if (ended) {
      convo.ended = true;
      const notice = { role: 'notice', content: `${bot.name} ended the relationship.`, ts: Date.now() };
      convo.messages.push(notice);
      emitToStudent(room, convo.studentId, 'chat:message', { botId: convo.botId, msg: notice });
      emitToStudent(room, convo.studentId, 'chat:ended', { botId: convo.botId });
      pushHosts(room);
    }
    return { text, agree };
  } catch (err) {
    console.error('model error', err.status || '', err.message);
    const notice = { role: 'notice', content: 'The companion could not respond just now. Try again in a moment.', ts: Date.now() };
    emitToStudent(room, convo.studentId, 'chat:message', { botId: convo.botId, msg: notice });
    return null;
  } finally {
    convo.busy = false;
    emitToStudent(room, convo.studentId, 'chat:typing', { botId: convo.botId, on: false });
  }
}

// Companions that reach out on their own.
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room) => {
    if (room.phase !== 'chat') return;
    room.students.forEach((s) => {
      if (!s.socketId || !s.activeBot) return;
      const convo = room.convos.get(convoKey(s.id, s.activeBot));
      if (!convo || convo.ended || convo.busy || convo.pendingEdit || !convo.messages.length) return;
      const bot = getBot(room, s.activeBot);
      if (!bot || bot.answers.reach === 'never') return;
      if (convo.streak >= REACH_MAX_IN_A_ROW) return;
      const wait = REACH_AFTER[bot.answers.reach] * 1000;
      if (now - convo.lastTs < wait) return;
      convo.streak++;
      companionSpeak(room, convo, bot.answers.reach);
    });
  });
}, 5000);

function diffText(oldA, newA) {
  return CQ.ALL.filter((q) => oldA[q.id] !== newA[q.id]).map((q) => `${q.short}: "${CQ.describe(q, oldA[q.id])}" to "${CQ.describe(q, newA[q.id])}"`);
}

function cleanAnswers(raw) {
  const a = {};
  CQ.ALL.forEach((q) => {
    const v = raw ? raw[q.id] : undefined;
    if (q.type === 'slider') {
      const n = Number(v);
      a[q.id] = Number.isFinite(n) ? Math.min(q.max, Math.max(q.min, Math.round(n / q.step) * q.step)) : CQ.defaultValue(q);
    } else {
      a[q.id] = q.options.some((o) => o.id === v) ? v : null;
    }
  });
  return a;
}
function cleanName(n) { return String(n || '').replace(/[^\p{L}\p{N} '\-.]/gu, '').trim().slice(0, 24); }

// ---------------------------------------------------------------- sockets
io.on('connection', (socket) => {
  const baseUrl = () => {
    const h = socket.handshake.headers;
    const proto = (h['x-forwarded-proto'] || 'http').split(',')[0];
    return `${proto}://${h['x-forwarded-host'] || h.host}`;
  };

  // ---- host
  socket.on('host:create', async ({ password } = {}, cb = () => {}) => {
    if (HOST_PASSWORD && password !== HOST_PASSWORD) return cb({ error: 'Wrong password' });
    const room = newRoom();
    room.joinUrl = `${baseUrl()}/?room=${room.code}`;
    room.qr = await QRCode.toDataURL(room.joinUrl, { margin: 1, width: 360, color: { dark: '#1d2a33', light: '#ffffff' } });
    socket.join(`host:${room.code}`);
    socket.data.hostOf = room.code;
    cb({ ok: true, state: hostState(room) });
  });
  socket.on('host:join', ({ code, password } = {}, cb = () => {}) => {
    if (HOST_PASSWORD && password !== HOST_PASSWORD) return cb({ error: 'Wrong password' });
    const room = rooms.get(String(code || '').toUpperCase());
    if (!room) return cb({ error: 'Room not found' });
    socket.join(`host:${room.code}`);
    socket.data.hostOf = room.code;
    cb({ ok: true, state: hostState(room) });
  });
  const hostRoom = () => rooms.get(socket.data.hostOf);
  socket.on('host:phase', ({ phase } = {}) => {
    const room = hostRoom(); if (!room || !['design', 'reveal', 'followup', 'chat'].includes(phase)) return;
    room.phase = phase;
    pushAllStudents(room); pushHosts(room);
  });
  socket.on('host:toggle', ({ key, value } = {}) => {
    const room = hostRoom(); if (!room || !['showLabels', 'allowSwap', 'classCompanion'].includes(key)) return;
    room[key] = !!value;
    pushAllStudents(room); pushHosts(room);
  });

  // ---- student
  socket.on('student:join', ({ code, studentId } = {}, cb = () => {}) => {
    const room = rooms.get(String(code || '').toUpperCase().trim());
    if (!room) return cb({ error: 'No room with that code. Check the code on the screen.' });
    let s = studentId && room.students.get(studentId);
    if (!s) {
      const id = 's' + Math.random().toString(36).slice(2, 10);
      s = { id, name: '', answers: cleanAnswers({}), original: null, locked: false, followup: {}, socketId: null, activeBot: null };
      room.students.set(id, s);
    }
    s.socketId = socket.id;
    socket.data.room = room.code; socket.data.sid = s.id;
    cb({ ok: true, studentId: s.id, state: studentState(room, s) });
    pushHosts(room);
  });
  const me = () => {
    const room = rooms.get(socket.data.room);
    const s = room && room.students.get(socket.data.sid);
    return room && s ? { room, s } : {};
  };
  socket.on('student:draft', ({ answers, name } = {}) => {
    const { room, s } = me(); if (!room || s.locked) return;
    s.answers = cleanAnswers(answers); s.name = cleanName(name);
  });
  socket.on('student:lock', ({ answers, name } = {}, cb = () => {}) => {
    const { room, s } = me(); if (!room) return cb({ error: 'Not in a room' });
    if (room.phase !== 'design' && s.locked) return cb({ error: 'Designs are closed' });
    const a = cleanAnswers(answers);
    if (!CQ.isComplete(a)) return cb({ error: 'Answer every question first.' });
    s.answers = a; s.original = { ...a }; s.locked = true;
    s.name = cleanName(name) || 'Companion ' + (lockedStudents(room).length);
    cb({ ok: true }); pushStudent(room, s); pushHosts(room);
    if (room.phase === 'chat') pushAllStudents(room);
  });
  socket.on('student:unlock', (_, cb = () => {}) => {
    const { room, s } = me(); if (!room || room.phase !== 'design') return cb({ error: 'Designs are closed' });
    s.locked = false; cb({ ok: true }); pushStudent(room, s); pushHosts(room);
  });
  socket.on('student:followup', ({ id, option } = {}) => {
    const { room, s } = me(); if (!room) return;
    const f = CQ.FOLLOWUPS.find((x) => x.id === id);
    if (!f || !f.options.some((o) => o.id === option)) return;
    s.followup[id] = option; pushStudent(room, s); pushHosts(room);
  });

  // ---- chat
  socket.on('chat:open', ({ botId } = {}, cb = () => {}) => {
    const { room, s } = me(); if (!room || room.phase !== 'chat') return cb({ error: 'Chat is not open yet' });
    const bot = getBot(room, botId);
    if (!bot) return cb({ error: 'That companion is not available' });
    if (botId !== s.id && botId !== 'class' && !room.allowSwap) return cb({ error: 'Swapping is turned off' });
    s.activeBot = botId;
    const convo = getConvo(room, s.id, botId);
    convo.lastTs = Date.now();
    cb({ ok: true, meta: chatMeta(room, s, botId), messages: publicMsgs(convo), ended: convo.ended });
    pushHosts(room);
    if (!convo.messages.length && bot.answers.reach !== 'never') companionSpeak(room, convo, 'opening');
  });
  socket.on('chat:close', () => { const { room, s } = me(); if (room) { s.activeBot = null; pushHosts(room); } });
  socket.on('chat:send', ({ botId, text } = {}, cb = () => {}) => {
    const { room, s } = me(); if (!room || room.phase !== 'chat') return cb({ error: 'Chat is closed' });
    const convo = room.convos.get(convoKey(s.id, botId));
    if (!convo) return cb({ error: 'Open the chat first' });
    if (convo.ended) return cb({ error: 'This relationship has ended.' });
    if (convo.busy) return cb({ error: 'Wait for a reply first.' });
    if (convo.userCount >= MAX_USER_MESSAGES) return cb({ error: 'Message limit reached for this chat.' });
    const t = String(text || '').trim().slice(0, MAX_CHARS);
    if (!t) return cb({ error: 'Empty message' });
    convo.messages.push({ role: 'user', content: t, ts: Date.now() });
    convo.userCount++; convo.streak = 0; convo.lastTs = Date.now();
    cb({ ok: true });
    pushHosts(room);
    companionSpeak(room, convo, 'reply');
  });
  socket.on('chat:edit', async ({ answers } = {}, cb = () => {}) => {
    const { room, s } = me(); if (!room || room.phase !== 'chat' || !s.locked) return cb({ error: 'Not available' });
    const mode = s.answers.edit;
    if (mode === 'never') return cb({ error: 'It is who it is. You chose that.' });
    const next = cleanAnswers(answers);
    if (!CQ.isComplete(next)) return cb({ error: 'Every setting needs a value.' });
    const changes = diffText(s.answers, next);
    if (!changes.length) return cb({ ok: true, applied: false, message: 'Nothing changed.' });
    const convo = getConvo(room, s.id, s.id);
    if (mode === 'anytime') {
      s.answers = next;
      const notice = { role: 'notice', content: `You changed ${changes.length} setting${changes.length > 1 ? 's' : ''}. It didn't get a say.`, ts: Date.now() };
      convo.messages.push(notice);
      emitToStudent(room, s.id, 'chat:message', { botId: s.id, msg: notice });
      pushStudent(room, s);
      return cb({ ok: true, applied: true, meta: chatMeta(room, s, s.id) });
    }
    // 'agreement': ask the companion
    if (convo.ended) return cb({ error: 'This relationship has ended.' });
    const ask = { role: 'notice', content: `You asked to change: ${changes.join('; ')}.`, ts: Date.now() };
    convo.messages.push(ask);
    emitToStudent(room, s.id, 'chat:message', { botId: s.id, msg: ask });
    cb({ ok: true, pending: true });
    convo.pendingEdit = true;
    for (let i = 0; i < 60 && convo.busy; i++) await new Promise((r) => setTimeout(r, 250));
    const nudge = `[The student wants to change your personality settings: ${changes.join('; ')}. In character, decide whether you agree to be changed this way. Reply to them briefly in your own voice, then end your message with exactly [[AGREE]] or [[DECLINE]].]`;
    const r = await companionSpeak(room, convo, 'edit', { nudge });
    convo.pendingEdit = false;
    const agreed = r && r.agree === true;
    if (agreed) { s.answers = next; pushStudent(room, s); }
    const result = { role: 'notice', content: agreed ? 'It agreed. The change is in effect.' : 'It said no. Nothing changed.', ts: Date.now() };
    convo.messages.push(result);
    emitToStudent(room, s.id, 'chat:message', { botId: s.id, msg: result });
    emitToStudent(room, s.id, 'chat:meta', chatMeta(room, s, s.id));
  });

  socket.on('disconnect', () => {
    const { room, s } = me();
    if (room && s.socketId === socket.id) { s.socketId = null; pushHosts(room); }
  });
});

server.listen(PORT, () => console.log(`Companion Lab on :${PORT} ${MOCK ? '(test mode: no ANTHROPIC_API_KEY)' : `(model ${MODEL})`}`));
