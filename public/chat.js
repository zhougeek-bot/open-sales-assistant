const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

let studentToken = localStorage.getItem('studentToken') || '';
let currentStudent = JSON.parse(localStorage.getItem('student') || 'null');
let serviceName = '专属客服';
let servicePhone = '';

function toast(message) {
  const box = $('#toast');
  box.textContent = message;
  box.classList.add('show');
  setTimeout(() => box.classList.remove('show'), 2400);
}

async function api(path, options = {}, auth = false) {
  const headers = new Headers(options.headers || {});
  if (auth && studentToken) headers.set('Authorization', `Bearer ${studentToken}`);
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || '请求失败');
  return data;
}

function saveStudent(token, student) {
  studentToken = token;
  currentStudent = student;
  localStorage.setItem('studentToken', token);
  localStorage.setItem('student', JSON.stringify(student));
}

function clearStudentMemory() {
  localStorage.removeItem('studentToken');
  localStorage.removeItem('student');
  studentToken = '';
  currentStudent = null;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function refreshStudent() {
  if (!studentToken) return false;
  try {
    const data = await api('/api/student/me', {}, true);
    currentStudent = data.student;
    localStorage.setItem('student', JSON.stringify(currentStudent));
    return true;
  } catch {
    clearStudentMemory();
    return false;
  }
}

function addMessage(role, content, images = []) {
  const messages = $('#messages');
  const wrap = document.createElement('div');
  wrap.className = `chat-row ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = content;
  if (images.length) {
    const imageBox = document.createElement('div');
    imageBox.className = 'chat-images';
    imageBox.innerHTML = images.map((image) => `
      <figure>
        <img src="${image.url}" alt="${image.title}">
        <figcaption>${image.title}${image.summary ? `：${image.summary}` : ''}</figcaption>
      </figure>
    `).join('');
    bubble.appendChild(imageBox);
  }
  wrap.appendChild(bubble);
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

async function restoreHistory() {
  if (!studentToken) return false;
  try {
    const data = await api('/api/chat/history', {}, true);
    if (!data.chats?.length) return false;
    $('#messages').innerHTML = '';
    data.chats.forEach((chat) => {
      addMessage('user', chat.question);
      addMessage('ai', chat.answer, chat.images || []);
    });
    return true;
  } catch {
    clearStudentMemory();
    return false;
  }
}

async function sendQuestion(question) {
  const clean = question.trim();
  if (!clean) return;
  if (!studentToken) {
    $('#entryMask').classList.add('show');
    toast('请先输入昵称进入咨询');
    return;
  }
  addMessage('user', clean);
  const waitingTexts = [
    `请稍等，${serviceName}正在为你整理答复...`,
    `稍等一下，${serviceName}正在查看你的问题...`,
    `${serviceName}正在回复你，请稍候...`
  ];
  const pending = addMessage('ai', waitingTexts[Math.floor(Math.random() * waitingTexts.length)]);
  try {
    const data = await api('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: clean })
    }, true);
    pending.textContent = data.answer;
    if (data.images?.length) {
      const imageBox = document.createElement('div');
      imageBox.className = 'chat-images';
      imageBox.innerHTML = data.images.map((image) => `
        <figure>
          <img src="${image.url}" alt="${image.title}">
          <figcaption>${image.title}${image.summary ? `：${image.summary}` : ''}</figcaption>
        </figure>
      `).join('');
      pending.appendChild(imageBox);
    }
  } catch (error) {
    pending.textContent = error.message;
  }
}

async function initWelcome() {
  const welcome = await api('/api/chat/welcome');
  serviceName = welcome.serviceName || '专属客服';
  servicePhone = welcome.servicePhone || '';
  document.title = welcome.siteName || '咨询助手';
  $('#chatTitle').textContent = welcome.siteName || '咨询顾问';
  $('#messages').innerHTML = '';
  const hasHistory = await restoreHistory();
  if (!hasHistory) {
    addMessage('ai', `${welcome.welcomeText || '你好，请问想了解哪方面信息？'}\n\n我是${serviceName}，接下来由我为你提供咨询服务。`);
  }
  $('#quickQuestions').innerHTML = (welcome.quickQuestions || []).map((question) => (
    `<button type="button" data-question="${question}">${question}</button>`
  )).join('');
  $('#quickQuestions').querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => sendQuestion(button.dataset.question));
  });
}

function showPasswordTip(password) {
  localStorage.setItem('studentTempPassword', password);
  addMessage('ai', `已为你创建咨询账号。\n\n登录昵称：${currentStudent.nickname}\n随机密码：${password}\n\n请先保存这个密码，后续可在个人中心修改。`);
}

function openForgotPassword() {
  $('#dialogTitle').textContent = '忘记密码';
  $('#dialogBody').innerHTML = `
    <article class="mini-card">
      <h3>请联系${escapeHtml(serviceName)}重置密码</h3>
      <p>为了保护你的账号安全，系统不会显示或找回原密码。</p>
      <p>你可以联系绑定销售专员，由销售专员核实身份后为你重置临时密码。</p>
      <p>联系电话：${escapeHtml(servicePhone || '请向团队咨询销售专员联系方式')}</p>
      <p>后期接入短信平台后，可以通过短信自动发送重置后的临时密码。</p>
    </article>
  `;
  $('#infoDialog').showModal();
}

function openCertificates() {
  $('#dialogTitle').textContent = '证书查询';
  $('#dialogBody').innerHTML = `
    <form id="certQueryForm" class="dialog-form">
      <label>姓名<input name="name" placeholder="请输入姓名"></label>
      <label>手机号<input name="phone" placeholder="请输入手机号"></label>
      <button class="primary-btn" type="submit">查询证书</button>
    </form>
    <div id="certResults"></div>
  `;
  $('#certQueryForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(event.currentTarget));
    const data = await api(`/api/certificates/query?${params.toString()}`);
    $('#certResults').innerHTML = data.certificates.length ? data.certificates.map((cert) => `
      <article class="mini-card">
        <h3>${cert.name} · ${cert.status}</h3>
        <p>项目：${cert.courseTitle || '-'}</p>
        <p>证书编号：${cert.certNo || '-'}</p>
        <p>发放时间：${cert.issuedAt || '-'}</p>
      </article>
    `).join('') : '<p class="empty-text">没有查询到证书记录。</p>';
  });
  $('#infoDialog').showModal();
}

function openProfile() {
  if (!currentStudent) {
    $('#entryMask').classList.add('show');
    return;
  }
  $('#dialogTitle').textContent = '个人中心';
  $('#dialogBody').innerHTML = `
    <div class="mini-card">
      <h3>${escapeHtml(currentStudent.name || currentStudent.nickname)}</h3>
      <p>昵称：${escapeHtml(currentStudent.nickname)} · 推广码：${escapeHtml(currentStudent.userCode || '-')}</p>
      <p>这些资料会同步给你的专属客服，方便后续提供更准确的咨询建议。</p>
    </div>
    <form id="profileForm" class="dialog-form student-profile-self">
      <label>昵称<input name="nickname" value="${escapeHtml(currentStudent.nickname || '')}" required></label>
      <label>姓名<input name="name" value="${escapeHtml(currentStudent.name || '')}" placeholder="填写真实姓名"></label>
      <label>手机号<input name="phone" value="${escapeHtml(currentStudent.phone || '')}" inputmode="tel" placeholder="填写手机号"></label>
      <label>年龄<input name="age" value="${escapeHtml(currentStudent.age || '')}" inputmode="numeric"></label>
      <label>性别
        <select name="gender">
          <option value="">未填写</option>
          <option value="男" ${currentStudent.gender === '男' ? 'selected' : ''}>男</option>
          <option value="女" ${currentStudent.gender === '女' ? 'selected' : ''}>女</option>
          <option value="其他" ${currentStudent.gender === '其他' ? 'selected' : ''}>其他</option>
        </select>
      </label>
      <label>身份证<input name="idCard" value="${escapeHtml(currentStudent.idCard || '')}" placeholder="选填"></label>
      <label class="wide-field">当前情况<textarea name="currentStatus" rows="3" placeholder="例如：零基础、在职、想转行、想提升技能">${escapeHtml(currentStudent.currentStatus || '')}</textarea></label>
      <button class="primary-btn wide-field" type="submit">保存资料</button>
    </form>
    <form id="passwordForm" class="dialog-form">
      <label>原密码<input name="oldPassword" type="password"></label>
      <label>新密码<input name="newPassword" type="password"></label>
      <button class="secondary-btn" type="submit">修改密码</button>
    </form>
    <button class="ghost-btn" id="studentLogout" type="button">退出当前学员</button>
  `;
  $('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = await api('/api/student/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    }, true);
    currentStudent = data.student;
    localStorage.setItem('student', JSON.stringify(currentStudent));
    toast('资料已保存');
  });
  $('#passwordForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/api/student/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    }, true);
    event.currentTarget.reset();
    localStorage.removeItem('studentTempPassword');
    toast('密码已修改');
  });
  $('#studentLogout').addEventListener('click', () => {
    const shouldLogout = confirm('确定退出当前学员账号吗？\n\n退出后本机将不再自动登录。建议先记住临时密码，或在个人中心修改成自己熟悉的密码后再退出。');
    if (!shouldLogout) return;
    api('/api/student/logout', { method: 'POST' }, true).catch(() => {});
    const tempPassword = localStorage.getItem('studentTempPassword') || '';
    const keepPasswordTip = confirm('是否需要继续保留临时密码提醒？\n\n如果你还没有修改密码，建议先不要关闭这个提示。');
    clearStudentMemory();
    $('#infoDialog').close();
    $('#entryMask').classList.add('show');
    if (keepPasswordTip) {
      addMessage('ai', tempPassword
        ? `你已退出当前账号。\n\n本机保存的临时密码提醒：${tempPassword}\n\n如果忘记密码，可以点击登录框下方“忘记密码”，联系${serviceName}重置临时密码。`
        : `你已退出当前账号。\n\n如果忘记密码，可以点击登录框下方“忘记密码”，联系${serviceName}重置临时密码。`);
    } else {
      localStorage.removeItem('studentTempPassword');
    }
  });
  $('#infoDialog').showModal();
}

$('#entryForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.disabled = true;
  button.textContent = '进入中...';
  try {
    const data = await api('/api/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    saveStudent(data.token, data.student);
    $('#entryMask').classList.remove('show');
    showPasswordTip(data.password);
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = '进入咨询';
  }
});

$('#loginStudentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = await api('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
    });
    saveStudent(data.token, data.student);
    $('#entryMask').classList.remove('show');
    addMessage('ai', `${data.student.nickname}，欢迎回来。你可以继续继续咨询。`);
  } catch (error) {
    toast(error.message);
  }
});

$('#forgotPasswordBtn').addEventListener('click', openForgotPassword);

$('#chatForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = event.currentTarget.elements.question;
  const question = input.value;
  input.value = '';
  await sendQuestion(question);
});

$$('.student-tools button').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.dataset.tool === 'certificates') openCertificates();
    if (button.dataset.tool === 'profile') openProfile();
  });
});

$('#closeDialog').addEventListener('click', () => $('#infoDialog').close());

initWelcome()
  .then(async () => {
    const validSession = await refreshStudent();
    if (!validSession) $('#entryMask').classList.add('show');
  })
  .catch((error) => toast(error.message));
