// Sparsh 360 Door Studio — customer app.
(() => {
  const cfg = window.SPARSH;
  const t = (key, vars) => I18N.t(key, vars);
  const $ = s => document.querySelector(s);
  const MAX_PHOTO = 2000;        // working photo resolution (long side)
  const HANDLE_HIT = 34;         // touch radius for corner handles (css px)
  const FAV_KEY = "sparsh-favs";
  const LOOKS = ["light", "medium", "dark", "grey", "colour"];
  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z"/></svg>';

  const state = {
    step: 1,
    photo: null,                 // canvas holding the working photo
    quad: null,                  // [[x,y] x4] TL,TR,BR,BL in photo pixels
    baseQuad: null,              // corners a sample room starts with (Reset goes back to these)
    door: null,                  // catalog entry
    doorImg: null,               // loaded <img>
    light: 1,
    brand: "All",
    catalogId: null,
    look: null,
    saved: false,                // gallery shows only saved designs
    query: "",
    favs: loadFavs(),            // saved door ids, oldest first
    data: { catalogs: [], doors: [] },
    byId: new Map(),
  };

  // ---------- Steps & history ----------
  function showStep(n, push = true) {
    if (n > 1 && !state.photo) n = 1;
    if (n > 2 && !state.quad) n = 2;
    state.step = n;
    for (const i of [1, 2, 3]) $("#step" + i).hidden = i !== n;
    document.querySelectorAll(".steps span").forEach(s => {
      const i = +s.dataset.step;
      s.classList.toggle("on", i === n);
      s.classList.toggle("done", i < n);
    });
    if (push) history.pushState({ step: n }, "");
    window.scrollTo(0, 0);
    syncTopbar();
    requestAnimationFrame(() => (n === 2 ? layoutMark() : n === 3 ? layoutView() : null));
    if (n === 3 && pendingDesign && !state.door) { selectDoor(pendingDesign); pendingDesign = null; }
  }

  // Deep link from the design catalogue pages: ?design=<id> preselects that door.
  const designParam = new URLSearchParams(location.search).get("design");
  let pendingDesign = null;

  // Expose the sticky header height to CSS so pinned panels sit right under it.
  function syncTopbar() {
    const bar = document.querySelector(".topbar");
    document.documentElement.style.setProperty("--topbar-h", (bar ? bar.offsetHeight : 0) + "px");
  }

  // Small status message ("Picture saved").
  let toastTimer = 0;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }
  window.addEventListener("popstate", e => {
    // Back button while comparing just closes the comparison.
    if (cmp.open) { cmp.close(); return; }
    showStep(e.state?.step || 1, false);
  });
  history.replaceState({ step: 1 }, "");
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showStep(+b.dataset.go)));

  // Images are cached so the compare view and the preview share downloads.
  const imgCache = new Map();
  function loadImg(src) {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => { imgCache.delete(src); rej(new Error("load " + src)); };
        im.src = src;
      }));
    }
    return imgCache.get(src);
  }

  // ---------- Step 1: load photo ----------
  function usePhoto(src, quad) {
    const w = src.width, h = src.height, k = Math.min(1, MAX_PHOTO / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    state.photo = c;
    state.baseQuad = quad ? quad.map(([x, y]) => [x * k, y * k]) : null;
    state.quad = state.baseQuad ? state.baseQuad.map(p => [...p]) : defaultQuad();
  }

  async function loadPhoto(file) {
    if (!file) return;
    let src;
    try {
      src = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      src = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = rej;
        im.src = URL.createObjectURL(file);
      });
    }
    usePhoto(src);
    showStep(2);
  }

  // Sample rooms: corners are already known, so go straight to the designs.
  async function loadRoom(room) {
    try {
      usePhoto(await loadImg(room.img), room.quad);
      showStep(3);
    } catch {
      toast(t("roomFail"));
    }
  }

  fetch("data/rooms.json")
    .then(r => r.json())
    .then(rooms => {
      const list = $("#roomsList");
      for (const room of rooms) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "room";
        b.innerHTML = '<img alt="" width="240" height="300" loading="lazy" decoding="async"><span></span>';
        b.querySelector("img").src = room.thumb;
        const label = b.querySelector("span");
        label.dataset.i18n = "room_" + room.id;
        label.textContent = t("room_" + room.id);
        b.onclick = () => loadRoom(room);
        list.appendChild(b);
      }
      $("#rooms").hidden = !rooms.length;
    })
    .catch(() => {});

  // Dev/QA only: ?qa=2 or ?qa=3 opens that step with a drawn sample wall (used for screenshots).
  const qaStep = +new URLSearchParams(location.search).get("qa");
  if (qaStep >= 2) {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 1600;
    const x = c.getContext("2d");
    x.fillStyle = "#e2d6c4"; x.fillRect(0, 0, 1200, 1600);
    x.fillStyle = "#96785c"; x.fillRect(0, 1350, 1200, 250);
    x.fillStyle = "#5a4637"; x.beginPath(); [[400, 310], [850, 365], [850, 1395], [400, 1365]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.fill();
    state.photo = c;
    state.quad = [[420, 330], [830, 380], [830, 1390], [420, 1360]];
    showStep(qaStep);
  }

  $("#camInput").addEventListener("change", e => loadPhoto(e.target.files[0]));
  $("#fileInput").addEventListener("change", e => loadPhoto(e.target.files[0]));

  function defaultQuad() {
    const W = state.photo.width, H = state.photo.height;
    let h = H * 0.7, w = h / 2.1;
    if (w > W * 0.6) { w = W * 0.6; h = w * 2.1; }
    const x = (W - w) / 2, y = (H - h) / 2;
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }

  // ---------- Canvas fitting ----------
  function fitCanvas(canvas, maxH, boxW) {
    const box = { width: boxW || canvas.parentElement.getBoundingClientRect().width };
    const W = state.photo.width, H = state.photo.height;
    const scale = Math.min(box.width / W, maxH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    return canvas.width / W; // photo px -> canvas px
  }
  // Soft, blurred copy of the photo fills the letterbox around the canvas (see .stage::before).
  let ambientFor = null;
  function syncAmbient() {
    if (!state.photo || ambientFor === state.photo) return;
    ambientFor = state.photo;
    const k = 48 / Math.max(state.photo.width, state.photo.height);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(state.photo.width * k));
    c.height = Math.max(1, Math.round(state.photo.height * k));
    c.getContext("2d").drawImage(state.photo, 0, 0, c.width, c.height);
    document.documentElement.style.setProperty("--stage-photo", `url(${c.toDataURL("image/jpeg", 0.7)})`);
  }
  const isPhone = () => matchMedia("(max-width: 860px)").matches;
  // Height left for a canvas whose stage starts at `stage`, keeping `below` px free underneath.
  const roomBelow = (stage, below) =>
    window.innerHeight - (stage.getBoundingClientRect().top + window.scrollY) - below;

  // ---------- Step 2: mark corners ----------
  const mark = $("#markCanvas"), mctx = mark.getContext("2d"), loupe = $("#loupe"), lctx = loupe.getContext("2d");
  let mScale = 1, drag = null;

  function layoutMark() {
    if (!state.photo) return;
    syncAmbient();
    const actions = $(".mark-actions");
    const maxH = roomBelow(mark.parentElement, (actions ? actions.offsetHeight : 60) + (isPhone() ? 24 : 56));
    // The frame hugs the photo, so measure the column it sits in rather than the stage.
    const frame = $("#markStage"), fs = getComputedStyle(frame);
    const boxW = frame.parentElement.clientWidth - parseFloat(fs.paddingLeft) - parseFloat(fs.paddingRight);
    mScale = fitCanvas(mark, Math.max(260, maxH), boxW);
    drawMark();
  }

  function drawMark() {
    const s = mScale, q = state.quad.map(([x, y]) => [x * s, y * s]);
    mctx.drawImage(state.photo, 0, 0, mark.width, mark.height);
    // Dim outside the door area.
    mctx.save();
    mctx.fillStyle = "rgba(0,0,0,.35)";
    mctx.beginPath();
    mctx.rect(0, 0, mark.width, mark.height);
    mctx.moveTo(...q[0]); q.slice(1).forEach(p => mctx.lineTo(...p)); mctx.closePath();
    mctx.fill("evenodd");
    mctx.restore();
    const dpr = mark.width / mark.clientWidth;
    mctx.lineWidth = 2 * dpr;
    mctx.strokeStyle = "#C89B3C";
    mctx.setLineDash([8 * dpr, 6 * dpr]);
    mctx.beginPath(); mctx.moveTo(...q[0]); q.slice(1).forEach(p => mctx.lineTo(...p)); mctx.closePath(); mctx.stroke();
    mctx.setLineDash([]);
    // Numbered handles (1 TL, 2 TR, 3 BR, 4 BL) matching the guide card.
    q.forEach(([x, y], i) => {
      const active = drag?.i === i, r = (active ? 15 : 12.5) * dpr;
      mctx.save();
      mctx.shadowColor = "rgba(0,0,0,.45)"; mctx.shadowBlur = 8 * dpr; mctx.shadowOffsetY = 2 * dpr;
      if (active) {
        mctx.beginPath(); mctx.arc(x, y, r + 7 * dpr, 0, Math.PI * 2);
        mctx.fillStyle = "rgba(200,155,60,.28)"; mctx.fill();
      }
      mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2);
      mctx.fillStyle = active ? "#DDB25A" : "#C89B3C"; mctx.fill();
      mctx.restore();
      mctx.lineWidth = 2.5 * dpr; mctx.strokeStyle = "#fff";
      mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2); mctx.stroke();
      mctx.fillStyle = "#3E2F25";
      mctx.font = `700 ${Math.round(13 * dpr)}px Montserrat, system-ui, sans-serif`;
      mctx.textAlign = "center"; mctx.textBaseline = "middle";
      mctx.fillText(String(i + 1), x, y + 0.5 * dpr);
    });
  }

  function toPhoto(e) {
    const r = mark.getBoundingClientRect();
    const k = state.photo.width / r.width;
    return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
  }

  function insideQuad([x, y], q) {
    let inside = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
      const [xi, yi] = q[i], [xj, yj] = q[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  mark.addEventListener("pointerdown", e => {
    const p = toPhoto(e);
    const hit = HANDLE_HIT * (state.photo.width / mark.clientWidth);
    let best = -1, bd = Infinity;
    state.quad.forEach(([x, y], i) => {
      const d = Math.hypot(x - p[0], y - p[1]);
      if (d < bd) { bd = d; best = i; }
    });
    if (bd <= hit) drag = { i: best, off: [state.quad[best][0] - p[0], state.quad[best][1] - p[1]] };
    else if (insideQuad(p, state.quad)) drag = { i: -1, last: p };
    else return;
    mark.setPointerCapture(e.pointerId);
    e.preventDefault();
    drawMark();
    drawLoupe();
  });

  mark.addEventListener("pointermove", e => {
    if (!drag) return;
    const p = toPhoto(e), W = state.photo.width, H = state.photo.height;
    const clamp = ([x, y]) => [Math.max(0, Math.min(W, x)), Math.max(0, Math.min(H, y))];
    if (drag.i >= 0) {
      state.quad[drag.i] = clamp([p[0] + drag.off[0], p[1] + drag.off[1]]);
    } else {
      const dx = p[0] - drag.last[0], dy = p[1] - drag.last[1];
      state.quad = state.quad.map(([x, y]) => clamp([x + dx, y + dy]));
      drag.last = p;
    }
    drawMark();
    drawLoupe();
  });

  const endDrag = () => { drag = null; loupe.hidden = true; drawMark(); };
  mark.addEventListener("pointerup", endDrag);
  mark.addEventListener("pointercancel", endDrag);

  // Magnifier so a finger doesn't hide the exact corner.
  function drawLoupe() {
    if (!drag || drag.i < 0) { loupe.hidden = true; return; }
    const [x, y] = state.quad[drag.i];
    const zoom = 3, displayK = mark.clientWidth / state.photo.width;
    const r = 70 / (zoom * displayK);
    loupe.hidden = false;
    loupe.classList.toggle("right", x < state.photo.width / 2 && y < state.photo.height / 2);
    lctx.fillStyle = "#000"; lctx.fillRect(0, 0, 140, 140);
    lctx.drawImage(state.photo, x - r, y - r, r * 2, r * 2, 0, 0, 140, 140);
    // Neighbouring edges for alignment.
    const toL = ([px, py]) => [(px - x + r) * (70 / r), (py - y + r) * (70 / r)];
    const q = state.quad, i = drag.i;
    lctx.strokeStyle = "rgba(200,155,60,.9)"; lctx.lineWidth = 2;
    lctx.beginPath();
    lctx.moveTo(...toL(q[(i + 3) % 4])); lctx.lineTo(70, 70); lctx.lineTo(...toL(q[(i + 1) % 4]));
    lctx.stroke();
    lctx.strokeStyle = "#fff"; lctx.lineWidth = 1.5;
    lctx.beginPath(); lctx.moveTo(70, 52); lctx.lineTo(70, 88); lctx.moveTo(52, 70); lctx.lineTo(88, 70); lctx.stroke();
  }

  $("#resetCorners").addEventListener("click", () => {
    state.quad = state.baseQuad ? state.baseQuad.map(p => [...p]) : defaultQuad();
    drawMark();
  });
  $("#toDesigns").addEventListener("click", () => showStep(3));

  // ---------- Step 3: preview ----------
  const view = $("#viewCanvas"), vctx = view.getContext("2d", { willReadFrequently: true });
  let vScale = 1, renderQueued = false;

  function layoutView() {
    if (!state.photo) return;
    syncAmbient();
    let maxH;
    if (isPhone()) {
      maxH = Math.min(440, Math.max(200, window.innerHeight * 0.38));
    } else {
      const h = s => ($(s) ? $(s).offsetHeight : 0);
      // Leave room for the tool strip, selection bar and note under the preview.
      maxH = Math.max(320, roomBelow(view.parentElement, h(".tools") + h(".selbar") + h(".send-note") + 64));
    }
    vScale = fitCanvas(view, maxH);
    renderView();
  }

  function renderView() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      vctx.drawImage(state.photo, 0, 0, view.width, view.height);
      if (state.doorImg) {
        drawWarpedDoor(vctx, state.doorImg, state.quad.map(([x, y]) => [x * vScale, y * vScale]), { light: state.light });
      } else {
        const q = state.quad.map(([x, y]) => [x * vScale, y * vScale]);
        vctx.fillStyle = "rgba(200,155,60,.25)"; vctx.strokeStyle = "#C89B3C"; vctx.lineWidth = 2;
        vctx.beginPath(); vctx.moveTo(...q[0]); q.slice(1).forEach(p => vctx.lineTo(...p)); vctx.closePath();
        vctx.fill(); vctx.stroke();
      }
    });
  }

  $("#light").addEventListener("input", e => { state.light = e.target.value / 100; renderView(); });
  window.addEventListener("resize", () => {
    syncTopbar();
    state.step === 2 ? layoutMark() : state.step === 3 ? layoutView() : null;
  });

  // Selection bar text (also re-run when the language changes).
  function renderSel() {
    const d = state.door;
    $("#selBrand").textContent = d?.brand || t("yourSelection");
    $("#selCode").textContent = d ? d.code : t("pickDesign");
    $("#selCat").textContent = d ? d.catalog : t("pickHint");
    $("#liveCode").textContent = d ? d.code : t("livePreview");
    const fav = $("#favSel");
    fav.hidden = !d;
    if (d) setFavButton(fav, isFav(d.id));
  }

  let loadToken = 0;
  function selectDoor(d) {
    state.door = d;
    const token = ++loadToken;
    renderSel();
    const thumb = $("#selThumb");
    thumb.hidden = false;
    thumb.src = d.thumb;
    thumb.alt = `Design ${d.code}`;
    document.querySelectorAll(".tile").forEach(tile => {
      const on = tile.dataset.id === d.id;
      tile.classList.toggle("on", on);
      tile.querySelector(".tile-pick")?.setAttribute("aria-pressed", on);
    });
    $("#viewLoader").hidden = false;
    loadImg(d.img).then(img => {
      if (token !== loadToken) return;
      state.doorImg = img;
      $("#viewLoader").hidden = true;
      renderView();
      updateSendButtons();
    }, () => {
      if (token !== loadToken) return;
      $("#viewLoader").hidden = true;
      toast(t("designFail"));
    });
  }

  // ---------- Saved designs ----------
  function loadFavs() {
    try {
      const v = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return Array.isArray(v) ? v.filter(x => typeof x === "string").slice(-100) : [];
    } catch {
      return [];
    }
  }
  function saveFavs() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(state.favs)); } catch {}
  }
  const isFav = id => state.favs.includes(id);
  // Newest first, skipping designs that are no longer in the catalog.
  const favDoors = () => state.favs.map(id => state.byId.get(id)).filter(Boolean).reverse();

  function setFavButton(b, on) {
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", t(on ? "favRemove" : "favAdd"));
  }

  function toggleFav(d) {
    if (isFav(d.id)) {
      state.favs = state.favs.filter(id => id !== d.id);
      toast(t("favRemoved", { code: d.code }));
    } else {
      state.favs.push(d.id);
      toast(t("favAdded", { code: d.code }));
    }
    saveFavs();
    syncFavs();
    if (state.saved) renderGrid();
  }

  function syncFavs() {
    const n = favDoors().length;
    $("#favCount").textContent = n;
    $("#favCount").hidden = !n;
    $("#compareBtn").classList.toggle("dim", n < 2);
    const savedCount = $("#savedCount");
    if (savedCount) savedCount.textContent = n || "";
    document.querySelectorAll(".tile[data-id]").forEach(tile => {
      const b = tile.querySelector(".fav");
      if (b) setFavButton(b, isFav(tile.dataset.id));
    });
    if (state.door) setFavButton($("#favSel"), isFav(state.door.id));
  }

  $("#favSel").addEventListener("click", () => state.door && toggleFav(state.door));

  // ---------- Gallery ----------
  const norm = s => s.toLowerCase().replace(/[\s\-_.()]/g, "");

  function chip(label, on, onClick, cls = "") {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "chip" + (cls ? " " + cls : "") + (on ? " on" : "");
    el.setAttribute("aria-pressed", on);
    el.textContent = label;
    el.onclick = onClick;
    return el;
  }

  function renderChips() {
    const bc = $("#brandChips");
    bc.innerHTML = "";
    const saved = chip("", state.saved, () => {
      state.saved = !state.saved;
      renderChips(); renderGrid();
    }, "chip-saved");
    saved.innerHTML = `${HEART}<span></span><b id="savedCount"></b>`;
    saved.querySelector("span").textContent = t("saved");
    saved.querySelector("b").textContent = favDoors().length || "";
    bc.appendChild(saved);
    const brands = ["All", ...new Set(state.data.catalogs.map(c => c.brand))];
    brands.forEach(b => bc.appendChild(chip(b === "All" ? t("all") : b, !state.saved && b === state.brand, () => {
      state.brand = b; state.catalogId = null; state.saved = false;
      renderChips(); renderGrid();
    })));

    const cc = $("#catChips");
    cc.innerHTML = "";
    const cats = state.data.catalogs.filter(c => c.brand === state.brand);
    cc.hidden = state.saved || cats.length < 2;
    [{ id: null, name: t("allOf", { brand: state.brand }) }, ...cats].forEach(c =>
      cc.appendChild(chip(c.name, c.id === state.catalogId, () => {
        state.catalogId = c.id; renderChips(); renderGrid();
      })));

    const lc = $("#lookChips");
    lc.innerHTML = "";
    lc.hidden = state.saved;
    LOOKS.forEach(look => {
      const el = chip("", state.look === look, () => {
        state.look = state.look === look ? null : look;   // tap again to clear
        renderChips(); renderGrid();
      }, "chip-look");
      el.innerHTML = `<i class="sw sw-${look}" aria-hidden="true"></i><span></span>`;
      el.querySelector("span").textContent = t("look_" + look);
      lc.appendChild(el);
    });
  }

  function filtered() {
    const q = norm(state.query);
    const match = d => !q || norm(d.code).includes(q);
    if (state.saved) return favDoors().filter(match);
    const brandOf = Object.fromEntries(state.data.catalogs.map(c => [c.id, c.brand]));
    return state.data.doors.filter(d =>
      (state.brand === "All" || brandOf[d.catalogId] === state.brand) &&
      (!state.catalogId || d.catalogId === state.catalogId) &&
      (!state.look || d.look === state.look) &&
      match(d));
  }

  function renderGrid() {
    const list = filtered(), grid = $("#grid");
    grid.innerHTML = "";
    grid.scrollTop = 0;
    const frag = document.createDocumentFragment();
    for (const d of list) {
      const on = state.door?.id === d.id;
      const tile = document.createElement("div");
      tile.className = "tile" + (on ? " on" : "");
      tile.dataset.id = d.id;
      tile.innerHTML = '<button type="button" class="tile-pick"><span class="tile-img"><img loading="lazy" decoding="async" alt=""></span><span class="tile-code"></span></button>'
        + `<button type="button" class="fav">${HEART}</button>`;
      const pick = tile.firstChild;
      pick.setAttribute("aria-pressed", on);
      pick.title = `${d.code} · ${d.catalog}`;
      const img = pick.querySelector("img");
      img.onload = () => tile.classList.add("ready");
      img.onerror = () => tile.classList.add("ready", "broken");
      img.src = d.thumb;
      pick.querySelector(".tile-code").textContent = d.code;
      pick.onclick = () => selectDoor(d);
      const fav = tile.lastChild;
      setFavButton(fav, isFav(d.id));
      fav.onclick = () => toggleFav(d);
      frag.appendChild(tile);
    }
    grid.appendChild(frag);
    const n = list.length;
    $("#count").textContent = n === 1 ? t("oneDesign") : t("nDesigns", { n: n.toLocaleString("en-IN") });
    grid.hidden = !n;
    $("#empty").hidden = !!n;
    if (!n) {
      $("#emptyText").textContent = state.query ? t("noMatch", { q: state.query })
        : state.saved ? t("noSaved")
        : state.look ? t("noLook")
        : t("emptyCat");
    }
  }

  function setQuery(v) {
    state.query = v;
    $("#searchClear").hidden = !v;
    renderGrid();
  }
  $("#search").addEventListener("input", e => setQuery(e.target.value));
  $("#searchClear").addEventListener("click", () => { $("#search").value = ""; setQuery(""); $("#search").focus(); });
  $("#emptyReset").addEventListener("click", () => {
    $("#search").value = "";
    state.brand = "All"; state.catalogId = null; state.look = null; state.saved = false;
    renderChips(); setQuery("");
  });

  // Placeholder tiles while the catalog loads.
  $("#grid").innerHTML = '<span class="tile skeleton" aria-hidden="true"><span class="tile-img"></span><span class="tile-code"></span></span>'.repeat(12);
  $("#count").textContent = t("loading");
  let catalogReady = false;

  fetch("data/catalog.json", { cache: "no-cache" })
    .then(r => r.json())
    .then(data => {
      state.data = data;
      state.byId = new Map(data.doors.map(d => [d.id, d]));
      catalogReady = true;
      renderChips(); renderGrid(); syncFavs();
      if (designParam) {
        pendingDesign = state.byId.get(designParam) || null;
        if (pendingDesign) toast(t("deepLink", { code: pendingDesign.code }));
        if (pendingDesign && state.step === 3) { selectDoor(pendingDesign); pendingDesign = null; }
      }
      if (qaStep === 3 && data.doors.length && !state.door) selectDoor(data.doors[0]);
    })
    .catch(() => {
      $("#count").textContent = "";
      $("#grid").hidden = true;
      $("#empty").hidden = false;
      $("#emptyText").textContent = t("loadFail");
    });

  // ---------- Compare saved designs on the wall ----------
  const cmp = $("#compare");

  function compareList() {
    return favDoors().slice(0, 4);
  }

  function openCompare() {
    if (favDoors().length < 2) { toast(t("cmpNeed")); return; }
    renderCompare();
    cmp.showModal();
    history.pushState({ step: state.step, cmp: true }, "");
  }

  function closeCompare() {
    if (history.state?.cmp) history.back();   // popstate closes the dialog
    else cmp.close();
  }

  // Photo + warped door at reduced size; resolves once the door is drawn.
  function drawOnWall(ctx, w, h, d) {
    ctx.drawImage(state.photo, 0, 0, w, h);
    const k = w / state.photo.width;
    return loadImg(d.img).then(img =>
      drawWarpedDoor(ctx, img, state.quad.map(([x, y]) => [x * k, y * k]), { light: state.light }));
  }

  function renderCompare() {
    const list = compareList();
    if (list.length < 2) { closeCompare(); return; }
    $("#cmpSub").textContent = favDoors().length > 4 ? t("cmpLatest") : t("cmpSub");
    const grid = $("#cmpGrid");
    grid.innerHTML = "";
    grid.dataset.n = list.length;
    const k = Math.min(1, 720 / Math.max(state.photo.width, state.photo.height));
    const w = Math.round(state.photo.width * k), h = Math.round(state.photo.height * k);
    for (const d of list) {
      const fig = document.createElement("figure");
      fig.className = "cmp-cell" + (state.door?.id === d.id ? " on" : "");
      fig.innerHTML = '<div class="cmp-pic"><canvas></canvas></div><figcaption><span class="cmp-meta"><b></b><span></span></span>'
        + '<span class="cmp-btns"><button type="button" class="btn btn-primary cmp-use"></button>'
        + `<button type="button" class="fav on cmp-remove">${HEART}</button></span></figcaption>`;
      const c = fig.querySelector("canvas");
      c.width = w; c.height = h;
      drawOnWall(c.getContext("2d", { willReadFrequently: true }), w, h, d).catch(() => {});
      fig.querySelector(".cmp-meta b").textContent = d.code;
      fig.querySelector(".cmp-meta span").textContent = d.catalog;
      const use = fig.querySelector(".cmp-use");
      use.textContent = t("cmpUse");
      use.onclick = () => { selectDoor(d); closeCompare(); };
      const rm = fig.querySelector(".cmp-remove");
      rm.setAttribute("aria-label", `${t("cmpRemove")} ${d.code}`);
      rm.onclick = () => { toggleFav(d); renderCompare(); };
      grid.appendChild(fig);
    }
  }

  $("#compareBtn").addEventListener("click", openCompare);
  $("#cmpClose").addEventListener("click", closeCompare);
  cmp.addEventListener("cancel", e => { e.preventDefault(); closeCompare(); });
  cmp.addEventListener("click", e => { if (e.target === cmp) closeCompare(); });

  // ---------- Export & WhatsApp ----------
  const logo = new Image();
  logo.src = "assets/logo-dark.png";

  // Dark brand strip with the logo on the left and two lines of text on the right.
  function drawBand(x, W, y, band, title, sub) {
    x.fillStyle = "#3E2F25";
    x.fillRect(0, y, W, band);
    if (logo.complete && logo.naturalWidth) {
      const lh = band * 0.8, lw = lh * logo.naturalWidth / logo.naturalHeight;
      x.drawImage(logo, band * 0.15, y + band * 0.1, lw, lh);
    }
    x.fillStyle = "#DCC7A7";
    x.textAlign = "right"; x.textBaseline = "middle";
    x.font = `700 ${Math.round(band * 0.3)}px Montserrat, sans-serif`;
    x.fillText(title, W - band * 0.3, y + band * 0.38);
    x.font = `500 ${Math.round(band * 0.2)}px Montserrat, sans-serif`;
    x.fillStyle = "#C89B3C";
    x.fillText(sub, W - band * 0.3, y + band * 0.72);
  }

  async function composite() {
    const W = state.photo.width, H = state.photo.height;
    const band = Math.round(Math.max(80, W * 0.1));
    const c = document.createElement("canvas");
    c.width = W; c.height = H + band;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(state.photo, 0, 0);
    if (state.doorImg) drawWarpedDoor(x, state.doorImg, state.quad, { light: state.light });
    drawBand(x, W, H, band, state.door ? `Design ${state.door.code}` : "", state.door ? state.door.catalog : "");
    return new Promise(res => c.toBlob(res, "image/jpeg", 0.88));
  }

  // All compared designs in one picture: a grid of the wall with each door, code under each.
  async function compositeMany(list) {
    const k = Math.min(1, 900 / Math.max(state.photo.width, state.photo.height));
    const cw = Math.round(state.photo.width * k), ch = Math.round(state.photo.height * k);
    const cols = Math.min(2, list.length), rows = Math.ceil(list.length / cols);
    const gap = 18, label = 64;
    const W = cols * cw + (cols + 1) * gap;
    const band = Math.round(Math.max(80, W * 0.08));
    const c = document.createElement("canvas");
    c.width = W; c.height = rows * (ch + label) + (rows + 1) * gap - gap / 2 + band;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.fillStyle = "#F3EEE6";
    x.fillRect(0, 0, c.width, c.height);
    const cell = document.createElement("canvas");
    cell.width = cw; cell.height = ch;
    const cx = cell.getContext("2d", { willReadFrequently: true });
    for (const [i, d] of list.entries()) {
      const px = gap + (i % cols) * (cw + gap), py = gap + Math.floor(i / cols) * (ch + label + gap);
      await drawOnWall(cx, cw, ch, d);
      x.drawImage(cell, px, py);
      x.fillStyle = "#3E2F25"; x.textAlign = "left"; x.textBaseline = "middle";
      x.font = "700 26px Montserrat, sans-serif";
      x.fillText(d.code, px + 4, py + ch + label * 0.42);
      x.fillStyle = "#8a6420";
      x.font = "500 17px Montserrat, sans-serif";
      x.fillText(d.catalog, px + 4, py + ch + label * 0.8);
    }
    drawBand(x, W, c.height - band, band, `${list.length} designs`, cfg.whatsappDisplay);
    return new Promise(res => c.toBlob(res, "image/jpeg", 0.88));
  }

  const message = () => state.door
    ? t("msgOne", { shop: cfg.shopName, code: state.door.code, cat: state.door.catalog })
    : t("msgAny", { shop: cfg.shopName });
  const manyMessage = list =>
    t("msgMany", { shop: cfg.shopName, list: list.map(d => `• ${d.code} (${d.catalog})`).join("\n") });
  const waLink = (text = message()) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(text)}`;
  const safeName = s => s.replace(/[^\w-]+/g, "-");

  function updateSendButtons() {
    $("#chatWa").href = waLink();
    $("#shareWa").disabled = !state.doorImg;
    $("#download").disabled = !state.doorImg;
  }
  $("#waNumber").textContent = cfg.whatsappDisplay;
  updateSendButtons();
  renderSel();

  function downloadBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  $("#download").addEventListener("click", async () => {
    downloadBlob(await composite(), `sparsh360-${safeName(state.door?.code || "door")}.jpg`);
    toast(t("pictureSaved"));
  });

  // Phones: native share sheet with the picture. Laptops/older browsers: save it, then open the chat.
  async function shareToWhatsApp(btn, makeBlob, name, text) {
    btn.disabled = true;
    try {
      const blob = await makeBlob();
      const file = new File([blob], name, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text: `${text}\n${t("sendTo", { shop: cfg.shopName, wa: cfg.whatsappDisplay })}` });
        } catch (err) { if (err.name !== "AbortError") throw err; }
      } else {
        downloadBlob(blob, name);
        toast(t("attachInChat"));
        window.open(waLink(text), "_blank", "noopener");
      }
    } finally {
      btn.disabled = false;
    }
  }

  $("#shareWa").addEventListener("click", () =>
    shareToWhatsApp($("#shareWa"), composite, `sparsh360-${safeName(state.door?.code || "door")}.jpg`, message()));

  $("#cmpShare").addEventListener("click", () => {
    const list = compareList();
    shareToWhatsApp($("#cmpShare"), () => compositeMany(list), "sparsh360-shortlist.jpg", manyMessage(list));
  });

  // ---------- Language ----------
  I18N.onChange(() => {
    $("#waNumber").textContent = cfg.whatsappDisplay;   // the note's markup was re-rendered
    renderSel();
    updateSendButtons();
    if (catalogReady) { renderChips(); renderGrid(); syncFavs(); }
    if (cmp.open) renderCompare();
    syncTopbar();
  });
})();
