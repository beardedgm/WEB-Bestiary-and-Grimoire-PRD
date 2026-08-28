/*! Minimal ZIP (STORE only) pack/unpack for Board export. */
"use strict";
(function () {
  const SIG_LOCAL = 0x04034b50;
  const SIG_CENTRAL = 0x02014b50;
  const SIG_END = 0x06054b50;

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

  function packZip(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = encodeName(f.name);
      const data = f.data instanceof Uint8Array ? f.data : new TextEncoder().encode(String(f.data));
      const crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length);
      const dv = new DataView(local.buffer);
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
      local.set(name, 30);
      local.set(data, 30 + name.length);
      parts.push(local);

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
      offset += local.length;
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
    const total = parts.reduce((n, p) => n + p.length, 0) + centralSize + end.length;
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of parts) { out.set(p, pos); pos += p.length; }
    for (const c of central) { out.set(c, pos); pos += c.length; }
    out.set(end, pos);
    return out;
  }

  function unpackZip(buf) {
    const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    let endAt = -1;
    for (let i = u8.length - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === SIG_END) { endAt = i; break; }
    }
    if (endAt < 0) throw new Error("Invalid zip");
    const count = dv.getUint16(endAt + 10, true);
    const cdOff = dv.getUint32(endAt + 16, true);
    const out = {};
    let p = cdOff;
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== SIG_CENTRAL) throw new Error("Bad central directory");
      const comp = dv.getUint16(p + 10, true);
      const size = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true);
      const extra = dv.getUint16(p + 30, true);
      const comment = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      const nameBytes = u8.subarray(p + 46, p + 46 + nameLen);
      const name = new TextDecoder().decode(nameBytes);
      p += 46 + nameLen + extra + comment;
      if (comp !== 0) throw new Error("Unsupported compression");
      const ld = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      const dataOff = localOff + 30 + ld.getUint16(localOff + 26, true)
        + ld.getUint16(localOff + 28, true);
      out[name] = u8.subarray(dataOff, dataOff + size);
    }
    return out;
  }

  const root = typeof globalThis !== "undefined" ? globalThis : window;
  root.BOARD_ZIP = { packZip, unpackZip };
})();
