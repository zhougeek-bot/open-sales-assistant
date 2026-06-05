const I18N_STORAGE_KEY = 'openSalesAssistantLang';
const supportedLangs = new Set(['zh-CN', 'en']);

const exactText = {
  '咨询助手': 'Sales Assistant',
  '咨询顾问': 'Sales Advisor',
  '在线咨询 · 知识库智能答复': 'Online sales consultation · Knowledge-base answers',
  '在线': 'Online',
  '证书查询': 'Certificate Lookup',
  '个人中心': 'Profile',
  '发送': 'Send',
  '进入咨询助手': 'Enter Sales Assistant',
  '请输入昵称，系统会为你生成随机密码。昵称就是后续登录名，密码可以在个人中心修改。': 'Enter a nickname. The system will generate a temporary password. Your nickname is your login name and the password can be changed in Profile.',
  '昵称': 'Nickname',
  '进入咨询': 'Start Chat',
  '已有账号登录': 'Existing Account',
  '登录': 'Log In',
  '忘记密码？': 'Forgot password?',
  '详情': 'Details',
  '关闭': 'Close',
  '后台登录': 'Admin Login',
  '开源团队销售助手': 'Open Team Sales Assistant',
  '知识库后台登录': 'Knowledge Base Admin Login',
  '管理员账号': 'Admin Username',
  '登录密码': 'Password',
  '登录后台': 'Log In',
  '知识库后台管理': 'Knowledge Base Admin',
  '服务检测中': 'Checking service',
  '未登录': 'Not logged in',
  '打开前台咨询': 'Open Chat',
  '退出': 'Log Out',
  '总览': 'Overview',
  '学员管理': 'Customers',
  '证书维护': 'Certificates',
  '素材管理': 'Materials',
  '知识库编辑': 'Knowledge Base',
  '咨询配置': 'Settings',
  '知识库总览': 'Knowledge Overview',
  'AI 全量整理知识库': 'Regenerate Knowledge with AI',
  '素材数量': 'Materials',
  '图片素材': 'Images',
  '常见问题': 'FAQ',
  '销售话术': 'Sales Playbook',
  '当前知识库摘要': 'Current Knowledge Summary',
  '暂无知识库内容。': 'No knowledge content yet.',
  '最近操作日志': 'Recent Operation Logs',
  '暂无操作日志': 'No operation logs yet',
  '学员列表': 'Customer List',
  '最近注册': 'Newest',
  '最近咨询': 'Recent Chat',
  '意向值高到低': 'Intent: High to Low',
  '聊天最多': 'Most Chats',
  '昵称 A-Z': 'Nickname A-Z',
  '暂无学员': 'No customers',
  '上一页': 'Previous',
  '下一页': 'Next',
  '请选择一位学员查看画像。': 'Select a customer to view the profile.',
  '学员画像': 'Customer Profile',
  'AI 分析': 'AI Analysis',
  '删除学员': 'Delete Customer',
  '聊天记录': 'Chat History',
  '姓名': 'Name',
  '电话': 'Phone',
  '年龄': 'Age',
  '性别': 'Gender',
  '未填写': 'Not set',
  '男': 'Male',
  '女': 'Female',
  '其他': 'Other',
  '身份证': 'ID Number',
  '意向值': 'Intent',
  '未知': 'Unknown',
  '低': 'Low',
  '中': 'Medium',
  '高': 'High',
  '现状': 'Current Status',
  '学员画像摘要': 'Profile Summary',
  '建议下一步跟进': 'Suggested Next Follow-up',
  '保存学员资料': 'Save Customer',
  '暂无 AI 分析。': 'No AI analysis yet.',
  '新增跟进记录': 'New Follow-up',
  '保存跟进': 'Save Follow-up',
  '暂无聊天记录。': 'No chat history yet.',
  '新增证书': 'Add Certificate',
  '手机号': 'Phone',
  '项目/证书名称': 'Program / Certificate',
  '证书编号': 'Certificate No.',
  '状态': 'Status',
  '发放时间': 'Issued At',
  '保存证书': 'Save Certificate',
  '批量导入证书': 'Import Certificates',
  '支持 Excel / CSV。表头建议：姓名、手机号、项目、证书编号、状态、发放时间。': 'Supports Excel / CSV. Suggested columns: name, phone, program, certificate number, status, issued at.',
  '导入证书': 'Import Certificates',
  '证书列表': 'Certificate List',
  '暂无证书': 'No certificates',
  '刷新数据': 'Refresh',
  '添加文字素材': 'Add Text Material',
  '分类': 'Category',
  '标题': 'Title',
  '内容': 'Content',
  '保存并 AI 分析': 'Save and Analyze with AI',
  '上传文档 / 图片': 'Upload Documents / Images',
  '统一标题': 'Shared Title',
  '补充说明': 'Notes',
  '上传并 AI 分析': 'Upload and Analyze with AI',
  '素材列表': 'Material List',
  '暂无素材': 'No materials',
  '保存知识库': 'Save Knowledge',
  '知识库摘要': 'Knowledge Summary',
  '按场景维护销售可用话术，上传素材只会生成待审核建议，不会自动覆盖这里。': 'Maintain reusable sales scripts by scenario. Uploaded materials only create reviewable suggestions and never overwrite this section automatically.',
  '添加话术': 'Add Script',
  '填写学员常问的问题和标准答复。': 'Maintain common customer questions and standard replies.',
  '添加问题': 'Add Question',
  '顾虑应对': 'Objection Handling',
  '填写学员常见顾虑和销售应对话术。': 'Maintain common objections and suggested sales responses.',
  '添加顾虑': 'Add Objection',
  'AI 待审核建议': 'AI Suggestions Pending Review',
  '素材分析后会进入这里。采纳后才进入正式知识库，忽略则不再显示。': 'Material analysis creates suggestions here. Accepted items enter the official knowledge base; ignored items are hidden.',
  '咨询配置': 'Chat Settings',
  '保存配置': 'Save Settings',
  '前台名称': 'Chat Site Name',
  '欢迎语': 'Welcome Message',
  '绑定客服名称': 'Assigned Advisor Name',
  '绑定客服电话': 'Advisor Phone',
  '销售顾问人设': 'Sales Advisor Persona',
  '答复收尾引导': 'Closing Guidance',
  '安全边界': 'Safety Rules',
  '问题': 'Question',
  '标准答复': 'Standard Reply',
  '顾虑': 'Objection',
  '应对话术': 'Response Script',
  '话术标题': 'Script Title',
  '使用场景': 'Scenario',
  '话术内容': 'Script Content',
  '删除': 'Delete',
  '采纳': 'Accept',
  '忽略': 'Ignore',
  '保存资料': 'Save Profile',
  '原密码': 'Current Password',
  '新密码': 'New Password',
  '修改密码': 'Change Password',
  '退出当前学员': 'Log Out Current Customer'
};

const exactAttributes = {
  '请输入你想咨询的问题': 'Enter your question',
  '例如：小李同学': 'e.g. Alex',
  '昵称': 'Nickname',
  '密码': 'Password',
  '请输入账号': 'Enter username',
  '请输入密码': 'Enter password',
  '搜索昵称、姓名、电话、现状': 'Search nickname, name, phone, status',
  'AI 可根据聊天记录识别': 'AI can infer this from chat history',
  '例如：零基础、想转行、已从业想提升、在职时间有限': 'e.g. beginner, career change, experienced, limited time',
  '例如：运动康复结业证书': 'e.g. Rehabilitation Course Certificate',
  '学习中 / 已结业 / 办理中 / 已发放': 'Studying / Completed / Processing / Issued',
  '项目介绍 / 证书政策 / 售前话术': 'Program intro / Certificate policy / Pre-sales script',
  '例如：健康管理师项目介绍': 'e.g. Health Management Program Intro',
  '粘贴项目介绍、销售话术、FAQ、证书说明等': 'Paste program intro, sales scripts, FAQ, certificate notes, etc.',
  '图片素材 / 项目资料 / 证书样例': 'Image material / Program docs / Certificate sample',
  '不填则使用文件名': 'Use file name if empty',
  '说明图片或文档适合什么咨询场景': 'Describe when this image or document should be used',
  '概括团队、产品、适合人群、核心卖点等': 'Summarize team, product, audience, key selling points, etc.',
  '例如：零基础可以学吗？': 'e.g. Can beginners join?',
  '填写销售顾问可直接使用的答复': 'Write a reply that sales advisors can use directly',
  '例如：担心工作忙没时间上课': 'e.g. Worried about having no time after work',
  '填写安抚、解释和引导下一步的话术': 'Write a response that reassures, explains, and guides the next step',
  '例如：张老师': 'e.g. Alex',
  '例如：13800000000': 'e.g. +1 555 000 0000',
  '请输入姓名': 'Enter name',
  '请输入手机号': 'Enter phone',
  '填写真实姓名': 'Enter real name',
  '填写手机号': 'Enter phone',
  '选填': 'Optional',
  '例如：零基础、在职、想转行、想提升技能': 'e.g. beginner, employed, career change, skill improvement'
};

const phraseRules = [
  [/(\d+)\s*人/g, '$1 people'],
  [/第\s*(\d+)\s*\/\s*(\d+)\s*页/g, 'Page $1 / $2'],
  [/第\s*(\d+)\s*页/g, 'Page $1'],
  [/(\d+)\s*条待审核/g, '$1 pending'],
  [/聊天\s*(\d+)\s*条/g, '$1 chats'],
  [/未留电话/g, 'No phone'],
  [/暂无现状/g, 'No status'],
  [/最近咨询：/g, 'Last chat: '],
  [/最近登录：/g, 'Last login: '],
  [/注册：/g, 'Registered: '],
  [/编号：/g, 'Code: '],
  [/意向：/g, 'Intent: '],
  [/顾虑：/g, 'Objections: '],
  [/关注项目：/g, 'Interested in: '],
  [/下一步：/g, 'Next step: '],
  [/分析时间：/g, 'Analyzed at: '],
  [/手机号：/g, 'Phone: '],
  [/项目：/g, 'Program: '],
  [/证书编号：/g, 'Certificate No.: '],
  [/发放时间：/g, 'Issued at: '],
  [/来源：/g, 'Source: '],
  [/销售：/g, 'Sales: '],
  [/销售话术：/g, 'Sales script: '],
  [/常见问题：/g, 'FAQ: '],
  [/顾虑应对：/g, 'Objection: '],
  [/未命名话术/g, 'Untitled script'],
  [/未填写问题/g, 'No question'],
  [/未填写顾虑/g, 'No objection'],
  [/可能与已有词条重复或冲突/g, 'May duplicate or conflict with an existing entry'],
  [/后台管理/g, 'Admin'],
  [/未配置 API Key：本地兜底/g, 'API key not configured: local fallback'],
  [/AI 已配置：/g, 'AI configured: '],
  [/服务异常/g, 'Service error'],
  [/保存中\.\.\./g, 'Saving...'],
  [/登录中\.\.\./g, 'Logging in...'],
  [/进入中\.\.\./g, 'Entering...'],
  [/AI 分析中\.\.\./g, 'Analyzing...'],
  [/AI 正在生成\.\.\./g, 'Generating with AI...'],
  [/导入中\.\.\./g, 'Importing...'],
  [/上传分析并生成建议\.\.\./g, 'Uploading and generating suggestions...'],
  [/AI 分析并生成建议\.\.\./g, 'Analyzing and generating suggestions...']
];

function getInitialLang() {
  const queryLang = new URLSearchParams(location.search).get('lang');
  if (supportedLangs.has(queryLang)) {
    localStorage.setItem(I18N_STORAGE_KEY, queryLang);
    return queryLang;
  }
  const saved = localStorage.getItem(I18N_STORAGE_KEY);
  return supportedLangs.has(saved) ? saved : 'en';
}

let currentLang = getInitialLang();
let translating = false;

function translateString(value) {
  if (currentLang !== 'en') return value;
  const trimmed = String(value).trim();
  if (!trimmed) return value;
  if (exactText[trimmed]) return String(value).replace(trimmed, exactText[trimmed]);
  if (exactAttributes[trimmed]) return String(value).replace(trimmed, exactAttributes[trimmed]);
  return phraseRules.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), String(value));
}

function translateNode(root = document.body) {
  if (currentLang !== 'en' || translating || !root) return;
  translating = true;
  try {
    document.documentElement.lang = 'en';
    if (exactText[document.title]) document.title = exactText[document.title];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest('script, style, textarea, input, [data-i18n-ignore]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach((node) => {
      node.nodeValue = translateString(node.nodeValue);
    });

    root.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach((item) => {
      item.placeholder = translateString(item.placeholder);
    });
    root.querySelectorAll?.('option').forEach((item) => {
      item.textContent = translateString(item.textContent);
    });
  } finally {
    translating = false;
  }
}

function addLanguageToggle() {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'language-toggle';
  toggle.dataset.i18nIgnore = 'true';
  toggle.textContent = currentLang === 'en' ? '中文' : 'EN';
  toggle.setAttribute('aria-label', 'Switch language');
  toggle.addEventListener('click', async () => {
    const nextLang = currentLang === 'en' ? 'zh-CN' : 'en';
    localStorage.setItem(I18N_STORAGE_KEY, nextLang);
    await switchDemoLanguage(nextLang);
    const url = new URL(location.href);
    url.searchParams.set('lang', nextLang);
    location.href = url.toString();
  });
  document.body.appendChild(toggle);
}

async function switchDemoLanguage(lang) {
  try {
    await fetch('/api/demo-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang })
    });
  } catch {
    // Production deployments may disable public demo switching. UI language still changes.
  }
}

window.osaI18n = {
  get lang() {
    return currentLang;
  },
  t: translateString,
  apply: translateNode
};

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = currentLang;
  addLanguageToggle();
  translateNode();
  const observer = new MutationObserver((mutations) => {
    if (currentLang !== 'en' || translating) return;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) translateNode(node);
        if (node.nodeType === Node.TEXT_NODE) node.nodeValue = translateString(node.nodeValue);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
