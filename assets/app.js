/* ==========================================================================
 * app.js — short_videos 在线演示站交互逻辑
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

  let selectedPlatform = 'all';
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
  function renderPlatformChips() {
    const host = $('#platformChips');
    const label = $('.label', host);
    const spacer = $('.spacer', host);
    (window.PLATFORMS || []).forEach(function (p) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (p.id === 'all' ? ' active' : '');
      b.dataset.platform = p.id;
      b.textContent = p.name;
      b.title = p.hint + ' · ' + p.endpoint;
      host.insertBefore(b, spacer);
    });
    host.addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      $$('.chip', host).forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      selectedPlatform = b.dataset.platform;
      const p = window.PLATFORMS.find(function (x) { return x.id === selectedPlatform; });
      $('.api-status .url').textContent = 'GET ' + (p ? p.endpoint : '/api/short_videos') + '?url=…';
    });
  }

  function selectPlatform(id) {
    const b = $('.chip[data-platform="' + id + '"]', $('#platformChips'));
    if (b) b.click();
  }

  function renderSupported() {
    $('#platformGrid').innerHTML = (window.SUPPORTED || []).map(function (p) {
      return '<div class="pf"><span class="pf-icon ' + p.tone + '">' + esc(p.name.charAt(0)) + '</span>' +
        '<div><b>' + esc(p.name) + '</b><span>' + esc(p.domain) + '</span></div></div>';
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

    $('#catalogGrid').innerHTML = list.map(function (x, i) {
      const badge = x.status === 'online'
        ? '<span class="bdg on">正常</span>'
        : x.status === 'closed' ? '<span class="bdg off">关闭</span>' : '<span class="bdg beta">不稳定</span>';
      const full = x.endpoint.charAt(0) === '/' ? 'https://api.bugpk.com' + x.endpoint : x.endpoint;
      return '<article class="api-card">' +
        '<div class="badges">' + badge + (x.free ? '<span class="bdg free">免费</span>' : '') + '</div>' +
        '<h4>' + esc(x.name) + '</h4>' +
        '<p class="desc">' + esc(x.desc) + '</p>' +
        '<div class="api-ep"><span title="' + esc(full) + '">' + esc(x.endpoint) + '</span>' +
          '<button type="button" data-copy="' + esc(full) + '" title="复制完整地址">' + ICON('copy') + '</button></div>' +
        '<div class="api-foot"><span>调用 <b>' + esc(x.calls) + '</b></span><span>今日 <b>' + esc(x.hits) + '</b></span><span>' + esc(x.date) + '</span>' +
          '<button type="button" class="try" data-ep="' + esc(x.endpoint) + '" data-idx="' + i + '">去演示 →</button></div>' +
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
      if (tr) {
        const ep = tr.dataset.ep;
        const p = (window.PLATFORMS || []).find(function (x) { return x.endpoint === ep; });
        selectPlatform(p ? p.id : 'all');
        document.getElementById('parser').scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(function () { $('#urlInput').focus(); }, 420);
        toast('已切换解析通道：' + (p ? p.name : '自动识别'));
      }
    });
    renderCatalog();
  }

  function renderFields() {
    $('#fieldsBody').innerHTML = (window.FIELDS || []).map(function (r) {
      return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>';
    }).join('');
  }

  const SAMPLES = {
    curl: 'curl -G "https://api.bugpk.com/api/short_videos" \\\n  --data-urlencode "url=https://v.douyin.com/xxxx/"',
    js: "const share = 'https://v.douyin.com/xxxx/';\nconst api = 'https://api.bugpk.com/api/short_videos';\n\nconst res = await fetch(api + '?url=' + encodeURIComponent(share));\nconst { code, msg, data } = await res.json();\n\nif (code === 200 && data.url) {\n  console.log('无水印直链:', data.url);\n  console.log('作者:', data.author.name);\n} else {\n  console.error('解析失败:', msg);\n}",
    py: "import requests\n\nshare = 'https://v.douyin.com/xxxx/'\napi = 'https://api.bugpk.com/api/short_videos'\n\npayload = requests.get(api, params={'url': share}, timeout=20).json()\n\nif payload.get('code') == 200:\n    data = payload['data']\n    print('无水印直链:', data.get('url'))\n    print('封面:', data.get('cover'))\nelse:\n    print('解析失败:', payload.get('msg'))"
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

  /* ------------------------------------------------------------ 响应归一 */
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

  function normalize(payload) {
    const root = (payload && typeof payload === 'object') ? payload : {};
    const rawData = root.data && typeof root.data === 'object' ? root.data : root;
    const d = rawData && typeof rawData === 'object' ? rawData : {};

    const authorRaw = pick(d, ['author', 'creator', 'owner', 'user_info', 'userInfo', 'nickname', 'author_name']);
    let author = { name: '', id: '', avatar: '' };
    if (authorRaw && typeof authorRaw === 'object') {
      author = {
        name: String(pick(authorRaw, ['name', 'nickname', 'nick', 'uname', 'title']) || ''),
        id: String(pick(authorRaw, ['id', 'uid', 'sec_uid', 'user_id']) || ''),
        avatar: safeUrl(pick(authorRaw, ['avatar', 'avatar_url', 'head', 'icon', 'face']))
      };
    } else if (typeof authorRaw === 'string') {
      author.name = authorRaw;
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

    const url = safeUrl(pick(d, ['url', 'video_url', 'play_url', 'play_addr', 'download_url', 'nwm_video_url', 'video', 'link', 'src']));
    const backup = asArray(pick(d, ['video_backup', 'backups', 'backup_urls', 'beifeng', 'urls']));
    let type = String(pick(d, ['type', 'resource_type', 'leixing']) || '').toLowerCase();
    if (!type || ['unknown', ''].indexOf(type) >= 0) {
      if (livePhoto.length) type = 'live';
      else if (url) type = 'video';
      else if (images.length) type = 'image';
      else type = 'unknown';
    }

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
        quality: String(pick(d, ['quality', 'resolution', 'definition', 'video_quality', 'clarity']) || ''),
        duration: pick(d, ['duration', 'duration_seconds', 'shichang']),
        size: Number(pick(d, ['size', 'video_size', 'filesize']) || 0),
        size_label: String(pick(d, ['size_label', 'size_text']) || ''),
        create_time: Number(pick(d, ['create_time', 'createTime', 'timestamp']) || 0),
        publish_time: String(pick(d, ['publish_time', 'publishTime', 'time']) || ''),
        video_backup: backup,
        video_id: String(pick(d, ['video_id', 'vid', 'aweme_id', 'id']) || ''),
        images: images.map(safeUrl).filter(Boolean),
        live_photo: livePhoto,
        music: music
      }
    };
  }

  /* ------------------------------------------------------------ 结果渲染 */
  function renderMedia(d) {
    const box = $('#mediaBox');
    if (d.url && (d.type === 'video' || d.type === 'live')) {
      box.innerHTML = '<video controls playsinline preload="metadata" referrerpolicy="no-referrer" poster="' + esc(d.cover) + '" src="' + esc(d.url) + '">您的浏览器不支持视频播放</video>';
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
    box.innerHTML = '<div class="media-placeholder">' + ICON('image') + '接口未返回可预览的媒体地址</div>';
  }

  function renderInfo(d) {
    const host = $('#infoPanel');
    const sizeText = d.size_label || fmtBytes(d.size);
    const rows = [
      ['类型', esc((d.type || 'unknown').toUpperCase())],
      ['画质', esc(d.quality || '—')],
      ['时长', esc(fmtDuration(d.duration))],
      ['大小', esc(sizeText)],
      ['发布时间', esc(fmtTime(d.create_time, d.publish_time))],
      ['VID', esc(d.video_id || '—')]
    ];

    let html = '';
    html += '<h4 class="info-title">' + esc(d.title || '（无标题）') + '</h4>';
    if (d.desc && d.desc !== d.title) html += '<p class="info-desc">' + esc(d.desc) + '</p>';
    html += '<div class="author-row">' +
      (d.author.avatar ? '<img referrerpolicy="no-referrer" src="' + esc(d.author.avatar) + '" alt="">' : '<span class="pf-icon t1">' + esc((d.author.name || '?').charAt(0)) + '</span>') +
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

  function showResult(payload, meta) {
    const r = normalize(payload);
    lastResult = payload;
    lastRawText = JSON.stringify(payload, null, 2);

    $('#resultHost').classList.remove('hidden');
    const tagEl = $('#resultTag');
    tagEl.textContent = r.data.type.toUpperCase();
    tagEl.classList.toggle('demo', !!(meta && meta.demo));
    $('#resultSource').textContent = meta && meta.source
      ? meta.source
      : '通道：' + (meta && meta.channel ? meta.channel : '自动识别') + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });

    $('#mediaBox').style.background = '';
    $('#mediaBox').style.padding = '';
    renderMedia(r.data);
    renderInfo(r.data);
    $('#jsonCode').innerHTML = highlightJSON(lastRawText);

    if (r.code !== 200 || (!r.data.url && !r.data.images.length && !r.data.live_photo.length && !r.data.cover)) {
      notify('warn', '接口返回 code=' + esc(r.code) + '：' + esc(r.msg || '未返回媒体数据') + '。请确认链接有效、内容未删除，或改用其他解析通道。');
    }
  }

  /* ------------------------------------------------------------ 解析请求 */
  function buildEndpoint() {
    if (selectedPlatform !== 'all' && CFG.platforms[selectedPlatform]) return CFG.platforms[selectedPlatform];
    return CFG.primary;
  }

  function setLoading(on) {
    const btn = $('#parseBtn');
    btn.disabled = on;
    btn.innerHTML = on
      ? '<span class="spinner"></span><span>解析中…</span>'
      : ICON('zap') + '<span>开始解析</span>';
  }

  async function doParse(text) {
    const shareUrl = extractUrl(text);
    if (!shareUrl) {
      notify('err', '未检测到有效的 http/https 链接。请粘贴完整的分享链接或整段分享文案。');
      $('#urlInput').focus();
      return;
    }
    clearNotice();
    setLoading(true);

    const endpoint = buildEndpoint();
    const channel = (window.PLATFORMS.find(function (p) { return p.id === selectedPlatform; }) || {}).name || '自动识别';
    const target = endpoint + '?url=' + encodeURIComponent(shareUrl) + '&_=' + Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, CFG.timeout);

    try {
      const res = await fetch(target, { method: 'GET', signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
      const raw = await res.text();
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch (e) {
        throw new Error('接口返回了非 JSON 内容（HTTP ' + res.status + '）。可能是上游限流、Cloudflare 拦截页或接口临时不可用。');
      }
      showResult(payload, { channel: channel, source: '通道：' + channel + ' · ' + endpoint.replace(/^https?:\/\//, '') + ' · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false }) });
      saveHistory(text);
    } catch (err) {
      clearNotice();
      let msg = esc(err && err.message ? err.message : String(err));
      let extra = '';
      if (err && err.name === 'AbortError') {
        msg = '请求超时（' + Math.round(CFG.timeout / 1000) + 's）';
        extra = '上游解析耗时较长，请稍后重试，或改用单平台通道。';
      } else if (/Failed to fetch|NetworkError|Load failed/i.test(String(err && err.message))) {
        msg = '网络请求被拦截或失败';
        extra = '常见原因：CORS 策略、网络代理、上游服务不可达。可稍后重试，或检查浏览器控制台。';
      }
      notify('err', '<strong>' + msg + '</strong>' + (extra ? '<br>' + extra : '') +
        '<br><span class="mono" style="font-size:11.5px;opacity:.85">GET ' + esc(endpoint) + '?url=…</span>');
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
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
      b.addEventListener('click', function () { $('#urlInput').value = v; toggleClear(); });
      host.appendChild(b);
    });
  }

  /* ------------------------------------------------------------ 事件绑定 */
  function toggleClear() {
    $('#clearInput').style.display = $('#urlInput').value ? 'block' : 'none';
  }

  function initParser() {
    const input = $('#urlInput');
    input.addEventListener('input', toggleClear);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doParse(input.value);
    });
    $('#clearInput').addEventListener('click', function () {
      input.value = '';
      toggleClear();
      input.focus();
      clearNotice();
    });
    $('#parseBtn').addEventListener('click', function () { doParse(input.value); });

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

    $('#infoPanel').addEventListener('click', function (e) {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      if (b.dataset.act === 'copy-url') copyText(b.dataset.val, '直链已复制');
      if (b.dataset.act === 'copy-images') copyText(b.dataset.val, '全部图片链接已复制');
    });

    $('#copyJsonBtn').addEventListener('click', function () { copyText(lastRawText, 'JSON 已复制'); });
    $('#downloadJsonBtn').addEventListener('click', function () {
      const blob = new Blob([lastRawText], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'short_videos_result_' + Date.now() + '.json';
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
    renderPlatformChips();
    renderSupported();
    renderFields();
    initCatalog();
    initSamples();
    initParser();
  });
})();
