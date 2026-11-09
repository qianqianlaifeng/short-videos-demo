/* ==========================================================================
 * app.js — 视频 / 音乐解析在线演示站交互逻辑
 * 零依赖 · 无构建 · 浏览器原生 ES2019+
 * ========================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const ICON = (name, style) => '<svg' + (style ? ' style="' + style + '"' : '') + '><use href="#i-' + name + '"/></svg>';

  const CFG = window.API_CONFIG;
  const HISTORY_KEY = 'sv-parser-history-v1';
  const THEME_KEY = 'sv-parser-theme';

  let mode = 'video';                 // 'video' | 'music'
  let selectedPlatform = 'all';      // 视频通道
  let selectedMusic = 'netease';     // 音乐通道
  let musicLevel = 'standard';       // 网易云音质
  let lastResult = null;
  let lastRawText = '';
  let catalogFilter = '全部';
  let catalogQuery = '';

  /* ---------------------------------------------------------------- 工具 */
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(u) {
    if (typeof u !== 'string') return '';
    const s = u.trim();
    return /^https?:\/\//i.test(s) || /^data:image\//i.test(s) || s.charAt(0) === '.' || s.charAt(0) === '/' ? s : '';
  }

  function toast(msg) {
    const host = $('#toastHost');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = ICON('check') + '<span>' + esc(msg) + '</span>';
    host.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  async function copyText(text, okMsg) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(okMsg || '已复制到剪贴板');
    } catch (e) {
      toast('复制失败，请手动选择文本');
    }
  }

  function fmtBytes(n) {
    if (!n || Number(n) <= 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0, v = Number(n);
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return v.toFixed(i ? 2 : 0) + units[i];
  }

  function fmtDuration(s) {
    if (s == null || s === '' || isNaN(Number(s))) return '—';
    const t = Math.round(Number(s));
    const m = Math.floor(t / 60);
    return m + ':' + String(t % 60).padStart(2, '0') + ' (' + Number(s) + 's)';
  }

  function fmtMusicDuration(v) {
    if (v == null || v === '') return '—';
    if (typeof v === 'string' && /^\d+:\d{1,2}$/.test(v)) return v;
    const n = Number(v);
    if (isNaN(n) || n <= 0) return '—';
    const sec = n > 10000 ? n / 1000 : n;   // 毫秒 / 秒
    const m = Math.floor(sec / 60);
    return m + ':' + String(Math.round(sec % 60)).padStart(2, '0');
  }

  function fmtTime(ts, label) {
    if (label) return esc(label);
    if (!ts) return '—';
    const d = new Date(Number(ts) * 1000);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  function extractUrl(text) {
    const m = String(text || '').match(/https?:\/\/[^\s<>"'{}|\\^`\[\]）】，。；！？、]+/i);
    if (!m) return '';
    return m[0].replace(/[),.;!?，。；！？]+$/, '');
  }

  /* LRC / 逐字歌词 → 纯文本 */
  function cleanLrc(lrc) {
    if (!lrc) return '';
    const s = String(lrc);
    // 汽水音乐逐字歌词：[1980,1990]<0,260,0>风<260,240,0>扬...
    if (/<\d+,/.test(s)) {
      const t = s.replace(/\[[^\]]*\]/g, '').replace(/<[^>]*>/g, '').replace(/\s+/g, '');
      return t.replace(/(.{24})/g, '$1\n').trim();
    }
    return s.split(/\r?\n/)
      .map(function (line) { return line.replace(/\[[^\]]*\]/g, '').trim(); })
      .filter(Boolean).join('\n');
  }

  function qs(params) {
    return Object.keys(params)
      .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
      .join('&');
  }

  function notify(type, html) {
    $('#noticeHost').innerHTML = '<div class="notice ' + type + '">' + ICON(type === 'err' ? 'alert' : 'info') + '<div>' + html + '</div></div>';
  }

  function clearNotice() { $('#noticeHost').innerHTML = ''; }

  function highlightJSON(text) {
    const re = /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b/g;
    let out = '', last = 0, m;
    while ((m = re.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      if (m[1]) out += '<span class="k">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="n">' + esc(m[3]) + '</span>';
      else out += '<span class="b">' + esc(m[4]) + '</span>';
      last = re.lastIndex;
    }
    return out + esc(text.slice(last));
  }

  /* 图片加载失败 → 直接隐藏，不显示破图 / 占位色块 */
  function initImageFallback() {
    document.addEventListener('error', function (e) {
      const t = e.target;
      if (!t || t.tagName !== 'IMG') return;
      t.style.display = 'none';
      const a = t.closest && t.closest('a');
      if (a) a.style.display = 'none';
    }, true);
  }

  /* ---------------------------------------------------------------- 主题 */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = $('#themeToggle');
    if (btn) btn.innerHTML = '<svg><use href="#i-' + (t === 'dark' ? 'sun' : 'moon') + '"/></svg>';
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* noop */ }
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* noop */ }
    applyTheme(saved === 'dark' ? 'dark' : 'light');
    $('#themeToggle').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ------------------------------------------------------------ 静态渲染 */
  function currentChannelName() {
    const list = mode === 'music' ? window.MUSIC_PLATFORMS : window.PLATFORMS;
    const id = mode === 'music' ? selectedMusic : selectedPlatform;
    const hit = (list || []).find(function (x) { return x.id === id; });
    return hit ? hit.name : '自动识别';
  }

  function updateEndpointHint(text) {
    const p = (mode === 'music' ? window.MUSIC_PLATFORMS : window.PLATFORMS)
      .find(function (x) { return x.id === (mode === 'music' ? selectedMusic : selectedPlatform); });
    let ep = p ? p.endpoint : '/api/short_videos';
    const raw = text === undefined ? ($('#urlInput') ? $('#urlInput').value : '') : text;
    if (mode === 'video' && selectedPlatform === 'all' && isBilibiliUrl(normalizeShareUrl(raw))) {
      ep = '/api/bilibili';   // 自动识别时 B 站改走专用端点，顶部提示同步
    }
    $('#endpointHint').textContent = 'GET ' + ep + (mode === 'music' ? '?…' : '?url=…');
    $('.api-status .url').title = 'https://api.bugpk.com' + ep;
  }

  function renderChips() {
    const host = $('#platformChips');
    $$('.chip', host).forEach(function (x) { x.remove(); });
    const list = mode === 'music' ? (window.MUSIC_PLATFORMS || []) : (window.PLATFORMS || []);
    const activeId = mode === 'music' ? selectedMusic : selectedPlatform;
    const spacer = $('.spacer', host);
    list.forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (p.id === activeId ? ' active' : '');
      b.dataset.platform = p.id;
      b.textContent = p.name;
      b.title = p.hint + ' · ' + p.endpoint;
      host.insertBefore(b, spacer);
    });
    updateEndpointHint();
  }

  function initChips() {
    $('#platformChips').addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      $$('.chip', $('#platformChips')).forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      if (mode === 'music') selectedMusic = b.dataset.platform;
      else selectedPlatform = b.dataset.platform;
      $('#levelBox').classList.toggle('hidden', !(mode === 'music' && selectedMusic === 'netease'));
      updateEndpointHint();
      clearNotice();
    });
  }

  function initModeTabs() {
    $('#levelSelect').innerHTML = (window.MUSIC_LEVELS || []).map(function (l) {
      return '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>';
    }).join('');
    $('#levelSelect').addEventListener('change', function (e) { musicLevel = e.target.value; });

    $('#modeTabs').addEventListener('click', function (e) {
      const b = e.target.closest('.mode-tab');
      if (b) setMode(b.dataset.mode);
    });
  }

  function setMode(next) {
    mode = next === 'music' ? 'music' : 'video';
    $$('#modeTabs .mode-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === mode); });

    const isMusic = mode === 'music';
    $('#modeNote').textContent = isMusic ? '歌曲直链 · 封面 · 音质 · 同步歌词' : '短视频 · 图集 · 实况 · 背景音乐';
    $('#inputTitle').textContent = isMusic ? '粘贴歌曲链接 / ID / 歌名' : '粘贴分享链接';
    $('#urlInput').placeholder = isMusic
      ? '粘贴歌曲链接、纯歌曲 ID 或歌名，例如：https://music.163.com/song?id=865632948'
      : '粘贴分享链接或整段分享文案，例如：https://v.douyin.com/xxxx/';
    $('#hintText').textContent = isMusic
      ? '示例按钮载入内置数据，不发起网络请求。真实解析时：链接或 ID 直接取直链，输入歌名走搜索；搜索结果点击任一歌曲即获取直链。'
      : '示例按钮载入内置静态数据，不发起网络请求；「试试」里是真实链接，会发起解析。B 站链接自动改走 /api/bilibili 专用端点（聚合端点对 B 站无效）。';

    $('#videoDemoGroup').classList.toggle('hidden', isMusic);
    $('#musicDemoGroup').classList.toggle('hidden', !isMusic);
    $('#videoQuickLinks').classList.toggle('hidden', isMusic);
    $('#musicQuickLinks').classList.toggle('hidden', !isMusic);
    $('#levelBox').classList.toggle('hidden', !(isMusic && selectedMusic === 'netease'));
    $('#jsonFname').textContent = isMusic ? 'raw music response' : 'v3 contract';

    $('#urlInput').value = '';
    toggleClear();
    clearNotice();
    $('#resultHost').classList.add('hidden');
    clearFailState();
    $('#musicListHost').innerHTML = '';
    $('#mediaBox').innerHTML = '';
    $('#infoPanel').innerHTML = '';
    $('#mediaBox').style.background = '';
    $('#mediaBox').style.padding = '';

    renderChips();
  }

  function selectPlatform(id) {
    const b = $('.chip[data-platform="' + id + '"]', $('#platformChips'));
    if (b) b.click();
  }

  function selectMusic(id) {
    const b = $('.chip[data-platform="' + id + '"]', $('#platformChips'));
    if (b) b.click();
  }

  function renderSupported() {
    $('#platformGrid').innerHTML = (window.SUPPORTED || []).map(function (p) {
      return '<div class="pf"><div><b>' + esc(p.name) + '</b><span>' + esc(p.domain) + '</span></div></div>';
    }).join('');
  }

  function renderMusicSupported() {
    $('#musicPlatformGrid').innerHTML = (window.MUSIC_SUPPORTED || []).map(function (p) {
      return '<div class="mp"><b>' + esc(p.name) + '</b><span class="mono">' + esc(p.domain) + '</span><em>' + esc(p.note) + '</em></div>';
    }).join('');
  }

  function renderCatalog() {
    const cats = ['全部'].concat(Array.from(new Set((window.API_CATALOG || []).map(function (x) { return x.cat; }))));
    $('#catalogFilters').innerHTML = cats.map(function (c) {
      return '<button type="button" class="fbtn' + (c === catalogFilter ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');

    const q = catalogQuery.trim().toLowerCase();
    const list = (window.API_CATALOG || []).filter(function (x) {
      const inCat = catalogFilter === '全部' || x.cat === catalogFilter;
      const inQ = !q || (x.name + ' ' + x.desc + ' ' + x.endpoint + ' ' + x.cat).toLowerCase().indexOf(q) >= 0;
      return inCat && inQ;
    });

    $('#catalogMeta').textContent = '共 ' + list.length + ' 个接口' + (catalogFilter !== '全部' ? ' · 分类：' + catalogFilter : '') + (q ? ' · 关键词：' + catalogQuery.trim() : '') + ' · 数据为静态快照';
    $('#statApiCount').textContent = String((window.API_CATALOG || []).length);

    if (!list.length) {
      $('#catalogGrid').innerHTML = '<div class="empty">没有匹配的接口，请调整搜索词或分类。</div>';
      return;
    }

    $('#catalogGrid').innerHTML = list.map(function (x) {
      const badge = x.status === 'online'
        ? '<span class="bdg on">正常</span>'
        : x.status === 'closed' ? '<span class="bdg off">关闭</span>' : '<span class="bdg beta">不稳定</span>';
      const full = x.endpoint.charAt(0) === '/' ? 'https://api.bugpk.com' + x.endpoint : x.endpoint;
      const isMusic = x.channel === 'music';
      return '<article class="api-card">' +
        '<div class="badges">' + badge + (x.free ? '<span class="bdg free">免费</span>' : '') +
          (isMusic ? '<span class="bdg music">音乐</span>' : '') + '</div>' +
        '<h4>' + esc(x.name) + '</h4>' +
        '<p class="desc">' + esc(x.desc) + '</p>' +
        '<div class="api-ep"><span title="' + esc(full) + '">' + esc(x.endpoint) + '</span>' +
          '<button type="button" data-copy="' + esc(full) + '" title="复制完整地址">' + ICON('copy') + '</button></div>' +
        '<div class="api-foot"><span>调用 <b>' + esc(x.calls) + '</b></span><span>今日 <b>' + esc(x.hits) + '</b></span><span>' + esc(x.date) + '</span>' +
          '<button type="button" class="try" data-ep="' + esc(x.endpoint) + '" data-channel="' + (isMusic ? 'music' : 'video') + '" data-music="' + esc(x.musicId || '') + '">去演示 →</button></div>' +
        '</article>';
    }).join('');
  }

  function initCatalog() {
    $('#catalogSearch').addEventListener('input', function (e) {
      catalogQuery = e.target.value;
      renderCatalog();
    });
    $('#catalogFilters').addEventListener('click', function (e) {
      const b = e.target.closest('.fbtn');
      if (!b) return;
      catalogFilter = b.dataset.cat;
      renderCatalog();
    });
    $('#catalogGrid').addEventListener('click', function (e) {
      const cp = e.target.closest('[data-copy]');
      if (cp) { copyText(cp.dataset.copy, '接口地址已复制'); return; }
      const tr = e.target.closest('.try');
      if (!tr) return;
      if (tr.dataset.channel === 'music') {
        setMode('music');
        if (tr.dataset.music) selectMusic(tr.dataset.music);
        toast('已切换音乐通道：' + currentChannelName());
      } else {
        setMode('video');
        const p = (window.PLATFORMS || []).find(function (x) { return x.endpoint === tr.dataset.ep; });
        selectPlatform(p ? p.id : 'all');
        toast('已切换解析通道：' + currentChannelName());
      }
      document.getElementById('parser').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { $('#urlInput').focus(); }, 420);
    });
    renderCatalog();
  }

  function renderFields() {
    $('#fieldsBody').innerHTML = (window.FIELDS || []).map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
    }).join('');
    $('#musicFieldsBody').innerHTML = (window.MUSIC_FIELDS || []).map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
    }).join('');
  }

  const SAMPLES = {
    curl: 'curl -G "https://api.bugpk.com/api/short_videos" \\\n  --data-urlencode "url=https://v.douyin.com/xxxx/"',
    js: "const share = 'https://v.douyin.com/xxxx/';\nconst api = 'https://api.bugpk.com/api/short_videos';\n\nconst res = await fetch(api + '?url=' + encodeURIComponent(share));\nconst { code, msg, data } = await res.json();\n\nif (code === 200 && data.url) {\n  console.log('无水印直链:', data.url);\n  console.log('作者:', data.author.name);\n} else {\n  console.error('解析失败:', msg);\n}",
    py: "import requests\n\nshare = 'https://v.douyin.com/xxxx/'\napi = 'https://api.bugpk.com/api/short_videos'\n\npayload = requests.get(api, params={'url': share}, timeout=20).json()\n\nif payload.get('code') == 200:\n    data = payload['data']\n    print('无水印直链:', data.get('url'))\n    print('封面:', data.get('cover'))\nelse:\n    print('解析失败:', payload.get('msg'))",
    music: "# 网易云 · 歌曲链接（也可改用 ids=865632948）\ncurl -G 'https://api.bugpk.com/api/163_music' \\\n  --data-urlencode 'type=json' \\\n  --data-urlencode 'url=https://music.163.com/song?id=865632948' \\\n  --data-urlencode 'level=lossless'\n\n# 歌名搜索 → 返回歌曲列表，再用 id 取直链\ncurl -G 'https://api.bugpk.com/api/163_music' \\\n  --data-urlencode 'type=search' \\\n  --data-urlencode 's=青花瓷' \\\n  --data-urlencode 'limit=10'\n\n# 响应为裸 JSON：status / name / ar_name / al_name /\n# pic / url / size / level / lyric —— 无统一 data 包裹层"
  };

  function initSamples() {
    function show(name) {
      $('#codeSample').textContent = SAMPLES[name] || SAMPLES.curl;
      $$('#codeTabs .tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    }
    $('#codeTabs').addEventListener('click', function (e) {
      const t = e.target.closest('.tab');
      if (t) show(t.dataset.tab);
    });
    $('#copyCodeBtn').addEventListener('click', function () { copyText($('#codeSample').textContent, '示例代码已复制'); });
    show('curl');
  }

  /* -------------------------------------------------------- 视频响应归一 */
  function pick(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const v = obj[keys[i]];
      if (v !== undefined && v !== null && v !== '' && v !== false) return v;
    }
    return '';
  }

  function asArray(v) {
    if (!v) return [];
    if (Array.isArray(v)) {
      return v.map(function (x) {
        if (typeof x === 'string') return x;
        if (x && typeof x === 'object') return pick(x, ['url', 'image', 'src', 'link', 'original', 'video']);
        return '';
      }).filter(Boolean);
    }
    if (typeof v === 'object') return asArray(Object.values(v));
    if (typeof v === 'string') return [v];
    return [];
  }

  /**
   * 视频响应归一。注意 /api/bilibili 与聚合端点字段差异很大：
   *  - 作者写在 data.auther（上游拼写如此）或 data.user.name
   *  - 头像写在顶层 data.avatar / data.user.avatar
   *  - 时长在 data.videos[i].duration(秒) / durationFormat("00:01:57")
   *  - 分 P / 合集在 data.videos[] 与 data.totalVideos
   * 这些扁平字段统一在这里吃进标准结构，避免「视频已播出但信息栏仍是未知作者 / 满屏 —」。
   */
  function normalize(payload, meta) {
    const root = (payload && typeof payload === 'object') ? payload : {};
    const rawData = root.data && typeof root.data === 'object' ? root.data : root;
    const d = rawData && typeof rawData === 'object' ? rawData : {};

    // 分 P / 合集（B 站专用端点）
    const parts = Array.isArray(d.videos)
      ? d.videos.filter(function (x) { return x && typeof x === 'object'; })
      : [];
    const firstPart = parts[0] || {};
    const totalParts = Number(d.totalVideos || parts.length || 0) || 0;

    const userObj = (d.user && typeof d.user === 'object') ? d.user : {};
    const authorRaw = pick(d, ['author', 'auther', 'autor', 'creator', 'owner', 'user_info', 'userInfo',
      'nickname', 'nick', 'uname', 'up_name', 'author_name']);
    let author = { name: '', id: '', avatar: '' };
    if (authorRaw && typeof authorRaw === 'object') {
      author = {
        name: String(pick(authorRaw, ['name', 'nickname', 'nick', 'uname', 'title']) || ''),
        id: String(pick(authorRaw, ['id', 'uid', 'sec_uid', 'user_id', 'mid']) || ''),
        avatar: safeUrl(pick(authorRaw, ['avatar', 'avatar_url', 'head', 'icon', 'face']))
      };
    } else if (typeof authorRaw === 'string') {
      author.name = authorRaw;
    }
    // 作者名 / ID / 头像兜底（B 站 auther、user.name、顶层 avatar 并存）
    if (!author.name) author.name = String(pick(userObj, ['name', 'nickname', 'uname']) || '');
    if (!author.id && userObj.mid) author.id = String(userObj.mid);
    if (!author.avatar) {
      author.avatar = safeUrl(pick(d, ['avatar', 'face', 'head_url', 'avatar_url']) ||
        pick(userObj, ['avatar', 'face', 'avatar_url']));
    }

    const musicRaw = pick(d, ['music', 'bgm', 'sound', 'song', 'music_info']);
    let music = null;
    if (musicRaw && typeof musicRaw === 'object') {
      const mu = safeUrl(pick(musicRaw, ['url', 'play_url', 'src', 'link']));
      const mt = String(pick(musicRaw, ['title', 'name', 'song']) || '');
      const ma = String(pick(musicRaw, ['author', 'singer', 'artist']) || '');
      if (mu || mt || ma) music = { title: mt, author: ma, url: mu, cover: safeUrl(pick(musicRaw, ['cover', 'cover_url', 'pic'])) };
    } else if (typeof musicRaw === 'string' && safeUrl(musicRaw)) {
      music = { title: '', author: '', url: safeUrl(musicRaw), cover: '' };
    }

    const images = asArray(pick(d, ['images', 'image_list', 'image_urls', 'pics', 'pictures', 'photos', 'img', 'tupian']));
    const livePhoto = (function () {
      const raw = pick(d, ['live_photo', 'live_photos', 'shitu', 'live']);
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (x) { return x && typeof x === 'object'; }).map(function (x) {
        return { image: safeUrl(pick(x, ['image', 'img', 'url', 'cover'])), video: safeUrl(pick(x, ['video', 'video_url', 'url_video'])) };
      }).filter(function (x) { return x.image || x.video; });
    })();

    const url = safeUrl(pick(d, ['url', 'video_url', 'play_url', 'play_addr', 'download_url', 'nwm_video_url', 'video', 'link', 'src']) ||
      pick(firstPart, ['url', 'video_url', 'play_url']));
    let backup = asArray(pick(d, ['video_backup', 'backups', 'backup_urls', 'beifeng', 'urls']));
    // 多 P / 合集：上游没给备选直链时，把每个分 P 的直链列出来
    if (!backup.length && parts.length > 1) {
      backup = parts.map(function (p) { return safeUrl(pick(p, ['url', 'video_url', 'play_url'])); }).filter(Boolean);
    }
    let type = String(pick(d, ['type', 'resource_type', 'leixing']) || '').toLowerCase();
    if (!type || ['unknown', ''].indexOf(type) >= 0) {
      if (livePhoto.length) type = 'live';
      else if (url) type = 'video';
      else if (images.length) type = 'image';
      else type = 'unknown';
    }

    // 时长：顶层没有时取分 P 的秒数；同时保留上游格式化文本（如 "00:01:57"）
    let duration = pick(d, ['duration', 'duration_seconds', 'shichang']);
    if (duration === '' || duration === undefined || duration === null) {
      duration = pick(firstPart, ['duration', 'duration_seconds']);
    }
    const durationLabel = String(pick(firstPart, ['durationFormat', 'duration_format', 'duration_text']) ||
      pick(d, ['durationFormat', 'duration_text', 'duration_label']) || '');

    // VID：B 站响应不带 bvid，从输入的分享链接 / BV 号里补回来
    const shareUrl = (meta && meta.shareUrl) || '';
    const bv = String(shareUrl).match(/BV[0-9A-Za-z]{8,12}/);

    return {
      code: Number(pick(root, ['code', 'status', 'errno']) || (url || images.length ? 200 : 0)),
      msg: String(pick(root, ['msg', 'message', 'error', 'errmsg', 'reason']) || ''),
      data: {
        type: type,
        title: String(pick(d, ['title', 'desc', 'name', 'caption', 'content']) || ''),
        desc: String(pick(d, ['desc', 'description', 'title', 'caption', 'content']) || ''),
        author: author,
        cover: safeUrl(pick(d, ['cover', 'thumbnail', 'poster', 'thumb', 'cover_url', 'img'])),
        url: url,
        quality: String(pick(d, ['quality', 'resolution', 'definition', 'video_quality', 'clarity']) ||
          pick(firstPart, ['quality', 'resolution', 'definition']) || ''),
        duration: duration,
        duration_label: durationLabel,
        size: Number(pick(d, ['size', 'video_size', 'filesize']) || 0),
        size_label: String(pick(d, ['size_label', 'size_text']) || ''),
        create_time: Number(pick(d, ['create_time', 'createTime', 'timestamp']) || 0),
        publish_time: String(pick(d, ['publish_time', 'publishTime', 'time']) || ''),
        parts_count: totalParts,
        video_backup: backup,
        video_id: String(pick(d, ['video_id', 'vid', 'aweme_id', 'id']) || (bv ? bv[0] : '')),
        images: images.map(safeUrl).filter(Boolean),
        live_photo: livePhoto,
        music: music
      }
    };
  }

  /* -------------------------------------------------------- 音乐响应归一 */
  function normalizeSong(o, root) {
    const x = o && typeof o === 'object' ? o : {};
    const r = root && typeof root === 'object' ? root : {};
    const meta = (x.video_meta && typeof x.video_meta === 'object') ? x.video_meta :
                 ((r.video_meta && typeof r.video_meta === 'object') ? r.video_meta : {});
    let artist = pick(x, ['ar_name', 'singer', 'artist', 'artists', 'artistsname', 'author', 'ar', 'singerName']);
    if (artist && typeof artist === 'object') artist = pick(artist, ['name', 'name1']);
    if (Array.isArray(artist)) artist = artist.map(function (a) { return typeof a === 'string' ? a : (a && a.name) || ''; }).join('/');
    // 部分接口（网易云 type=json）不返回 id，从直链里补一个
    const audioUrl = safeUrl(pick(x, ['url', 'music_url', 'play_url', 'song_url', 'musicUrl', 'download_url', 'audio_url']));
    let sid = String(pick(x, ['song_id', 'id', 'songmid', 'mid', 'songId']) || '');
    if (!sid && audioUrl) {
      const m = audioUrl.match(/[?&]id=([^&#.]+)/);
      if (m) sid = m[1];
    }
    return {
      title: String(pick(x, ['name', 'title', 'song_name', 'songname', 'track_name', 'albumname']) || ''),
      artist: String(artist || ''),
      album: String(pick(x, ['al_name', 'album', 'albumname', 'albumName']) || ''),
      cover: safeUrl(pick(x, ['pic', 'picUrl', 'picimg', 'cover', 'cover_url', 'img', 'image', 'album_pic', 'pic_url'])),
      url: audioUrl,
      quality: String(pick(x, ['level', 'quality']) || pick(meta, ['quality']) || ''),
      size: String(pick(x, ['size', 'size_label', 'file_size']) || (meta.size ? fmtBytes(meta.size) : '')),
      duration: pick(x, ['duration', 'songTimeMinutes', 'duration_ms']),
      lyric: String(pick(x, ['lyric', 'lrc', 'lrc_data', 'lyrics', 'lrcData']) || ''),
      id: sid,
      extra: meta
    };
  }

  function normalizeMusic(payload, kind) {
    const root = (payload && typeof payload === 'object') ? payload : {};
    const upstreamErr = String(pick(root, ['error', 'errmsg', 'err']) || '');
    const code = Number(pick(root, ['code', 'status']) || (upstreamErr || root.data === null ? 500 : 200));
    const msg = String(pick(root, ['msg', 'message']) || upstreamErr || '');
    const d = (root.data && typeof root.data === 'object') ? root.data : root;

    if (kind === 'search') {
      const rawList = pick(d, ['songs', 'list', 'songlist', 'result', 'songs_list']) ||
                      pick(root, ['songs', 'list', 'songlist', 'result']);
      const arr = Array.isArray(rawList) ? rawList : (rawList && typeof rawList === 'object' ? Object.values(rawList) : []);
      return {
        code: code, msg: msg || '搜索完成', kind: arr.length ? 'search' : 'error',
        songs: arr.filter(function (x) { return x && typeof x === 'object'; }).map(function (x) { return normalizeSong(x, root); }),
        raw: payload
      };
    }

    // 普通歌曲响应；若 data 里仍嵌套数组，取第一项
    let target = d;
    const nested = pick(d, ['songs', 'list', 'songlist']);
    if (Array.isArray(nested) && nested.length && typeof nested[0] === 'object') target = nested[0];
    const song = normalizeSong(target, root);
    const ok = !upstreamErr && code === 200 && root.data !== null && (song.url || song.title);
    return { code: code, msg: msg, kind: ok ? 'song' : 'error', songs: [song], raw: payload };
  }

  /* ------------------------------------------------------------ 结果渲染 */
  function renderMedia(d) {
    const box = $('#mediaBox');
    if (d.url && (d.type === 'video' || d.type === 'live')) {
      box.innerHTML = '<video controls playsinline preload="metadata" referrerpolicy="no-referrer"' +
        (d.cover ? ' poster="' + esc(d.cover) + '"' : '') +
        ' src="' + esc(d.url) + '">您的浏览器不支持视频播放</video>';
      return;
    }
    if (d.images.length) {
      box.style.background = 'var(--surface-3)';
      box.style.padding = '12px';
      box.innerHTML = '<div class="gallery" style="width:100%">' + d.images.map(function (u, i) {
        return '<a href="' + esc(u) + '" data-img="' + esc(u) + '" title="点击查看原图 ' + (i + 1) + '"><img loading="lazy" referrerpolicy="no-referrer" src="' + esc(u) + '" alt="图集第 ' + (i + 1) + ' 张"></a>';
      }).join('') + '</div>';
      return;
    }
    if (d.live_photo.length) {
      box.style.background = 'var(--surface-3)';
      box.style.padding = '12px';
      box.innerHTML = '<div class="live-pair" style="width:100%">' + d.live_photo.slice(0, 4).map(function (p) {
        return '<img loading="lazy" referrerpolicy="no-referrer" style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:8px" src="' + esc(p.image || p.video) + '" alt="实况图">';
      }).join('') + '</div>';
      return;
    }
    if (d.cover) {
      box.style.background = 'var(--code-bg)';
      box.innerHTML = '<img class="cover" referrerpolicy="no-referrer" src="' + esc(d.cover) + '" alt="封面">';
      return;
    }
    box.innerHTML = '<div class="media-placeholder">接口未返回可预览的媒体地址</div>';
  }

  function renderInfo(d) {
    const host = $('#infoPanel');
    const sizeText = d.size_label || fmtBytes(d.size);
    let rows = [
      ['类型', esc((d.type || 'unknown').toUpperCase())],
      ['画质', esc(d.quality || '—')],
      ['时长', esc(d.duration_label || fmtDuration(d.duration))],
      ['大小', esc(sizeText)],
      ['发布时间', esc(fmtTime(d.create_time, d.publish_time))],
      ['VID', esc(d.video_id || '—')]
    ];
    if (d.parts_count > 1) rows.splice(3, 0, ['分P / 合集', esc('共 ' + d.parts_count + ' P')]);
    // 上游没给的字段不渲染成「—」占位，避免信息栏变成一排空值
    rows = rows.filter(function (r) { return r[1] && r[1] !== '—'; });

    let html = '';
    html += '<h4 class="info-title">' + esc(d.title || '（无标题）') + '</h4>';
    if (d.desc && d.desc !== d.title) html += '<p class="info-desc">' + esc(d.desc) + '</p>';
    // 无头像时不再渲染彩色占位块，只保留文字
    html += '<div class="author-row">' +
      (d.author.avatar ? '<img referrerpolicy="no-referrer" src="' + esc(d.author.avatar) + '" alt="">' : '') +
      '<div><div class="n">' + esc(d.author.name || '未知作者') + '</div><div class="i">' + esc(d.author.id || '—') + '</div></div></div>';
    html += '<dl class="kv">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';

    html += '<div class="action-row">';
    if (d.url) {
      html += '<a class="btn-sm solid" href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' + ICON('download') + ' 打开 / 下载直链</a>';
      html += '<button class="btn-sm" type="button" data-act="copy-url" data-val="' + esc(d.url) + '">' + ICON('copy') + ' 复制链接</button>';
    }
    const allImgs = d.images.concat(d.live_photo.map(function (p) { return p.image; }).filter(Boolean));
    if (allImgs.length) {
      html += '<button class="btn-sm" type="button" data-act="copy-images" data-val="' + esc(allImgs.join('\n')) + '">' + ICON('copy') + ' 复制全部图片链接</button>';
    }
    if (d.cover) html += '<a class="btn-sm" href="' + esc(d.cover) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' + ICON('image') + ' 查看封面</a>';
    html += '</div>';

    if (d.video_backup.length) {
      html += '<div class="backup-list"><div class="muted" style="margin-bottom:5px">备选直链（' + d.video_backup.length + '）</div>' +
        d.video_backup.slice(0, 3).map(function (u) {
          return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' + esc(u) + '</a>';
        }).join('') + '</div>';
    }
    if (d.music && (d.music.url || d.music.title)) {
      html += '<div class="backup-list"><div class="muted" style="margin-bottom:5px">背景音乐</div>' +
        '<div>' + esc(d.music.title || '未命名') + (d.music.author ? ' · ' + esc(d.music.author) : '') + '</div>' +
        (d.music.url ? '<a href="' + esc(d.music.url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.music.url) + '</a>' : '') + '</div>';
    }
    host.innerHTML = html;
  }

  /* 失败态 --------------------------------------------------------------- */
  function clearFailState() {
    $('#resultHost').classList.remove('fail');
    $('#failPanel').classList.add('hidden');
    $('#resultTitle').textContent = '解析结果';
    $('#resultTag').classList.remove('fail');
    $('#mediaBox').style.background = '';
    $('#mediaBox').style.padding = '';
  }

  /**
   * 解析失败统一走这里，绝不套用成功结果模板。
   * 之前的问题：失败响应（code=0 / msg=解析失败！）也渲染了视频卡片，
   * 于是出现「（无标题）/ 未知作者 / 满屏 — / 黑色空媒体框」这种空壳。
   * 现在只展示失败原因 + 可操作建议 + 上游原始响应（供排障）。
   * 返回 false，调用方据此跳过「最近解析」记录。
   */
  function showFailure(payload, meta, detail) {
    const root = (payload && typeof payload === 'object') ? payload : {};
    const d = detail || {};
    lastResult = payload;
    lastRawText = (meta && meta.rawText) || JSON.stringify(payload, null, 2);

    const rawMsg = String(d.msg || pick(root, ['msg', 'message', 'error', 'errmsg', 'reason']) || '');
    const cleanMsg = rawMsg.replace(/[！!。.]+$/, '').trim();
    const code = d.code !== undefined && d.code !== null ? d.code : pick(root, ['code', 'status', 'errno']);
    const isRaw = !!(root.__raw || d.nonJSON);
    const upstreamMsg = cleanMsg || (isRaw ? '上游返回了非 JSON 内容' : '接口未返回媒体数据');
    const headline = '解析失败 · 未取得可播放内容';
    const channel = (meta && meta.channel) || '自动识别';

    $('#resultHost').classList.remove('hidden');
    $('#resultHost').classList.add('fail');
    $('#resultTitle').textContent = '解析失败';
    const tagEl = $('#resultTag');
    tagEl.textContent = 'FAILED';
    tagEl.classList.remove('demo');
    tagEl.classList.add('fail');
    $('#resultSource').textContent = (meta && meta.source) ||
      ('通道：' + channel + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }));

    $('#musicListHost').innerHTML = '';
    $('#mediaBox').innerHTML = '';
    $('#mediaBox').style.background = '';
    $('#mediaBox').style.padding = '';
    $('#infoPanel').innerHTML = '';

    const hint = d.hint || (meta && meta.failHint) ||
      '请确认链接有效、内容未下架或未被设为私密；也可在上方手动切换其他解析通道，或稍后重试。公益接口可能临时限流或维护。';
    $('#failPanel').innerHTML =
      '<div class="fail-icon">' + ICON('alert') + '</div>' +
      '<div class="fail-body">' +
        '<h4>' + esc(headline) + '</h4>' +
        '<p class="fail-upstream"><b>上游返回：</b>' + esc(upstreamMsg) + '</p>' +
        '<p>' + esc(hint) + '</p>' +
        '<p class="fail-hint">通道：' + esc(channel) + ' · 响应码 ' +
          esc(code === undefined || code === null || code === '' ? 'N/A' : code) +
          ' · 上游原始响应已保留在下方，便于排查</p>' +
        '<div class="fail-actions">' +
          '<button class="btn-sm solid" type="button" id="failRetryBtn">' + ICON('refresh') + ' 重新解析</button>' +
          '<span class="muted">可更换输入内容，或在上方手动切换解析通道</span>' +
        '</div>' +
      '</div>';
    $('#failPanel').classList.remove('hidden');
    $('#failRetryBtn').addEventListener('click', function () { $('#parseBtn').click(); });

    $('#jsonFname').textContent = (meta && meta.channel) ? (meta.channel + ' · raw response') : 'raw response';
    $('#jsonCode').innerHTML = highlightJSON(lastRawText);

    const lead = (!cleanMsg || /^解析失败[！!]?$/.test(cleanMsg))
      ? '接口未返回可播放的媒体数据'
      : cleanMsg;
    notify('err', '<strong>解析失败</strong><br>' + esc(lead) +
      '<br>已跳过空白结果卡片，下方保留上游原始响应；可更换链接或在上方手动切换通道后重试。');
    return false;
  }

  function isVideoFailure(payload, r) {
    const hasMedia = !!(r.data.url || r.data.images.length || r.data.live_photo.length);
    const badMsg = /失败|异常|错误|无法|不存在|已下架|付费|invalid|fail|error|not found/i.test(r.msg);
    return !!(payload && payload.__raw) || !hasMedia || badMsg;
  }

  function showResult(payload, meta) {
    const r = normalize(payload, meta);
    if (isVideoFailure(payload, r)) {
      return showFailure(payload, meta, {
        msg: r.msg, code: r.code, nonJSON: !!(payload && payload.__raw),
        hint: meta && meta.failHint
      });
    }
    clearFailState();
    lastResult = payload;
    lastRawText = (meta && meta.rawText) || JSON.stringify(payload, null, 2);

    $('#resultHost').classList.remove('hidden');
    $('#musicListHost').innerHTML = '';
    $('#jsonFname').textContent = 'v3 contract';
    const tagEl = $('#resultTag');
    tagEl.textContent = r.data.type.toUpperCase();
    tagEl.classList.toggle('demo', !!(meta && meta.demo));
    $('#resultSource').textContent = meta && meta.source
      ? meta.source
      : '通道：' + (meta && meta.channel ? meta.channel : '自动识别') + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });

    renderMedia(r.data);
    renderInfo(r.data);
    $('#jsonCode').innerHTML = highlightJSON(lastRawText);
    return true;
  }

  /* 音乐结果 ------------------------------------------------------------ */
  function renderMusicList(songs) {
    $('#musicListHost').innerHTML = '<div class="song-list-head">' + ICON('search', 'width:14px;height:14px') +
      ' 搜索结果（' + songs.length + '）· 点击「解析此曲」用网易云通道获取直链</div>' +
      '<div class="song-list">' + songs.slice(0, 12).map(function (s, i) {
        return '<div class="song-row">' +
          (s.cover ? '<img referrerpolicy="no-referrer" src="' + esc(s.cover) + '" alt="">' : '') +
          '<div class="song-main"><b>' + esc(s.title || '未命名') + '</b>' +
            '<span>' + esc(s.artist || '未知歌手') + (s.album ? ' · ' + esc(s.album) : '') + '</span></div>' +
          '<span class="song-dur mono">' + esc(fmtMusicDuration(s.duration)) + '</span>' +
          '<button type="button" class="btn-sm" data-song-id="' + esc(s.id) + '" data-song-idx="' + i + '"' + (s.id ? '' : ' disabled') + '>解析此曲 →</button>' +
        '</div>';
      }).join('') + '</div>';
  }

  function renderMusicMedia(s) {
    let html = '';
    if (s.cover) html += '<img class="music-cover" referrerpolicy="no-referrer" src="' + esc(s.cover) + '" alt="专辑封面">';
    if (s.url) html += '<audio controls preload="metadata" src="' + esc(s.url) + '">您的浏览器不支持音频播放</audio>';
    else html += '<div class="media-placeholder">接口未返回可播放的音频直链</div>';
    $('#mediaBox').innerHTML = '<div class="audio-box">' + html + '</div>';
  }

  function renderMusicInfo(s, r, channelName) {
    const rows = [
      ['通道', esc(channelName || '—')],
      ['音质', esc(s.quality || '—')],
      ['大小', esc(s.size || '—')],
      ['时长', esc(fmtMusicDuration(s.duration))],
      ['歌曲 ID', esc(s.id || '—')]
    ];
    let html = '<h4 class="info-title">' + ICON('music', 'width:15px;height:15px;vertical-align:-3px;margin-right:6px;color:var(--accent)') + esc(s.title || '（无歌名）') + '</h4>';
    html += '<p class="info-desc">' + esc(s.artist || '未知歌手') + (s.album ? ' · 《' + esc(s.album) + '》' : '') + '</p>';
    html += '<dl class="kv">' + rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>';

    html += '<div class="action-row">';
    if (s.url) {
      html += '<a class="btn-sm solid" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' + ICON('download') + ' 打开 / 下载音频</a>';
      html += '<button class="btn-sm" type="button" data-act="copy-url" data-val="' + esc(s.url) + '">' + ICON('copy') + ' 复制直链</button>';
    }
    if (s.cover) html += '<a class="btn-sm" href="' + esc(s.cover) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">' + ICON('image') + ' 查看封面</a>';
    const lrc = cleanLrc(s.lyric);
    if (lrc) html += '<button class="btn-sm" type="button" data-act="copy-lyric" data-val="' + esc(lrc) + '">' + ICON('copy') + ' 复制歌词</button>';
    html += '</div>';

    if (lrc) {
      html += '<div class="lyric-box"><div class="lyric-head">' + ICON('lyric', 'width:13px;height:13px') + ' 歌词</div><pre>' + esc(lrc) + '</pre></div>';
    }
    $('#infoPanel').innerHTML = html;
  }

  function showMusicResult(payload, meta) {
    const r = normalizeMusic(payload, meta.kind);
    if (r.kind === 'error' || (payload && payload.__raw)) {
      return showFailure(payload, meta, {
        msg: r.msg, code: r.code, nonJSON: !!(payload && payload.__raw),
        hint: '请确认歌曲链接 / ID 有效，或改用歌曲链接、纯 ID、歌名搜索重试；VIP / 付费 / 下架内容可能无法取得直链，也可切换其他音乐通道。'
      });
    }
    clearFailState();
    lastResult = payload;
    lastRawText = meta.rawText || JSON.stringify(payload, null, 2);

    $('#resultHost').classList.remove('hidden');
    const tagEl = $('#resultTag');
    tagEl.textContent = r.kind === 'search' ? 'SEARCH' : 'MUSIC';
    tagEl.classList.toggle('demo', !!meta.demo);
    $('#resultSource').textContent = meta.source || ('通道：' + meta.channel + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }));
    $('#jsonFname').textContent = meta.channel + ' · raw response';
    $('#jsonCode').innerHTML = highlightJSON(lastRawText);

    $('#mediaBox').style.background = '';
    $('#mediaBox').style.padding = '';
    if (r.kind === 'search') {
      renderMusicList(r.songs);
      $('#mediaBox').innerHTML = '<div class="media-placeholder">选择上方任一歌曲以获取音频直链</div>';
      $('#infoPanel').innerHTML = '<div class="empty">' + ICON('search') + '共找到 ' + r.songs.length + ' 首歌曲。点击「解析此曲」查看播放器、封面与歌词。</div>';
      if (!r.songs.length) notify('warn', '未找到匹配的歌曲，请更换关键词或直接使用歌曲链接 / ID。');
      return true;
    }
    $('#musicListHost').innerHTML = '';
    const s = r.songs[0] || {};
    renderMusicMedia(s);
    renderMusicInfo(s, r, meta.channel);
    if (!s.url) notify('warn', '接口返回了歌曲信息，但没有音频直链（常见于 VIP / 付费 / 风控内容）。');
    return true;
  }

  /* ------------------------------------------------------------ 解析请求 */
  /**
   * 实测：聚合端点 /api/short_videos 对 bilibili 链接一律返回 code=0「解析失败！」，
   * 而专用端点 /api/bilibili 对同样的链接返回 code=200 + 真实 mp4 直链。
   * 因此「自动识别」遇到 B 站域名时自动改道，用户无需手动切通道。
   */
  function isBilibiliUrl(u) {
    return /(?:^|\/\/)(?:(?:www|m|mobile)\.)?bilibili\.com\//i.test(u || '') ||
           /(?:^|\/\/)b23\.tv\//i.test(u || '');
  }

  // 纯 BV 号（B 站常见分享形式）补成完整播放页链接，上游只认完整 URL
  function normalizeShareUrl(text) {
    const raw = String(text || '').trim();
    const u = extractUrl(raw);
    if (u) return u;
    if (/^BV[0-9A-Za-z]{8,12}$/i.test(raw)) return 'https://www.bilibili.com/video/' + raw;
    return '';
  }

  function buildEndpoint(shareUrl) {
    if (selectedPlatform !== 'all' && CFG.platforms[selectedPlatform]) return CFG.platforms[selectedPlatform];
    if (isBilibiliUrl(shareUrl)) return CFG.platforms.bilibili;
    return CFG.primary;
  }

  function buildMusicRequest(text) {
    const raw = String(text || '').trim();
    const url = extractUrl(raw);
    const channel = selectedMusic;
    const endpoint = CFG.music[channel];
    let params = {}, kind = 'song';

    if (channel === 'netease') {
      if (url) {
        params = { type: 'json', url: url, level: musicLevel };
      } else if (/^\d+$/.test(raw)) {
        params = { type: 'json', ids: raw, level: musicLevel };
      } else {
        params = { type: 'search', s: raw, limit: 10 };
        kind = 'search';
      }
    } else if (channel === 'qq') {
      if (url) params = { url: url, type: 'song' };
      else { params = { name: raw, type: 'search' }; kind = 'search'; }
    } else if (channel === 'kuwo' || channel === 'qishui') {
      params = { url: url || raw };
    } else { // aggregate
      let id = raw, media = 'tencent';
      if (url) {
        const m = url.match(/songDetail\/([A-Za-z0-9_-]+)/) ||
                  url.match(/[?&](?:songmid|mid)=([^&#]+)/) ||
                  url.match(/[?&]id=([A-Za-z0-9_-]+)/) ||
                  url.match(/play_detail\/(\d+)/);
        if (m) id = decodeURIComponent(m[1]);
        if (/163\.com/.test(url)) media = 'netease';
      }
      params = { id: id, media: media, type: 'song' };
    }
    return { endpoint: endpoint, target: endpoint + '?' + qs(params) + '&_=' + Date.now(), channel: channel, kind: kind };
  }

  function setLoading(on) {
    const btn = $('#parseBtn');
    btn.disabled = on;
    btn.innerHTML = on
      ? '<span class="spinner"></span><span>解析中…</span>'
      : ICON('zap') + '<span>开始解析</span>';
  }

  function reportError(err, target) {
    clearNotice();
    let msg = esc(err && err.message ? err.message : String(err));
    let extra = '';
    if (err && err.name === 'AbortError') {
      msg = '请求超时（' + Math.round(CFG.timeout / 1000) + 's）';
      extra = '上游解析耗时较长，请稍后重试，或改用其他通道。';
    } else if (/Failed to fetch|NetworkError|Load failed/i.test(String(err && err.message))) {
      msg = '网络请求被拦截或失败';
      extra = '常见原因：CORS 策略、网络代理、上游服务不可达。可稍后重试，或检查浏览器控制台。';
    }
    notify('err', '<strong>' + msg + '</strong>' + (extra ? '<br>' + extra : '') +
      '<br><span class="mono" style="font-size:11.5px;opacity:.85">GET ' + esc(target) + '</span>');
  }

  async function fetchJSON(target, ctrl) {
    const res = await fetch(target, { method: 'GET', signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    const raw = await res.text();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      // 上游偶发返回 HTML / 纯文本：保留原文，交给结果区展示
      payload = { __raw: true, error: '接口返回了非 JSON 内容（HTTP ' + res.status + '）', http_status: res.status, body: raw.slice(0, 4000) };
    }
    return { payload: payload, rawText: raw.slice(0, 20000), nonJSON: !!payload.__raw };
  }

  async function doVideoParse(text, retryCount) {
    const attempt = retryCount || 0;
    const shareUrl = normalizeShareUrl(text);
    if (!shareUrl) {
      notify('err', '未检测到有效的 http/https 链接。请粘贴完整的分享链接、整段分享文案，或直接粘贴 B 站 BV 号。');
      $('#urlInput').focus();
      return;
    }
    clearNotice();
    setLoading(true);

    const endpoint = buildEndpoint(shareUrl);
    const autoBili = selectedPlatform === 'all' && endpoint === CFG.platforms.bilibili;
    const channel = autoBili ? '自动识别 → 哔哩哔哩专用' : currentChannelName();
    const target = endpoint + '?url=' + encodeURIComponent(shareUrl) + '&_=' + Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, CFG.timeout);

    try {
      const out = await fetchJSON(target, ctrl);
      const ok = showResult(out.payload, {
        channel: channel,
        shareUrl: shareUrl,
        source: '通道：' + channel + ' · ' + endpoint.replace(/^https?:\/\//, '') + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        rawText: out.nonJSON ? out.rawText : '',
        failHint: isBilibiliUrl(shareUrl)
          ? 'B 站链接已自动改走专用端点 /api/bilibili（聚合端点对 B 站无效）。若仍失败，通常是该视频不存在、已删除、会员 / 合集限制：请先在 B 站打开确认链接有效，或换一个 BV 号重试。'
          : ''
      });
      if (ok !== false) saveHistory(text);
    } catch (err) {
      // 上游偶发响应慢 / 中断（实测 B 站专用端点约 1/4 请求会超时），自动重试一次
      const transient = err && (err.name === 'AbortError' ||
        /Failed to fetch|NetworkError|Load failed/i.test(String(err.message)));
      if (transient && attempt < 1) {
        toast('上游响应较慢，正在自动重试一次');
        await doVideoParse(text, attempt + 1);
        return;
      }
      reportError(err, target);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  async function doMusicParse(text) {
    const raw = String(text || '').trim();
    if (!raw) {
      notify('err', '请输入歌曲链接、纯歌曲 ID 或歌名（例如：865632948 / 青花瓷）。');
      $('#urlInput').focus();
      return;
    }
    clearNotice();
    setLoading(true);

    const req = buildMusicRequest(raw);
    const channel = currentChannelName();
    const source = '通道：' + channel + ' · ' + req.endpoint.replace(/^https?:\/\//, '') +
      ' · ' + (req.kind === 'search' ? '歌名搜索' : '直链解析') + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, CFG.timeout);

    try {
      const out = await fetchJSON(req.target, ctrl);
      const ok = showMusicResult(out.payload, {
        channel: channel, source: source, kind: req.kind,
        rawText: out.nonJSON ? out.rawText : ''
      });
      if (ok !== false) saveHistory(text);
    } catch (err) {
      reportError(err, req.target);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  /* 搜索结果 → 用网易云通道按 ID 取直链 */
  async function parseSongById(id) {
    if (!id) return;
    if (selectedMusic !== 'netease') {
      selectedMusic = 'netease';
      renderChips();
      toast('已切换至网易云通道以获取直链');
    }
    clearNotice();
    setLoading(true);
    const endpoint = CFG.music.netease;
    const target = endpoint + '?type=json&ids=' + encodeURIComponent(id) + '&level=' + encodeURIComponent(musicLevel) + '&_=' + Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, CFG.timeout);
    try {
      const out = await fetchJSON(target, ctrl);
      showMusicResult(out.payload, {
        channel: '网易云音乐',
        source: '通道：网易云音乐 · 歌曲 ID ' + String(id) + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        kind: 'song', rawText: out.nonJSON ? out.rawText : ''
      });
      if (out.nonJSON) $('#jsonCode').innerHTML = highlightJSON(out.rawText);
      document.getElementById('parser').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      reportError(err, target);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  function doParse(text) {
    return mode === 'music' ? doMusicParse(text) : doVideoParse(text);
  }

  /* ------------------------------------------------------------ 历史记录 */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }

  function saveHistory(text) {
    const v = String(text || '').trim();
    if (!v) return;
    let list = loadHistory().filter(function (x) { return x !== v; });
    list.unshift(v);
    list = list.slice(0, 6);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* noop */ }
    renderHistory();
  }

  function renderHistory() {
    const list = loadHistory();
    const host = $('#historyHost');
    host.querySelectorAll('button').forEach(function (b) { b.remove(); });
    host.classList.toggle('hidden', !list.length);
    list.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v.length > 40 ? v.slice(0, 40) + '…' : v;
      b.title = v;
      b.addEventListener('click', function () { $('#urlInput').value = v; toggleClear(); updateEndpointHint(v); $('#urlInput').focus(); });
      host.appendChild(b);
    });
  }

  /* ------------------------------------------------------------ 事件绑定 */
  function toggleClear() {
    $('#clearInput').style.display = $('#urlInput').value ? 'block' : 'none';
  }

  function initParser() {
    const input = $('#urlInput');
    input.addEventListener('input', function () { toggleClear(); updateEndpointHint(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doParse(input.value);
    });
    $('#clearInput').addEventListener('click', function () {
      input.value = '';
      toggleClear();
      updateEndpointHint('');
      input.focus();
      clearNotice();
    });
    $('#parseBtn').addEventListener('click', function () { doParse(input.value); });

    ['#musicQuickLinks', '#videoQuickLinks'].forEach(function (sel) {
      $(sel).addEventListener('click', function (e) {
        const b = e.target.closest('[data-fill]');
        if (!b) return;
        input.value = b.dataset.fill;
        toggleClear();
        updateEndpointHint(b.dataset.fill);
        input.focus();
      });
    });

    $('#demoVideoBtn').addEventListener('click', function () {
      clearNotice();
      showResult(window.DEMO_RESULT, { demo: true, source: window.DEMO_RESULT.__source });
      toast('已载入视频示例数据');
    });
    $('#demoImageBtn').addEventListener('click', function () {
      clearNotice();
      showResult(window.DEMO_IMAGE_RESULT, { demo: true, source: window.DEMO_IMAGE_RESULT.__source });
      toast('已载入图集示例数据');
    });
    $('#demoMusicBtn').addEventListener('click', function () {
      clearNotice();
      showMusicResult(window.DEMO_MUSIC_RESULT, {
        demo: true, channel: '网易云音乐', kind: 'song', source: window.DEMO_MUSIC_RESULT.__source
      });
      toast('已载入音乐示例数据');
    });
    $('#demoMusicSearchBtn').addEventListener('click', function () {
      clearNotice();
      showMusicResult(window.DEMO_MUSIC_SEARCH_RESULT, {
        demo: true, channel: '网易云音乐', kind: 'search', source: window.DEMO_MUSIC_SEARCH_RESULT.__source
      });
      toast('已载入搜索结果示例');
    });

    $('#musicListHost').addEventListener('click', function (e) {
      const b = e.target.closest('[data-song-id]');
      if (b && b.dataset.songId) parseSongById(b.dataset.songId);
    });

    $('#infoPanel').addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'copy-url') copyText(b.dataset.val, '直链已复制');
      if (b.dataset.act === 'copy-images') copyText(b.dataset.val, '全部图片链接已复制');
      if (b.dataset.act === 'copy-lyric') copyText(b.dataset.val, '歌词已复制');
    });

    $('#copyJsonBtn').addEventListener('click', function () { copyText(lastRawText, 'JSON 已复制'); });
    $('#downloadJsonBtn').addEventListener('click', function () {
      const blob = new Blob([lastRawText], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (mode === 'music' ? 'music_parse_' : 'video_parse_') + Date.now() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('JSON 文件已生成');
    });

    // 图集灯箱：拦截 <a data-img> 的默认跳转
    $('#mediaBox').addEventListener('click', function (e) {
      const a = e.target.closest('[data-img]');
      if (!a) return;
      e.preventDefault();
      $('#lightboxImg').src = a.dataset.img;
      $('#lightbox').classList.add('open');
    });
    $('#lightboxClose').addEventListener('click', function () { $('#lightbox').classList.remove('open'); });
    $('#lightbox').addEventListener('click', function (e) {
      if (e.target.id === 'lightbox') $('#lightbox').classList.remove('open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $('#lightbox').classList.remove('open');
    });

    renderHistory();
  }

  /* ---------------------------------------------------------------- 启动 */
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initImageFallback();
    initModeTabs();
    renderChips();
    initChips();
    renderSupported();
    renderMusicSupported();
    renderFields();
    initCatalog();
    initSamples();
    initParser();
    setMode('video');
    updateEndpointHint();
  });
})();
