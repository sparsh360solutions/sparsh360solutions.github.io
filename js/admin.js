// Sparsh 360 admin: add catalogs from PDFs and manage designs, publishing to GitHub.
if (window.top !== window.self) { document.documentElement.hidden = true; window.top.location = window.self.location.href; }
(() => {
  const $ = s => document.querySelector(s);
  const STORE = "sparsh-admin";
  const DOOR_H = 900, THUMB_H = 260;

  // ---------- Tabs ----------
  const TABS = ["connect", "add", "manage"];
  function showTab(name) {
    document.querySelectorAll("#tabs button").forEach(b => {
      const on = b.dataset.tab === name;
      b.classList.toggle("on", on);
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    document.querySelectorAll(".panel").forEach(p => (p.hidden = p.id !== "tab-" + name));
    if (location.hash.slice(1) !== name) history.replaceState(null, "", "#" + name);
    if (name === "manage" && !manage.data) loadManage();
  }
  document.querySelectorAll("#tabs button").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1); if (TABS.includes(h)) showTab(h); });

  function setStatus(el, text, kind = "") {
    el.textContent = text;
    // Neutral messages ending in "…" are in progress: styled with a spinner.
    el.className = "status " + (kind || (/…$/.test(text) ? "busy" : ""));
  }

  // Connection badge in the top bar (presentation only).
  function updateBadge() {
    const b = $("#connBadge");
    if (!b) return;
    const ok = !!conn?.token;
    b.classList.toggle("ok", ok);
    b.querySelector(".conn-text").textContent = ok ? `Connected · ${conn.repo}` : "Not connected";
    b.title = ok ? `Publishing to ${conn.owner}/${conn.repo} (${conn.branch})` : "Connect to GitHub to publish";
  }
  $("#connBadge")?.addEventListener("click", () => showTab("connect"));

  // Add-catalog step indicator: 1 Upload, 2 Review, 3 Publish.
  function setStep(n) {
    document.querySelectorAll("#addSteps li").forEach(li => {
      const k = +li.dataset.step;
      li.classList.toggle("on", k === n);
      li.classList.toggle("done", k < n);
      if (k === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }

  // ---------- GitHub ----------
  // Repo details are remembered; the token lives only for this browser tab unless
  // "Remember on this computer" is ticked (then localStorage). Never sent anywhere but api.github.com.
  const TOKEN_KEY = STORE + "-token";
  const safeName = v => /^[A-Za-z0-9_.-]{1,100}$/.test(v);
  const readJSON = (store, key) => { try { return JSON.parse(store.getItem(key) || "null"); } catch { return null; } };
  let conn = readJSON(localStorage, STORE);
  if (conn?.token) { localStorage.setItem(TOKEN_KEY, conn.token); delete conn.token; localStorage.setItem(STORE, JSON.stringify(conn)); } // migrate old saves
  if (conn) conn.token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";

  const cf = $("#connectForm");
  if (conn) for (const k of ["owner", "repo", "branch", "token"]) cf[k].value = conn[k] || "";
  if (cf.remember) cf.remember.checked = !!localStorage.getItem(TOKEN_KEY);
  updateBadge();

  async function gh(path, opts = {}) {
    if (!conn?.token) throw new Error("Connect to GitHub first (Connect tab).");
    const res = await fetch(`https://api.github.com/repos/${conn.owner}/${conn.repo}${path ? "/" + path : ""}`, {
      ...opts,
      headers: {
        Authorization: `Bearer ${conn.token}`,
        Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!res.ok) {
      let msg = `${res.status}`;
      try { msg += " " + (await res.json()).message; } catch { /* no body */ }
      const err = new Error(`GitHub: ${msg}`);
      err.status = res.status;
      throw err;
    }
    return opts.raw ? res.text() : res.json();
  }

  async function fetchCatalog() {
    try {
      const txt = await gh(`contents/data/catalog.json?ref=${encodeURIComponent(conn.branch)}`, { raw: true });
      return JSON.parse(txt);
    } catch (e) {
      if (e.status === 404) return { catalogs: [], doors: [] };
      throw e;
    }
  }

  async function pool(items, n, fn) {
    const out = new Array(items.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
    }));
    return out;
  }

  /** One commit: files = [{path, base64}] to add/replace, remove = [paths]. */
  async function commit(files, remove, message, onProgress = () => {}) {
    const ref = await gh(`git/ref/heads/${conn.branch}`);
    const head = ref.object.sha;
    const base = await gh(`git/commits/${head}`);
    let done = 0;
    const blobs = await pool(files, 4, async f => {
      const b = await gh("git/blobs", { method: "POST", body: JSON.stringify({ content: f.base64, encoding: "base64" }) });
      onProgress(++done, files.length);
      return { path: f.path, mode: "100644", type: "blob", sha: b.sha };
    });
    const tree = await gh("git/trees", {
      method: "POST",
      body: JSON.stringify({
        base_tree: base.tree.sha,
        tree: [...blobs, ...remove.map(path => ({ path, mode: "100644", type: "blob", sha: null }))],
      }),
    });
    const c = await gh("git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
    await gh(`git/refs/heads/${conn.branch}`, { method: "PATCH", body: JSON.stringify({ sha: c.sha }) });
  }

  const textB64 = s => btoa(unescape(encodeURIComponent(s)));
  const blobB64 = blob => new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.readAsDataURL(blob);
  });

  cf.addEventListener("submit", async e => {
    e.preventDefault();
    conn = { owner: cf.owner.value.trim(), repo: cf.repo.value.trim(), branch: cf.branch.value.trim() || "main", token: cf.token.value.trim() };
    const st = $("#connectStatus");
    setStatus(st, "Checking…");
    try {
      if (!safeName(conn.owner) || !safeName(conn.repo) || !/^[A-Za-z0-9_./-]{1,100}$/.test(conn.branch) || conn.branch.includes(".."))
        throw new Error("Owner, repository and branch may only contain letters, numbers, - _ and .");
      if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(conn.token))
        throw new Error("That doesn't look like a GitHub token (it should start with github_pat_).");
      const repo = await gh("");
      if (!repo.permissions?.push) throw new Error("This token can read the repository but cannot publish. Give it Contents: Read and write.");
      const { token, ...details } = conn;
      localStorage.setItem(STORE, JSON.stringify(details));
      sessionStorage.setItem(TOKEN_KEY, token);
      if (cf.remember?.checked) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
      updateBadge();
      setStatus(st, `Connected to ${repo.full_name}. You can add catalogs now.`, "ok");
      manage.data = null;
    } catch (err) {
      setStatus(st, err.message, "err");
    }
  });
  $("#forget").addEventListener("click", () => {
    localStorage.removeItem(STORE);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    cf.token.value = "";
    conn = null;
    updateBadge();
    setStatus($("#connectStatus"), "Token removed from this browser.");
  });

  // Brand suggestions from the live site data.
  fetch("data/catalog.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
    const list = $("#brandList");
    list.replaceChildren(...[...new Set(d.catalogs.map(c => c.brand))].map(b => Object.assign(document.createElement("option"), { value: b })));
  }).catch(() => {});

  // ---------- Add catalog ----------
  const add = { pdf: null, pages: [], page: 0, sel: -1, mode: "", meta: null };

  // PDF drop zone (presentation): drag & drop fills the file input; show the chosen file.
  const dz = $("#dropzone"), pdfInput = $("#addForm").pdf;
  function showPicked() {
    if (!dz) return;
    const f = pdfInput.files[0];
    dz.classList.toggle("has-file", !!f);
    $("#dzTitle").textContent = f ? f.name : "Drop the catalog PDF here";
    $("#dzSub").innerHTML = f ? `${(f.size / 1048576).toFixed(1)} MB · <u>choose a different file</u>` : "or <u>browse your computer</u> · PDF only";
  }
  pdfInput.addEventListener("change", showPicked);
  if (dz) {
    ["dragenter", "dragover"].forEach(t => dz.addEventListener(t, e => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "dragend"].forEach(t => dz.addEventListener(t, e => { if (!dz.contains(e.relatedTarget)) dz.classList.remove("drag"); }));
    dz.addEventListener("drop", e => {
      e.preventDefault();
      dz.classList.remove("drag");
      const f = [...(e.dataTransfer?.files || [])].find(x => x.type === "application/pdf" || /\.pdf$/i.test(x.name));
      if (!f) return;
      const dt = new DataTransfer();
      dt.items.add(f);
      pdfInput.files = dt.files;
      showPicked();
    });
  }

  $("#addForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.target;
    add.meta = { brand: f.brand.value.trim(), name: f.name.value.trim(), prefix: f.prefix.value.trim() };
    $("#addStart").hidden = true;
    $("#addProgress").hidden = false;
    $("#progBar").style.width = "0%";
    $("#progText").textContent = "Opening the PDF…";
    try {
      const data = new Uint8Array(await f.pdf.files[0].arrayBuffer());
      add.pdf = await pdfjsLib.getDocument({ data, isEvalSupported: false }).promise;
      add.pages = [];
      for (let i = 0; i < add.pdf.numPages; i++) {
        $("#progText").textContent = `Page ${i + 1} of ${add.pdf.numPages} — ${add.pages.reduce((n, p) => n + p.doors.length, 0)} doors so far`;
        $("#progBar").style.width = `${(i / add.pdf.numPages) * 100}%`;
        const page = await add.pdf.getPage(i + 1);
        const r = await Detect.analyzePage(page, i, add.meta.prefix);
        add.pages.push({ index: i, image: r.image, doors: r.doors });
      }
      add.page = add.pages.findIndex(p => p.doors.length);
      if (add.page < 0) add.page = 0;
      startReview();
    } catch (err) {
      console.error(err);
      $("#progText").textContent = "Couldn't read this PDF: " + err.message;
      setTimeout(resetAdd, 4000);
    }
  });

  function resetAdd() {
    add.pdf = null; add.pages = []; add.sel = -1;
    $("#addForm").reset();
    $("#addStart").hidden = false;
    $("#addProgress").hidden = true;
    $("#review").hidden = true;
    setStatus($("#publishStatus"), "");
    showPicked();
    setStep(1);
  }

  function startReview() {
    $("#addProgress").hidden = true;
    $("#review").hidden = false;
    setStep(2);
    $("#reviewTitle").textContent = `${add.meta.brand} — ${add.meta.name}`;
    drawReview();
  }

  const pc = $("#pageCanvas"), pctx = pc.getContext("2d");
  let pScale = 1;

  function drawReview() {
    const p = add.pages[add.page];
    $("#doorTotal").textContent = add.pages.reduce((n, pg) => n + pg.doors.length, 0);
    $("#pageLabel").textContent = `Page ${add.page + 1} of ${add.pages.length} · ${p.doors.length} doors`;
    $("#addBox").classList.toggle("active", add.mode === "draw");
    const maxW = pc.parentElement.clientWidth - 20, maxH = Math.max(320, window.innerHeight - 190);
    pScale = Math.min(maxW / p.image.width, maxH / p.image.height, 1.5);
    pc.width = Math.round(p.image.width * pScale);
    pc.height = Math.round(p.image.height * pScale);
    drawPageCanvas();
    renderDoorList();
  }

  function drawPageCanvas(temp) {
    const p = add.pages[add.page], W = pc.width, H = pc.height;
    pctx.drawImage(p.image, 0, 0, W, H);
    const all = temp ? [...p.doors, temp] : p.doors;
    all.forEach((d, i) => {
      const x = d.x0 * W, y = d.y0 * H, w = (d.x1 - d.x0) * W, h = (d.y1 - d.y0) * H;
      const sel = i === add.sel;
      pctx.lineWidth = sel ? 3 : 2;
      pctx.strokeStyle = sel ? "#C89B3C" : "rgba(46,93,58,.95)";
      pctx.fillStyle = sel ? "rgba(200,155,60,.15)" : "rgba(46,93,58,.12)";
      pctx.fillRect(x, y, w, h);
      pctx.strokeRect(x, y, w, h);
      if (d !== temp) {
        pctx.fillStyle = sel ? "#C89B3C" : "#2E5D3A";
        pctx.fillRect(x, y, 26, 20);
        pctx.fillStyle = "#fff"; pctx.font = "bold 12px Montserrat, sans-serif";
        pctx.fillText(String(i + 1), x + 6, y + 14);
      }
      if (sel) cornersOf(d).forEach(([cx, cy]) => {
        pctx.fillStyle = "#C89B3C"; pctx.fillRect(cx * W - 6, cy * H - 6, 12, 12);
      });
    });
  }

  const cornersOf = d => [[d.x0, d.y0], [d.x1, d.y0], [d.x1, d.y1], [d.x0, d.y1]];

  function renderDoorList() {
    const p = add.pages[add.page], list = $("#doorList");
    list.innerHTML = "";
    if (!p.doors.length) {
      list.innerHTML = `<p class="muted">No doors on this page. Use “Draw a door box” if one was missed.</p>`;
      return;
    }
    p.doors.forEach((d, i) => {
      const card = document.createElement("div");
      card.className = "door-card" + (i === add.sel ? " sel" : "");
      const num = document.createElement("span");
      num.className = "door-num"; num.textContent = i + 1;
      const c = document.createElement("canvas");
      const sw = (d.x1 - d.x0) * p.image.width, sh = (d.y1 - d.y0) * p.image.height;
      c.height = 240; c.width = Math.max(1, Math.round(240 * sw / sh));
      c.getContext("2d").drawImage(p.image, d.x0 * p.image.width, d.y0 * p.image.height, sw, sh, 0, 0, c.width, c.height);
      const inp = document.createElement("input");
      inp.value = d.code; inp.placeholder = "Design code";
      inp.setAttribute("aria-label", `Design code for door ${i + 1}`);
      inp.classList.toggle("empty", !d.code);
      inp.addEventListener("input", () => { d.code = inp.value.trim(); inp.classList.toggle("empty", !d.code); });
      inp.addEventListener("focus", () => { add.sel = i; drawPageCanvas(); markSelectedCard(); });
      const rm = document.createElement("button");
      rm.type = "button"; rm.className = "rm";
      rm.innerHTML = `<svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg>Remove #${i + 1}`;
      rm.onclick = () => { p.doors.splice(i, 1); add.sel = -1; drawReview(); };
      card.append(num, c, inp, rm);
      card.addEventListener("click", ev => { if (ev.target === card || ev.target === c || ev.target === num) { add.sel = i; drawPageCanvas(); markSelectedCard(); } });
      list.appendChild(card);
    });
  }
  function markSelectedCard() {
    document.querySelectorAll(".door-card").forEach((c, i) => c.classList.toggle("sel", i === add.sel));
  }

  // Box editing on the page canvas.
  let pdrag = null;
  const ptPos = e => {
    const r = pc.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };
  pc.addEventListener("pointerdown", e => {
    const p = add.pages[add.page], [x, y] = ptPos(e);
    const tolX = 10 / pc.clientWidth, tolY = 10 / pc.clientHeight;
    pc.setPointerCapture(e.pointerId);
    if (add.mode === "draw") { pdrag = { type: "new", sx: x, sy: y, box: { x0: x, y0: y, x1: x, y1: y } }; return; }
    if (add.sel >= 0) {
      const d = p.doors[add.sel];
      const ci = cornersOf(d).findIndex(([cx, cy]) => Math.abs(cx - x) < tolX && Math.abs(cy - y) < tolY);
      if (ci >= 0) { pdrag = { type: "corner", ci, d }; return; }
    }
    const hit = p.doors.findIndex(d => x >= d.x0 && x <= d.x1 && y >= d.y0 && y <= d.y1);
    add.sel = hit;
    if (hit >= 0) pdrag = { type: "move", d: p.doors[hit], last: [x, y] };
    drawPageCanvas();
    markSelectedCard();
  });
  pc.addEventListener("pointermove", e => {
    if (!pdrag) return;
    const [x, y] = ptPos(e).map(v => Math.max(0, Math.min(1, v)));
    if (pdrag.type === "new") {
      pdrag.box = { x0: Math.min(pdrag.sx, x), y0: Math.min(pdrag.sy, y), x1: Math.max(pdrag.sx, x), y1: Math.max(pdrag.sy, y) };
      drawPageCanvas(pdrag.box);
    } else if (pdrag.type === "corner") {
      const d = pdrag.d;
      if (pdrag.ci === 0 || pdrag.ci === 3) d.x0 = Math.min(x, d.x1 - 0.01); else d.x1 = Math.max(x, d.x0 + 0.01);
      if (pdrag.ci < 2) d.y0 = Math.min(y, d.y1 - 0.01); else d.y1 = Math.max(y, d.y0 + 0.01);
      drawPageCanvas();
    } else if (pdrag.type === "move") {
      const d = pdrag.d, dx = x - pdrag.last[0], dy = y - pdrag.last[1];
      const mx = Math.max(-d.x0, Math.min(1 - d.x1, dx)), my = Math.max(-d.y0, Math.min(1 - d.y1, dy));
      d.x0 += mx; d.x1 += mx; d.y0 += my; d.y1 += my;
      pdrag.last = [x, y];
      drawPageCanvas();
    }
  });
  pc.addEventListener("pointerup", () => {
    if (!pdrag) return;
    const p = add.pages[add.page];
    if (pdrag.type === "new") {
      const b = pdrag.box;
      if (b.x1 - b.x0 > 0.02 && b.y1 - b.y0 > 0.04) {
        p.doors.push({ ...b, code: "" });
        add.sel = p.doors.length - 1;
      }
      add.mode = "";
    }
    pdrag = null;
    drawReview();
  });

  $("#addBox").addEventListener("click", () => { add.mode = add.mode === "draw" ? "" : "draw"; add.sel = -1; drawReview(); });
  $("#clearPage").addEventListener("click", () => { add.pages[add.page].doors = []; add.sel = -1; drawReview(); });
  $("#prevPage").addEventListener("click", () => { if (add.page > 0) { add.page--; add.sel = -1; drawReview(); } });
  $("#nextPage").addEventListener("click", () => { if (add.page < add.pages.length - 1) { add.page++; add.sel = -1; drawReview(); } });
  $("#cancelReview").addEventListener("click", () => { if (confirm("Discard this catalog? Nothing has been published.")) resetAdd(); });
  window.addEventListener("resize", () => { if (!$("#review").hidden) drawReview(); });
  document.addEventListener("keydown", e => {
    if ($("#review").hidden || add.sel < 0 || e.target.tagName === "INPUT") return;
    if (e.key === "Delete" || e.key === "Backspace") { add.pages[add.page].doors.splice(add.sel, 1); add.sel = -1; drawReview(); }
  });

  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "catalog";
  const fileOf = code => code.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "door";
  const toBlob = (c, q) => new Promise(res => c.toBlob(res, "image/jpeg", q));
  const naturalKey = s => s.split(/(\d+)/).map(t => (/^\d+$/.test(t) ? t.padStart(8, "0") : t.toLowerCase())).join("");

  function scaled(src, sx, sy, sw, sh, h) {
    const c = document.createElement("canvas");
    c.height = Math.min(h, Math.round(sh));
    c.width = Math.max(1, Math.round(sw * c.height / sh));
    const x = c.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c;
  }

  $("#publish").addEventListener("click", async () => {
    const st = $("#publishStatus"), btn = $("#publish");
    const total = add.pages.reduce((n, p) => n + p.doors.length, 0);
    if (!total) return setStatus(st, "There are no doors to publish.", "err");
    if (!conn?.token) return setStatus(st, "Connect to GitHub first (Connect tab).", "err");
    btn.disabled = true;
    setStep(3);
    try {
      setStatus(st, "Checking the website's current designs…");
      const catalog = await fetchCatalog();
      let slug = slugify(add.meta.name), n = 2;
      const taken = new Set(catalog.catalogs.map(c => c.id));
      while (taken.has(slug)) slug = `${slugify(add.meta.name)}-${n++}`;

      const files = [], entries = [], seen = new Set();
      let made = 0, auto = 0;
      for (const p of add.pages) {
        if (!p.doors.length) continue;
        const page = await add.pdf.getPage(p.index + 1);
        const minH = Math.min(...p.doors.map(d => d.y1 - d.y0));
        const { canvas } = await Detect.renderPage(page, Math.max(1100, Math.min(5000, DOOR_H / minH)));
        for (const d of p.doors) {
          let code = d.code || `${slug.toUpperCase()}-${++auto}`;
          const base = code;
          let k = 2;
          while (seen.has(code.toLowerCase())) code = `${base}-${k++}`;
          seen.add(code.toLowerCase());
          const sx = d.x0 * canvas.width, sy = d.y0 * canvas.height, sw = (d.x1 - d.x0) * canvas.width, sh = (d.y1 - d.y0) * canvas.height;
          const full = scaled(canvas, sx, sy, sw, sh, DOOR_H), thumb = scaled(canvas, sx, sy, sw, sh, THUMB_H);
          const fname = fileOf(code) + ".jpg";
          files.push({ path: `doors/${slug}/${fname}`, base64: await blobB64(await toBlob(full, 0.84)) });
          files.push({ path: `doors/${slug}/t/${fname}`, base64: await blobB64(await toBlob(thumb, 0.78)) });
          entries.push({
            id: `${slug}/${fname.slice(0, -4)}`, code, brand: add.meta.brand, catalog: add.meta.name, catalogId: slug,
            img: `doors/${slug}/${fname}`, thumb: `doors/${slug}/t/${fname}`, w: full.width, h: full.height, page: p.index + 1,
          });
          setStatus(st, `Preparing pictures… ${++made} of ${total}`);
        }
      }
      entries.sort((a, b) => naturalKey(a.code).localeCompare(naturalKey(b.code)));
      catalog.catalogs.push({ id: slug, name: add.meta.name, brand: add.meta.brand });
      catalog.doors.push(...entries);
      files.push({ path: "data/catalog.json", base64: textB64(JSON.stringify(catalog, null, 1)) });

      await commit(files, [], `Add catalog: ${add.meta.brand} — ${add.meta.name} (${entries.length} designs)`,
        (d, t) => setStatus(st, `Uploading… ${d} of ${t} files`));
      setStatus(st, `Published ${entries.length} designs. The website updates in about a minute.`, "ok");
      manage.data = null;
      setTimeout(resetAdd, 6000);
    } catch (err) {
      console.error(err);
      setStatus(st, err.message, "err");
      setStep(2);
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Manage ----------
  const manage = { data: null, removed: new Set(), dropCats: new Set(), cat: null };

  async function loadManage() {
    const st = $("#manageStatus");
    if (!conn?.token) return setStatus(st, "Connect to GitHub first (Connect tab).", "err");
    setStatus(st, "Loading…");
    try {
      manage.data = await fetchCatalog();
      manage.removed = new Set();
      manage.dropCats = new Set();
      manage.original = JSON.stringify(manage.data);
      manage.cat = manage.data.catalogs[0]?.id || null;
      renderManage();
      setStatus(st, "");
    } catch (err) {
      setStatus(st, err.message, "err");
    }
  }

  function renderManage() {
    const d = manage.data, sel = $("#manageCat");
    sel.replaceChildren(...d.catalogs.map(c => {
      const n = d.doors.filter(x => x.catalogId === c.id).length;
      return new Option(`${manage.dropCats.has(c.id) ? "✕ " : ""}${c.brand} — ${c.name} (${n})`, c.id);
    }));
    sel.value = manage.cat;
    const cat = d.catalogs.find(c => c.id === manage.cat);
    $("#manageBrand").value = cat?.brand || "";
    $("#manageName").value = cat?.name || "";
    $("#deleteCat").textContent = manage.dropCats.has(manage.cat) ? "Keep this catalog" : "Remove this catalog";
    const grid = $("#manageGrid");
    grid.innerHTML = "";
    const inCat = d.doors.filter(x => x.catalogId === manage.cat);
    const marked = manage.dropCats.has(manage.cat) ? inCat.length : inCat.filter(x => manage.removed.has(x.id)).length;
    let sum = $("#manageSummary");
    if (!sum) { sum = document.createElement("p"); sum.id = "manageSummary"; sum.className = "manage-summary"; grid.before(sum); }
    sum.innerHTML = cat ? `<b>${inCat.length}</b> designs in this catalog${marked ? ` · <span class="warn">${marked} marked for removal</span>` : ""}` : "";
    for (const door of d.doors.filter(x => x.catalogId === manage.cat)) {
      const t = document.createElement("div");
      const gone = manage.removed.has(door.id) || manage.dropCats.has(door.catalogId);
      t.className = "m-tile" + (gone ? " removed" : "");
      t.innerHTML = `<div class="thumb"><img loading="lazy" alt=""><span class="flag">Will be removed</span></div><input aria-label="Design code"><button type="button"></button>`;
      t.querySelector("img").src = door.thumb;
      const inp = t.querySelector("input");
      inp.value = door.code;
      inp.oninput = () => { door.code = inp.value.trim(); };
      const b = t.querySelector("button");
      b.textContent = gone ? "Undo" : "Remove";
      b.onclick = () => { manage.removed.has(door.id) ? manage.removed.delete(door.id) : manage.removed.add(door.id); renderManage(); };
      grid.appendChild(t);
    }
  }

  $("#manageCat").addEventListener("change", e => { manage.cat = e.target.value; renderManage(); });
  $("#manageBrand").addEventListener("input", e => {
    const v = e.target.value;
    const c = manage.data.catalogs.find(c => c.id === manage.cat);
    if (c) { c.brand = v; manage.data.doors.forEach(d => { if (d.catalogId === c.id) d.brand = v; }); }
  });
  $("#manageName").addEventListener("input", e => {
    const v = e.target.value;
    const c = manage.data.catalogs.find(c => c.id === manage.cat);
    if (c) { c.name = v; manage.data.doors.forEach(d => { if (d.catalogId === c.id) d.catalog = v; }); }
  });
  $("#deleteCat").addEventListener("click", () => {
    manage.dropCats.has(manage.cat) ? manage.dropCats.delete(manage.cat) : manage.dropCats.add(manage.cat);
    renderManage();
  });
  $("#reloadManage").addEventListener("click", loadManage);

  $("#saveManage").addEventListener("click", async () => {
    const st = $("#manageStatus");
    if (!manage.data) return;
    const d = manage.data;
    const gone = d.doors.filter(x => manage.removed.has(x.id) || manage.dropCats.has(x.catalogId));
    const next = {
      catalogs: d.catalogs.filter(c => !manage.dropCats.has(c.id)),
      doors: d.doors.filter(x => !gone.includes(x)),
    };
    const json = JSON.stringify(next, null, 1);
    if (json === JSON.stringify(JSON.parse(manage.original), null, 1)) return setStatus(st, "Nothing to save.");
    if (gone.length && !confirm(`Remove ${gone.length} designs from the website?`)) return;
    $("#saveManage").disabled = true;
    try {
      setStatus(st, "Saving…");
      await commit([{ path: "data/catalog.json", base64: textB64(json) }],
        gone.flatMap(x => [x.img, x.thumb]),
        `Update designs${gone.length ? ` (removed ${gone.length})` : ""}`);
      setStatus(st, "Saved. The website updates in about a minute.", "ok");
      await loadManage();
      setStatus(st, "Saved. The website updates in about a minute.", "ok");
    } catch (err) {
      setStatus(st, err.message, "err");
    } finally {
      $("#saveManage").disabled = false;
    }
  });

  const startTab = location.hash.slice(1);
  if (TABS.includes(startTab)) showTab(startTab);
  else if (!conn?.token) showTab("connect");
})();
