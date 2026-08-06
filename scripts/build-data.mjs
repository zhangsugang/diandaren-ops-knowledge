import fs from 'node:fs';
import path from 'node:path';

const root = '/tmp/diandaren';
const target = '/tmp/diandaren-github-site/content/data.js';
const articles = JSON.parse(fs.readFileSync(path.join(root, 'articles.json'), 'utf8'));
const packageRoot = path.join(root, '店大人_语雀式知识库_2026-08-06');

const sourceUrls = {
  home: 'https://www.diandaren.net/',
  help: 'https://www.diandaren.net/Help/index',
  download: 'https://www.diandaren.net/index/download',
  about: 'https://www.diandaren.net/index/about',
  pricing: 'https://www.diandaren.net/Index/packagePrice',
};

const categoryMeta = {
  '入门指南': { icon: '⌂', color: 'blue', order: 1 },
  '店铺管理': { icon: '▦', color: 'violet', order: 2 },
  '上架商品': { icon: '◇', color: 'amber', order: 3 },
  '工作流': { icon: '↗', color: 'teal', order: 4 },
  '售后助手': { icon: '↺', color: 'rose', order: 5 },
  '财务助手': { icon: '¥', color: 'green', order: 6 },
  '推广助手': { icon: '✦', color: 'orange', order: 7 },
  '新人培训': { icon: '★', color: 'blue', order: 8 },
  '架构与总览': { icon: '◎', color: 'violet', order: 9 },
  '视频拆解': { icon: '▶', color: 'rose', order: 10 },
  'AI与检索': { icon: '⌕', color: 'teal', order: 11 },
};

const keywordMap = {
  40: ['快速开始', '应用管理', '应用开发', '触发器'],
  41: ['安装', '更新', '登录', '用户模式'],
  48: ['服务器模式', '定时运行', '并发', '挂机'],
  42: ['添加店铺', '扫码', '店铺登录', '本地线路'],
  43: ['店铺分组', '分组', '右键'],
  45: ['店铺数据', '数据汇总', '即时读取', 'CSV'],
  46: ['交易概况', '近12个月', '导出'],
  47: ['提现', '预留推广费用', '自动提现'],
  78: ['工作流', '节点', '测试运行', '定时'],
  49: ['链接结构', 'SKU', '单一结构', '上下结构'],
  52: ['后端费用', '快递费', '仓库费', '利润'],
  53: ['图片包', '主图', 'SKU图', '详情图'],
  54: ['商品上架', '模板', 'AI标题', '发布任务'],
  55: ['链接上架', '复制商品', '商品库', '目标店铺'],
  66: ['包裹中心', '物流异常', '赔付'],
  67: ['评价申诉', '差评', '申诉'],
  68: ['评价回复', '批量回复', '模板'],
  69: ['待退款', '退款', '售后'],
  70: ['商家举证', '举证', '凭证'],
  73: ['客服在线', '客服状态', '检测'],
  71: ['虚假轨迹', '物流', '罚款'],
  72: ['对账中心', '对账', '财务'],
  74: ['待开票', '发票', '导出'],
  75: ['提交发票', '发票导出'],
  76: ['推广财务流水', '推广', '流水'],
  77: ['视频匹配', '素材', '视频'],
};

function cleanText(value = '') {
  return String(value)
    .replace(/\[IFRAME:[^\]]+\]/gi, '')
    .replace(/\[IMAGE:file:\/\/[^\]]+\]/gi, '')
    .replace(/\[IMAGE:https?:\/\/[^\]]+\]/gi, '')
    .replace(/file:\/\/\/[^\n\r]*/gi, '')
    .replace(/\/Users\/[^\n\r]*/gi, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstSentence(text, fallback) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return fallback;
  return compact.length > 96 ? `${compact.slice(0, 96)}…` : compact;
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: markdown };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    meta[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return { meta, body: match[2].trim() };
}

const docs = articles.map((article) => {
  const content = cleanText(article.text);
  return {
    id: `official-${article.a_id}`,
    title: article.a_title,
    category: article.category_name,
    badge: '官网帮助',
    evidence: 'official',
    color: categoryMeta[article.category_name]?.color || 'blue',
    updated: article.update_time?.slice(0, 10) || '待核验',
    sourceUrl: `https://www.diandaren.net/Help/detail/${article.a_id}`,
    summary: firstSentence(content, '官网帮助中心操作说明'),
    keywords: keywordMap[article.a_id] || [article.a_title],
    content,
    steps: [],
  };
});

const curatedFiles = [
  ['01_新人培训/01_30分钟入门.md', '新人培训', '30 分钟入门', '30 分钟完成登录、测试店、读数、商品准备与安全工作流测试。'],
  ['01_新人培训/02_培训演示脚本.md', '新人培训', '培训演示脚本', '培训人可以按这份脚本演示，不需要临场编排。'],
  ['01_新人培训/03_上岗考核.md', '新人培训', '上岗考核清单', '用结果验收新人是否真的会做，而不是只听过。'],
  ['02_架构与总览/01_功能架构与数据流.md', '架构与总览', '功能架构与数据流', '把店铺、商品、售后、财务和工作流串成一条可核验的数据链。'],
  ['02_架构与总览/02_版本与能力边界.md', '架构与总览', '版本与能力边界', '区分官网确认、视频演示和业务推断，避免培训时把推断讲成硬规则。'],
  ['08_视频拆解/01_视频时间轴.md', '视频拆解', '视频时间轴', '约 34 分钟演示的画面证据索引；用于回看，不替代官网文字步骤。'],
  ['08_视频拆解/02_视频重点讲解.md', '视频拆解', '视频重点讲解', '把视频中商品上架、SKU、图片包和工作流的讲解拆成动作。'],
  ['09_AI与检索/01_AI教练提示词.md', 'AI与检索', 'AI 教练提示词', '把当前页面、任务目标和核验结果交给 AI，获得逐步讲解。'],
];

for (const [relative, category, title, summary] of curatedFiles) {
  const filePath = path.join(packageRoot, relative);
  const raw = fs.readFileSync(filePath, 'utf8');
  const { body } = parseFrontmatter(raw);
  const id = `curated-${relative.replace(/[^\u4e00-\u9fa5A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
  docs.push({
    id,
    title,
    category,
    badge: category === '视频拆解' ? '视频证据' : category === '架构与总览' ? '推断/边界' : '培训模板',
    evidence: category === '视频拆解' ? 'video' : category === '架构与总览' ? 'inference' : 'training',
    color: categoryMeta[category]?.color || 'blue',
    updated: '2026-08-06',
    sourceUrl: category === '视频拆解' ? null : sourceUrls.help,
    summary,
    keywords: [category, title, '新人', '操作', '核验'],
    content: cleanText(body),
    steps: [],
  });
}

const categoryCounts = {};
for (const doc of docs) categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;

const payload = {
  generatedAt: '2026-08-06',
  product: '店大人运营知识库',
  sources: sourceUrls,
  stats: { official: articles.length, curated: curatedFiles.length, total: docs.length, onboardingMinutes: 30 },
  categories: Object.keys(categoryCounts)
    .sort((a, b) => (categoryMeta[a]?.order || 99) - (categoryMeta[b]?.order || 99))
    .map((name) => ({ name, count: categoryCounts[name], ...(categoryMeta[name] || {}) })),
  quickLinks: [
    { label: '安装登录', docId: 'official-41', hint: '下载、更新、用户模式登录' },
    { label: '添加测试店', docId: 'official-42', hint: '扫码/账号登录与店铺备注' },
    { label: '商品上架', docId: 'official-54', hint: '模板、SKU、图片包、发布任务' },
    { label: '退款售后', docId: 'official-69', hint: '待退款查询与处理' },
    { label: '工作流测试', docId: 'official-78', hint: '节点、连线、单商品测试' },
  ],
  docs,
};

const output = `window.DIANDAREN_KB = ${JSON.stringify(payload, null, 2)};\n`;
fs.writeFileSync(target, output);
console.log(`wrote ${target} (${docs.length} docs)`);
