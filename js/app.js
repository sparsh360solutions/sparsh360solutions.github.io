// Sparsh 360 Door Studio — customer app.
(() => {
  const cfg = window.SPARSH;
  const $ = s => document.querySelector(s);
  const MAX_PHOTO = 2000;        // working photo resolution (long side)
  const HANDLE_HIT = 34;         // touch radius for corner handles (css px)

  const state = {
    step: 1,
    photo: null,                 // canvas holding the working photo
    quad: null,                  // [[x,y] x4] TL,TR,BR,BL in photo pixels
    door: null,                  // catalog entry
    doorImg: null,               // loaded <img>
    light: 1,
    brand: "All",
    catalogId: null,
    query: "",
    data: { catalogs: [], doors: [] },
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
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
  }
  window.addEventListener("popstate", e => showStep(e.state?.step || 1, false));
  history.replaceState({ step: 1 }, "");
  document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => showStep(+b.dataset.go)));

  // ---------- Step 1: load photo ----------
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
    const w = src.width, h = src.height, k = Math.min(1, MAX_PHOTO / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    state.photo = c;
    state.quad = defaultQuad();
    showStep(2);
  }
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

  $("#resetCorners").addEventListener("click", () => { state.quad = defaultQuad(); drawMark(); });
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

  let loadToken = 0;
  function selectDoor(d) {
    state.door = d;
    const token = ++loadToken;
    $("#selBrand").textContent = d.brand || "Selected design";
    $("#selCode").textContent = d.code;
    $("#selCat").textContent = d.catalog;
    $("#liveCode").textContent = d.code;
    const thumb = $("#selThumb");
    thumb.hidden = false;
    thumb.src = d.thumb;
    thumb.alt = `Design ${d.code}`;
    document.querySelectorAll(".tile").forEach(t => {
      const on = t.dataset.id === d.id;
      t.classList.toggle("on", on);
      t.setAttribute("aria-pressed", on);
    });
    $("#viewLoader").hidden = false;
    const img = new Image();
    img.onload = () => {
      if (token !== loadToken) return;
      state.doorImg = img;
      $("#viewLoader").hidden = true;
      renderView();
      updateSendButtons();
    };
    img.onerror = () => {
      if (token !== loadToken) return;
      $("#viewLoader").hidden = true;
      toast("Couldn't load this design. Please try another.");
    };
    img.src = d.img;
  }

  // ---------- Gallery ----------
  const norm = s => s.toLowerCase().replace(/[\s\-_.()]/g, "");

  function renderChips() {
    const brands = ["All", ...new Set(state.data.catalogs.map(c => c.brand))];
    const bc = $("#brandChips");
    bc.innerHTML = "";
    brands.forEach(b => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "chip" + (b === state.brand ? " on" : "");
      el.setAttribute("aria-pressed", b === state.brand);
      el.textContent = b;
      el.onclick = () => { state.brand = b; state.catalogId = null; renderChips(); renderGrid(); };
      bc.appendChild(el);
    });
    const cc = $("#catChips");
    cc.innerHTML = "";
    const cats = state.data.catalogs.filter(c => c.brand === state.brand);
    cc.hidden = cats.length < 2;
    [{ id: null, name: "All " + state.brand }, ...cats].forEach(c => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "chip" + (c.id === state.catalogId ? " on" : "");
      el.setAttribute("aria-pressed", c.id === state.catalogId);
      el.textContent = c.name;
      el.onclick = () => { state.catalogId = c.id; renderChips(); renderGrid(); };
      cc.appendChild(el);
    });
  }

  function filtered() {
    const q = norm(state.query);
    const brandOf = Object.fromEntries(state.data.catalogs.map(c => [c.id, c.brand]));
    return state.data.doors.filter(d =>
      (state.brand === "All" || brandOf[d.catalogId] === state.brand) &&
      (!state.catalogId || d.catalogId === state.catalogId) &&
      (!q || norm(d.code).includes(q)));
  }

  function renderGrid() {
    const list = filtered(), grid = $("#grid");
    grid.innerHTML = "";
    grid.scrollTop = 0;
    const frag = document.createDocumentFragment();
    for (const d of list) {
      const on = state.door?.id === d.id;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tile" + (on ? " on" : "");
      b.dataset.id = d.id;
      b.setAttribute("aria-pressed", on);
      b.title = `${d.code} · ${d.catalog}`;
      b.innerHTML = `<span class="tile-img"><img loading="lazy" decoding="async" alt=""></span><span class="tile-code"></span>`;
      const img = b.querySelector("img");
      img.onload = () => b.classList.add("ready");
      img.onerror = () => b.classList.add("ready", "broken");
      img.src = d.thumb;
      b.querySelector(".tile-code").textContent = d.code;
      b.onclick = () => selectDoor(d);
      frag.appendChild(b);
    }
    grid.appendChild(frag);
    const n = list.length;
    $("#count").textContent = n ? `${n.toLocaleString("en-IN")} design${n === 1 ? "" : "s"}` : "0 designs";
    grid.hidden = !n;
    $("#empty").hidden = !!n;
    if (!n) {
      $("#emptyText").textContent = state.query
        ? `Nothing matches “${state.query}”. Check the code or try another brand.`
        : "No designs in this catalog yet.";
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
    state.brand = "All"; state.catalogId = null;
    renderChips(); setQuery("");
  });

  // Placeholder tiles while the catalog loads.
  $("#grid").innerHTML = '<span class="tile skeleton" aria-hidden="true"><span class="tile-img"></span><span class="tile-code"></span></span>'.repeat(12);
  $("#count").textContent = "Loading…";

  fetch("data/catalog.json", { cache: "no-cache" })
    .then(r => r.json())
    .then(data => {
      state.data = data; renderChips(); renderGrid();
      if (designParam) {
        pendingDesign = data.doors.find(d => d.id === designParam) || null;
        if (pendingDesign) toast(`Design ${pendingDesign.code} selected — take a photo of your wall to try it`);
        if (pendingDesign && state.step === 3) { selectDoor(pendingDesign); pendingDesign = null; }
      }
      if (qaStep === 3 && data.doors.length && !state.door) selectDoor(data.doors[0]);
    })
    .catch(() => {
      $("#count").textContent = "";
      $("#grid").hidden = true;
      $("#empty").hidden = false;
      $("#emptyText").textContent = "Couldn't load designs. Please check your connection and refresh.";
    });

  // ---------- Export & WhatsApp ----------
  const logo = new Image();
  logo.src = "assets/logo-dark.png";

  async function composite() {
    const W = state.photo.width, H = state.photo.height;
    const band = Math.round(Math.max(80, W * 0.1));
    const c = document.createElement("canvas");
    c.width = W; c.height = H + band;
    const x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(state.photo, 0, 0);
    if (state.doorImg) drawWarpedDoor(x, state.doorImg, state.quad, { light: state.light });
    x.fillStyle = "#3E2F25";
    x.fillRect(0, H, W, band);
    if (logo.complete && logo.naturalWidth) {
      const lh = band * 0.8, lw = lh * logo.naturalWidth / logo.naturalHeight;
      x.drawImage(logo, band * 0.15, H + band * 0.1, lw, lh);
    }
    x.fillStyle = "#DCC7A7";
    x.textAlign = "right"; x.textBaseline = "middle";
    x.font = `700 ${Math.round(band * 0.3)}px Montserrat, sans-serif`;
    x.fillText(state.door ? `Design ${state.door.code}` : "", W - band * 0.3, H + band * 0.38);
    x.font = `500 ${Math.round(band * 0.2)}px Montserrat, sans-serif`;
    x.fillStyle = "#C89B3C";
    x.fillText(state.door ? state.door.catalog : "", W - band * 0.3, H + band * 0.72);
    return new Promise(res => c.toBlob(res, "image/jpeg", 0.88));
  }

  const message = () => state.door
    ? `Hi ${cfg.shopName}! I like door design ${state.door.code} (${state.door.catalog}). Please share the price and details.`
    : `Hi ${cfg.shopName}! I'd like to know more about your lamination doors.`;
  const waLink = () => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(message())}`;
  const fileName = () => `sparsh360-${(state.door?.code || "door").replace(/[^\w-]+/g, "-")}.jpg`;

  function updateSendButtons() {
    $("#chatWa").href = waLink();
    $("#shareWa").disabled = !state.doorImg;
    $("#download").disabled = !state.doorImg;
  }
  $("#waNumber").textContent = cfg.whatsappDisplay;
  updateSendButtons();

  function downloadBlob(blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  $("#download").addEventListener("click", async () => {
    downloadBlob(await composite());
    toast("Picture saved");
  });

  $("#shareWa").addEventListener("click", async () => {
    const btn = $("#shareWa");
    btn.disabled = true;
    try {
      const blob = await composite();
      const file = new File([blob], fileName(), { type: "image/jpeg" });
      const text = `${message()}\n(Send to ${cfg.shopName}: ${cfg.whatsappDisplay})`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); }
        catch (err) { if (err.name !== "AbortError") throw err; }
      } else {
        // Laptops/older browsers: save the picture, then open the chat so it can be attached.
        downloadBlob(blob);
        toast("Picture saved — attach it in the WhatsApp chat");
        window.open(waLink(), "_blank", "noopener");
      }
    } finally {
      btn.disabled = false;
    }
  });
})();
