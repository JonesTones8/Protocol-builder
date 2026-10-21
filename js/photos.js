// Your own exercise photos, stored in this browser (IndexedDB), keyed by exercise id.
// Photos are downscaled before saving so the store stays small.
(function () {
  'use strict';

  var DB_NAME = 'hep-builder', STORE = 'photos', MAX_SIDE = 1400;
  var dbPromise = null;
  var urls = {};  // exercise id -> object URL

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise(function (resolve, reject) {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    }
    return dbPromise;
  }

  function tx(mode, fn) {
    return db().then(function (d) {
      return new Promise(function (resolve, reject) {
        var t = d.transaction(STORE, mode), store = t.objectStore(STORE), result;
        var r = fn(store);
        if (r) r.onsuccess = function () { result = r.result; };
        t.oncomplete = function () { resolve(result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }

  function setUrl(id, blob) {
    if (urls[id]) URL.revokeObjectURL(urls[id]);
    if (blob) urls[id] = URL.createObjectURL(blob); else delete urls[id];
  }

  // Load every stored photo once at startup.
  function init() {
    return db().then(function (d) {
      return new Promise(function (resolve) {
        var t = d.transaction(STORE, 'readonly'), req = t.objectStore(STORE).openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { setUrl(c.key, c.value); c.continue(); } else resolve();
        };
        req.onerror = function () { resolve(); };
      });
    }).catch(function () { /* storage unavailable: run without photos */ });
  }

  // Downscale to MAX_SIDE on the long edge and re-encode as JPEG.
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), src = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(src);
        var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('Could not process image')); }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('That file could not be read as an image.')); };
      img.src = src;
    });
  }

  function save(id, file) {
    return shrink(file).then(function (blob) {
      return tx('readwrite', function (s) { return s.put(blob, id); }).then(function () { setUrl(id, blob); });
    });
  }

  function remove(id) {
    return tx('readwrite', function (s) { return s.delete(id); }).then(function () { setUrl(id, null); });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.readAsDataURL(blob);
    });
  }

  // For backups: { id: dataURL }
  function exportAll() {
    var out = {};
    return db().then(function (d) {
      return new Promise(function (resolve) {
        var entries = [], req = d.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
        req.onsuccess = function () {
          var c = req.result;
          if (c) { entries.push([c.key, c.value]); c.continue(); } else resolve(entries);
        };
      });
    }).then(function (entries) {
      return Promise.all(entries.map(function (e) {
        return blobToDataUrl(e[1]).then(function (u) { out[e[0]] = u; });
      }));
    }).then(function () { return out; });
  }

  function importAll(map) {
    var ids = Object.keys(map || {});
    return Promise.all(ids.map(function (id) {
      return fetch(map[id]).then(function (r) { return r.blob(); });
    })).then(function (blobs) {
      return tx('readwrite', function (s) {
        ids.forEach(function (id, i) { s.put(blobs[i], id); });
      }).then(function () { ids.forEach(function (id, i) { setUrl(id, blobs[i]); }); });
    }).then(function () { return ids.length; });
  }

  window.Photos = {
    init: init,
    url: function (id) { return urls[id] || null; },
    count: function () { return Object.keys(urls).length; },
    save: save,
    remove: remove,
    exportAll: exportAll,
    importAll: importAll
  };
})();
