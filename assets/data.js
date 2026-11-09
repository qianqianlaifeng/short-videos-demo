/* ==========================================================================
 * data.js — 静态数据源与接口配置
 * 项目：视频 / 音乐解析接口 · 在线演示站
 * 说明：所有数据均为静态，不依赖任何构建工具或第三方 CDN。
 *       示例数据不含任何占位色块；图片一律使用真实公开 URL，加载失败即隐藏。
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * 1. 接口配置（硬编码公共 API）
 * --------------------------------------------------------------------------
 * 视频端点来自项目官方演示前端 jiuhunwl/shortvideo-html 的生产配置。
 * 音乐端点来自 api.bugpk.com 各音乐接口文档页（doc-163_music / doc-qqmusic /
 * doc-kuwo / doc-qsmusic / doc-music），并已实测 CORS 为 *。
 * ------------------------------------------------------------------------ */
window.API_CONFIG = Object.freeze({
  primary: 'https://api.bugpk.com/api/short_videos',
  fallbacks: [
    'https://api.bugpk.com/api/short_videos'
  ],
  // 视频单平台端点（用于下拉显式指定平台）
  platforms: {
    douyin:    'https://api.bugpk.com/api/douyin',
    kuaishou:  'https://api.bugpk.com/api/ksjx',
    bilibili:  'https://api.bugpk.com/api/bilibili',
    xhs:       'https://api.bugpk.com/api/xhsjx',
    toutiao:   'https://api.bugpk.com/api/toutiao'
  },
  // 音乐端点（按平台区分请求参数，见 app.js buildMusicRequest）
  music: {
    netease:   'https://api.bugpk.com/api/163_music',
    qq:        'https://api.bugpk.com/api/qqmusic',
    kuwo:      'https://api.bugpk.com/api/kuwo',
    qishui:    'https://api.bugpk.com/api/qsmusic',
    aggregate: 'https://api.bugpk.com/api/music'
  },
  timeout: 25000,
  docs: 'https://github.com/jiuhunwl/short_videos',
  musicDocs: 'https://github.com/jiuhunwl/music_jx',
  upstream: 'https://api.bugpk.com/'
});

/* --------------------------------------------------------------------------
 * 2. 视频解析通道
 * ------------------------------------------------------------------------ */
window.PLATFORMS = [
  { id: 'all',      name: '自动识别',   en: 'Auto',        hint: '聚合入口 · 支持 20+ 平台', endpoint: '/api/short_videos', path: 'api/sv.php' },
  { id: 'douyin',   name: '抖音',       en: 'Douyin',      hint: '视频 / 图集 / 实况 · 原画', endpoint: '/api/douyin',       path: 'api/douyin/douyin.php' },
  { id: 'kuaishou', name: '快手',       en: 'Kuaishou',    hint: '视频 / 图集 / 实况', endpoint: '/api/ksjx',         path: 'api/kuaishou/ksjx.php' },
  { id: 'xhs',      name: '小红书',     en: 'Xiaohongshu', hint: '视频 / 图文 / 实况', endpoint: '/api/xhsjx',        path: 'api/xiaohongshu/xhsjx.php' },
  { id: 'bilibili', name: '哔哩哔哩',   en: 'Bilibili',    hint: '视频 / 分 P / 合集', endpoint: '/api/bilibili',     path: 'api/bilibili/bilibili.php' },
  { id: 'toutiao',  name: '今日头条',   en: 'Toutiao',     hint: '视频 / 背景音乐', endpoint: '/api/toutiao',       path: 'api/toutiao.php' }
];

/* 音乐解析通道（与 API_CONFIG.music 的键一一对应） */
window.MUSIC_PLATFORMS = [
  { id: 'netease',   name: '网易云音乐', endpoint: '/api/163_music', hint: '歌曲链接 / 歌曲 ID / 歌名搜索 · 可选音质', docs: 'https://api.bugpk.com/doc-163_music.html' },
  { id: 'qq',        name: 'QQ 音乐',   endpoint: '/api/qqmusic',   hint: '歌曲链接 / 歌名搜索',                    docs: 'https://api.bugpk.com/doc-qqmusic.html' },
  { id: 'kuwo',      name: '酷我音乐',  endpoint: '/api/kuwo',      hint: '播放页链接',                            docs: 'https://api.bugpk.com/doc-kuwo.html' },
  { id: 'qishui',    name: '汽水音乐',  endpoint: '/api/qsmusic',   hint: '分享短链',                              docs: 'https://api.bugpk.com/doc-qsmusic.html' },
  { id: 'aggregate', name: '音乐聚合',  endpoint: '/api/music',     hint: '歌曲 ID + 平台 + 类型',                  docs: 'https://api.bugpk.com/doc-music.html' }
];

/* 网易云可选音质（doc-163_music.html level 参数） */
window.MUSIC_LEVELS = [
  { id: 'standard', name: '标准音质' },
  { id: 'exhigh',   name: '极高音质' },
  { id: 'lossless', name: '无损音质' },
  { id: 'hires',    name: 'Hi-Res' },
  { id: 'jyeffect', name: '高清环绕声' },
  { id: 'sky',      name: '沉浸环绕声' },
  { id: 'jymaster', name: '超清母带' }
];

/* 视频支持平台（展示用，顺序对齐官方演示站；纯文字，无占位图标） */
window.SUPPORTED = [
  { name: '抖音',       domain: 'douyin.com' },
  { name: '快手',       domain: 'kuaishou.com' },
  { name: 'B 站',       domain: 'bilibili.com' },
  { name: '小红书',     domain: 'xiaohongshu.com' },
  { name: '微博',       domain: 'weibo.com' },
  { name: '微视',       domain: 'weishi.qq.com' },
  { name: '皮皮虾',     domain: 'pipix.com' },
  { name: '皮皮搞笑',   domain: 'pipigx.com' },
  { name: '西瓜视频',   domain: 'ixigua.com' },
  { name: '好看视频',   domain: 'haokan.baidu.com' },
  { name: '最右',       domain: 'izuiyou.com' },
  { name: '火山小视频', domain: 'huoshan.com' }
];

/* 音乐支持平台（展示用） */
window.MUSIC_SUPPORTED = [
  { name: '网易云音乐', domain: 'music.163.com',      note: '链接 / ID / 歌名 · 7 档音质' },
  { name: 'QQ 音乐',    domain: 'y.qq.com',           note: '歌曲链接 / 歌名' },
  { name: '酷我音乐',   domain: 'kuwo.cn',            note: '播放页链接' },
  { name: '汽水音乐',   domain: 'qishui.douyin.com',  note: '分享短链' },
  { name: '音乐聚合',   domain: 'QQ / 网易云',         note: '歌曲 ID + media + type' }
];

/* --------------------------------------------------------------------------
 * 3. API 目录数据（复刻 api.bugpk.com 首页的接口列表结构）
 *    status: online | closed | beta
 *    channel: music 时「去演示」会切到音乐模式并选中对应通道
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
  { name: '网易云音乐 SVIP 解析', cat: '音乐', channel: 'music', musicId: 'netease', status: 'online', free: true, desc: '网易云音乐解析：歌曲链接 / ID / 歌名搜索，返回歌名、歌手、专辑、封面、直链与歌词，支持 7 档音质。若获取不到 url 则为账号被风控。', endpoint: '/api/163_music', calls: '18.6M', hits: '58.1k', date: '2026-11-09' },
  { name: '音乐解析聚合', cat: '音乐', channel: 'music', musicId: 'aggregate', status: 'online', free: true, desc: '音乐聚合解析，目前支持 QQ 音乐 / 网易云音乐，按 id + media + type 请求。上游偶发返回非 JSON，页面会展示原始响应。', endpoint: '/api/music', calls: '143.7k', hits: '22', date: '2026-11-09' },
  { name: 'QQ 音乐解析', cat: '音乐', channel: 'music', musicId: 'qq', status: 'online', free: true, desc: 'QQ 音乐信息直链解析，支持歌曲链接与歌名搜索；账号目前无会员。上游偶发返回非 JSON。', endpoint: '/api/qqmusic', calls: '42.3k', hits: '60', date: '2026-11-09' },
  { name: '汽水音乐解析【官方接口】', cat: '音乐', channel: 'music', musicId: 'qishui', status: 'online', free: true, desc: '汽水音乐音频直链、歌手、专辑与逐字歌词解析，走官方接口请求。', endpoint: '/api/qsmusic', calls: '179.5k', hits: '462', date: '2026-11-09' },
  { name: '酷我音乐解析', cat: '音乐', channel: 'music', musicId: 'kuwo', status: 'online', free: true, desc: '酷我音乐信息、封面与歌词提取；付费 / 已下架歌曲会返回 code=1003。', endpoint: '/api/kuwo', calls: '22.6k', hits: '1', date: '2026-11-09' },
  { name: '城市天气查询', cat: '工具', status: 'online', free: true, desc: '查询当前城市的天气情况，支持输入城市名称和 id。', endpoint: '/api/weather', calls: '408.1k', hits: '515', date: '2026-11-09' },
  { name: 'Ip 归属地查询', cat: '工具', status: 'online', free: true, desc: '查询 IP 地理位置及其归属地，精确到市。', endpoint: '/api/ip', calls: '5.5k', hits: '2', date: '2026-11-09' },
  { name: '蓝奏云直链解析', cat: '工具', status: 'online', free: true, desc: '蓝奏云分享链接直链解析。', endpoint: '/api/lanzou', calls: '85.8k', hits: '5', date: '2026-11-09' },
  { name: '随机一言', cat: '工具', status: 'online', free: true, desc: '随机输出一条一言。', endpoint: '/api/yiyan', calls: '74.0k', hits: '9', date: '2026-11-09' },
  { name: 'ICP 备案查询', cat: '工具', status: 'beta', free: true, desc: '采用 Python 过备案官网验证，响应较慢，稳定性不高。', endpoint: '/api/icp', calls: '4.5k', hits: '42', date: '2026-11-09' },
  { name: '闲鱼商品信息解析', cat: '工具', status: 'online', free: true, desc: '咸鱼商品信息解析，目前仅支持带 id 的链接。', endpoint: '/api/xianyu', calls: '296.7k', hits: '22', date: '2026-11-09' }
];

/* --------------------------------------------------------------------------
 * 4. 视频响应契约 v3 字段说明（接口文档区）
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

/* 音乐响应归一化字段（前端统一后的结构，跨 5 个通道） */
window.MUSIC_FIELDS = [
  ['title', '字符串', '歌曲名；兼容 name / title / songname / albumname'],
  ['artist', '字符串', '歌手；兼容 ar_name / singer / artistsname / author'],
  ['album', '字符串', '专辑；兼容 al_name / album / albumname'],
  ['cover', '字符串', '封面图 URL；兼容 pic / picUrl / picimg / cover'],
  ['url', '字符串', '音频直链；兼容 url / music_url / play_url'],
  ['quality', '字符串', '音质档位；兼容 level / quality'],
  ['size', '字符串', '文件大小；兼容 size / file_size'],
  ['duration', '数值 / 字符串', '时长；兼容 duration / songTimeMinutes'],
  ['lyric', '字符串', 'LRC 歌词；兼容 lyric / lrc / lrc_data / lyrics'],
  ['id', '字符串', '歌曲 ID；用于二次请求直链'],
  ['extra', '对象', '该通道的其它原始字段（如 video_meta）']
];

/* --------------------------------------------------------------------------
 * 5. 示例结果（仅用于「载入示例」按钮，不发起网络请求）
 *    不使用任何生成的占位色块 / 假图；图片均为真实公开 URL。
 * ------------------------------------------------------------------------ */
window.DEMO_RESULT = {
  code: 200,
  msg: '解析成功',
  data: {
    type: 'video',
    title: '示例数据 · 湖畔日落延时摄影',
    desc: '这是一条用于演示页面展示效果的示例数据，不会发起真实解析请求。#延时摄影 #日落',
    author: { name: '演示账号', id: 'demo_0001', avatar: '' },
    cover: '',
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
    music: { title: '示例背景音乐', author: '演示音频', url: '', cover: '' },
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
    title: '示例图集 · 公开专辑封面',
    desc: '图集渲染演示，图片取自音乐平台公开封面 URL，无占位色块。#图集 #原图',
    author: { name: '演示账号', id: 'demo_0002', avatar: '' },
    cover: '',
    url: null,
    quality: 'original',
    duration: null,
    size: 0,
    size_label: '0B',
    create_time: 1766503530,
    publish_time: '2025-12-23 23:25:30',
    video_backup: [],
    images: [
      'https://p4.music.126.net/yD9vbpuILH-tqNRIaP640g==/109951163038292176.jpg',
      'https://p4.music.126.net/81BsxxhomJ4aJZYvEbyPkw==/109951165671182684.jpg',
      'https://p3.music.126.net/8D2Pd7EuvGboMyE2xWc47A==/109951172453712025.jpg',
      'https://p4.music.126.net/pleQjKOI26fSenkUGipDLw==/109951166537300832.jpg'
    ],
    live_photo: [],
    music: { title: '', author: '', url: '', cover: '' },
    video_id: ''
  },
  __demo: true,
  __source: '内置示例数据（未调用接口）'
};

/* 音乐示例：网易云 /api/163_music?type=json 的裸 JSON 结构（真实字段，歌词精简） */
window.DEMO_MUSIC_RESULT = {
  status: 200,
  name: '若把你',
  ar_name: 'Kirsty刘瑾睿',
  al_name: '若把你',
  pic: 'https://p3.music.126.net/M877M2-VhWZiLPVFORf9iQ==/109951163401482434.jpg',
  url: 'https://music.163.com/song/media/outer/url?id=865632948.mp3',
  size: '0B',
  level: '标准音质',
  lyric: '[00:00.000] 作词 : Kirsty刘瑾睿\n[00:01.000] 作曲 : Kirsty刘瑾睿\n[00:18.840]落叶无归根 单丝不成线\n[00:27.710]无所寄托 亦无心流浪\n[00:36.570]你把红豆赠我不如写我一首歌\n[00:44.240]落款你的名字 工整又好看\n[00:52.470]若把你比作歌\n[00:57.530]你便是那高山流水',
  tlyric: '',
  __demo: true,
  __source: '内置示例数据 · 网易云 /api/163_music?type=json 结构（未调用接口）'
};

/* 音乐示例：网易云 /api/163_music?type=search 的歌曲列表结构 */
window.DEMO_MUSIC_SEARCH_RESULT = {
  code: 200,
  msg: '搜索成功',
  data: {
    songs: [
      { id: 865632948, name: '若把你', artists: 'Kirsty刘瑾睿', album: '若把你', picUrl: 'https://p3.music.126.net/M877M2-VhWZiLPVFORf9iQ==/109951163401482434.jpg', duration: 205000 },
      { id: 509781655, name: '想你就写信 (Live)', artists: '周杰伦/李硕/张鑫', album: '周杰伦地表最强世界巡回演唱会', picUrl: 'https://p4.music.126.net/yD9vbpuILH-tqNRIaP640g==/109951163038292176.jpg', duration: 234880 },
      { id: 5257138, name: '屋顶', artists: '周杰伦/温岚/吴宗宪', album: '找自己', picUrl: 'https://p4.music.126.net/81BsxxhomJ4aJZYvEbyPkw==/109951165671182684.jpg', duration: 298000 }
    ],
    total: 300
  },
  __demo: true,
  __source: '内置示例数据 · 网易云 /api/163_music?type=search 结构（未调用接口）'
};
