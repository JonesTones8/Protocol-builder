(function () {
  'use strict';

  var LIBRARY = window.LIBRARY;
  var BY_ID = {};
  LIBRARY.forEach(function (e) { BY_ID[e.id] = e; });

  var STORE_KEY = 'hep_builder_v1';
  var LEGACY_KEY = 'pt_rx_v2';
  var PAGE = 60;  // library rows rendered per batch

  var CAT_COLORS = {
    'Cervical': '#3B82C4', 'TMJ': '#8B6FD6', 'Thoracic': '#2F9C95', 'Shoulder': '#E0613C',
    'Elbow & Wrist': '#D08A1E', 'Core & Lumbar': '#C2477A', 'Hip': '#6A8F2E', 'Knee': '#1F7A6B',
    'Ankle & Foot': '#B45A3C', 'Balance & Functional': '#5B6CC9', 'Neuro & Vestibular': '#9B59B6',
    'Pediatric': '#E5A00F', 'Pelvic Floor & Womens Health': '#C0587E', 'Post-Op & General': '#5E7487',
    'Sport-Specific & Plyometric': '#D9483B', 'Amputee & Prosthetic': '#7A6A58'
  };

  var QUICK_INSTRS = [
    { label: 'Frequency: 1x/day', text: 'Perform your home exercise program once per day.' },
    { label: 'Frequency: 2x/day', text: 'Perform your home exercise program twice per day, once in the morning and once in the evening.' },
    { label: 'Frequency: 3x/day', text: 'Perform your home exercise program three times per day (morning, afternoon, and evening).' },
    { label: 'Frequency: multiple', text: 'Perform these exercises multiple times throughout the day as instructed. Frequent, short sessions are more effective than one long session for your condition.' },
    { label: 'Ice 15-20 min', text: 'Apply ice to the affected area for 15-20 minutes after strenuous activity or as needed for pain.' },
    { label: 'Heat before', text: 'Apply moist heat to the affected area for 10–15 minutes before performing exercises.' },
    { label: 'Pain guidelines', text: 'Some muscle soreness after exercise is normal. Stop and contact your PT if you experience sharp pain, increased swelling, or pain greater than 4/10 during exercise.' },
    { label: 'Activity rest', text: 'Avoid high-impact activities and heavy lifting until cleared by your physical therapist.' },
    { label: 'Posture reminder', text: 'Throughout the day, be mindful of your posture. Sit and stand tall with your shoulders back and down and your chin gently tucked.' },
    { label: 'Elevation', text: 'When resting, elevate the affected limb above heart level to help reduce swelling.' },
    { label: 'Compression', text: 'Wear your compression wrap or brace as directed during activity. Remove at night unless instructed otherwise.' },
    { label: 'Sleep position', text: 'When sleeping, use a pillow to support the affected area and reduce strain. Avoid sleeping on the affected side.' },
    { label: 'Walking program', text: 'Walk on flat, even surfaces for the recommended time each day. Wear supportive footwear. Increase distance gradually as tolerated.' },
    { label: 'Follow-up', text: 'Please attend all scheduled PT appointments. If you need to cancel or reschedule, call the clinic at least 24 hours in advance.' },
    { label: 'Home program', text: 'Perform your home exercise program as prescribed. Consistency is key to your recovery. If you are unsure about any exercise, contact your PT before proceeding.' },
    { label: 'Wound care', text: 'Keep the surgical site clean and dry. Do not submerge in water until cleared by your surgeon. Report any signs of infection (redness, warmth, discharge, fever) immediately.' }
  ];

  var PARAM_OPTS = {
    sets: ['1', '2', '3', '4', '5', '6'],
    reps: ['5', '8', '10', '12', '15', '20', '25', '30', '3 each side', '5 each side', '10 each side', '12 each side', '15 each side', '10 each leg', '15 each leg', '20 circles', 'A-Z each foot'],
    hold: ['—', '2 sec', '3 sec', '5 sec', '10 sec', '15 sec', '20 sec', '30 sec', '45 sec', '60 sec', '20-30 sec', '30-60 sec'],
    freq: ['Daily', '2x/day', '3x/day', 'Every 1-2 hrs', 'Every other day', '3x/week', '4x/week', '5x/week', 'As needed']
  };

  // ── State ───────────────────────────────────────────────────
  var state = { program: [], pt: emptyPt(), snaps: {}, favs: {} };
  var ui = { cat: 'All', search: '', shown: PAGE, filtered: [], detailId: null, photoTarget: null };

  function emptyPt() {
    return { name: '', date: today(), therapist: '', dx: '', instructions: '' };
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        state.program = d.program || [];
        state.pt = Object.assign(emptyPt(), d.pt || {});
        state.snaps = d.snaps || {};
        state.favs = d.favs || {};
        return;
      }
      // Pick up data saved by the original single-file builder, if it ran on this origin.
      var old = localStorage.getItem(LEGACY_KEY);
      if (old) {
        var o = JSON.parse(old);
        state.program = o.program || [];
        state.pt = Object.assign(emptyPt(), o.pt || {});
        state.snaps = o.snaps || {};
        state.favs = o.favs || {};
      }
    } catch (e) { /* start fresh */ }
  }

  var statusEl = document.getElementById('save-status');
  function store() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      statusEl.textContent = 'Saved on this device';
      statusEl.classList.remove('err');
    } catch (e) {
      statusEl.textContent = 'Couldn’t save';
      statusEl.classList.add('err');
    }
  }

  // ── Helpers ─────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function icon(name) { return '<svg><use href="#i-' + name + '"/></svg>'; }
  function inProgram(id) { return state.program.some(function (p) { return p.id === id; }); }
  function progItem(id) { return state.program.find(function (p) { return p.id === id; }); }

  // Library exercise, or a custom one that only exists in the program.
  function exById(id) { return BY_ID[id] || progItem(id); }
  function photo(ex) {
    var url = Photos.url(ex.id);
    return url ? '<img src="' + url + '" alt="' + esc(ex.name) + '" loading="lazy">' : '';
  }
  function holdText(h) { return h && h !== '—' ? h + ' hold' : ''; }
  function doseLine(e) {
    return [e.sets + ' × ' + e.reps, holdText(e.hold), e.freq].filter(Boolean).join(' · ');
  }

  var toastTimer = null;
  function toast(msg, actionLabel, action) {
    var t = $('toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (actionLabel ? '<button type="button">' + esc(actionLabel) + '</button>' : '');
    if (actionLabel) t.querySelector('button').onclick = function () { action(); t.classList.remove('show'); };
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, actionLabel ? 6000 : 2600);
  }

  // ── Category chips ──────────────────────────────────────────
  var CATS = [];
  LIBRARY.forEach(function (e) { if (CATS.indexOf(e.cat) < 0) CATS.push(e.cat); });

  function renderChips() {
    var counts = {};
    LIBRARY.forEach(function (e) { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    var favCount = Object.keys(state.favs).length;
    var html = chip('All', 'All', LIBRARY.length) +
      '<button class="chip fav-chip' + (ui.cat === 'Favorites' ? ' active' : '') + '" data-cat="Favorites" role="tab">' +
      icon('star') + 'Favorites<span class="count">' + favCount + '</span></button>';
    CATS.forEach(function (c) { html += chip(c, c.replace(' & Womens Health', '').replace(' & Plyometric', ''), counts[c]); });
    $('chips').innerHTML = html;
    function chip(cat, label, n) {
      return '<button class="chip' + (ui.cat === cat ? ' active' : '') + '" data-cat="' + esc(cat) + '" role="tab" title="' + esc(cat) + '">' +
        esc(label) + '<span class="count">' + n + '</span></button>';
    }
  }

  $('chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    ui.cat = b.dataset.cat;
    renderChips();
    filterLibrary();
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  // ── Library ─────────────────────────────────────────────────
  function filterLibrary() {
    var words = ui.search.toLowerCase().split(/\s+/).filter(Boolean);
    ui.filtered = LIBRARY.filter(function (e) {
      if (ui.cat === 'Favorites' ? !state.favs[e.id] : ui.cat !== 'All' && e.cat !== ui.cat) return false;
      if (!words.length) return true;
      var hay = (e.name + ' ' + e.cat + ' ' + e.pos + ' ' + e.instr).toLowerCase();
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
    // Name matches first when searching.
    if (words.length) {
      ui.filtered.sort(function (a, b) {
        var an = words.every(function (w) { return a.name.toLowerCase().indexOf(w) >= 0; });
        var bn = words.every(function (w) { return b.name.toLowerCase().indexOf(w) >= 0; });
        return an === bn ? 0 : an ? -1 : 1;
      });
    }
    ui.shown = PAGE;
    $('ex-list').scrollTop = 0;
    $('lib-count').textContent = ui.filtered.length.toLocaleString() + ' exercises';
    renderLibrary();
  }

  function rowHtml(ex) {
    var added = inProgram(ex.id), fav = !!state.favs[ex.id], hasPhoto = !!Photos.url(ex.id);
    return '<div class="ex-row' + (added ? ' added' : '') + '" data-id="' + ex.id + '">' +
      (hasPhoto ? '<button class="ex-thumb" data-act="detail" title="View details">' + photo(ex) + '</button>'
                : '<span class="cat-bar" style="background:' + (CAT_COLORS[ex.cat] || '#888') + '"></span>') +
      '<div class="ex-body"><div class="ex-name">' + esc(ex.name) + '</div>' +
        '<div class="ex-meta">' + esc(ex.pos) + ' · ' + esc(doseLine(ex)) + '</div></div>' +
      '<div class="ex-actions">' +
        '<button class="icon-btn" data-act="detail" title="Details and photo">' + icon('info') + '</button>' +
        '<button class="icon-btn star' + (fav ? ' on' : '') + '" data-act="fav" title="' + (fav ? 'Remove from favorites' : 'Add to favorites') + '">' + icon('star') + '</button>' +
        '<span class="add-btn" aria-hidden="true">' + icon(added ? 'check' : 'plus') + '</span>' +
      '</div></div>';
  }

  function renderLibrary() {
    var list = ui.filtered, html = '', lastCat = null;
    var grouped = (ui.cat === 'All' || ui.cat === 'Favorites') && !ui.search;
    if (!list.length) {
      $('ex-list').innerHTML = '<div class="empty-list">' + (ui.cat === 'Favorites' && !ui.search
        ? 'No favorites yet.<br>Tap the star on any exercise to keep it here.'
        : 'No exercises match “' + esc(ui.search) + '”.') + '</div>';
      return;
    }
    list.slice(0, ui.shown).forEach(function (ex) {
      if (grouped && ex.cat !== lastCat) {
        html += '<div class="group-title"><span>' + esc(ex.cat) + '</span></div>';
        lastCat = ex.cat;
      }
      html += rowHtml(ex);
    });
    if (ui.shown < list.length) html += '<div id="lib-sentinel" style="height:1px"></div>';
    $('ex-list').innerHTML = html;
    observeSentinel();
  }

  // Render more rows as the list scrolls to the bottom.
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    if (entries.some(function (en) { return en.isIntersecting; })) {
      var top = $('ex-list').scrollTop;
      ui.shown += PAGE;
      renderLibrary();
      $('ex-list').scrollTop = top;
    }
  }, { root: $('ex-list'), rootMargin: '400px' }) : null;
  function observeSentinel() {
    if (!io) return;
    io.disconnect();
    var s = $('lib-sentinel');
    if (s) io.observe(s);
  }

  function refreshRow(id) {
    var row = $('ex-list').querySelector('.ex-row[data-id="' + id + '"]');
    if (row && BY_ID[id]) row.outerHTML = rowHtml(BY_ID[id]);
  }

  $('ex-list').addEventListener('click', function (e) {
    var row = e.target.closest('.ex-row');
    if (!row) return;
    var id = row.dataset.id, act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'fav') return toggleFav(id);
    if (act && act.dataset.act === 'detail') return openDetail(id);
    inProgram(id) ? removeExercise(id) : addExercise(id);
  });

  var searchTimer = null;
  $('search').addEventListener('input', function () {
    $('search-wrap').classList.toggle('has-text', !!this.value);
    clearTimeout(searchTimer);
    var v = this.value;
    searchTimer = setTimeout(function () { ui.search = v.trim(); filterLibrary(); }, 120);
  });
  $('clear-search').addEventListener('click', function () {
    $('search').value = '';
    $('search-wrap').classList.remove('has-text');
    ui.search = '';
    filterLibrary();
    $('search').focus();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      e.preventDefault();
      $('search').focus();
    }
    if (e.key === 'Escape' && $('modal').classList.contains('open')) closeModal();
  });

  function toggleFav(id) {
    if (state.favs[id]) delete state.favs[id]; else state.favs[id] = true;
    store();
    renderChips();
    if (ui.cat === 'Favorites') filterLibrary(); else refreshRow(id);
    if (ui.detailId === id) openDetail(id);
  }

  // ── Program ─────────────────────────────────────────────────
  function addExercise(id) {
    if (inProgram(id)) return;
    var ex = BY_ID[id];
    state.program.push({
      id: ex.id, name: ex.name, cat: ex.cat, pos: ex.pos,
      sets: ex.sets, reps: ex.reps, hold: ex.hold, freq: ex.freq, instr: ex.instr, note: ''
    });
    store();
    refreshRow(id);
    renderProgram();
    toast('Added “' + ex.name + '”');
  }

  function addCustomExercise() {
    var id = 'custom' + Date.now();
    state.program.push({
      id: id, name: '', cat: 'Custom', pos: 'As instructed', custom: true,
      sets: 3, reps: '10', hold: '—', freq: 'Daily', instr: '', note: ''
    });
    store();
    renderProgram();
    $('shell').dataset.view = 'program';
    syncTabs();
    var input = progList.querySelector('.pcard[data-id="' + id + '"] .title-input');
    if (input) { input.scrollIntoView({ behavior: 'smooth', block: 'center' }); input.focus(); }
  }
  $('btn-custom').addEventListener('click', addCustomExercise);

  function removeExercise(id) {
    var idx = state.program.findIndex(function (p) { return p.id === id; });
    if (idx < 0) return;
    var item = state.program.splice(idx, 1)[0];
    store();
    refreshRow(id);
    renderProgram();
    toast('Removed “' + item.name + '”', 'Undo', function () {
      state.program.splice(idx, 0, item);
      store(); refreshRow(id); renderProgram();
    });
  }

  function moveExercise(from, to) {
    if (to < 0 || to >= state.program.length || from === to) return;
    var item = state.program.splice(from, 1)[0];
    state.program.splice(to, 0, item);
    store();
    renderProgram();
  }

  function updateField(id, field, val) {
    var p = progItem(id);
    if (!p) return;
    p[field] = val;
    store();
  }

  function combo(id, field, value) {
    var opts = PARAM_OPTS[field].map(function (o) {
      return '<div class="combo-opt' + (String(o) === String(value) ? ' active' : '') + '" data-val="' + esc(o) + '">' + esc(o) + '</div>';
    }).join('');
    return '<div class="combo" data-id="' + id + '" data-field="' + field + '">' +
      '<button type="button" class="combo-step" data-step="-1" tabindex="-1" aria-label="Decrease ' + field + '">' + icon('minus') + '</button>' +
      '<input value="' + esc(value) + '" data-field="' + field + '" aria-label="' + field + '">' +
      '<button type="button" class="combo-step" data-step="1" tabindex="-1" aria-label="Increase ' + field + '">' + icon('plus') + '</button>' +
      '<button type="button" class="combo-arrow" tabindex="-1" aria-label="Choose ' + field + '">' + icon('down') + '</button>' +
      '<div class="combo-menu">' + opts + '</div></div>';
  }

  function renderProgram() {
    var n = state.program.length;
    $('ex-count').textContent = n;
    $('tab-badge').textContent = n;
    $('tab-badge').hidden = !n;
    $('btn-clear-ex').style.visibility = n ? '' : 'hidden';

    if (!n) {
      $('prog-list').innerHTML = '<div class="empty-state">' +
        '<h3>No exercises yet</h3><p>Pick exercises from the library, or add a custom one. They’ll show up here, ready to adjust and print.</p></div>';
      return;
    }

    $('prog-list').innerHTML = state.program.map(function (p, i) {
      var hasPhoto = !!Photos.url(p.id);
      var title = p.custom
        ? '<input class="title-input" data-field="name" value="' + esc(p.name) + '" placeholder="Name this exercise…" aria-label="Exercise name">'
        : '<h3>' + esc(p.name) + '</h3>';
      return '<article class="card pcard' + (hasPhoto ? ' has-photo' : '') + '" data-id="' + p.id + '" data-idx="' + i + '">' +
        (hasPhoto ? '<div class="media" data-act="detail">' + photo(p) +
          '<button class="media-btn" data-act="photo">' + icon('camera') + 'Change photo</button></div>' : '') +
        '<div class="pbody">' +
          '<div class="ptop">' +
            '<span class="num">' + (i + 1) + '</span>' +
            '<div class="ptitle">' + title +
              '<div class="sub"><span class="dot" style="background:' + (CAT_COLORS[p.cat] || '#888') + '"></span>' + esc(p.cat) + ' · ' + esc(p.pos) + '</div></div>' +
            '<div class="pbtns">' +
              (hasPhoto ? '' : '<button class="btn btn-ghost btn-sm add-photo" data-act="photo" title="Add your own photo">' + icon('camera') + '<span>Add photo</span></button>') +
              '<button class="icon-btn drag-handle" draggable="true" title="Drag to reorder">' + icon('grip') + '</button>' +
              '<button class="icon-btn" data-act="up" title="Move up"' + (i === 0 ? ' disabled' : '') + '>' + icon('up') + '</button>' +
              '<button class="icon-btn" data-act="down" title="Move down"' + (i === n - 1 ? ' disabled' : '') + '>' + icon('down') + '</button>' +
              '<button class="icon-btn danger" data-act="remove" title="Remove">' + icon('x') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="params">' +
            '<div class="param"><label>Sets</label>' + combo(p.id, 'sets', p.sets) + '</div>' +
            '<div class="param"><label>Reps / time</label>' + combo(p.id, 'reps', p.reps) + '</div>' +
            '<div class="param"><label>Hold</label>' + combo(p.id, 'hold', p.hold) + '</div>' +
            '<div class="param"><label>Frequency</label>' + combo(p.id, 'freq', p.freq) + '</div>' +
          '</div>' +
          '<div class="pextra">' +
            '<div><span class="field-label">How to perform</span><div class="with-mic">' +
              '<textarea class="textarea" id="instr-' + p.id + '" data-field="instr" rows="3">' + esc(p.instr) + '</textarea>' +
              '<button class="mic" type="button" data-mic-target="instr-' + p.id + '" title="Dictate">' + icon('mic') + '</button></div></div>' +
            '<div><span class="field-label">PT note</span><div class="with-mic">' +
              '<textarea class="textarea" id="note-' + p.id + '" data-field="note" rows="3" placeholder="Optional note for the patient…">' + esc(p.note) + '</textarea>' +
              '<button class="mic" type="button" data-mic-target="note-' + p.id + '" title="Dictate">' + icon('mic') + '</button></div></div>' +
          '</div>' +
        '</div></article>';
    }).join('');
  }

  var progList = $('prog-list');
  progList.addEventListener('click', function (e) {
    var card = e.target.closest('.pcard');
    if (!card) return;
    var id = card.dataset.id, idx = +card.dataset.idx;
    var act = e.target.closest('[data-act]');

    // +/- adjusts the first number in the value: seconds/minutes by 5, everything else by 1.
    var stepBtn = e.target.closest('.combo-step');
    if (stepBtn) {
      var sc = stepBtn.closest('.combo'), inp = sc.querySelector('input'), field = sc.dataset.field;
      var dir = +stepBtn.dataset.step, val = inp.value, m = val.match(/\d+/);
      var next = null;
      if (m) {
        var inc = field === 'hold' || /sec|min/i.test(val) ? 5 : 1;
        next = val.replace(/\d+/, String(Math.max(1, +m[0] + dir * inc)));
      } else if (field === 'hold' && dir > 0) {
        next = '5 sec';
      }
      if (next !== null) { inp.value = next; updateField(id, field, next); }
      return;
    }

    var arrow = e.target.closest('.combo-arrow');
    if (arrow) {
      var menu = arrow.parentNode.querySelector('.combo-menu'), wasOpen = menu.classList.contains('open');
      closeMenus();
      if (!wasOpen) menu.classList.add('open');
      e.stopPropagation();
      return;
    }
    var opt = e.target.closest('.combo-opt');
    if (opt) {
      var c = opt.closest('.combo');
      c.querySelector('input').value = opt.dataset.val;
      c.querySelectorAll('.combo-opt').forEach(function (o) { o.classList.toggle('active', o === opt); });
      updateField(id, c.dataset.field, opt.dataset.val);
      closeMenus();
      e.stopPropagation();
      return;
    }
    if (!act) return;
    if (act.dataset.act === 'photo') { e.stopPropagation(); return pickPhoto(id); }
    if (act.dataset.act === 'detail') return openDetail(id);
    if (act.dataset.act === 'up') return moveExercise(idx, idx - 1);
    if (act.dataset.act === 'down') return moveExercise(idx, idx + 1);
    if (act.dataset.act === 'remove') return removeExercise(id);
  });

  progList.addEventListener('input', function (e) {
    var card = e.target.closest('.pcard'), f = e.target.dataset.field;
    if (card && f) updateField(card.dataset.id, f, e.target.value);
  });

  function closeMenus() {
    document.querySelectorAll('.combo-menu.open').forEach(function (m) { m.classList.remove('open'); });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.combo')) closeMenus(); });

  // Drag to reorder (desktop); arrows still work everywhere.
  var dragFrom = null;
  progList.addEventListener('dragstart', function (e) {
    var card = e.target.closest('.pcard');
    if (!card || !e.target.classList.contains('drag-handle')) return;
    dragFrom = +card.dataset.idx;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragFrom));
    e.dataTransfer.setDragImage(card, 40, 40);
  });
  progList.addEventListener('dragover', function (e) {
    var card = e.target.closest('.pcard');
    if (dragFrom === null) {
      // Image files dropped on a picture set that exercise's photo.
      if (card && e.target.closest('.media') && e.dataTransfer.types.indexOf('Files') >= 0) e.preventDefault();
      return;
    }
    if (!card) return;
    e.preventDefault();
    var r = card.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
    progList.querySelectorAll('.drop-before,.drop-after').forEach(function (c) { c.classList.remove('drop-before', 'drop-after'); });
    card.classList.add(after ? 'drop-after' : 'drop-before');
  });
  progList.addEventListener('drop', function (e) {
    var card = e.target.closest('.pcard');
    if (dragFrom === null) {
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (card && f && /^image\//.test(f.type)) { e.preventDefault(); savePhoto(card.dataset.id, f); }
      return;
    }
    e.preventDefault();
    if (card) {
      var to = +card.dataset.idx;
      if (card.classList.contains('drop-after')) to += 1;
      if (to > dragFrom) to -= 1;
      var from = dragFrom;
      dragFrom = null;
      moveExercise(from, to);
    }
  });
  progList.addEventListener('dragend', function () {
    dragFrom = null;
    progList.querySelectorAll('.dragging,.drop-before,.drop-after').forEach(function (c) { c.classList.remove('dragging', 'drop-before', 'drop-after'); });
  });

  // ── Photos ──────────────────────────────────────────────────
  function pickPhoto(id) {
    ui.photoTarget = id;
    $('photo-input').value = '';
    $('photo-input').click();
  }
  $('photo-input').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (f && ui.photoTarget) savePhoto(ui.photoTarget, f);
  });
  function savePhoto(id, file) {
    toast('Saving photo…');
    Photos.save(id, file).then(function () {
      afterPhotoChange(id);
      toast('Photo saved for “' + (exById(id).name || 'custom exercise') + '”');
    }).catch(function (err) { toast(err.message || 'Couldn’t save that photo'); });
  }
  function removePhoto(id) {
    Photos.remove(id).then(function () {
      afterPhotoChange(id);
      toast('Photo removed. Showing the illustration again.');
    });
  }
  function afterPhotoChange(id) {
    refreshRow(id);
    if (inProgram(id)) renderProgram();
    if (ui.detailId === id) openDetail(id);
  }

  // ── Modal ───────────────────────────────────────────────────
  function openModal(html, wide) {
    $('modal-box').innerHTML = html;
    $('modal-box').style.maxWidth = wide ? '640px' : '';
    $('modal').classList.add('open');
  }
  function closeModal() {
    $('modal').classList.remove('open');
    ui.detailId = null;
  }
  $('modal').addEventListener('click', function (e) {
    if (e.target === this || e.target.closest('[data-close]')) closeModal();
  });

  function openDetail(id) {
    var ex = exById(id), p = progItem(id) || ex, inLib = !!BY_ID[id];
    var added = inProgram(id), fav = !!state.favs[id], hasPhoto = !!Photos.url(id);
    ui.detailId = id;
    openModal(
      (hasPhoto
        ? '<div class="detail-media">' + photo(ex) + '<button class="icon-btn close-float" data-close title="Close">' + icon('x') + '</button></div>'
        : '<div class="modal-head"><span></span><button class="icon-btn" data-close title="Close">' + icon('x') + '</button></div>') +
      '<div class="detail-content' + (hasPhoto ? '' : ' no-photo') + '">' +
        '<h2>' + esc(ex.name || 'Custom exercise') + '</h2>' +
        '<div class="sub"><span class="dot" style="background:' + (CAT_COLORS[ex.cat] || '#888') + '"></span>' + esc(ex.cat) + ' · ' + esc(ex.pos) + '</div>' +
        '<div class="dose">' +
          '<div><span>Sets</span><strong>' + esc(p.sets) + '</strong></div>' +
          '<div><span>Reps</span><strong>' + esc(p.reps) + '</strong></div>' +
          '<div><span>Hold</span><strong>' + esc(p.hold) + '</strong></div>' +
          '<div><span>Frequency</span><strong>' + esc(p.freq) + '</strong></div>' +
        '</div>' +
        '<p class="instr">' + esc(p.instr) + '</p>' +
        '<p class="photo-note">' + (hasPhoto
          ? 'Using your photo. It’s saved in this browser and appears on printed handouts.'
          : 'No photo yet. Add your own and it will appear here and on printed handouts.') + '</p>' +
      '</div>' +
      '<div class="modal-foot">' +
        (hasPhoto ? '<button class="btn btn-danger-ghost" id="d-rm-photo">' + icon('trash') + 'Remove photo</button>' : '') +
        '<button class="btn btn-ghost" id="d-photo">' + icon('camera') + (hasPhoto ? 'Replace photo' : 'Add photo') + '</button>' +
        (inLib ? '<button class="btn btn-ghost" id="d-fav">' + icon('star') + (fav ? 'Unfavorite' : 'Favorite') + '</button>' +
          '<button class="btn ' + (added ? '' : 'btn-primary') + '" id="d-add">' + icon(added ? 'x' : 'plus') + (added ? 'Remove from program' : 'Add to program') + '</button>' : '') +
      '</div>');
    $('d-photo').onclick = function () { pickPhoto(id); };
    if (inLib) {
      $('d-fav').onclick = function () { toggleFav(id); };
      $('d-add').onclick = function () { added ? removeExercise(id) : addExercise(id); openDetail(id); };
    }
    if (hasPhoto) $('d-rm-photo').onclick = function () { removePhoto(id); };
  }

  // ── Saved programs ──────────────────────────────────────────
  function openPrograms() {
    var keys = Object.keys(state.snaps).sort(function (a, b) { return b - a; });
    var list = keys.length ? keys.map(function (k) {
      var s = state.snaps[k];
      return '<div class="snap" data-key="' + k + '"><div class="snap-info"><strong>' + esc(s.label) + '</strong>' +
        '<span>' + s.program.length + ' exercises · saved ' + new Date(+k).toLocaleDateString() + '</span></div>' +
        '<button class="btn btn-sm" data-act="load">Load</button>' +
        '<button class="icon-btn danger" data-act="del" title="Delete">' + icon('trash') + '</button></div>';
    }).join('') : '<p class="muted-p" style="margin-top:8px">No saved programs yet.</p>';
    openModal(
      '<div class="modal-head"><h2>Saved programs</h2><button class="icon-btn" data-close title="Close">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' +
        '<p class="muted-p">Save the current patient and exercises as a template you can load again later.</p>' +
        '<div class="save-row" style="margin-top:12px"><input class="input" id="snap-name" placeholder="Name, e.g. “ACL phase 1”" value="' + esc(state.pt.name) + '">' +
        '<button class="btn btn-primary" id="snap-save"' + (state.program.length ? '' : ' disabled') + '>Save</button></div>' +
        '<div class="section-label">Saved</div><div class="snap-list" id="snap-list">' + list + '</div>' +
      '</div>');
    $('snap-save').onclick = function () {
      var label = $('snap-name').value.trim() || ('Program ' + new Date().toLocaleDateString());
      state.snaps[Date.now()] = { label: label, program: JSON.parse(JSON.stringify(state.program)), pt: Object.assign({}, state.pt) };
      store();
      openPrograms();
      toast('Saved “' + label + '”');
    };
    $('snap-list').onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var key = b.closest('.snap').dataset.key, s = state.snaps[key];
      if (b.dataset.act === 'del') {
        if (!confirm('Delete “' + s.label + '”?')) return;
        delete state.snaps[key];
        store();
        openPrograms();
      } else {
        if (state.program.length && !confirm('Replace the current program with “' + s.label + '”?')) return;
        state.program = JSON.parse(JSON.stringify(s.program));
        state.pt = Object.assign(emptyPt(), s.pt);
        store();
        fillPatient();
        renderAll();
        closeModal();
        toast('Loaded “' + s.label + '”');
      }
    };
  }

  // ── Backup ──────────────────────────────────────────────────
  function openBackup() {
    openModal(
      '<div class="modal-head"><h2>Backup &amp; restore</h2><button class="icon-btn" data-close title="Close">' + icon('x') + '</button></div>' +
      '<div class="modal-body">' +
        '<p class="muted-p">Your programs, favorites and photos are saved only in this browser. Download a backup to keep them safe or move them to another device.</p>' +
        '<p class="muted-p" style="margin-top:8px">This browser has <strong>' + Object.keys(state.snaps).length + '</strong> saved programs, <strong>' +
          Object.keys(state.favs).length + '</strong> favorites and <strong>' + Photos.count() + '</strong> photos.</p>' +
      '</div>' +
      '<div class="modal-foot">' +
        '<button class="btn" id="bk-import">' + icon('upload') + 'Restore from file</button>' +
        '<button class="btn btn-primary" id="bk-export">' + icon('download') + 'Download backup</button>' +
      '</div>');
    $('bk-export').onclick = exportBackup;
    $('bk-import').onclick = function () { $('backup-input').value = ''; $('backup-input').click(); };
  }

  function exportBackup() {
    Photos.exportAll().then(function (photos) {
      var data = { app: 'hep-builder', version: 1, exported: new Date().toISOString(), state: state, photos: photos };
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hep-builder-backup-' + today() + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Backup downloaded');
    });
  }

  $('backup-input').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    f.text().then(function (txt) {
      var d = JSON.parse(txt);
      // New backups wrap everything in `state`; the original builder's backups are flat.
      var s = d.app === 'hep-builder' ? d.state : (d.program || d.snaps || d.favs ? d : null);
      if (!s) throw new Error('bad');
      if (!confirm('Restore this backup? Saved programs and favorites will be merged, and the current program will be replaced.')) return;
      state.program = s.program || [];
      state.pt = Object.assign(emptyPt(), s.pt || {});
      Object.assign(state.snaps, s.snaps || {});
      Object.assign(state.favs, s.favs || {});
      store();
      return Photos.importAll(d.photos).then(function (n) {
        fillPatient();
        renderAll();
        closeModal();
        toast('Backup restored' + (n ? ' with ' + n + ' photos' : ''));
      });
    }).catch(function () { toast('That file isn’t a HEP Builder backup.'); });
  });

  // ── Patient + instructions ──────────────────────────────────
  var PT_FIELDS = { 'pt-name': 'name', 'pt-date': 'date', 'pt-therapist': 'therapist', 'pt-dx': 'dx' };
  function fillPatient() {
    Object.keys(PT_FIELDS).forEach(function (k) { $(k).value = state.pt[PT_FIELDS[k]] || ''; });
    $('pt-instructions').value = state.pt.instructions || '';
    updateInstrPreview();
  }
  Object.keys(PT_FIELDS).forEach(function (k) {
    $(k).addEventListener('input', function () { state.pt[PT_FIELDS[k]] = this.value; store(); });
  });

  $('quick').innerHTML = QUICK_INSTRS.map(function (q, i) {
    return '<button type="button" data-i="' + i + '">+ ' + esc(q.label) + '</button>';
  }).join('');
  $('quick').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var ta = $('pt-instructions'), cur = ta.value.trim();
    ta.value = cur ? cur + '\n\n' + QUICK_INSTRS[+b.dataset.i].text : QUICK_INSTRS[+b.dataset.i].text;
    ta.dispatchEvent(new Event('input'));
    ta.scrollTop = ta.scrollHeight;
  });
  $('pt-instructions').addEventListener('input', function () {
    state.pt.instructions = this.value;
    store();
    updateInstrPreview();
  });
  function updateInstrPreview() {
    var t = (state.pt.instructions || '').replace(/\s+/g, ' ').trim();
    $('instr-preview').textContent = t || 'None yet. Add ice, heat, pain guidelines and more.';
  }
  $('instr-toggle').addEventListener('click', function () {
    var open = $('instr-card').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    try { localStorage.setItem('hep_instr_open', open ? '1' : ''); } catch (e) {}
  });
  $('btn-clear-instr').addEventListener('click', function () {
    var ta = $('pt-instructions');
    if (!ta.value.trim()) return;
    var prev = ta.value;
    ta.value = '';
    ta.dispatchEvent(new Event('input'));
    toast('Instructions cleared', 'Undo', function () { ta.value = prev; ta.dispatchEvent(new Event('input')); });
  });

  // ── Clear ───────────────────────────────────────────────────
  $('btn-clear-ex').addEventListener('click', function () {
    if (!state.program.length) return;
    var prev = state.program;
    state.program = [];
    store();
    renderAll();
    toast('Cleared ' + prev.length + ' exercises', 'Undo', function () { state.program = prev; store(); renderAll(); });
  });
  $('btn-clear-all').addEventListener('click', function () {
    var prev = { program: state.program, pt: state.pt };
    state.program = [];
    state.pt = Object.assign(emptyPt(), { therapist: state.pt.therapist });  // keep your name
    store();
    fillPatient();
    renderAll();
    toast('Started a new patient', 'Undo', function () {
      state.program = prev.program; state.pt = prev.pt; store(); fillPatient(); renderAll();
    });
  });

  // ── Voice dictation (Web Speech API) ────────────────────────
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var rec = null, recBtn = null;
  function stopListening() {
    if (rec) { try { rec.stop(); } catch (e) {} }
    if (recBtn) recBtn.classList.remove('listening');
    rec = null; recBtn = null;
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.mic');
    if (!btn) return;
    e.preventDefault();
    if (!SR) return toast('Dictation needs Chrome, Edge or Safari.');
    if (recBtn === btn) return stopListening();
    stopListening();
    var field = $(btn.dataset.micTarget);
    if (!field) return;
    var r = new SR();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = false;
    rec = r; recBtn = btn;
    btn.classList.add('listening');
    r.onresult = function (ev) {
      var t = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) t += ev.results[i][0].transcript;
      t = t.trim();
      if (!t) return;
      var cur = field.value;
      field.value = cur + (cur && !/\s$/.test(cur) ? ' ' : '') + t;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    };
    r.onerror = function (ev) {
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') toast('Microphone access is blocked for this site.');
      stopListening();
    };
    r.onend = function () { if (recBtn === btn) stopListening(); };
    try { r.start(); } catch (err) { stopListening(); }
  });

  // ── Print ───────────────────────────────────────────────────
  function buildPrintView() {
    var pt = state.pt, date = '';
    if (pt.date) {
      try { date = new Date(pt.date + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
      catch (e) { date = pt.date; }
    }
    var meta = [];
    if (pt.name) meta.push('<b>Patient:</b> ' + esc(pt.name));
    if (date) meta.push('<b>Date:</b> ' + esc(date));
    if (pt.therapist) meta.push('<b>PT:</b> ' + esc(pt.therapist));
    if (pt.dx) meta.push('<b>Dx:</b> ' + esc(pt.dx));

    var html = '<div class="pv-head"><h1>Home Exercise Program</h1>' +
      (meta.length ? '<div class="pv-meta">' + meta.join(' &nbsp;·&nbsp; ') + '</div>' : '') + '</div>';
    if ((pt.instructions || '').trim()) {
      html += '<div class="pv-instr"><h2>Instructions</h2><div>' + esc(pt.instructions.trim()) + '</div></div>';
    }
    // Three exercises per page. Instructions take room on page one, so it holds
    // two (or one, for long instructions).
    var n = state.program.length, instrLen = (pt.instructions || '').trim().length;
    var first = instrLen > 400 ? 1 : instrLen > 0 ? 2 : 3;
    state.program.forEach(function (p, i) {
      var k = i + 1;
      var brk = i < n - 1 && (k === first || (k > first && (k - first) % 3 === 0));
      var img = photo(p);
      html += '<section class="pv-ex' + (img ? ' with-img' : '') + (brk ? ' break' : '') + '">' +
        (img ? '<div class="pv-img">' + img + '</div>' : '') +
        '<div><h3><span>' + (i + 1) + '</span>' + esc(p.name || 'Custom exercise') + '</h3>' +
        '<div class="pv-pos">' + esc(p.pos) + '</div>' +
        '<div class="pv-dose"><div><span>Sets</span><strong>' + esc(p.sets) + '</strong></div>' +
          '<div><span>Reps / time</span><strong>' + esc(p.reps) + '</strong></div>' +
          '<div><span>Hold</span><strong>' + esc(p.hold) + '</strong></div>' +
          '<div><span>Frequency</span><strong>' + esc(p.freq) + '</strong></div></div>' +
        '<div class="pv-text">' + esc(p.instr) + '</div>' +
        ((p.note || '').trim() ? '<div class="pv-note"><b>Note from your PT</b>' + esc(p.note.trim()) + '</div>' : '') +
        '</div></section>';
    });
    $('print-view').innerHTML = html;
  }
  $('btn-print').addEventListener('click', function () {
    if (!state.program.length && !(state.pt.instructions || '').trim()) return toast('Add some exercises first.');
    buildPrintView();
    // Let photos finish decoding before the print dialog snapshots the page.
    var imgs = Array.prototype.slice.call($('print-view').querySelectorAll('img'));
    imgs.forEach(function (im) { im.loading = 'eager'; });
    Promise.all(imgs.map(function (im) { return im.decode ? im.decode().catch(function () {}) : null; }))
      .then(function () { window.print(); });
  });
  window.addEventListener('beforeprint', buildPrintView);

  // ── Top bar, theme, mobile tabs ─────────────────────────────
  $('btn-programs').addEventListener('click', openPrograms);
  $('btn-save-quick').addEventListener('click', openPrograms);
  $('btn-backup').addEventListener('click', openBackup);

  function applyTheme(t) {
    if (t) document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  try { applyTheme(localStorage.getItem('hep_theme')); } catch (e) {}
  $('btn-theme').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('hep_theme', next); } catch (e) {}
  });

  function syncTabs() {
    document.querySelectorAll('.mobile-tabs button').forEach(function (x) {
      x.classList.toggle('active', x.dataset.view === $('shell').dataset.view);
    });
  }
  document.querySelector('.mobile-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]');
    if (!b) return;
    $('shell').dataset.view = b.dataset.view;
    syncTabs();
  });

  // ── Init ────────────────────────────────────────────────────
  function renderAll() {
    renderChips();
    filterLibrary();
    renderProgram();
  }

  load();
  if (!state.pt.date) state.pt.date = today();
  fillPatient();
  try { if (localStorage.getItem('hep_instr_open')) { $('instr-card').classList.add('open'); $('instr-toggle').setAttribute('aria-expanded', 'true'); } } catch (e) {}
  renderAll();
  Photos.init().then(function () { if (Photos.count()) { renderLibrary(); renderProgram(); } });
})();
