/* ==========================================================================
 * data.js — 静态数据源与接口配置
 * 项目：short_videos 短视频去水印解析接口 · 在线演示站
 * 说明：所有数据均为静态，不依赖任何构建工具或第三方 CDN。
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * 1. 接口配置（硬编码公共 API）
 * --------------------------------------------------------------------------
 * 端点来自项目官方演示前端 jiuhunwl/shortvideo-html 的生产配置，
 * 后端即 jiuhunwl/short_videos 仓库所部署的公益接口。
 * 已验证：GET 返回 access-control-allow-origin: *，静态站点可跨域直连。
 * ------------------------------------------------------------------------ */
window.API_CONFIG = Object.freeze({
  primary: 'https://api.bugpk.com/api/short_videos',
  fallbacks: [
    'https://api.bugpk.com/api/short_videos'
  ],
  // 单平台端点（用于下拉显式指定平台）
  platforms: {
    douyin:    'https://api.bugpk.com/api/douyin',
    kuaishou:  'https://api.bugpk.com/api/ksjx',
    bilibili:  'https://api.bugpk.com/api/bilibili',
    xhs:       'https://api.bugpk.com/api/xhsjx',
    toutiao:   'https://api.bugpk.com/api/toutiao'
  },
  timeout: 25000,
  docs: 'https://github.com/jiuhunwl/short_videos',
  upstream: 'https://api.bugpk.com/'
});

/* --------------------------------------------------------------------------
 * 2. 平台元数据（解析台下拉 + 支持平台展示区）
 * ------------------------------------------------------------------------ */
window.PLATFORMS = [
  { id: 'all',      name: '自动识别',   en: 'Auto',        icon: 'spark',  hint: '聚合入口 · 支持 20+ 平台', endpoint: '/api/short_videos', path: 'api/sv.php' },
  { id: 'douyin',   name: '抖音',       en: 'Douyin',      icon: 'douyin', hint: '视频 / 图集 / 实况 · 原画', endpoint: '/api/douyin',       path: 'api/douyin/douyin.php' },
  { id: 'kuaishou', name: '快手',       en: 'Kuaishou',    icon: 'kuaishou', hint: '视频 / 图集 / 实况', endpoint: '/api/ksjx',         path: 'api/kuaishou/ksjx.php' },
  { id: 'xhs',      name: '小红书',     en: 'Xiaohongshu', icon: 'xhs',    hint: '视频 / 图文 / 实况', endpoint: '/api/xhsjx',        path: 'api/xiaohongshu/xhsjx.php' },
  { id: 'bilibili', name: '哔哩哔哩',   en: 'Bilibili',    icon: 'bili',   hint: '视频 / 分 P / 合集', endpoint: '/api/bilibili',     path: 'api/bilibili/bilibili.php' },
  { id: 'toutiao',  name: '今日头条',   en: 'Toutiao',     icon: 'toutiao',hint: '视频 / 背景音乐', endpoint: '/api/toutiao',       path: 'api/toutiao.php' }
];

/* 支持平台区（展示用，顺序对齐官方演示站） */
window.SUPPORTED = [
  { name: '抖音',       domain: 'douyin.com',       tone: 't1' },
  { name: '快手',       domain: 'kuaishou.com',     tone: 't2' },
  { name: 'B 站',       domain: 'bilibili.com',     tone: 't3' },
  { name: '小红书',     domain: 'xiaohongshu.com',  tone: 't4' },
  { name: '微博',       domain: 'weibo.com',        tone: 't5' },
  { name: '微视',       domain: 'weishi.qq.com',    tone: 't6' },
  { name: '皮皮虾',     domain: 'pipix.com',        tone: 't7' },
  { name: '皮皮搞笑',   domain: 'pipigx.com',       tone: 't8' },
  { name: '西瓜视频',   domain: 'ixigua.com',       tone: 't9' },
  { name: '好看视频',   domain: 'haokan.baidu.com', tone: 't10' },
  { name: '最右',       domain: 'izuiyou.com',      tone: 't11' },
  { name: '火山小视频', domain: 'huoshan.com',      tone: 't12' }
];

/* --------------------------------------------------------------------------
 * 3. API 目录数据（复刻 api.bugpk.com 首页的接口列表结构）
 *    status: online | closed | beta
 *    calls / date 为演示站展示字段，静态快照，不代表实时统计
 * ------------------------------------------------------------------------ */
window.API_CATALOG = [
  { name: '短视频去水印解析【聚合】', cat: '短视频', status: 'online', free: true, desc: '聚合入口，自动识别平台。支持抖音、快手、小红书、bilibili、油管、TikTok、西瓜视频、好看视频、微视、梨视频、A 站、知乎、绿洲、美拍、虎牙、ins、豆包、即梦 AI、视频号等 20+ 平台。', endpoint: '/api/short_videos', calls: '35.1M', hits: '95.2k', date: '2026-11-09' },
  { name: '抖音无水印解析【原画】', cat: '短视频', status: 'online', free: true, desc: '抖音去水印解析，支持图文、短视频和实况解析，支持分享短链接；自动通过 vid 302 解析原画质量。', endpoint: '/api/douyin', calls: '12.6M', hits: '37.1k', date: '2026-11-09' },
  { name: '小红书解析', cat: '短视频', status: 'online', free: true, desc: '无水印解析小红书视频内容，返回封面、作者、时长与直链。', endpoint: '/api/xhsjx', calls: '5.3M', hits: '13.7k', date: '2026-11-09' },
  { name: '今日头条去水印解析', cat: '短视频', status: 'online', free: true, desc: '今日头条短视频去水印解析，含背景音乐与封面信息。', endpoint: '/api/toutiao', calls: '3.1M', hits: '573', date: '2026-11-09' },
  { name: 'bilibili 解析', cat: '短视频', status: 'online', free: true, desc: '仅支持 bilibili 短视频，画质 1080，支持合集与分 P 列表。', endpoint: '/api/bilibili', calls: '2.5M', hits: '1.1k', date: '2026-11-09' },
  { name: '快手聚合解析【支持实况】', cat: '短视频', status: 'online', free: true, desc: '快手去水印聚合解析，支持图集、视频、实况三类内容。', endpoint: '/api/ksjx', calls: '1.3M', hits: '282', date: '2026-11-09' },
  { name: '即梦去水印解析', cat: 'AI 生成', status: 'online', free: true, desc: '即梦 AI 视频去水印，支持隐藏和未发布的作品。', endpoint: '/api/jimengai', calls: '2.2M', hits: '1.4k', date: '2026-11-09' },
  { name: '豆包视频去水印解析', cat: 'AI 生成', status: 'online', free: true, desc: '豆包短视频解析，返回 AI 生成视频的无水印直链。', endpoint: '/api/doubao', calls: '1.3M', hits: '5.4k', date: '2026-11-09' },
  { name: '豆包对话图片无水印提取', cat: 'AI 生成', status: 'online', free: true, desc: '提取豆包对话中生成的无水印图片原图。', endpoint: '/api/doubao/image', calls: '681.5k', hits: '5.3k', date: '2026-11-09' },
  { name: '千问图片 / 视频去水印', cat: 'AI 生成', status: 'online', free: true, desc: '千问生成的图片与视频无水印提取。', endpoint: '/api/qianwen', calls: '388.7k', hits: '2.0k', date: '2026-11-09' },
  { name: '微信视频号视频解析', cat: '短视频', status: 'online', free: true, desc: '微信视频号内容解析，返回无水印直链与元数据。', endpoint: '/api/wechat', calls: '1.5M', hits: '2.7k', date: '2026-11-09' },
  { name: '皮皮虾去水印解析', cat: '短视频', status: 'online', free: true, desc: '皮皮虾视频与图集去水印解析，含作者信息。', endpoint: '/api/ppxia', calls: '546.8k', hits: '4.5k', date: '2026-11-09' },
  { name: '皮皮搞笑去水印解析', cat: '短视频', status: 'online', free: true, desc: '皮皮搞笑短视频无水印解析。', endpoint: '/api/pipigx', calls: '1.5k', hits: '30', date: '2026-11-09' },
  { name: '最右解析', cat: '短视频', status: 'online', free: true, desc: '最右社区视频无水印解析。', endpoint: '/api/zuiyou', calls: '6.4k', hits: '23', date: '2026-11-09' },
  { name: '抖音主页解析', cat: '短视频', status: 'online', free: true, desc: '抖音主页作品批量列表解析（需登录 Cookie，使用独立接口）。', endpoint: 'api/douyin-home/home.php', calls: '339.0k', hits: '119', date: '2026-11-09' },
  { name: '微博短视频解析【官方接口】', cat: '短视频', status: 'online', free: true, desc: '微博短视频无水印解析接口版，支持多画质与备选直链。', endpoint: 'api/weibo.php', calls: '165.2k', hits: '58', date: '2026-11-09' },
  { name: '小红书图文解析', cat: '短视频', status: 'online', free: true, desc: '小红书图文笔记原图提取。', endpoint: '/api/xhsjx', calls: '971.5k', hits: '2.1k', date: '2026-11-09' },
  { name: '短视频解析聚合 2', cat: '短视频', status: 'online', free: true, desc: '备用聚合入口，目前支持抖音、小红书、ins、即梦 AI 解析。', endpoint: '/api/short_videos', calls: '2.2M', hits: '715', date: '2026-11-09' },
  { name: '快手图集解析', cat: '短视频', status: 'closed', free: true, desc: '快手图集去水印解析（已关闭，请改用快手聚合解析）。', endpoint: '/api/ksjx', calls: '1.0k', hits: '0', date: '2026-05-27' },
  { name: '网易云音乐 SVIP 解析', cat: '音乐', status: 'online', free: true, desc: '网易云音乐解析。若获取不到 url 则为账号被风控。', endpoint: 'api/wyy.py', calls: '18.6M', hits: '58.1k', date: '2026-11-09' },
  { name: '音乐解析聚合', cat: '音乐', status: 'online', free: true, desc: '音乐聚合解析，目前支持 QQ 音乐 / 网易云音乐。', endpoint: '/api/music', calls: '143.7k', hits: '22', date: '2026-11-09' },
  { name: 'QQ 音乐解析', cat: '音乐', status: 'online', free: true, desc: 'QQ 音乐信息直链解析，账号目前无会员。', endpoint: '/api/qqmusic', calls: '42.3k', hits: '60', date: '2026-11-09' },
  { name: '汽水音乐解析【官方接口】', cat: '音乐', status: 'online', free: true, desc: '汽水音乐直链及作者解析，走官方接口请求。', endpoint: '/api/qishui', calls: '179.5k', hits: '462', date: '2026-11-09' },
  { name: '酷我音乐解析', cat: '音乐', status: 'online', free: true, desc: '酷我音乐信息提取。', endpoint: '/api/kuwo', calls: '22.6k', hits: '1', date: '2026-11-09' },
  { name: '城市天气查询', cat: '工具', status: 'online', free: true, desc: '查询当前城市的天气情况，支持输入城市名称和 id。', endpoint: '/api/weather', calls: '408.1k', hits: '515', date: '2026-11-09' },
  { name: 'Ip 归属地查询', cat: '工具', status: 'online', free: true, desc: '查询 IP 地理位置及其归属地，精确到市。', endpoint: '/api/ip', calls: '5.5k', hits: '2', date: '2026-11-09' },
  { name: '蓝奏云直链解析', cat: '工具', status: 'online', free: true, desc: '蓝奏云分享链接直链解析。', endpoint: '/api/lanzou', calls: '85.8k', hits: '5', date: '2026-11-09' },
  { name: '随机一言', cat: '工具', status: 'online', free: true, desc: '随机输出一条一言。', endpoint: '/api/yiyan', calls: '74.0k', hits: '9', date: '2026-11-09' },
  { name: 'ICP 备案查询', cat: '工具', status: 'beta', free: true, desc: '采用 Python 过备案官网验证，响应较慢，稳定性不高。', endpoint: '/api/icp', calls: '4.5k', hits: '42', date: '2026-11-09' },
  { name: '闲鱼商品信息解析', cat: '工具', status: 'online', free: true, desc: '咸鱼商品信息解析，目前仅支持带 id 的链接。', endpoint: '/api/xianyu', calls: '296.7k', hits: '22', date: '2026-11-09' }
];

/* --------------------------------------------------------------------------
 * 4. v3 契约字段说明（接口文档区）
 * ------------------------------------------------------------------------ */
window.FIELDS = [
  ['code', '整数', '业务状态码：200 成功；400 / 404 / 500 失败'],
  ['msg', '字符串', '响应消息，可直接展示给用户'],
  ['data', '对象 / 数组', '数据主体；失败时为空数组或 null'],
  ['data.type', '字符串', '内容类型：video / image / live / unknown'],
  ['data.title', '字符串', '标题，通常与 desc 一致'],
  ['data.desc', '字符串', '描述文本'],
  ['data.author', '对象', '作者信息：name / id / avatar'],
  ['data.cover', '字符串', '封面图 URL'],
  ['data.url', '字符串 / null', '无水印直链（type=video 时返回）'],
  ['data.quality', '字符串', '画质档位；抖音原画为 original'],
  ['data.duration', '数值 / null', '视频时长（秒，保留两位小数）'],
  ['data.size', '整数', '主直链字节大小；探测失败为 0'],
  ['data.size_label', '字符串', '人类可读大小，如 1.74MB'],
  ['data.create_time', '整数', '发布时间戳（秒）'],
  ['data.publish_time', '字符串', '发布时间（东八区 Y-m-d H:i:s）'],
  ['data.video_backup', '数组', '备选直链列表（type=video）'],
  ['data.video_id', '字符串', '视频 vid（type=video）'],
  ['data.images', '数组', '图集原图 URL 数组（type=image / live）'],
  ['data.live_photo', '数组', '实况图数组，每项含 image 与 video'],
  ['data.music', '对象', '背景音乐：title / author / url / cover']
];

/* --------------------------------------------------------------------------
 * 5. 示例结果（仅用于「载入示例」按钮，不发起网络请求）
 *    结构严格遵循《视频解析统一 JSON 格式 3.0》
 * ------------------------------------------------------------------------ */
function svgPoster(label, c1, c2) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/>' +
    '</linearGradient></defs>' +
    '<rect width="720" height="960" fill="url(#g)"/>' +
    '<circle cx="360" cy="420" r="150" fill="rgba(255,255,255,.14)"/>' +
    '<circle cx="360" cy="420" r="96" fill="rgba(255,255,255,.16)"/>' +
    '<text x="360" y="440" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="rgba(255,255,255,.92)">DEMO</text>' +
    '<text x="360" y="820" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" fill="rgba(255,255,255,.8)">' + label + '</text>' +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

window.DEMO_RESULT = {
  code: 200,
  msg: '解析成功',
  data: {
    type: 'video',
    title: '示例数据 · 湖畔日落延时摄影',
    desc: '这是一条用于演示页面展示效果的示例数据，不会发起真实解析请求。#延时摄影 #日落',
    author: { name: '演示账号', id: 'demo_0001', avatar: svgPoster('A', '#0d9488', '#0f172a') },
    cover: svgPoster('COVER', '#0ea5e9', '#0d9488'),
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    quality: 'original',
    duration: 30.06,
    size: 1123456,
    size_label: '1.07MB',
    create_time: 1766503530,
    publish_time: '2025-12-23 23:25:30',
    video_backup: ['https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'],
    images: [],
    live_photo: [],
    music: { title: '示例背景音乐', author: '演示音频', url: '', cover: svgPoster('BGM', '#6366f1', '#0d9488') },
    video_id: 'v0200fg10000demo'
  },
  __demo: true,
  __source: '内置示例数据（未调用接口）'
};

window.DEMO_IMAGE_RESULT = {
  code: 200,
  msg: '解析成功',
  data: {
    type: 'image',
    title: '示例图集 · 城市漫步',
    desc: '用于演示图集渲染效果的示例数据。#城市 #街拍',
    author: { name: '演示账号', id: 'demo_0002', avatar: svgPoster('A', '#f59e0b', '#0f172a') },
    cover: svgPoster('COVER', '#f59e0b', '#ef4444'),
    url: null,
    quality: 'original',
    duration: null,
    size: 0,
    size_label: '0B',
    create_time: 1766503530,
    publish_time: '2025-12-23 23:25:30',
    video_backup: [],
    images: [
      svgPoster('IMG 01', '#0ea5e9', '#0d9488'),
      svgPoster('IMG 02', '#8b5cf6', '#ec4899'),
      svgPoster('IMG 03', '#f59e0b', '#ef4444'),
      svgPoster('IMG 04', '#10b981', '#0ea5e9')
    ],
    live_photo: [],
    music: { title: '', author: '', url: '', cover: '' },
    video_id: ''
  },
  __demo: true,
  __source: '内置示例数据（未调用接口）'
};
