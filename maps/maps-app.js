/*! Bestiary & Grimoire — Maps mode (HexPlora-class, Pixi + IndexedDB). */
"use strict";
(function () {
  const DB_NAME = "bg-maps";
  const DB_VER = 1;
  const STORE = "maps";
  const LAST_KEY = "bg.maps.lastOpen.v1";
  const MAX_MAPS_META = 100;
  const MAX_TOKENS = 500;
  const MAX_REVEALED = 50000;
  const MAX_ANNOT = 1000;
  const MAX_STROKE_PTS = 100000;
  const MAX_MEASURE_HEXES = 10000;
  const MAX_IMAGE_B64 = 30 * 1024 * 1024;
  const UNDO_MAX = 80;
  const TOKEN_ICON_ALIASES = {
    "★": "star", "⌂": "home", "☠": "skull", "⚑": "flag", "⚔": "sword",
    "◇": "question", "●": "person", "▲": "exclamation", "✚": "check",
    star_rate: "star", swords: "sword", groups: "group", person_pin: "person",
    location_on: "location", help: "question", warning: "exclamation",
    check_circle: "check", bolt: "bolt", castle: "castle", fort: "fort",
    camping: "camp", grass: "grass", village: "village", shield: "shield",
    flag: "flag", skull: "skull", home: "home", star: "star", sword: "sword",
  };
  const TOKEN_SIZES = { small: 0.55, medium: 1, large: 1.55 };
  const iconTextures = new Map();
  let iconsLoadPromise = null;
  const TEXT_SIZES = { small: 14, medium: 20, large: 32 };
  const STARTER_MAP_URL = "maps/starter.hexplora";
  const STARTER_MAP_NAME = "Starter map";

  const DEFAULT_SETTINGS = {
    hexSize: 40, offsetX: 0, offsetY: 0, columnCount: 20, rowCount: 15,
    orientation: "pointy", mapScale: 100,
    fogColor: "#225522", fogOpacity: 0.85, gridColor: "#FFFFFF", gridThickness: 1,
    tokenColor: "#c0392b", tokenIcon: "", tokenSize: "medium",
    hexDistanceValue: 8, hexDistanceUnit: "miles", measureColor: "#c9a267",
    drawColor: "#ff4444", drawThickness: 3, drawOpacity: 1,
    rectColor: "#ff4444", rectThickness: 3, rectOpacity: 1, rectFill: null, rectFillOpacity: 0.5,
    ellipseColor: "#ff4444", ellipseThickness: 3, ellipseOpacity: 1, ellipseFill: null, ellipseFillOpacity: 0.5,
    arrowColor: "#ff4444", arrowThickness: 3, arrowOpacity: 1,
    textToolColor: "#241f1c", textToolSize: "medium",
    textToolOutlineColor: "#f4f0e8", textToolOutlineWidth: 3, textToolOutlineOpacity: 1,
    textToolCustomPx: 20,
    gridKind: "hex",
  };

  const TEXT_PRESETS = {
    white: { color: "#f4f0e8", outlineColor: "#241f1c", outlineWidth: 3, outlineOpacity: 1 },
    black: { color: "#241f1c", outlineColor: "#f4f0e8", outlineWidth: 3, outlineOpacity: 1 },
    yellow: { color: "#f0d78c", outlineColor: "#241f1c", outlineWidth: 3, outlineOpacity: 1 },
  };

  function announce(m) {
    if (typeof announceLive === "function") announceLive(m);
    else if (window.TRK && TRK._test) { /* noop */ }
  }
  function uid() {
    return (crypto.randomUUID && crypto.randomUUID()) || ("m" + Math.random().toString(36).slice(2, 11));
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function vStr(v, max, fb) {
    if (typeof v !== "string") return fb;
    return v.length > max ? v.slice(0, max) : v;
  }
  function num(v, fb) {
    if (v == null || v === "") return fb;
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  }

  /* ---------- IndexedDB ---------- */
  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: "id" });
          s.createIndex("name", "name", { unique: false });
          s.createIndex("updated", "updated", { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  function withStore(type, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, type);
      const store = tx.objectStore(STORE);
      let request;
      try { request = fn(store); }
      catch (err) { reject(err); return; }
      const rp = request && typeof request === "object" && "onsuccess" in request
        ? new Promise((res, rej) => { request.onsuccess = () => res(request.result); request.onerror = () => rej(request.error); })
        : Promise.resolve(request);
      tx.oncomplete = () => rp.then(resolve, reject);
      tx.onerror = () => {
        const err = tx.error;
        reject(err && err.name === "QuotaExceededError" ? new Error("QUOTA_EXCEEDED") : err);
      };
      tx.onabort = () => {
        const err = tx.error;
        reject(err && err.name === "QuotaExceededError" ? new Error("QUOTA_EXCEEDED") : err);
      };
    }));
  }
  const idb = {
    open: openDB,
    async put(rec) {
      await withStore("readwrite", (s) => s.put(rec));
    },
    async get(id) {
      return withStore("readonly", (s) => s.get(id));
    },
    async del(id) {
      await withStore("readwrite", (s) => s.delete(id));
    },
    async all() {
      return withStore("readonly", (s) => s.getAll());
    },
  };

  /* ---------- Spatial hash ---------- */
  class SpatialHashGrid {
    constructor(cellSize) {
      this.cellSize = cellSize || 100;
      this.cells = new Map();
    }
    clear() { this.cells.clear(); }
    _key(cx, cy) {
      const enc = (n) => (n >= 0 ? 2 * n : -2 * n - 1);
      const x = BigInt(enc(cx)), y = BigInt(enc(cy));
      return (((x + y) * (x + y + 1n)) / 2n + y).toString();
    }
    insert(obj, b) {
      const c0 = Math.floor(b.xMin / this.cellSize), c1 = Math.floor(b.xMax / this.cellSize);
      const r0 = Math.floor(b.yMin / this.cellSize), r1 = Math.floor(b.yMax / this.cellSize);
      for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
        const k = this._key(cx, cy);
        if (!this.cells.has(k)) this.cells.set(k, new Set());
        this.cells.get(k).add(obj);
      }
    }
    queryPoint(x, y) {
      const set = this.cells.get(this._key(Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)));
      return set ? Array.from(set) : [];
    }
  }

  function pointInPoly(px, py, verts) {
    let inside = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const xi = verts[i].x, yi = verts[i].y, xj = verts[j].x, yj = verts[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi)) inside = !inside;
    }
    return inside;
  }

  function generateHexGrid(settings, revealedHexes) {
    const hexSize = settings.hexSize;
    const orientation = settings.orientation === "flat" ? "flat" : "pointy";
    let hexWidth, hexHeight;
    if (orientation === "pointy") {
      hexWidth = hexSize * Math.sqrt(3);
      hexHeight = hexSize * 2;
    } else {
      hexWidth = hexSize * 2;
      hexHeight = hexSize * Math.sqrt(3);
    }
    const index = new SpatialHashGrid(hexSize * 2);
    const hexes = [];
    const byId = new Map();
    for (let row = 0; row < settings.rowCount; row++) {
      for (let col = 0; col < settings.columnCount; col++) {
        let x, y;
        if (orientation === "pointy") {
          x = col * hexWidth + (row % 2 === 1 ? hexWidth / 2 : 0) + settings.offsetX;
          y = row * ((hexHeight * 3) / 4) + settings.offsetY;
        } else {
          x = col * ((hexWidth * 3) / 4) + settings.offsetX;
          y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0) + settings.offsetY;
        }
        const id = col + "-" + row;
        const verts = [];
        const start = orientation === "pointy" ? Math.PI / 2 : 0;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + start;
          verts.push({ x: x + hexSize * Math.cos(a), y: y + hexSize * Math.sin(a) });
        }
        const hex = {
          id, x, y, row, col, revealed: revealedHexes[id] === true, vertices: verts,
        };
        hexes.push(hex);
        byId.set(id, hex);
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        for (const v of verts) {
          if (v.x < xMin) xMin = v.x; if (v.x > xMax) xMax = v.x;
          if (v.y < yMin) yMin = v.y; if (v.y > yMax) yMax = v.y;
        }
        index.insert(hex, { xMin, xMax, yMin, yMax });
      }
    }
    return { kind: "hex", hexes, cells: hexes, index, byId, hexWidth, hexHeight, cellWidth: hexWidth, cellHeight: hexHeight };
  }

  function generateSquareGrid(settings, revealedCells) {
    const cellSize = settings.hexSize;
    const index = new SpatialHashGrid(cellSize);
    const cells = [];
    const byId = new Map();
    for (let row = 0; row < settings.rowCount; row++) {
      for (let col = 0; col < settings.columnCount; col++) {
        const x = col * cellSize + cellSize / 2 + settings.offsetX;
        const y = row * cellSize + cellSize / 2 + settings.offsetY;
        const id = col + "-" + row;
        const half = cellSize / 2;
        const verts = [
          { x: x - half, y: y - half }, { x: x + half, y: y - half },
          { x: x + half, y: y + half }, { x: x - half, y: y + half },
        ];
        const cell = {
          id, x, y, row, col, revealed: revealedCells[id] === true, vertices: verts,
        };
        cells.push(cell);
        byId.set(id, cell);
        index.insert(cell, { xMin: x - half, xMax: x + half, yMin: y - half, yMax: y + half });
      }
    }
    return { kind: "square", cells, index, byId, cellWidth: cellSize, cellHeight: cellSize };
  }

  function findCellAt(wx, wy, g) {
    if (!g) return null;
    for (const h of g.index.queryPoint(wx, wy)) {
      if (pointInPoly(wx, wy, h.vertices)) return h;
    }
    return null;
  }

  function findHexAt(wx, wy, g) { return findCellAt(wx, wy, g); }

  function hexNeighbors(hex, byId, orientation) {
    const { col, row } = hex;
    const odd = orientation === "pointy" ? (row % 2 === 1) : (col % 2 === 1);
    const deltas = orientation === "pointy"
      ? (odd
        ? [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]]
        : [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]])
      : (odd
        ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
        : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]]);
    const out = [];
    for (const [dc, dr] of deltas) {
      const n = byId.get((col + dc) + "-" + (row + dr));
      if (n) out.push(n);
    }
    return out;
  }

  function cellNeighbors(cell, byId, settings) {
    if (settings.gridKind === "square") {
      const { col, row } = cell;
      const out = [];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = byId.get((col + dc) + "-" + (row + dr));
        if (n) out.push(n);
      }
      return out;
    }
    return hexNeighbors(cell, byId, settings.orientation);
  }

  function tokenIconSlugs() {
    const m = window.MAPS_TOKEN_ICON_MANIFEST;
    if (!m) return new Set([""]);
    return new Set(m.map((e) => e.id));
  }

  function normalizeTokenIcon(raw) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) return "";
    if (TOKEN_ICON_ALIASES[s]) return TOKEN_ICON_ALIASES[s];
    const slugs = tokenIconSlugs();
    if (slugs.has(s)) return s.slice(0, 32);
    return "";
  }

  async function textureFromSvgUrl(url, PIXI) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const svg = await res.text();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const urlObj = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = urlObj;
      });
      return PIXI.Texture.from(img);
    } finally {
      URL.revokeObjectURL(urlObj);
    }
  }

  async function loadTokenIcons() {
    const PIXI = window.PIXI;
    if (!PIXI || !window.MAPS_TOKEN_ICON_MANIFEST) return;
    if (iconsLoadPromise) return iconsLoadPromise;
    iconsLoadPromise = (async () => {
      for (const entry of MAPS_TOKEN_ICON_MANIFEST) {
        if (!entry.id || iconTextures.has(entry.id)) continue;
        try {
          const tex = await textureFromSvgUrl("maps/token-icons/" + entry.id + ".svg", PIXI);
          iconTextures.set(entry.id, tex);
        } catch (_) { /* fail soft if fetch blocked */ }
      }
    })();
    return iconsLoadPromise;
  }

  /* ---------- validators ---------- */
  function vSettings(raw) {
    const s = Object.assign({}, DEFAULT_SETTINGS);
    if (!raw || typeof raw !== "object") return s;
    s.hexSize = clamp(num(raw.hexSize, s.hexSize), 8, 400);
    s.offsetX = num(raw.offsetX, 0);
    s.offsetY = num(raw.offsetY, 0);
    s.columnCount = clamp(Math.round(num(raw.columnCount, s.columnCount)), 1, 200);
    s.rowCount = clamp(Math.round(num(raw.rowCount, s.rowCount)), 1, 200);
    s.orientation = raw.orientation === "flat" ? "flat" : "pointy";
    s.gridKind = raw.gridKind === "square" ? "square" : "hex";
    s.mapScale = clamp(num(raw.mapScale, 100), 10, 400);
    for (const k of ["fogColor", "gridColor", "tokenColor", "measureColor", "drawColor",
      "rectColor", "ellipseColor", "arrowColor", "lineColor", "textToolColor", "textToolOutlineColor"]) {
      if (typeof raw[k] === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw[k])) s[k] = raw[k];
    }
    s.fogOpacity = clamp(num(raw.fogOpacity, s.fogOpacity), 0, 1);
    s.gridThickness = clamp(num(raw.gridThickness, 1), 0.5, 8);
    s.tokenIcon = normalizeTokenIcon(vStr(raw.tokenIcon, 32, ""));
    s.tokenSize = raw.tokenSize === "small" || raw.tokenSize === "large" ? raw.tokenSize : "medium";
    s.hexDistanceValue = clamp(num(raw.hexDistanceValue, 8), 0.01, 1e6);
    s.hexDistanceUnit = vStr(raw.hexDistanceUnit, 24, "miles");
    s.drawThickness = clamp(num(raw.drawThickness, 3), 1, 40);
    s.drawOpacity = clamp(num(raw.drawOpacity, 1), 0, 1);
    for (const prefix of ["rect", "ellipse"]) {
      s[prefix + "Thickness"] = clamp(num(raw[prefix + "Thickness"], 3), 1, 40);
      s[prefix + "Opacity"] = clamp(num(raw[prefix + "Opacity"], 1), 0, 1);
      const fill = raw[prefix + "Fill"];
      s[prefix + "Fill"] = (typeof fill === "string" && /^#[0-9a-fA-F]{3,8}$/.test(fill)) ? fill : null;
      s[prefix + "FillOpacity"] = clamp(num(raw[prefix + "FillOpacity"], 0.5), 0, 1);
    }
    s.arrowThickness = clamp(num(raw.arrowThickness, 3), 1, 40);
    s.arrowOpacity = clamp(num(raw.arrowOpacity, 1), 0, 1);
    s.lineThickness = clamp(num(raw.lineThickness, 3), 1, 40);
    s.lineOpacity = clamp(num(raw.lineOpacity, 1), 0, 1);
    s.textToolSize = raw.textToolSize === "small" || raw.textToolSize === "large" || raw.textToolSize === "custom"
      ? raw.textToolSize : "medium";
    s.textToolOutlineWidth = clamp(num(raw.textToolOutlineWidth, s.textToolOutlineWidth), 0, 12);
    s.textToolOutlineOpacity = clamp(num(raw.textToolOutlineOpacity, s.textToolOutlineOpacity), 0, 1);
    s.textToolCustomPx = clamp(num(raw.textToolCustomPx, s.textToolCustomPx), 8, 128);
    return s;
  }
  function vRevealed(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    let n = 0;
    for (const k of Object.keys(raw)) {
      if (n >= MAX_REVEALED) break;
      if (raw[k] === true && /^\d+-\d+$/.test(k)) { out[k] = true; n++; }
    }
    return out;
  }
  function vToken(raw, i) {
    if (!raw || typeof raw !== "object") return null;
    return {
      x: num(raw.x, 0), y: num(raw.y, 0),
      color: (typeof raw.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(raw.color)) ? raw.color : "#c0392b",
      label: vStr(raw.label, 100, ""),
      icon: normalizeTokenIcon(vStr(raw.icon, 32, "")),
      notes: vStr(raw.notes, 2000, ""),
      zIndex: num(raw.zIndex, i + 1),
    };
  }
  function vStroke(raw) {
    if (!raw || !Array.isArray(raw.points)) return null;
    const pts = [];
    for (const p of raw.points.slice(0, MAX_STROKE_PTS)) {
      if (!p || !Array.isArray(p) || p.length < 2) continue;
      pts.push([num(p[0], 0), num(p[1], 0)]);
    }
    if (!pts.length) return null;
    return {
      points: pts,
      color: (typeof raw.color === "string") ? raw.color : "#ff4444",
      thickness: clamp(num(raw.thickness, 3), 1, 40),
      opacity: clamp(num(raw.opacity, 1), 0, 1),
    };
  }
  function vShape(raw) {
    if (!raw || typeof raw !== "object") return null;
    const type = raw.type === "rect" || raw.type === "circle" || raw.type === "arrow" || raw.type === "line" ? raw.type : null;
    if (!type) return null;
    return {
      type, x1: num(raw.x1, 0), y1: num(raw.y1, 0), x2: num(raw.x2, 0), y2: num(raw.y2, 0),
      color: (typeof raw.color === "string") ? raw.color : "#ff4444",
      thickness: clamp(num(raw.thickness, 3), 1, 40),
      opacity: clamp(num(raw.opacity, 1), 0, 1),
      fill: (typeof raw.fill === "string") ? raw.fill : null,
      fillOpacity: clamp(num(raw.fillOpacity, 0.5), 0, 1),
    };
  }
  function vText(raw) {
    if (!raw || typeof raw !== "object") return null;
    const text = vStr(raw.text != null ? raw.text : raw.content, 500, "");
    if (!text) return null;
    return {
      text, x: num(raw.x, 0), y: num(raw.y, 0),
      fontSize: clamp(num(raw.fontSize != null ? raw.fontSize : raw.size, 18), 8, 128),
      color: (typeof raw.color === "string") ? raw.color : "#241f1c",
      outlineColor: (typeof raw.outlineColor === "string") ? raw.outlineColor : "#f4f0e8",
      outlineWidth: clamp(num(raw.outlineWidth, 3), 0, 12),
      outlineOpacity: clamp(num(raw.outlineOpacity, 1), 0, 1),
    };
  }
  function vMeasurement(raw) {
    if (!raw || !Array.isArray(raw.hexIds)) return null;
    const hexIds = [];
    for (const id of raw.hexIds.slice(0, MAX_MEASURE_HEXES)) {
      if (typeof id === "string" && /^\d+-\d+$/.test(id)) hexIds.push(id);
    }
    if (hexIds.length < 2) return null;
    return { hexIds, color: (typeof raw.color === "string") ? raw.color : "#c9a267", createdAt: num(raw.createdAt, Date.now()) };
  }
  function vState(raw) {
    const settings = vSettings(raw && raw.settings);
    let zoomLevel = num(raw && raw.view && raw.view.zoomLevel, 1);
    // 0.1 only came from Number(null)→0 clamped to the old vState minimum.
    if (!Number.isFinite(zoomLevel) || zoomLevel <= 0.11) zoomLevel = 1;
    else zoomLevel = clamp(zoomLevel, 0.15, 8);
    const view = {
      zoomLevel,
      panX: num(raw && raw.view && raw.view.panX, 0),
      panY: num(raw && raw.view && raw.view.panY, 0),
    };
    const revealedHexes = vRevealed(raw && raw.revealedHexes);
    const tokens = [];
    const tin = Array.isArray(raw && raw.tokens) ? raw.tokens : [];
    for (let i = 0; i < tin.length && tokens.length < MAX_TOKENS; i++) {
      const t = vToken(tin[i], i);
      if (t) tokens.push(t);
    }
    const strokes = [], shapes = [], texts = [], measurements = [];
    for (const x of (Array.isArray(raw && raw.strokes) ? raw.strokes : []).slice(0, MAX_ANNOT)) {
      const s = vStroke(x); if (s) strokes.push(s);
    }
    for (const x of (Array.isArray(raw && raw.shapes) ? raw.shapes : []).slice(0, MAX_ANNOT)) {
      const s = vShape(x); if (s) shapes.push(s);
    }
    for (const x of (Array.isArray(raw && raw.texts) ? raw.texts : []).slice(0, MAX_ANNOT)) {
      const s = vText(x); if (s) texts.push(s);
    }
    for (const x of (Array.isArray(raw && raw.measurements) ? raw.measurements : []).slice(0, MAX_ANNOT)) {
      const s = vMeasurement(x); if (s) measurements.push(s);
    }
    return { settings, view, revealedHexes, tokens, strokes, shapes, texts, measurements };
  }

  function snapshotState(st) {
    return JSON.parse(JSON.stringify({
      settings: st.settings, view: st.view, revealedHexes: st.revealedHexes,
      tokens: st.tokens, strokes: st.strokes, shapes: st.shapes, texts: st.texts, measurements: st.measurements,
    }));
  }

  /* ---------- MAPS module ---------- */
  const MAPS = (() => {
    let active = false;
    let openMapId = null;
    let blob = null;
    let state = vState(null);
    let grid = null;
    let tool = "pan";
    let shapeKind = "rect";
    let brushErasing = false;
    let app = null;
    let layers = null;
    let dirty = false;
    let saveTimer = null;
    let undoStack = [];
    let redoStack = [];
    let drag = null;
    let measurePath = [];
    let pendingText = null;
    let strokePts = null;
    let shapeDraft = null;
    let selectedToken = -1;
    let selectedText = -1;
    let selectedMeasurement = -1;
    let selectedStroke = -1;
    let selectedShape = -1;
    let tokenMultiPlace = false;
    let pinching = null;
    let nextZ = 1;
    let editClick = null;

    function hitEditKey(hitText, hitToken) {
      if (hitText >= 0) return "t:" + hitText;
      if (hitToken >= 0) return "k:" + hitToken;
      return null;
    }

    function tryEditOnDblHit(hitText, hitToken) {
      const key = hitEditKey(hitText, hitToken);
      if (!key) { editClick = null; return false; }
      const now = Date.now();
      if (editClick && editClick.key === key && now - editClick.t < 450) {
        editClick = null;
        return openHitEditor(hitText, hitToken);
      }
      editClick = { key, t: now };
      return false;
    }

    function $(id) { return document.getElementById(id); }
    function metas() {
      const c = window.CAMPAIGN && CAMPAIGN.active && CAMPAIGN.active();
      return (c && Array.isArray(c.maps)) ? c.maps : [];
    }
    function persistMetas(list) {
      if (window.CAMPAIGN && typeof CAMPAIGN.saveActiveMaps === "function")
        return CAMPAIGN.saveActiveMaps(list);
      return false;
    }
    function toast(msg) {
      announce(msg);
      const el = $("mapsToast");
      if (!el) return;
      el.textContent = msg;
      el.hidden = false;
      clearTimeout(toast._t);
      toast._t = setTimeout(() => { el.hidden = true; }, 2800);
    }

    function scheduleSave() {
      dirty = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => { saveOpen().catch(() => {}); }, 450);
    }

    async function saveOpen() {
      if (!openMapId) return true;
      try {
        const name = (metas().find((m) => m.id === openMapId) || {}).name || "Map";
        await idb.put({
          id: openMapId, name, blob, state: snapshotState(state), updated: Date.now(),
        });
        const list = metas().map((m) => m.id === openMapId
          ? { id: m.id, name: m.name, updatedAt: Date.now() } : m);
        persistMetas(list);
        dirty = false;
        return true;
      } catch (e) {
        if (String(e && e.message) === "QUOTA_EXCEEDED")
          toast("Could not save map — browser storage is full");
        else toast("Could not save map");
        return false;
      }
    }

    function pushUndo() {
      undoStack.push(snapshotState(state));
      if (undoStack.length > UNDO_MAX) undoStack.shift();
      redoStack = [];
    }

    function applySnap(snap) {
      state = vState(snap);
      rebuildGrid();
      renderAll();
      scheduleSave();
    }

    function undo() {
      if (!undoStack.length) return;
      redoStack.push(snapshotState(state));
      applySnap(undoStack.pop());
    }
    function redo() {
      if (!redoStack.length) return;
      undoStack.push(snapshotState(state));
      applySnap(redoStack.pop());
    }

    function rebuildGrid() {
      if (state.settings.gridKind === "square") {
        grid = generateSquareGrid(state.settings, state.revealedHexes);
      } else {
        grid = generateHexGrid(state.settings, state.revealedHexes);
      }
    }

    function worldFromEvent(e) {
      if (!app || !layers) return { x: 0, y: 0 };
      const rect = app.canvas.getBoundingClientRect();
      const sx = (e.clientX - rect.left) * (app.screen.width / rect.width);
      const sy = (e.clientY - rect.top) * (app.screen.height / rect.height);
      const z = state.view.zoomLevel;
      return { x: (sx - state.view.panX) / z, y: (sy - state.view.panY) / z };
    }

    function textStyleFor(t) {
      const PIXI = window.PIXI;
      if (!PIXI) return null;
      return new PIXI.TextStyle({
        fontFamily: "Source Serif 4, Georgia, serif",
        fontSize: t.fontSize || 18,
        fill: t.color || "#241f1c",
        stroke: { color: t.outlineColor || "#f4f0e8", width: t.outlineWidth || 0 },
      });
    }

    function textBounds(t) {
      const fs = t.fontSize || 18;
      const pad = 6 + Math.ceil((t.outlineWidth || 0) / 2);
      const anchor = { x: t.x - pad, y: t.y - pad, w: pad * 2, h: pad * 2 };
      const PIXI = window.PIXI;
      if (PIXI) {
        try {
          const tx = new PIXI.Text({ text: t.text || "", style: textStyleFor(t) });
          const b = tx.getLocalBounds();
          tx.destroy(true);
          const visual = {
            x: t.x + b.x - pad,
            y: t.y + b.y - pad,
            w: b.width + pad * 2,
            h: b.height + pad * 2,
          };
          const x = Math.min(anchor.x, visual.x);
          const y = Math.min(anchor.y, visual.y);
          const r = Math.max(anchor.x + anchor.w, visual.x + visual.w);
          const bot = Math.max(anchor.y + anchor.h, visual.y + visual.h);
          return { x, y, w: r - x, h: bot - y };
        } catch (_) { /* fall through */ }
      }
      const w = Math.max(fs * 1.5, (t.text || "").length * fs * 0.55) + pad * 2;
      const h = fs * 1.4 + pad * 2;
      return { x: t.x - pad, y: t.y - pad, w, h };
    }

    function pickTextAt(wx, wy) {
      for (let i = state.texts.length - 1; i >= 0; i--) {
        const b = textBounds(state.texts[i]);
        if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return i;
      }
      return -1;
    }

    function pickTokenAt(wx, wy) {
      const hexSize = state.settings.hexSize;
      const mul = TOKEN_SIZES[state.settings.tokenSize] || 1;
      const r = hexSize * 0.4 * mul * 1.15;
      for (let i = state.tokens.length - 1; i >= 0; i--) {
        const t = state.tokens[i];
        if (Math.hypot(wx - t.x, wy - t.y) <= r) return i;
      }
      return -1;
    }

    function distPointToSegment(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - ax, py - ay);
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }

    function pathNearPoint(path, x, y, radius) {
      if (!path || path.length < 1) return false;
      if (path.length === 1) return Math.hypot(path[0][0] - x, path[0][1] - y) <= radius;
      for (let i = 0; i < path.length - 1; i++) {
        const [ax, ay] = path[i], [bx, by] = path[i + 1];
        if (distPointToSegment(x, y, ax, ay, bx, by) <= radius) return true;
      }
      return false;
    }

    function pickStrokeAt(wx, wy) {
      for (let i = state.strokes.length - 1; i >= 0; i--) {
        const s = state.strokes[i];
        const hitR = Math.max((s.thickness || 3) / 2, 8);
        if (pathNearPoint(s.points, wx, wy, hitR)) return i;
      }
      return -1;
    }

    function pickShapeAt(wx, wy) {
      const pad = 8;
      for (let i = state.shapes.length - 1; i >= 0; i--) {
        const sh = state.shapes[i];
        if (sh.type === "line" || sh.type === "arrow") {
          if (distPointToSegment(wx, wy, sh.x1, sh.y1, sh.x2, sh.y2) <= pad + (sh.thickness || 3)) return i;
        } else {
          const minX = Math.min(sh.x1, sh.x2) - pad, maxX = Math.max(sh.x1, sh.x2) + pad;
          const minY = Math.min(sh.y1, sh.y2) - pad, maxY = Math.max(sh.y1, sh.y2) + pad;
          if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) return i;
        }
      }
      return -1;
    }

    function pickMeasurementAt(wx, wy) {
      let best = -1, bestD = Infinity;
      for (let i = 0; i < state.measurements.length; i++) {
        const m = state.measurements[i];
        for (const id of m.hexIds) {
          const h = grid && grid.byId.get(id);
          if (!h) continue;
          const d = Math.hypot(wx - h.x, wy - h.y);
          if (d < 18 && d < bestD) { bestD = d; best = i; }
        }
      }
      return best;
    }

    function clearSelection() {
      selectedToken = selectedText = selectedMeasurement = selectedStroke = selectedShape = -1;
    }

    function selectKind(kind, index) {
      clearSelection();
      if (kind === "token") selectedToken = index;
      else if (kind === "text") selectedText = index;
      else if (kind === "measurement") selectedMeasurement = index;
      else if (kind === "stroke") selectedStroke = index;
      else if (kind === "shape") selectedShape = index;
      drawAnnotations();
      drawTokens();
    }

    function pickPanTarget(wx, wy) {
      const hitToken = pickTokenAt(wx, wy);
      if (hitToken >= 0) return { kind: "token", index: hitToken };
      const hitText = pickTextAt(wx, wy);
      if (hitText >= 0) return { kind: "text", index: hitText };
      const hitMeas = pickMeasurementAt(wx, wy);
      if (hitMeas >= 0) return { kind: "measurement", index: hitMeas };
      const hitShape = pickShapeAt(wx, wy);
      if (hitShape >= 0) return { kind: "shape", index: hitShape };
      const hitStroke = pickStrokeAt(wx, wy);
      if (hitStroke >= 0) return { kind: "stroke", index: hitStroke };
      return null;
    }

    function applyShapeModifiers(x1, y1, x2, y2, type, shiftKey, altKey) {
      let nx = x2, ny = y2;
      if (shiftKey && (type === "rect" || type === "circle")) {
        const side = Math.max(Math.abs(nx - x1), Math.abs(ny - y1));
        nx = x1 + (nx >= x1 ? side : -side);
        ny = y1 + (ny >= y1 ? side : -side);
      }
      if (altKey) {
        nx = x1 + (nx - x1) * 2;
        ny = y1 + (ny - y1) * 2;
      }
      return { x1, y1, x2: nx, y2: ny };
    }

    function eraseAlongPath(path) {
      if (!path || path.length < 2) return;
      state.strokes = state.strokes.filter((s) => {
        const hitR = Math.max((s.thickness || 3) / 2, 8);
        for (const [x, y] of path) {
          if (pathNearPoint(s.points, x, y, hitR)) return false;
        }
        return true;
      });
      state.shapes = state.shapes.filter((sh) => {
        const pad = 8;
        const minX = Math.min(sh.x1, sh.x2) - pad, maxX = Math.max(sh.x1, sh.x2) + pad;
        const minY = Math.min(sh.y1, sh.y2) - pad, maxY = Math.max(sh.y1, sh.y2) + pad;
        for (const [x, y] of path) {
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) return false;
        }
        return true;
      });
    }

    function deleteSelection() {
      if (selectedToken >= 0) {
        pushUndo();
        state.tokens.splice(selectedToken, 1);
        clearSelection();
        renderAll(); scheduleSave();
        toast("Token deleted");
        return true;
      }
      if (selectedMeasurement >= 0) {
        pushUndo();
        state.measurements.splice(selectedMeasurement, 1);
        clearSelection();
        renderAll(); scheduleSave();
        toast("Measurement deleted");
        return true;
      }
      if (selectedText >= 0) {
        pushUndo();
        state.texts.splice(selectedText, 1);
        clearSelection();
        renderAll(); scheduleSave();
        toast("Text deleted");
        return true;
      }
      if (selectedStroke >= 0) {
        pushUndo();
        state.strokes.splice(selectedStroke, 1);
        clearSelection();
        renderAll(); scheduleSave();
        toast("Stroke deleted");
        return true;
      }
      if (selectedShape >= 0) {
        pushUndo();
        state.shapes.splice(selectedShape, 1);
        clearSelection();
        renderAll(); scheduleSave();
        toast("Shape deleted");
        return true;
      }
      return false;
    }

    let drawerView = "maps";

    const SHAPE_FIELDS = {
      rect: ["mapsRectColor", "mapsRectThick", "mapsRectOpacity", "mapsRectFillOn", "mapsRectFillColor", "mapsRectFillOpacity"],
      ellipse: ["mapsEllipseColor", "mapsEllipseThick", "mapsEllipseOpacity", "mapsEllipseFillOn", "mapsEllipseFillColor", "mapsEllipseFillOpacity"],
      arrow: ["mapsArrowColor", "mapsArrowThick", "mapsArrowOpacity"],
      line: ["mapsLineColor", "mapsLineThick", "mapsLineOpacity"],
    };

    function shapeSettingsPrefix() {
      if (shapeKind === "ellipse") return "ellipse";
      if (shapeKind === "rect") return "rect";
      return shapeKind;
    }

    function activeToolKey() {
      if (tool === "reveal" || tool === "hide") return tool;
      if (tool === "brush") return "brush";
      if (tool === "shape") return shapeKind === "ellipse" ? "circle" : shapeKind;
      if (tool === "measure") return "measure";
      if (tool === "token") return "token";
      if (tool === "text") return "text";
      return "";
    }

    function toolLabel(key) {
      const labels = {
        brush: "Brush", rect: "Rectangle", circle: "Ellipse", arrow: "Arrow", line: "Line",
        measure: "Measure", reveal: "Reveal", hide: "Hide", token: "Token", text: "Text",
      };
      return (labels[key] || "Tool") + " settings";
    }

    function syncTextSizeRow() {
      const row = $("mapsTextFontSizeRow");
      const sz = $("mapsTextSize");
      if (row) row.style.display = (sz && sz.value === "custom") ? "flex" : "none";
    }

    function readShapeSettingsFromForm() {
      const s = state.settings;
      const p = shapeSettingsPrefix();
      const ids = SHAPE_FIELDS[p];
      if (!ids) return;
      const col = $(ids[0]);
      if (col) s[p + "Color"] = col.value || s[p + "Color"];
      const th = $(ids[1]);
      if (th) s[p + "Thickness"] = clamp(num(th.value, 3), 1, 40);
      const op = $(ids[2]);
      if (op) s[p + "Opacity"] = clamp(num(op.value, 1), 0, 1);
      if (p === "rect" || p === "ellipse") {
        const fillOn = $(ids[3]);
        const fillCol = $(ids[4]);
        const fillOp = $(ids[5]);
        if (fillOn && fillOn.checked && fillCol) s[p + "Fill"] = fillCol.value;
        else if (fillOn) s[p + "Fill"] = null;
        if (fillOp) s[p + "FillOpacity"] = clamp(num(fillOp.value, 0.5), 0, 1);
      }
    }

    function syncShapeSettingsForm() {
      const s = state.settings;
      const p = shapeSettingsPrefix();
      const ids = SHAPE_FIELDS[p];
      if (!ids) return;
      const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
      set(ids[0], s[p + "Color"] || s.drawColor);
      set(ids[1], s[p + "Thickness"] || 3);
      set(ids[2], s[p + "Opacity"] ?? 1);
      if (p === "rect" || p === "ellipse") {
        const fillOn = $(ids[3]);
        const fillCol = $(ids[4]);
        const fillOp = $(ids[5]);
        if (fillOn) fillOn.checked = !!s[p + "Fill"];
        if (fillCol) fillCol.value = s[p + "Fill"] || s[p + "Color"] || "#ff4444";
        if (fillOp) fillOp.value = s[p + "FillOpacity"] ?? 0.5;
      }
    }

    function readToolSettingsLive() {
      const s = state.settings;
      const dc = $("mapsDrawColor");
      if (dc) s.drawColor = dc.value || s.drawColor;
      const dt = $("mapsDrawThick");
      if (dt) s.drawThickness = clamp(num(dt.value, 3), 1, 40);
      const dop = $("mapsDrawOpacity");
      if (dop) s.drawOpacity = clamp(num(dop.value, 1), 0, 1);
      const er = $("mapsEraser");
      if (er) brushErasing = !!er.checked;
      const mc = $("mapsMeasureColor");
      if (mc) s.measureColor = mc.value || s.measureColor;
      const dv = $("mapsDistVal");
      if (dv) s.hexDistanceValue = clamp(num(dv.value, s.hexDistanceValue), 0.01, 1e6);
      const du = $("mapsDistUnit");
      if (du) s.hexDistanceUnit = (du.value || s.hexDistanceUnit).slice(0, 24);
      const fc = $("mapsFogColor");
      if (fc) s.fogColor = fc.value || s.fogColor;
      const fo = $("mapsFogOpacity");
      if (fo) s.fogOpacity = clamp(num(fo.value, s.fogOpacity), 0, 1);
      const tc = $("mapsTextColor");
      if (tc) s.textToolColor = tc.value;
      const ts = $("mapsTextSize");
      if (ts) s.textToolSize = ts.value;
      const toc = $("mapsTextOutlineColor");
      if (toc) s.textToolOutlineColor = toc.value;
      const tow = $("mapsTextOutlineWidth");
      if (tow) s.textToolOutlineWidth = clamp(num(tow.value, 3), 0, 12);
      const too = $("mapsTextOutlineOpacity");
      if (too) s.textToolOutlineOpacity = clamp(num(too.value, 1), 0, 1);
      const tfs = $("mapsTextFontSize");
      if (tfs) s.textToolCustomPx = clamp(num(tfs.value, s.textToolCustomPx), 8, 128);
      const tokc = $("mapsTokenColor");
      if (tokc) s.tokenColor = tokc.value || s.tokenColor;
      const toks = $("mapsTokenSize");
      if (toks) s.tokenSize = toks.value;
      const toki = $("mapsTokIconDrawer");
      if (toki) s.tokenIcon = normalizeTokenIcon(toki.value || "");
      const tm = $("mapsTokMulti");
      if (tm) tokenMultiPlace = !!tm.checked;
      readShapeSettingsFromForm();
    }

    function syncToolSettingsForm() {
      const s = state.settings;
      const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
      set("mapsDrawColor", s.drawColor);
      set("mapsDrawThick", s.drawThickness);
      set("mapsDrawOpacity", s.drawOpacity);
      set("mapsMeasureColor", s.measureColor);
      set("mapsDistVal", s.hexDistanceValue);
      set("mapsDistUnit", s.hexDistanceUnit);
      set("mapsTextColor", s.textToolColor || "#241f1c");
      set("mapsTextSize", s.textToolSize || "medium");
      set("mapsTextOutlineColor", s.textToolOutlineColor || "#f4f0e8");
      set("mapsTextOutlineWidth", s.textToolOutlineWidth ?? 3);
      set("mapsTextOutlineOpacity", s.textToolOutlineOpacity ?? 1);
      set("mapsTextFontSize", s.textToolCustomPx ?? 20);
      set("mapsFogColor", s.fogColor);
      set("mapsFogOpacity", s.fogOpacity);
      set("mapsTokenColor", s.tokenColor);
      set("mapsTokenSize", s.tokenSize);
      const toki = $("mapsTokIconDrawer");
      if (toki) toki.value = s.tokenIcon || "";
      const er = $("mapsEraser");
      if (er) er.checked = brushErasing;
      const tm = $("mapsTokMulti");
      if (tm) tm.checked = tokenMultiPlace;
      syncShapeSettingsForm();
      syncTextSizeRow();
    }

    function syncDrawerContext() {
      const key = activeToolKey();
      const drawer = $("mapsDrawer");
      const toolSec = $("mapsToolSettings");
      if (key) {
        drawerView = "tool";
        if (drawer) drawer.dataset.drawerView = "tool";
        if (toolSec) toolSec.dataset.activeTool = key;
        const hd = $("mapsDrawerToolHd");
        if (hd) hd.textContent = toolLabel(key);
        setDrawerOpen(true, "tool");
      } else if (drawer && drawer.dataset.drawerView === "tool") {
        if (toolSec) toolSec.dataset.activeTool = "";
        setDrawerOpen(false);
      }
      syncToolSettingsForm();
    }

    function setDrawerOpen(on, view) {
      const drawer = $("mapsDrawer");
      if (!drawer) return;
      if (view) {
        drawerView = view;
        drawer.dataset.drawerView = view;
      }
      drawer.classList.toggle("closed", !on);
      document.body.classList.toggle("maps-drawer-open", !!on);
      const dt = $("mapsDrawerToggle");
      const st = $("mapsSettingsToggle");
      const fab = $("mapsDrawerFab");
      const mapsOpen = on && drawer.dataset.drawerView === "maps";
      const settingsOpen = on && drawer.dataset.drawerView === "settings";
      if (dt) {
        dt.setAttribute("aria-expanded", mapsOpen ? "true" : "false");
        dt.setAttribute("aria-pressed", mapsOpen ? "true" : "false");
      }
      if (st) {
        st.setAttribute("aria-expanded", settingsOpen ? "true" : "false");
        st.setAttribute("aria-pressed", settingsOpen ? "true" : "false");
      }
      if (fab) fab.setAttribute("aria-expanded", on ? "true" : "false");
      clearTimeout(setDrawerOpen._rt);
      setDrawerOpen._rt = setTimeout(() => { if (active) resize(); }, on ? 300 : 50);
    }

    function openMapsTray() {
      const drawer = $("mapsDrawer");
      if (!drawer) return;
      if (!drawer.classList.contains("closed") && drawer.dataset.drawerView === "maps") {
        setDrawerOpen(false);
        return;
      }
      tool = "pan";
      measurePath = [];
      strokePts = null;
      shapeDraft = null;
      syncToolChrome();
      setDrawerOpen(true, "maps");
    }

    function openSettingsTray() {
      const drawer = $("mapsDrawer");
      if (!drawer) return;
      if (!drawer.classList.contains("closed") && drawer.dataset.drawerView === "settings") {
        setDrawerOpen(false);
        return;
      }
      tool = "pan";
      measurePath = [];
      strokePts = null;
      shapeDraft = null;
      syncToolChrome();
      const toolSec = $("mapsToolSettings");
      if (toolSec) toolSec.dataset.activeTool = "";
      setDrawerOpen(true, "settings");
    }

    function openDangerTray() {
      tool = "pan";
      syncToolChrome();
      setDrawerOpen(true, "danger");
    }

    function backToSettingsTray() {
      setDrawerOpen(true, "settings");
    }

    function applyTextPreset(name) {
      const p = TEXT_PRESETS[name];
      if (!p) return;
      const s = state.settings;
      s.textToolColor = p.color;
      s.textToolOutlineColor = p.outlineColor;
      s.textToolOutlineWidth = p.outlineWidth;
      s.textToolOutlineOpacity = p.outlineOpacity;
      syncToolSettingsForm();
      readToolSettingsLive();
    }

    function textDefaultsForNew() {
      const s = state.settings;
      readToolSettingsLive();
      const sizeKey = s.textToolSize || "medium";
      let fontSize = TEXT_SIZES[sizeKey];
      if (sizeKey === "custom") fontSize = s.textToolCustomPx || 20;
      return {
        fontSize: fontSize || TEXT_SIZES.medium,
        color: s.textToolColor || "#241f1c",
        outlineColor: s.textToolOutlineColor || "#f4f0e8",
        outlineWidth: s.textToolOutlineWidth ?? 3,
        outlineOpacity: s.textToolOutlineOpacity ?? 1,
      };
    }

    function startTextDrag(index, wx, wy) {
      const t = state.texts[index];
      if (!t) return false;
      selectKind("text", index);
      pushUndo();
      drag = { kind: "text", index, ox: wx - t.x, oy: wy - t.y };
      return true;
    }

    function startTokenDrag(index) {
      const t = state.tokens[index];
      if (!t) return false;
      selectKind("token", index);
      pushUndo();
      drag = { kind: "token", index, sx: t.x, sy: t.y };
      drawTokens();
      return true;
    }

    function openHitEditor(hitText, hitToken) {
      drag = null;
      pendingText = null;
      if (hitText >= 0) {
        selectKind("text", hitText);
        openTextEditor();
        return true;
      }
      if (hitToken >= 0) {
        openTokenEditor(hitToken);
        return true;
      }
      return false;
    }

    function applyViewTransform() {
      if (!layers || !layers.world) return;
      layers.world.position.set(state.view.panX, state.view.panY);
      layers.world.scale.set(state.view.zoomLevel);
    }

    async function ensurePixi(host) {
      if (app) {
        host.appendChild(app.canvas);
        resize();
        return;
      }
      const PIXI = window.PIXI;
      if (!PIXI || !PIXI.Application) {
        toast("Maps renderer failed to load (Pixi)");
        return;
      }
      app = new PIXI.Application();
      await app.init({
        background: "#2a2622", antialias: true, autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: host,
      });
      host.appendChild(app.canvas);
      app.canvas.style.touchAction = "none";
      layers = {
        world: new PIXI.Container(),
        map: new PIXI.Container(),
        gridFog: new PIXI.Container(),
        annot: new PIXI.Container(),
        tokens: new PIXI.Container(),
        draft: new PIXI.Container(),
      };
      layers.world.addChild(layers.map, layers.gridFog, layers.annot, layers.tokens, layers.draft);
      app.stage.addChild(layers.world);
      bindPointer(app.canvas);
      resize();
    }

    function resize() {
      if (!app) return;
      const host = $("mapsStage");
      if (!host) return;
      const w = host.clientWidth || 640, h = host.clientHeight || 480;
      app.renderer.resize(w, h);
      applyViewTransform();
    }

    async function loadMapTexture() {
      const PIXI = window.PIXI;
      layers.map.removeChildren();
      if (!blob || !PIXI) return;
      try {
        // Prefer ImageBitmap — Pixi Assets.load(blob:) fails with null texture in v8 IIFE.
        const bitmap = await createImageBitmap(blob);
        const tex = PIXI.Texture.from(bitmap);
        const spr = new PIXI.Sprite(tex);
        const scale = (state.settings.mapScale || 100) / 100;
        spr.scale.set(scale);
        layers.map.addChild(spr);
      } catch (err) {
        // Fallback: HTMLImageElement + object URL
        try {
          const url = URL.createObjectURL(blob);
          const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("image decode failed"));
            el.src = url;
          });
          URL.revokeObjectURL(url);
          const tex = PIXI.Texture.from(img);
          const spr = new PIXI.Sprite(tex);
          const scale = (state.settings.mapScale || 100) / 100;
          spr.scale.set(scale);
          layers.map.addChild(spr);
        } catch (err2) {
          toast("Could not load map image");
        }
      }
    }

    function drawGridFog() {
      const PIXI = window.PIXI;
      layers.gridFog.removeChildren();
      if (!grid || !PIXI) return;
      const g = new PIXI.Graphics();
      const fog = hexToRgb(state.settings.fogColor);
      const fogA = state.settings.fogOpacity;
      const gc = hexToRgb(state.settings.gridColor);
      const gt = state.settings.gridThickness;
      for (const h of grid.cells) {
        const pts = h.vertices;
        if (!h.revealed) {
          g.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
          g.closePath();
          g.fill({ color: fog, alpha: fogA });
        }
        g.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
        g.closePath();
        g.stroke({ width: gt, color: gc, alpha: 0.85 });
      }
      layers.gridFog.addChild(g);
    }

    function hexToRgb(hex) {
      let h = String(hex || "#000").replace("#", "");
      if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      return parseInt(h.slice(0, 6), 16) || 0;
    }

    function drawAnnotations() {
      const PIXI = window.PIXI;
      layers.annot.removeChildren();
      if (!PIXI) return;
      for (let si = 0; si < state.strokes.length; si++) {
        const s = state.strokes[si];
        if (s.points.length < 2) continue;
        const g = new PIXI.Graphics();
        g.moveTo(s.points[0][0], s.points[0][1]);
        for (let i = 1; i < s.points.length; i++) g.lineTo(s.points[i][0], s.points[i][1]);
        const sel = selectedStroke === si;
        g.stroke({ width: s.thickness + (sel ? 2 : 0), color: sel ? 0xf0d78c : hexToRgb(s.color), alpha: s.opacity });
        layers.annot.addChild(g);
      }
      for (let shi = 0; shi < state.shapes.length; shi++) {
        const sh = state.shapes[shi];
        const g = new PIXI.Graphics();
        const col = selectedShape === shi ? 0xf0d78c : hexToRgb(sh.color);
        const th = sh.thickness + (selectedShape === shi ? 2 : 0);
        if (sh.type === "rect") {
          const x = Math.min(sh.x1, sh.x2), y = Math.min(sh.y1, sh.y2);
          const w = Math.abs(sh.x2 - sh.x1), h = Math.abs(sh.y2 - sh.y1);
          g.rect(x, y, w, h);
          if (sh.fill) g.fill({ color: hexToRgb(sh.fill), alpha: sh.fillOpacity });
          g.stroke({ width: th, color: col, alpha: sh.opacity });
        } else if (sh.type === "circle") {
          const cx = (sh.x1 + sh.x2) / 2, cy = (sh.y1 + sh.y2) / 2;
          const rx = Math.abs(sh.x2 - sh.x1) / 2, ry = Math.abs(sh.y2 - sh.y1) / 2;
          g.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1));
          if (sh.fill) g.fill({ color: hexToRgb(sh.fill), alpha: sh.fillOpacity });
          g.stroke({ width: th, color: col, alpha: sh.opacity });
        } else if (sh.type === "line" || sh.type === "arrow") {
          g.moveTo(sh.x1, sh.y1); g.lineTo(sh.x2, sh.y2);
          g.stroke({ width: th, color: col, alpha: sh.opacity });
          if (sh.type === "arrow") {
            const ang = Math.atan2(sh.y2 - sh.y1, sh.x2 - sh.x1);
            const ah = 12 + sh.thickness;
            g.moveTo(sh.x2, sh.y2);
            g.lineTo(sh.x2 - ah * Math.cos(ang - 0.4), sh.y2 - ah * Math.sin(ang - 0.4));
            g.moveTo(sh.x2, sh.y2);
            g.lineTo(sh.x2 - ah * Math.cos(ang + 0.4), sh.y2 - ah * Math.sin(ang + 0.4));
            g.stroke({ width: th, color: col, alpha: sh.opacity });
          }
        }
        layers.annot.addChild(g);
      }
      for (let i = 0; i < state.texts.length; i++) {
        const t = state.texts[i];
        const b = textBounds(t);
        if (selectedText === i) {
          const sel = new PIXI.Graphics();
          sel.rect(b.x - 3, b.y - 3, b.w + 6, b.h + 6);
          sel.stroke({ width: 2, color: 0xf0d78c, alpha: 0.95 });
          layers.annot.addChild(sel);
        }
        const tx = new PIXI.Text({ text: t.text, style: textStyleFor(t) });
        tx.x = t.x; tx.y = t.y;
        layers.annot.addChild(tx);
      }
      for (let mi = 0; mi < state.measurements.length; mi++) {
        const m = state.measurements[mi];
        const g = new PIXI.Graphics();
        const col = selectedMeasurement === mi ? 0xf0d78c : hexToRgb(m.color || state.settings.measureColor);
        const lw = selectedMeasurement === mi ? 5 : 3;
        let first = true;
        for (const id of m.hexIds) {
          const h = grid && grid.byId.get(id);
          if (!h) continue;
          if (first) { g.moveTo(h.x, h.y); first = false; }
          else g.lineTo(h.x, h.y);
        }
        g.stroke({ width: lw, color: col, alpha: 0.95 });
        layers.annot.addChild(g);
      }
    }

    function createTokenGroup(token, index, hexSize, PIXI) {
      const sizeScale = TOKEN_SIZES[state.settings.tokenSize] || 1;
      const radius = hexSize * 0.4 * sizeScale;
      const g = new PIXI.Container();
      g.x = token.x; g.y = token.y;
      const circle = new PIXI.Graphics();
      circle.circle(0, 0, radius);
      circle.fill({ color: hexToRgb(token.color), alpha: 0.95 });
      circle.stroke({
        width: selectedToken === index ? 3 : 1.5,
        color: selectedToken === index ? 0xf0d78c : 0x241f1c,
        alpha: 1,
      });
      g.addChild(circle);
      const slug = normalizeTokenIcon(token.icon);
      if (slug && iconTextures.has(slug)) {
        const spr = new PIXI.Sprite(iconTextures.get(slug));
        const iconSize = radius * 1.1;
        spr.anchor.set(0.5);
        spr.width = iconSize;
        spr.height = iconSize;
        g.addChild(spr);
      }
      if (token.label) {
        const fontSize = Math.max(10, hexSize * 0.22 * sizeScale);
        const tx = new PIXI.Text({
          text: token.label.slice(0, 100),
          style: new PIXI.TextStyle({
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize,
            fill: "#ffffff",
            fontWeight: "600",
            stroke: { color: "#241f1c", width: Math.max(2, fontSize * 0.15) },
          }),
        });
        tx.anchor.set(0.5, 0);
        tx.y = hexSize * 0.5 * sizeScale;
        g.addChild(tx);
      }
      g.eventMode = "none";
      g.on("pointerover", () => {
        if (token.notes) showNotesTip(token.notes);
      });
      return g;
    }

    function drawTokens() {
      const PIXI = window.PIXI;
      layers.tokens.removeChildren();
      if (!PIXI) return;
      const sorted = state.tokens.map((t, i) => ({ t, i })).sort((a, b) => a.t.zIndex - b.t.zIndex);
      const hexSize = state.settings.hexSize;
      for (const { t, i } of sorted) {
        layers.tokens.addChild(createTokenGroup(t, i, hexSize, PIXI));
      }
    }

    function showNotesTip(notes) {
      const tip = $("mapsNotesTip");
      if (!tip) return;
      tip.textContent = notes;
      tip.hidden = !notes;
    }

    function renderDraft() {
      const PIXI = window.PIXI;
      layers.draft.removeChildren();
      if (!PIXI) return;
      if (strokePts && strokePts.length > 1) {
        const g = new PIXI.Graphics();
        g.moveTo(strokePts[0][0], strokePts[0][1]);
        for (let i = 1; i < strokePts.length; i++) g.lineTo(strokePts[i][0], strokePts[i][1]);
        g.stroke({ width: state.settings.drawThickness, color: hexToRgb(state.settings.drawColor), alpha: state.settings.drawOpacity });
        layers.draft.addChild(g);
      }
      if (measurePath.length) {
        const g = new PIXI.Graphics();
        const col = hexToRgb(state.settings.measureColor);
        let first = true;
        for (const id of measurePath) {
          const h = grid.byId.get(id);
          if (!h) continue;
          if (first) { g.moveTo(h.x, h.y); first = false; }
          else g.lineTo(h.x, h.y);
          g.circle(h.x, h.y, 4); g.fill({ color: col });
        }
        g.stroke({ width: 2, color: col, alpha: 0.8 });
        layers.draft.addChild(g);
      }
    }

    function renderAll() {
      applyViewTransform();
      drawGridFog();
      drawAnnotations();
      drawTokens();
      renderDraft();
      syncToolChrome();
      updateSettingsForm();
    }

    async function openMap(id, _retry) {
      const rec = await idb.get(id);
      if (!rec) {
        if (_retry) { toast("Map data missing from local storage"); return; }
        await ensureDefaultMap({ open: false });
        const next = metas().find((m) => m.id === id) || metas()[0];
        if (!next) { toast("Map data missing from local storage"); return; }
        return openMap(next.id, true);
      }
      openMapId = id;
      blob = rec.blob || null;
      const corruptZoom = rec.state && rec.state.view && rec.state.view.zoomLevel != null
        && num(rec.state.view.zoomLevel, 1) <= 0.11;
      state = vState(rec.state);
      nextZ = 1;
      for (const t of state.tokens) if (t.zIndex >= nextZ) nextZ = t.zIndex + 1;
      undoStack = []; redoStack = [];
      rebuildGrid();
      $("mapsEmpty").hidden = true;
      $("mapsEditor").hidden = false;
      const host = $("mapsStage");
      await ensurePixi(host);
      await loadTokenIcons();
      await loadMapTexture();
      renderAll();
      resize();
      rememberLast(id);
      renderList();
      if (corruptZoom) scheduleSave();
    }

    function closeEditor() {
      openMapId = null;
      blob = null;
      $("mapsEmpty").hidden = false;
      $("mapsEditor").hidden = true;
      if (layers) {
        layers.map.removeChildren();
        layers.gridFog.removeChildren();
        layers.annot.removeChildren();
        layers.tokens.removeChildren();
        layers.draft.removeChildren();
      }
    }

    function rememberLast(id) {
      try {
        const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") || {};
        const cid = window.CAMPAIGN && CAMPAIGN.state && CAMPAIGN.state.activeCampaignId;
        if (cid) raw[cid] = id;
        localStorage.setItem(LAST_KEY, JSON.stringify(raw));
      } catch (_) {}
    }

    function renderList() {
      const nav = $("mapsList");
      if (!nav) return;
      const list = metas();
      nav.innerHTML = "";
      for (const m of list) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "maps-list-item" + (m.id === openMapId ? " on" : "");
        btn.textContent = m.name || "Map";
        btn.title = m.name || "Map";
        btn.onclick = () => openMap(m.id);
        nav.appendChild(btn);
      }
      const hint = $("mapsCampHint");
      const c = window.CAMPAIGN && CAMPAIGN.active && CAMPAIGN.active();
      if (hint) {
        hint.hidden = !c;
        if (c) hint.textContent = "Maps for “" + (c.title || "Campaign") + "”";
      }
    }

    async function createMapFromFile(file) {
      if (!file || !/^image\//.test(file.type)) {
        toast("Choose an image file");
        return;
      }
      if (metas().length >= MAX_MAPS_META) {
        toast("Map limit reached (" + MAX_MAPS_META + ")");
        return;
      }
      const id = uid();
      const name = (file.name || "Map").replace(/\.[^.]+$/, "").slice(0, 80) || "Map";
      const st = vState(null);
      try {
        await idb.put({ id, name, blob: file, state: snapshotState(st), updated: Date.now() });
      } catch (e) {
        if (String(e && e.message) === "QUOTA_EXCEEDED") toast("Storage full — free space and try again");
        else toast("Could not create map");
        return;
      }
      const list = metas().concat([{ id, name, updatedAt: Date.now() }]);
      persistMetas(list);
      renderList();
      await openMap(id);
      toast("Map created");
    }

    let starterPackPromise = null;

    async function buildProceduralStarterPack() {
      const W = 1280, H = 960;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      const grad = g.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#e8dcc8");
      grad.addColorStop(1, "#d4c4a8");
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.fillStyle = "rgba(34, 72, 42, 0.55)";
      g.beginPath();
      g.ellipse(280, 260, 240, 200, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(34, 72, 42, 0.5)";
      g.beginPath();
      g.ellipse(920, 780, 260, 160, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(196, 178, 132, 0.45)";
      g.beginPath();
      g.ellipse(640, 480, 360, 280, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(52, 98, 128, 0.9)";
      g.lineWidth = 36;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(180, 720);
      g.lineTo(520, 560);
      g.lineTo(900, 420);
      g.lineTo(1080, 340);
      g.stroke();
      g.strokeStyle = "rgba(154, 132, 96, 0.85)";
      g.lineWidth = 22;
      g.beginPath();
      g.moveTo(220, 260);
      g.lineTo(620, 380);
      g.lineTo(1020, 460);
      g.stroke();
      const dataUrl = c.toDataURL("image/png");
      const revealed = {};
      for (let col = 8; col < 13; col++) {
        for (let row = 5; row < 10; row++) revealed[col + "-" + row] = true;
      }
      return {
        name: STARTER_MAP_NAME,
        mapData: dataUrl,
        mapImageData: dataUrl,
        state: {
          settings: {
            hexSize: 40, offsetX: 80, offsetY: 48, columnCount: 20, rowCount: 15,
            orientation: "pointy", mapScale: 100,
            fogColor: "#1a3d24", fogOpacity: 0.88, gridColor: "#f4f0e8", gridThickness: 1.25,
            tokenColor: "#8b3a2a", tokenIcon: "home", tokenSize: "medium",
            hexDistanceValue: 6, hexDistanceUnit: "miles",
          },
          view: { zoomLevel: 1, panX: 0, panY: 0 },
          revealedHexes: revealed,
          tokens: [{
            x: 807.5, y: 468, label: "Camp", icon: "⌂", color: "#8b3a2a",
            notes: "Party start — reveal hexes and place tokens from here.", zIndex: 1,
          }],
          strokes: [], shapes: [], texts: [], measurements: [],
        },
      };
    }

    function loadStarterPack() {
      if (!starterPackPromise) {
        starterPackPromise = fetch(STARTER_MAP_URL)
          .then((r) => { if (!r.ok) throw new Error("missing"); return r.json(); })
          .catch(() => buildProceduralStarterPack());
      }
      return starterPackPromise;
    }

    async function installMapPack(data, opts) {
      const open = !opts || opts.open !== false;
      if (metas().length >= MAX_MAPS_META) return null;
      const img = data.mapImageData || data.mapData;
      if (!img || typeof img !== "string" || !img.startsWith("data:image")) return null;
      if (img.length > MAX_IMAGE_B64) return null;
      const bin = await (await fetch(img)).blob();
      const name = vStr(data.name, 80, STARTER_MAP_NAME);
      const id = uid();
      const st = vState(data.state || data);
      try {
        await idb.put({ id, name, blob: bin, state: snapshotState(st), updated: Date.now() });
      } catch (e) {
        if (String(e && e.message) === "QUOTA_EXCEEDED") toast("Storage full — free space and try again");
        return null;
      }
      persistMetas(metas().concat([{ id, name, updatedAt: Date.now() }]));
      renderList();
      if (open) await openMap(id);
      return id;
    }

    async function ensureDefaultMap(opts) {
      if (!window.CAMPAIGN || !CAMPAIGN.active || !CAMPAIGN.active()) return null;
      if (metas().length > 0) return null;
      const data = await loadStarterPack();
      return installMapPack(data, { open: opts && opts.open === true });
    }

    async function openPreferredMap() {
      await ensureDefaultMap({ open: false });
      const list = metas();
      if (!list.length) return;
      let id = list[0].id;
      try {
        const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "{}") || {};
        const cid = window.CAMPAIGN && CAMPAIGN.state && CAMPAIGN.state.activeCampaignId;
        const last = cid && raw[cid];
        if (last && list.some((m) => m.id === last)) id = last;
      } catch (_) {}
      await openMap(id);
    }

    function renameOpen() {
      if (!openMapId) return;
      const input = $("mapsRenameInput");
      const meta = metas().find((m) => m.id === openMapId);
      if (!input || !meta) return;
      input.hidden = false;
      input.value = meta.name;
      input.focus();
      input.select();
    }

    async function commitRename() {
      const input = $("mapsRenameInput");
      if (!input || !openMapId) return;
      const name = (input.value || "").trim().slice(0, 80) || "Map";
      input.hidden = true;
      const list = metas().map((m) => m.id === openMapId ? { ...m, name, updatedAt: Date.now() } : m);
      persistMetas(list);
      const rec = await idb.get(openMapId);
      if (rec) {
        rec.name = name;
        rec.updated = Date.now();
        await idb.put(rec);
      }
      renderList();
    }

    function deleteOpen(btn) {
      if (!openMapId) return;
      const meta = metas().find((m) => m.id === openMapId);
      const go = async () => {
        const id = openMapId;
        await idb.del(id);
        persistMetas(metas().filter((m) => m.id !== id));
        closeEditor();
        renderList();
        const seeded = await ensureDefaultMap({ open: true });
        toast(seeded ? "Map deleted — starter map loaded" : "Map deleted");
      };
      if (window.TRK && typeof TRK.confirmSwap === "function")
        TRK.confirmSwap(btn, "Delete “" + ((meta && meta.name) || "Map") + "”?", go);
      else go();
    }

    function setTool(t) {
      tool = t;
      measurePath = [];
      strokePts = null;
      shapeDraft = null;
      syncToolChrome();
      syncDrawerContext();
      renderDraft();
    }

    function syncToolChrome() {
      document.querySelectorAll("#mapsTools [data-tool]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === tool));
      });
      const sg = $("mapsShapeGroup");
      if (sg) sg.hidden = tool !== "shape";
      document.querySelectorAll("#mapsShapeGroup [data-shape]").forEach((b) => {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-shape") === shapeKind));
      });
      const sk = $("mapsShapeKind");
      if (sk) { sk.hidden = tool !== "shape"; sk.value = shapeKind; }
    }

    function updateSettingsForm() {
      const s = state.settings;
      const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = v; };
      set("mapsHexSize", s.hexSize);
      set("mapsOffsetX", s.offsetX);
      set("mapsOffsetY", s.offsetY);
      set("mapsCols", s.columnCount);
      set("mapsRows", s.rowCount);
      set("mapsGridKind", s.gridKind);
      set("mapsOrient", s.orientation);
      set("mapsScale", s.mapScale);
      syncGridKindUI();
      set("mapsFogColor", s.fogColor);
      set("mapsFogOpacity", s.fogOpacity);
      set("mapsGridColor", s.gridColor);
      set("mapsGridThick", s.gridThickness);
      syncToolSettingsForm();
    }

    function readSettingsFromForm() {
      pushUndo();
      const s = state.settings;
      s.hexSize = clamp(num($("mapsHexSize").value, s.hexSize), 8, 400);
      s.offsetX = num($("mapsOffsetX").value, 0);
      s.offsetY = num($("mapsOffsetY").value, 0);
      s.columnCount = clamp(Math.round(num($("mapsCols").value, s.columnCount)), 1, 200);
      s.rowCount = clamp(Math.round(num($("mapsRows").value, s.rowCount)), 1, 200);
      const gk = $("mapsGridKind");
      s.gridKind = gk && gk.value === "square" ? "square" : "hex";
      s.orientation = $("mapsOrient").value === "flat" ? "flat" : "pointy";
      s.mapScale = clamp(num($("mapsScale").value, 100), 10, 400);
      s.gridColor = $("mapsGridColor").value || s.gridColor;
      s.gridThickness = clamp(num($("mapsGridThick").value, 1), 0.5, 8);
      rebuildGrid();
      loadMapTexture().then(() => renderAll());
      scheduleSave();
    }

    function syncGridKindUI() {
      const sq = state.settings.gridKind === "square";
      const row = $("mapsOrientRow");
      if (row) row.hidden = sq;
      const lbl = $("mapsHexSizeLabel");
      if (lbl) lbl.textContent = sq ? "Cell size" : "Hex size";
    }

    function paintCell(wx, wy, reveal) {
      const h = findCellAt(wx, wy, grid);
      if (!h) return false;
      const was = !!state.revealedHexes[h.id];
      if (reveal && !was) { state.revealedHexes[h.id] = true; h.revealed = true; return true; }
      if (!reveal && was) { delete state.revealedHexes[h.id]; h.revealed = false; return true; }
      return false;
    }

    function paintHex(wx, wy, reveal) { return paintCell(wx, wy, reveal); }

    function bindPointer(canvas) {
      canvas.addEventListener("wheel", (e) => {
        if (!openMapId) return;
        e.preventDefault();
        const before = worldFromEvent(e);
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        state.view.zoomLevel = clamp(state.view.zoomLevel * factor, 0.15, 6);
        const rect = canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (app.screen.width / rect.width);
        const sy = (e.clientY - rect.top) * (app.screen.height / rect.height);
        state.view.panX = sx - before.x * state.view.zoomLevel;
        state.view.panY = sy - before.y * state.view.zoomLevel;
        applyViewTransform();
        scheduleSave();
      }, { passive: false });

      canvas.addEventListener("pointerdown", (e) => {
        if (!openMapId) return;
        const w = worldFromEvent(e);
        const hitText = pickTextAt(w.x, w.y);
        const hitToken = pickTokenAt(w.x, w.y);

        if (tryEditOnDblHit(hitText, hitToken)) return;
        if (e.detail >= 2 && openHitEditor(hitText, hitToken)) return;

        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* synthetic / unsupported */ }

        if (tool === "pan") {
          const hit = pickPanTarget(w.x, w.y);
          if (hit) {
            if (hit.kind === "text" && startTextDrag(hit.index, w.x, w.y)) return;
            if (hit.kind === "token" && startTokenDrag(hit.index)) return;
            selectKind(hit.kind, hit.index);
            return;
          }
          clearSelection();
          drawAnnotations();
          drawTokens();
          drag = { kind: "pan", ox: e.clientX, oy: e.clientY, px: state.view.panX, py: state.view.panY };
        } else if (tool === "reveal" || tool === "hide") {
          pushUndo();
          paintHex(w.x, w.y, tool === "reveal");
          drag = { kind: "fog", reveal: tool === "reveal" };
          drawGridFog();
          scheduleSave();
        } else if (tool === "token") {
          if (hitToken >= 0 && startTokenDrag(hitToken)) return;
          if (state.tokens.length >= MAX_TOKENS) { toast("Token limit reached"); return; }
          pushUndo();
          let tx = w.x, ty = w.y;
          if (!e.altKey) {
            const h = findCellAt(w.x, w.y, grid);
            if (h) { tx = h.x; ty = h.y; }
          }
          readToolSettingsLive();
          state.tokens.push({
            x: tx, y: ty, color: state.settings.tokenColor,
            label: "", icon: normalizeTokenIcon(state.settings.tokenIcon || ""), notes: "", zIndex: nextZ++,
          });
          selectKind("token", state.tokens.length - 1);
          scheduleSave();
          if (!tokenMultiPlace) openTokenEditor(selectedToken);
        } else if (tool === "measure") {
          const h = findCellAt(w.x, w.y, grid);
          if (!h) return;
          if (!measurePath.length) measurePath = [h.id];
          else {
            const last = grid.byId.get(measurePath[measurePath.length - 1]);
            const neigh = cellNeighbors(last, grid.byId, state.settings).some((n) => n.id === h.id);
            if (neigh && !measurePath.includes(h.id)) measurePath.push(h.id);
            else if (measurePath[measurePath.length - 1] === h.id && measurePath.length >= 2) {
              pushUndo();
              readToolSettingsLive();
              state.measurements.push({ hexIds: measurePath.slice(), color: state.settings.measureColor, createdAt: Date.now() });
              if (state.measurements.length > MAX_ANNOT) state.measurements.shift();
              measurePath = [];
              scheduleSave();
            }
          }
          renderAll();
        } else if (tool === "text") {
          if (hitText >= 0 && startTextDrag(hitText, w.x, w.y)) return;
          pendingText = { x: w.x, y: w.y };
          selectedText = -1;
          openTextEditor();
        } else if (tool === "brush") {
          readToolSettingsLive();
          if (!brushErasing) pushUndo();
          strokePts = [[w.x, w.y]];
          drag = { kind: "brush" };
        } else if (tool === "shape") {
          pushUndo();
          readToolSettingsLive();
          const p = shapeSettingsPrefix();
          shapeDraft = {
            type: shapeKind === "ellipse" ? "circle" : shapeKind,
            x1: w.x, y1: w.y, x2: w.x, y2: w.y,
            color: state.settings[p + "Color"] || state.settings.drawColor,
            thickness: state.settings[p + "Thickness"] || 3,
            opacity: state.settings[p + "Opacity"] ?? 1,
            fill: (p === "rect" || p === "ellipse") && state.settings[p + "Fill"] ? state.settings[p + "Fill"] : null,
            fillOpacity: state.settings[p + "FillOpacity"] ?? 0.5,
          };
          drag = { kind: "shape" };
        }
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const w = worldFromEvent(e);
        if (drag.kind === "pan") {
          state.view.panX = drag.px + (e.clientX - drag.ox);
          state.view.panY = drag.py + (e.clientY - drag.oy);
          applyViewTransform();
        } else if (drag.kind === "fog") {
          if (paintHex(w.x, w.y, drag.reveal)) { drawGridFog(); scheduleSave(); }
        } else if (drag.kind === "token" && drag.index >= 0) {
          const z = state.view.zoomLevel;
          state.tokens[drag.index].x = drag.sx + (e.globalX != null ? 0 : 0);
          // use client delta via world
          const rect = canvas.getBoundingClientRect();
          const sx = (e.clientX - rect.left) * (app.screen.width / rect.width);
          const sy = (e.clientY - rect.top) * (app.screen.height / rect.height);
          // recompute from original screen - store screen origin
          if (drag.sox == null) {
            drag.sox = (drag.sx * z) + state.view.panX;
            drag.soy = (drag.sy * z) + state.view.panY;
          }
          state.tokens[drag.index].x = (sx - state.view.panX) / z;
          state.tokens[drag.index].y = (sy - state.view.panY) / z;
          drawTokens();
          scheduleSave();
        } else if (drag.kind === "text" && drag.index >= 0) {
          state.texts[drag.index].x = w.x - drag.ox;
          state.texts[drag.index].y = w.y - drag.oy;
          drawAnnotations();
        } else if (drag.kind === "brush" && strokePts) {
          strokePts.push([w.x, w.y]);
          renderDraft();
        } else if (drag.kind === "shape" && shapeDraft) {
          const mod = applyShapeModifiers(shapeDraft.x1, shapeDraft.y1, w.x, w.y, shapeDraft.type, e.shiftKey, e.altKey);
          shapeDraft.x2 = mod.x2; shapeDraft.y2 = mod.y2;
          layers.draft.removeChildren();
          // temp draw
          const PIXI = window.PIXI;
          const g = new PIXI.Graphics();
          const sh = shapeDraft;
          const col = hexToRgb(sh.color);
          if (sh.type === "rect") {
            g.rect(Math.min(sh.x1, sh.x2), Math.min(sh.y1, sh.y2), Math.abs(sh.x2 - sh.x1), Math.abs(sh.y2 - sh.y1));
            g.stroke({ width: 2, color: col, alpha: 0.9 });
          } else if (sh.type === "circle") {
            g.ellipse((sh.x1 + sh.x2) / 2, (sh.y1 + sh.y2) / 2, Math.max(1, Math.abs(sh.x2 - sh.x1) / 2), Math.max(1, Math.abs(sh.y2 - sh.y1) / 2));
            g.stroke({ width: 2, color: col, alpha: 0.9 });
          } else {
            g.moveTo(sh.x1, sh.y1); g.lineTo(sh.x2, sh.y2);
            g.stroke({ width: 2, color: col, alpha: 0.9 });
          }
          layers.draft.addChild(g);
        }
      });

      canvas.addEventListener("pointerup", (e) => {
        if (drag && drag.kind === "brush" && strokePts && strokePts.length > 1) {
          readToolSettingsLive();
          if (brushErasing) {
            pushUndo();
            eraseAlongPath(strokePts);
          } else {
            state.strokes.push({
              points: strokePts, color: state.settings.drawColor,
              thickness: state.settings.drawThickness, opacity: state.settings.drawOpacity,
            });
            if (state.strokes.length > MAX_ANNOT) state.strokes.shift();
          }
          strokePts = null;
          scheduleSave();
          renderAll();
        }
        if (drag && drag.kind === "shape" && shapeDraft) {
          state.shapes.push(shapeDraft);
          if (state.shapes.length > MAX_ANNOT) state.shapes.shift();
          shapeDraft = null;
          scheduleSave();
          renderAll();
        }
        if (drag && (drag.kind === "pan" || drag.kind === "token" || drag.kind === "text")) {
          scheduleSave();
        }
        drag = null;
      });

      // pinch
      canvas.addEventListener("touchstart", (e) => {
        if (e.touches.length === 2) {
          const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          pinching = { d, z: state.view.zoomLevel };
        }
      }, { passive: true });
      canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2 && pinching) {
          const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          state.view.zoomLevel = clamp(pinching.z * (d / pinching.d), 0.15, 6);
          applyViewTransform();
        }
      }, { passive: true });
      canvas.addEventListener("touchend", () => { pinching = null; });

      canvas.addEventListener("dblclick", (e) => {
        if (!openMapId) return;
        e.preventDefault();
        const w = worldFromEvent(e);
        const hitText = pickTextAt(w.x, w.y);
        const hitToken = pickTokenAt(w.x, w.y);
        if (openHitEditor(hitText, hitToken)) return;
        const hitMeas = pickMeasurementAt(w.x, w.y);
        if (hitMeas >= 0) { selectKind("measurement", hitMeas); openMeasurementEditor(hitMeas); return; }
        const hitShape = pickShapeAt(w.x, w.y);
        if (hitShape >= 0) { selectKind("shape", hitShape); openShapeEditor(hitShape); return; }
        const hitStroke = pickStrokeAt(w.x, w.y);
        if (hitStroke >= 0) { selectKind("stroke", hitStroke); openStrokeEditor(hitStroke); return; }
      });
    }

    function openTokenEditor(idx) {
      const t = state.tokens[idx];
      if (!t) return;
      selectKind("token", idx);
      const ov = $("mapsTokenOvl");
      if (!ov) return;
      $("mapsTokLabel").value = t.label;
      $("mapsTokNotes").value = t.notes;
      $("mapsTokColor").value = t.color;
      $("mapsTokIcon").value = t.icon;
      const del = $("mapsTokDelete");
      if (del) del.hidden = false;
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
    }
    function closeTokenEditor(save) {
      const ov = $("mapsTokenOvl");
      if (!ov) return;
      if (save && selectedToken >= 0 && state.tokens[selectedToken]) {
        const t = state.tokens[selectedToken];
        t.label = ($("mapsTokLabel").value || "").slice(0, 100);
        t.notes = ($("mapsTokNotes").value || "").slice(0, 2000);
        t.color = $("mapsTokColor").value || t.color;
        t.icon = normalizeTokenIcon($("mapsTokIcon").value || "");
        scheduleSave();
        drawTokens();
      }
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }

    function deleteTokenFromModal() {
      if (selectedToken < 0) return;
      pushUndo();
      state.tokens.splice(selectedToken, 1);
      clearSelection();
      closeTokenEditor(false);
      renderAll();
      scheduleSave();
      toast("Token deleted");
    }

    function openTextEditor() {
      const ov = $("mapsTextOvl");
      const input = $("mapsTextInput");
      if (!ov || !input) return;
      const editing = selectedText >= 0 && state.texts[selectedText];
      input.value = editing ? state.texts[selectedText].text : "";
      const del = $("mapsTextDelete");
      const saveBtn = $("mapsTextSave");
      if (del) del.hidden = !editing;
      if (saveBtn) saveBtn.textContent = editing ? "Save" : "Add";
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
      input.focus();
    }

    function closeTextEditor(save) {
      const ov = $("mapsTextOvl");
      const input = $("mapsTextInput");
      if (!ov) return;
      const text = input ? (input.value || "").trim().slice(0, 500) : "";
      if (save && text) {
        readToolSettingsLive();
        const defs = textDefaultsForNew();
        if (selectedText >= 0 && state.texts[selectedText]) {
          state.texts[selectedText].text = text;
        } else if (pendingText) {
          pushUndo();
          state.texts.push({
            text, x: pendingText.x, y: pendingText.y,
            fontSize: defs.fontSize, color: defs.color,
            outlineColor: defs.outlineColor, outlineWidth: defs.outlineWidth,
            outlineOpacity: defs.outlineOpacity,
          });
          if (state.texts.length > MAX_ANNOT) state.texts.shift();
          selectKind("text", state.texts.length - 1);
        }
        scheduleSave();
        drawAnnotations();
      }
      pendingText = null;
      if (!save) selectedText = -1;
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }

    function deleteTextFromModal() {
      if (selectedText < 0) return;
      pushUndo();
      state.texts.splice(selectedText, 1);
      clearSelection();
      closeTextEditor(false);
      renderAll();
      scheduleSave();
      toast("Text deleted");
    }

    function openStrokeEditor(idx) {
      const s = state.strokes[idx];
      if (!s) return;
      selectKind("stroke", idx);
      const ov = $("mapsStrokeOvl");
      if (!ov) return;
      $("mapsStrokeColor").value = s.color || state.settings.drawColor;
      $("mapsStrokeThick").value = s.thickness || 3;
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
    }
    function closeStrokeEditor(save) {
      const ov = $("mapsStrokeOvl");
      if (!ov) return;
      if (save && selectedStroke >= 0 && state.strokes[selectedStroke]) {
        const s = state.strokes[selectedStroke];
        s.color = $("mapsStrokeColor").value || s.color;
        s.thickness = clamp(num($("mapsStrokeThick").value, s.thickness), 1, 40);
        scheduleSave();
        drawAnnotations();
      }
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }
    function deleteStrokeFromModal() {
      if (selectedStroke < 0) return;
      pushUndo();
      state.strokes.splice(selectedStroke, 1);
      clearSelection();
      closeStrokeEditor(false);
      renderAll();
      scheduleSave();
      toast("Stroke deleted");
    }

    function openShapeEditor(idx) {
      const sh = state.shapes[idx];
      if (!sh) return;
      selectKind("shape", idx);
      const ov = $("mapsShapeOvl");
      if (!ov) return;
      $("mapsShapeEditColor").value = sh.color || state.settings.drawColor;
      $("mapsShapeEditThick").value = sh.thickness || 3;
      $("mapsShapeEditOpacity").value = sh.opacity ?? 1;
      const fillOn = $("mapsShapeEditFillOn");
      if (fillOn) fillOn.checked = !!sh.fill;
      $("mapsShapeEditFillColor").value = sh.fill || sh.color || "#ff4444";
      $("mapsShapeEditFillOpacity").value = sh.fillOpacity ?? 0.5;
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
    }
    function closeShapeEditor(save) {
      const ov = $("mapsShapeOvl");
      if (!ov) return;
      if (save && selectedShape >= 0 && state.shapes[selectedShape]) {
        const sh = state.shapes[selectedShape];
        sh.color = $("mapsShapeEditColor").value || sh.color;
        sh.thickness = clamp(num($("mapsShapeEditThick").value, sh.thickness), 1, 40);
        sh.opacity = clamp(num($("mapsShapeEditOpacity").value, sh.opacity), 0, 1);
        const fillOn = $("mapsShapeEditFillOn");
        if (fillOn && fillOn.checked) sh.fill = $("mapsShapeEditFillColor").value || sh.fill;
        else sh.fill = null;
        sh.fillOpacity = clamp(num($("mapsShapeEditFillOpacity").value, sh.fillOpacity), 0, 1);
        scheduleSave();
        drawAnnotations();
      }
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }
    function deleteShapeFromModal() {
      if (selectedShape < 0) return;
      pushUndo();
      state.shapes.splice(selectedShape, 1);
      clearSelection();
      closeShapeEditor(false);
      renderAll();
      scheduleSave();
      toast("Shape deleted");
    }

    function openMeasurementEditor(idx) {
      const m = state.measurements[idx];
      if (!m) return;
      selectKind("measurement", idx);
      const ov = $("mapsMeasOvl");
      if (!ov) return;
      $("mapsMeasEditColor").value = m.color || state.settings.measureColor;
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
    }
    function closeMeasurementEditor(save) {
      const ov = $("mapsMeasOvl");
      if (!ov) return;
      if (save && selectedMeasurement >= 0 && state.measurements[selectedMeasurement]) {
        state.measurements[selectedMeasurement].color = $("mapsMeasEditColor").value
          || state.measurements[selectedMeasurement].color;
        scheduleSave();
        drawAnnotations();
      }
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }
    function deleteMeasurementFromModal() {
      if (selectedMeasurement < 0) return;
      pushUndo();
      state.measurements.splice(selectedMeasurement, 1);
      clearSelection();
      closeMeasurementEditor(false);
      renderAll();
      scheduleSave();
      toast("Measurement deleted");
    }

    function resetFog() {
      const go = () => {
        pushUndo();
        state.revealedHexes = {};
        rebuildGrid();
        renderAll();
        scheduleSave();
      };
      if (window.TRK && TRK.confirmSwap) TRK.confirmSwap($("mapsResetFog"), "Reset all fog?", go);
      else go();
    }
    function clearTokens() {
      const go = () => {
        pushUndo();
        state.tokens = [];
        renderAll();
        scheduleSave();
      };
      if (window.TRK && TRK.confirmSwap) TRK.confirmSwap($("mapsClearTokens"), "Clear all tokens?", go);
      else go();
    }
    function clearMeasurements() {
      const go = () => {
        pushUndo();
        state.measurements = [];
        measurePath = [];
        renderAll();
        scheduleSave();
      };
      if (window.TRK && TRK.confirmSwap) TRK.confirmSwap($("mapsClearMeas"), "Clear all measurements?", go);
      else go();
    }
    function clearAnnot() {
      const go = () => {
        pushUndo();
        state.strokes = []; state.shapes = []; state.texts = [];
        renderAll();
        scheduleSave();
      };
      if (window.TRK && TRK.confirmSwap) TRK.confirmSwap($("mapsClearAnnot"), "Clear strokes, shapes, and text?", go);
      else go();
    }

    async function exportMapFile() {
      if (!openMapId || !blob) { toast("Open a map first"); return; }
      const meta = metas().find((m) => m.id === openMapId);
      const reader = new FileReader();
      const dataUrl = await new Promise((res, rej) => {
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      if (String(dataUrl).length > MAX_IMAGE_B64) {
        toast("Image too large to export as JSON");
        return;
      }
      const payload = {
        name: (meta && meta.name) || "Map",
        mapData: dataUrl,
        mapImageData: dataUrl,
        state: snapshotState(state),
        version: "1.0",
        exportedAt: new Date().toISOString(),
      };
      const blobOut = new Blob([JSON.stringify(payload)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blobOut);
      a.download = ((meta && meta.name) || "map").replace(/[^\w\-]+/g, "_") + ".hexplora";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Map exported");
    }

    async function importMapFile(file) {
      if (!file) return;
      let text = await file.text();
      if (text.length > MAX_IMAGE_B64 + 2e6) { toast("Import file too large"); return; }
      let data;
      try { data = JSON.parse(text); }
      catch (_) { toast("Invalid map file"); return; }
      // state-only
      if (data && data.version === 3 && data.settings && !data.mapData && !data.mapImageData) {
        if (!openMapId) { toast("Open a map to apply state-only import"); return; }
        pushUndo();
        state = vState(data);
        rebuildGrid();
        renderAll();
        scheduleSave();
        toast("State imported");
        return;
      }
      const img = data.mapImageData || data.mapData;
      if (!img || typeof img !== "string" || !img.startsWith("data:image")) {
        toast("Map file missing image");
        return;
      }
      if (img.length > MAX_IMAGE_B64) { toast("Image exceeds size limit"); return; }
      const id = await installMapPack(data, { open: true });
      if (id) toast("Map imported");
      else toast("Import failed");
    }

    async function screenshot() {
      if (!app || !openMapId) return;
      const url = await app.renderer.extract.base64(app.stage);
      const a = document.createElement("a");
      a.href = url;
      a.download = "map-screenshot.png";
      a.click();
    }

    function duplicateSelection() {
      if (selectedToken < 0) return false;
      if (state.tokens.length >= MAX_TOKENS) { toast("Token limit reached"); return true; }
      const src = state.tokens[selectedToken];
      if (!src) return false;
      pushUndo();
      state.tokens.push({
        x: src.x + 12, y: src.y + 12,
        color: src.color, label: src.label, icon: src.icon, notes: src.notes,
        zIndex: nextZ++,
      });
      selectKind("token", state.tokens.length - 1);
      scheduleSave();
      return true;
    }

    function openShortcutHelp() {
      const ov = $("mapsShortcutOvl");
      if (!ov) return;
      ov.hidden = false;
      if (typeof setAppInert === "function") setAppInert(true);
    }

    function closeShortcutHelp() {
      const ov = $("mapsShortcutOvl");
      if (!ov) return;
      ov.hidden = true;
      if (typeof setAppInert === "function") setAppInert(false);
    }

    function populateTokenIconSelects() {
      const m = window.MAPS_TOKEN_ICON_MANIFEST;
      if (!m) return;
      for (const id of ["mapsTokIconDrawer", "mapsTokIcon"]) {
        const sel = $(id);
        if (!sel) continue;
        const cur = sel.value;
        sel.innerHTML = "";
        for (const entry of m) {
          const opt = document.createElement("option");
          opt.value = entry.id;
          opt.textContent = entry.label;
          sel.appendChild(opt);
        }
        if ([...sel.options].some((o) => o.value === cur)) sel.value = cur;
        else sel.value = "";
      }
    }

    function onKey(e) {
      if (!active || !openMapId) return;
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && e.shiftKey && (e.ctrlKey || e.metaKey))) {
        e.preventDefault(); redo();
      }       else if (e.key === "Escape") {
        const shortcutOv = $("mapsShortcutOvl");
        if (shortcutOv && !shortcutOv.hidden) { closeShortcutHelp(); return; }
        if (measurePath.length) { measurePath = []; renderAll(); return; }
        setTool("pan");
        closeTokenEditor(false);
        closeTextEditor(false);
        closeStrokeEditor(false);
        closeShapeEditor(false);
        closeMeasurementEditor(false);
      }
      else if (tool === "measure" && measurePath.length && e.key === "Backspace" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        measurePath.pop();
        renderAll();
      }
      else if (e.key === "Delete" || e.key === "Backspace") {
        if (deleteSelection()) e.preventDefault();
      }       else if (e.key === "r") setTool("reveal");
      else if (e.key === "h") setTool("hide");
      else if (e.key === "t") setTool("token");
      else if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const ov = $("mapsShortcutOvl");
        if (ov && !ov.hidden) closeShortcutHelp();
        else openShortcutHelp();
      }
      else if ((e.key === "d" || e.key === "D") && (e.ctrlKey || e.metaKey)) {
        if (duplicateSelection()) e.preventDefault();
      }
      else if (e.key === " ") { e.preventDefault(); setTool("pan"); }
    }

    function on(id, ev, fn) {
      const el = $(id);
      if (el) el[ev] = fn;
    }
    function bind() {
      if (!$("maps")) return;
      populateTokenIconSelects();
      on("mapsNew", "onclick", () => $("mapsFile") && $("mapsFile").click());
      on("mapsFile", "onchange", (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = "";
        if (f) createMapFromFile(f);
      });
      on("mapsEmptyNew", "onclick", () => $("mapsFile") && $("mapsFile").click());
      on("mapsRename", "onclick", renameOpen);
      on("mapsRenameInput", "onchange", commitRename);
      on("mapsRenameInput", "onkeydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); commitRename(); }
        if (e.key === "Escape") { e.preventDefault(); $("mapsRenameInput").hidden = true; }
      });
      on("mapsDelete", "onclick", (e) => deleteOpen(e.currentTarget));
      on("mapsImport", "onclick", () => $("mapsImportFile") && $("mapsImportFile").click());
      on("mapsImportFile", "onchange", (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = "";
        if (f) importMapFile(f);
      });
      on("mapsExport", "onclick", () => exportMapFile());
      on("mapsScreenshot", "onclick", () => screenshot());
      on("mapsUndo", "onclick", undo);
      on("mapsRedo", "onclick", redo);
      on("mapsResetFog", "onclick", resetFog);
      on("mapsClearTokens", "onclick", clearTokens);
      on("mapsClearMeas", "onclick", clearMeasurements);
      on("mapsClearAnnot", "onclick", clearAnnot);
      on("mapsResetView", "onclick", () => {
        state.view = { zoomLevel: 1, panX: 0, panY: 0 };
        applyViewTransform();
        scheduleSave();
      });
      on("mapsApplySettings", "onclick", readSettingsFromForm);
      document.querySelectorAll("#mapsTools [data-tool]").forEach((b) => {
        b.onclick = () => setTool(b.getAttribute("data-tool"));
      });
      document.querySelectorAll("#mapsShapeGroup [data-shape]").forEach((b) => {
        b.onclick = () => {
          shapeKind = b.getAttribute("data-shape");
          syncToolChrome();
          syncShapeSettingsForm();
          if (tool === "shape") {
            const toolSec = $("mapsToolSettings");
            const ak = shapeKind === "ellipse" ? "circle" : shapeKind;
            if (toolSec) toolSec.dataset.activeTool = ak;
            const hd = $("mapsDrawerToolHd");
            if (hd) hd.textContent = toolLabel(ak);
          }
        };
      });
      on("mapsShapeKind", "onchange", (e) => {
        shapeKind = e.target.value;
        syncToolChrome();
        syncShapeSettingsForm();
      });
      const toolLiveIds = [
        "mapsDrawColor", "mapsDrawThick", "mapsDrawOpacity", "mapsEraser",
        "mapsFogColor", "mapsFogOpacity",
        "mapsRectColor", "mapsRectThick", "mapsRectOpacity", "mapsRectFillOn", "mapsRectFillColor", "mapsRectFillOpacity",
        "mapsEllipseColor", "mapsEllipseThick", "mapsEllipseOpacity", "mapsEllipseFillOn", "mapsEllipseFillColor", "mapsEllipseFillOpacity",
        "mapsArrowColor", "mapsArrowThick", "mapsArrowOpacity",
        "mapsLineColor", "mapsLineThick", "mapsLineOpacity",
        "mapsMeasureColor", "mapsDistVal", "mapsDistUnit",
        "mapsTextColor", "mapsTextSize", "mapsTextFontSize", "mapsTextOutlineColor", "mapsTextOutlineWidth", "mapsTextOutlineOpacity",
        "mapsTokenColor", "mapsTokenSize", "mapsTokIconDrawer", "mapsTokMulti",
      ];
      toolLiveIds.forEach((id) => {
        const el = $(id);
        if (!el) return;
        const ev = el.type === "range" || el.type === "color" || el.type === "number" ? "input" : "change";
        el[ev] = () => {
          readToolSettingsLive();
          if (id === "mapsTextSize") syncTextSizeRow();
        };
      });
      on("mapsTextPresetWhite", "onclick", () => applyTextPreset("white"));
      on("mapsTextPresetBlack", "onclick", () => applyTextPreset("black"));
      on("mapsTextPresetYellow", "onclick", () => applyTextPreset("yellow"));
      on("mapsDangerEntry", "onclick", openDangerTray);
      on("mapsDangerBack", "onclick", backToSettingsTray);
      on("mapsTokSave", "onclick", () => closeTokenEditor(true));
      on("mapsTokCancel", "onclick", () => closeTokenEditor(false));
      on("mapsTokDelete", "onclick", deleteTokenFromModal);
      on("mapsTextSave", "onclick", () => closeTextEditor(true));
      on("mapsTextCancel", "onclick", () => closeTextEditor(false));
      on("mapsTextDelete", "onclick", deleteTextFromModal);
      on("mapsStrokeSave", "onclick", () => closeStrokeEditor(true));
      on("mapsStrokeCancel", "onclick", () => closeStrokeEditor(false));
      on("mapsStrokeDelete", "onclick", deleteStrokeFromModal);
      on("mapsShapeEditSave", "onclick", () => closeShapeEditor(true));
      on("mapsShapeEditCancel", "onclick", () => closeShapeEditor(false));
      on("mapsShapeEditDelete", "onclick", deleteShapeFromModal);
      on("mapsMeasEditSave", "onclick", () => closeMeasurementEditor(true));
      on("mapsMeasEditCancel", "onclick", () => closeMeasurementEditor(false));
      on("mapsMeasEditDelete", "onclick", deleteMeasurementFromModal);
      on("mapsShortcuts", "onclick", () => openShortcutHelp());
      on("mapsShortcutClose", "onclick", () => closeShortcutHelp());
      on("mapsTextInput", "onkeydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); closeTextEditor(true); }
        if (e.key === "Escape") { e.preventDefault(); closeTextEditor(false); }
      });
      on("mapsDrawerToggle", "onclick", openMapsTray);
      on("mapsSettingsToggle", "onclick", openSettingsTray);
      on("mapsDrawerFab", "onclick", openMapsTray);
      const scrim = $("mapsDrawerScrim");
      if (scrim) scrim.onclick = () => setDrawerOpen(false);
      const drawer = $("mapsDrawer");
      if (drawer) drawer.classList.add("closed");
      window.addEventListener("keydown", onKey);
      window.addEventListener("resize", () => { if (active) resize(); });
    }

    function setActive(on) {
      active = !!on;
      if (on) {
        renderList();
        idb.open().catch(() => toast("IndexedDB unavailable"));
        loadTokenIcons().then(() => { if (openMapId) drawTokens(); }).catch(() => {});
        if (!openMapId) openPreferredMap().catch(() => {});
        requestAnimationFrame(resize);
      }
    }

    function onCampaignChanged() {
      closeEditor();
      renderList();
      openPreferredMap().catch(() => {});
    }

    bind();

    return {
      setActive, onCampaignChanged, idb, vState,
      _test: {
        vState, generateHexGrid, generateSquareGrid, findCellAt, findHexAt, vSettings,
        normalizeTokenIcon,
      },
    };
  })();

  window.MAPS = MAPS;
})();
