/*! Minimal ZIP (STORE only) pack/unpack plus data-URL ⇄ bytes media helpers, shared by the
    Board zip export (bg-board-zip/1) and the campaign archive (bg-campaign-archive/1). */
"use strict";
(function () {
  const SIG_LOCAL = 0x04034b50;
  const SIG_CENTRAL = 0x02014b50;
  const SIG_END = 0x06054b50;
  const MEDIA_TYPES = new Set(["image", "audio"]);
  const MEDIA_MIME_RE = /^(image|audio)\/[\w.+-]{1,60}$/;

  function crc32(buf) {
    let c = 0xffffffff;
    const table = crc32._t || (crc32._t = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let n = i;
        for (let k = 0; k < 8; k++) n = (n & 1) ? (0xedb88320 ^ (n >>> 1)) : (n >>> 1);
        t[i] = n >>> 0;
      }
      return t;
    })());
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function u16(dv, off, v) { dv.setUint16(off, v, true); }
  function u32(dv, off, v) { dv.setUint32(off, v, true); }

  function encodeName(name) {
    return new TextEncoder().encode(String(name).replace(/\\/g, "/"));
  }

  /* Returns the archive as an ordered list of byte parts (local header, data, …, central
     directory, end record). Entry data is referenced, not copied, so a caller can hand the
     parts straight to `new Blob(parts)` and never hold a second copy of a large archive. */
  function packZipParts(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = encodeName(f.name);
      const data = f.data instanceof Uint8Array ? f.data : new TextEncoder().encode(String(f.data));
      const crc = crc32(data);
      const head = new Uint8Array(30 + name.length);
      const dv = new DataView(head.buffer);
      u32(dv, 0, SIG_LOCAL);
      u16(dv, 4, 20);
      u16(dv, 6, 0);
      u16(dv, 8, 0);
      u16(dv, 10, 0);
      u16(dv, 12, 0);
      u32(dv, 14, crc);
      u32(dv, 18, data.length);
      u32(dv, 22, data.length);
      u16(dv, 26, name.length);
      u16(dv, 28, 0);
      head.set(name, 30);
      parts.push(head, data);

      const cen = new Uint8Array(46 + name.length);
      const cd = new DataView(cen.buffer);
      u32(cd, 0, SIG_CENTRAL);
      u16(cd, 4, 20);
      u16(cd, 6, 20);
      u16(cd, 8, 0);
      u16(cd, 10, 0);
      u16(cd, 12, 0);
      u16(cd, 14, 0);
      u32(cd, 16, crc);
      u32(cd, 20, data.length);
      u32(cd, 24, data.length);
      u16(cd, 28, name.length);
      u16(cd, 30, 0);
      u16(cd, 32, 0);
      u16(cd, 34, 0);
      u16(cd, 36, 0);
      u32(cd, 38, 0);
      u32(cd, 42, offset);
      cen.set(name, 46);
      central.push(cen);
      offset += head.length + data.length;
    }
    const centralSize = central.reduce((n, c) => n + c.length, 0);
    const end = new Uint8Array(22);
    const ed = new DataView(end.buffer);
    u32(ed, 0, SIG_END);
    u16(ed, 4, 0);
    u16(ed, 6, 0);
    u16(ed, 8, files.length);
    u16(ed, 10, files.length);
    u32(ed, 12, centralSize);
    u32(ed, 16, offset);
    u16(ed, 20, 0);
    return parts.concat(central, [end]);
  }

  function packZip(files) {
    const parts = packZipParts(files);
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    return out;
  }

  /* Returns { name: Uint8Array } views over the input buffer. Every structural check throws,
     because a silently short entry is a blank map or a truncated JSON later. `opts.verify`
     also compares each entry's CRC-32 to the central directory. Entry names are untrusted
     file content, hence the null-prototype result object. */
  function unpackZip(buf, opts) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const verify = !!(opts && opts.verify);
    let endAt = -1;
    const stop = Math.max(0, u8.length - 22 - 0xffff);
    for (let i = u8.length - 22; i >= stop; i--) {
      if (dv.getUint32(i, true) === SIG_END) { endAt = i; break; }
    }
    if (endAt < 0) throw new Error("Invalid zip");
    const count = dv.getUint16(endAt + 10, true);
    if (count === 0xffff) throw new Error("zip64 unsupported");
    const cdOff = dv.getUint32(endAt + 16, true);
    const out = Object.create(null);
    let p = cdOff;
    for (let n = 0; n < count; n++) {
      if (p + 46 > u8.length || dv.getUint32(p, true) !== SIG_CENTRAL) throw new Error("Bad central directory");
      const comp = dv.getUint16(p + 10, true);
      const crc = dv.getUint32(p + 16, true);
      const size = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extra = dv.getUint16(p + 30, true);
      const comment = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      if (p + 46 + nameLen > u8.length) throw new Error("Bad central directory");
      const nameBytes = u8.subarray(p + 46, p + 46 + nameLen);
      const name = new TextDecoder().decode(nameBytes);
      p += 46 + nameLen + extra + comment;
      if (comp !== 0) throw new Error("Unsupported compression");
      if (localOff + 30 > u8.length || dv.getUint32(localOff, true) !== SIG_LOCAL) throw new Error("Bad local header");
      const dataOff = localOff + 30 + dv.getUint16(localOff + 26, true)
        + dv.getUint16(localOff + 28, true);
      if (dataOff + size > u8.length) throw new Error("Truncated zip");
      const data = u8.subarray(dataOff, dataOff + size);
      if (verify && crc32(data) !== crc) throw new Error("CRC mismatch");
      out[name] = data;
    }
    return out;
  }

  /* ---- media helpers: board image/audio cards hold data: URLs; in a zip they become files ---- */

  function extOf(mime) {
    return (String(mime || "").split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "") || "bin";
  }
  function mimeOfDataUrl(src) {
    const m = /^data:([^;,]+)/.exec(String(src || ""));
    return m ? m[1] : "";
  }
  async function dataUrlToBlob(src) {
    const r = await fetch(src);
    return r.blob();
  }
  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error || new Error("read failed"));
      fr.readAsDataURL(blob);
    });
  }

  /* Moves each image/audio card's data: URL out into `files` as `<prefix><n>.<ext>` and
     leaves the path in `src` with the mime stashed on `_mime`. Counting from `files.length`
     keeps Board's historical `assets/a0.png…` names and gives the archive `board-media/0.png…`.
     A data: URL fetch() cannot decode stays inline — a bigger JSON, never a lost card. */
  async function detachMedia(cards, files, prefix) {
    let n = 0;
    if (!Array.isArray(cards) || !Array.isArray(files)) return 0;
    for (const card of cards) {
      if (!card || !MEDIA_TYPES.has(card.type)) continue;
      if (typeof card.src !== "string" || !card.src.startsWith("data:")) continue;
      let blob;
      try { blob = await dataUrlToBlob(card.src); } catch (_) { continue; }
      const mime = blob.type || mimeOfDataUrl(card.src) || "application/octet-stream";
      const data = new Uint8Array(await blob.arrayBuffer());
      const path = prefix + files.length + "." + extOf(mime);
      files.push({ name: path, data });
      card._mime = mime;
      card.src = path;
      n++;
    }
    return n;
  }

  /* The reverse: must run BEFORE the board validator, whose mediaSrc accepts only
     data:image/ and data:audio/ and would blank a file path. The stashed mime is trusted only
     when it is a well-formed mime of the card's own kind; otherwise the extension names it.
     A card whose file is absent from the zip comes back empty and is counted, not dropped. */
  async function attachMedia(cards, entries) {
    const out = { attached: 0, missing: 0 };
    if (!Array.isArray(cards) || !entries) return out;
    for (const card of cards) {
      if (!card || !MEDIA_TYPES.has(card.type)) continue;
      const stash = card._mime;
      delete card._mime;
      const src = card.src;
      if (typeof src !== "string" || !src || src.startsWith("data:")) continue;
      const data = entries[src];
      if (!(data instanceof Uint8Array)) { card.src = ""; out.missing++; continue; }
      const ext = (/\.([a-z0-9]+)$/i.exec(src) || [])[1] || "bin";
      const ok = typeof stash === "string" && MEDIA_MIME_RE.test(stash) && stash.startsWith(card.type + "/");
      const mime = ok ? stash : card.type + "/" + ext;
      try {
        card.src = await blobToDataUrl(new Blob([data], { type: mime }));
        out.attached++;
      } catch (_) {
        card.src = "";
        out.missing++;
      }
    }
    return out;
  }

  const root = typeof globalThis !== "undefined" ? globalThis : window;
  root.BOARD_ZIP = {
    packZip, packZipParts, unpackZip, crc32,
    extOf, dataUrlToBlob, blobToDataUrl, detachMedia, attachMedia,
  };
})();
