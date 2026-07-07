/* Flocker offline renderer — feed management + local record storage. */
(function () {
  "use strict";

  var INGREDIENTS = window.INGREDIENTS || [];
  var STAGE_TARGETS = window.STAGE_TARGETS || [];
  var ingByName = {};
  INGREDIENTS.forEach(function (i) { ingByName[i.name] = i; });

  var main = document.getElementById("main");
  var LS = {
    get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem(k, JSON.stringify(v)); },
  };

  function uid() { return Math.random().toString(36).slice(2, 10); }
  function fmt(n, dp) { dp = dp == null ? 1 : dp; return (n || 0).toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------------- Feed Management ---------------- */
  function defaultRows() {
    return [
      { id: uid(), name: "Maize (yellow)", kg: 55, price: 4.5 },
      { id: uid(), name: "Soya bean meal (solvent-ext.)", kg: 22, price: 9.0 },
      { id: uid(), name: "Wheat bran", kg: 12, price: 2.5 },
      { id: uid(), name: "Fish meal (65% CP)", kg: 5, price: 14 },
      { id: uid(), name: "Oyster shell", kg: 5, price: 1.2 },
      { id: uid(), name: "Vitamin-mineral premix", kg: 1, price: 22 },
    ];
  }

  function computeTotals(rows) {
    var kg = 0, cost = 0;
    rows.forEach(function (r) { kg += +r.kg || 0; cost += (+r.kg || 0) * (+r.price || 0); });
    var basis = kg > 0 ? kg : 1;
    var t = { kg: kg, cp: 0, me: 0, ca: 0, avP: 0, lys: 0, meth: 0, cf: 0, cost: cost };
    rows.forEach(function (r) {
      var ing = ingByName[r.name]; if (!ing) return;
      var f = (+r.kg || 0) / basis;
      t.cp += f * ing.cp; t.me += f * ing.me; t.ca += f * ing.ca;
      t.avP += f * ing.avP; t.lys += f * ing.lys; t.meth += f * ing.meth; t.cf += f * ing.cf;
    });
    t.costPerKg = kg > 0 ? cost / kg : 0;
    return t;
  }
  function status(ach, tgt) {
    if (!tgt) return "met";
    var d = Math.abs((ach - tgt) / tgt) * 100;
    return d <= 5 ? "met" : d <= 15 ? "close" : "deficit";
  }
  function cfStatus(ach, max) { return ach <= max ? "met" : ach <= max * 1.15 ? "close" : "deficit"; }
  function pill(s) { return '<span class="pill ' + s + '">' + (s === "met" ? "On target" : s === "close" ? "Close" : "Off") + "</span>"; }

  function renderFeed() {
    var rows = LS.get("flocker.ration", defaultRows());
    var stageIdx = LS.get("flocker.stage", 3);
    var target = STAGE_TARGETS[stageIdx] || STAGE_TARGETS[0];
    var t = computeTotals(rows);

    var opts = INGREDIENTS.map(function (i) { return '<option value="' + esc(i.name) + '">' + esc(i.name) + "</option>"; }).join("");
    var stageOpts = STAGE_TARGETS.map(function (s, i) { return '<option value="' + i + '"' + (i === stageIdx ? " selected" : "") + ">" + esc(s.stage) + "</option>"; }).join("");

    var body = rows.map(function (r) {
      return (
        '<tr data-id="' + r.id + '">' +
        '<td><select data-f="name">' + INGREDIENTS.map(function (i) { return '<option' + (i.name === r.name ? " selected" : "") + '>' + esc(i.name) + "</option>"; }).join("") + "</select></td>" +
        '<td class="num"><input data-f="kg" type="number" step="0.5" value="' + r.kg + '" /></td>' +
        '<td class="num"><input data-f="price" type="number" step="0.1" value="' + r.price + '" /></td>' +
        '<td class="num">' + fmt((+r.kg || 0) * (+r.price || 0), 2) + "</td>" +
        '<td><button class="link" data-del="' + r.id + '">Remove</button></td>' +
        "</tr>"
      );
    }).join("");

    function line(label, ach, tgt, unit, st) {
      return '<tr><td>' + label + '</td><td class="num">' + fmt(ach, unit === "kcal" ? 0 : 2) + '</td><td class="num">' + fmt(tgt, unit === "kcal" ? 0 : 2) + '</td><td>' + pill(st) + "</td></tr>";
    }

    main.innerHTML =
      '<h1>Feed Management</h1><p class="sub">Least-cost ration formulation — fully offline. Target stage sets the nutrient goals.</p>' +
      '<div class="stat">' +
      '<div class="card"><div class="big">' + fmt(t.kg, 0) + '</div><div class="lbl">Total kg</div></div>' +
      '<div class="card"><div class="big">GHS ' + fmt(t.cost, 2) + '</div><div class="lbl">Batch cost</div></div>' +
      '<div class="card"><div class="big">GHS ' + fmt(t.costPerKg, 2) + '</div><div class="lbl">Cost / kg</div></div>' +
      '<div class="card"><div class="big">' + fmt(t.cp, 1) + '%</div><div class="lbl">Crude protein</div></div>' +
      "</div>" +
      '<div class="grid2">' +
      '<div class="card"><div class="flex-between"><strong>Ration mix</strong>' +
      '<div class="row" style="gap:8px"><select id="stage" style="width:auto">' + stageOpts + '</select><button class="btn sm" id="addRow">+ Ingredient</button></div></div>' +
      '<table><thead><tr><th>Ingredient</th><th class="num">kg</th><th class="num">GHS/kg</th><th class="num">Subtotal</th><th></th></tr></thead><tbody id="rrows">' + body + "</tbody></table>" +
      '<div style="margin-top:14px"><button class="btn" id="saveMix">Save mix</button> <button class="btn ghost sm" id="resetMix">Reset</button></div></div>' +
      '<div class="card"><div class="flex-between"><strong>Nutrition vs target</strong><span class="badge">' + esc(target.stage) + '</span></div>' +
      '<table><thead><tr><th>Nutrient</th><th class="num">Achieved</th><th class="num">Target</th><th>Status</th></tr></thead><tbody>' +
      line("ME (kcal/kg)", t.me, target.me, "kcal", status(t.me, target.me)) +
      line("Crude protein %", t.cp, target.cp, "%", status(t.cp, target.cp)) +
      line("Calcium %", t.ca, target.ca, "%", status(t.ca, target.ca)) +
      line("Avail. P %", t.avP, target.avP, "%", status(t.avP, target.avP)) +
      line("Lysine %", t.lys, target.lys, "%", status(t.lys, target.lys)) +
      line("Methionine %", t.meth, target.meth, "%", status(t.meth, target.meth)) +
      line("Crude fibre % (max)", t.cf, target.cfMax, "%", cfStatus(t.cf, target.cfMax)) +
      "</tbody></table></div></div>";

    // Wire events
    function persist() { LS.set("flocker.ration", rows); LS.set("flocker.stage", stageIdx); renderFeed(); }
    document.getElementById("stage").onchange = function (e) { stageIdx = +e.target.value; persist(); };
    document.getElementById("addRow").onclick = function () { rows.push({ id: uid(), name: INGREDIENTS[0].name, kg: 0, price: 0 }); persist(); };
    document.getElementById("resetMix").onclick = function () { rows = defaultRows(); persist(); };
    document.getElementById("saveMix").onclick = function () { LS.set("flocker.ration", rows); flash("saveMix", "Saved ✓"); };
    document.querySelectorAll("#rrows tr").forEach(function (tr) {
      var id = tr.getAttribute("data-id");
      var row = rows.find(function (r) { return r.id === id; });
      tr.querySelectorAll("[data-f]").forEach(function (el) {
        el.onchange = function () {
          var f = el.getAttribute("data-f");
          row[f] = f === "name" ? el.value : +el.value;
          persist();
        };
      });
    });
    document.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () { rows = rows.filter(function (r) { return r.id !== b.getAttribute("data-del"); }); persist(); };
    });
  }

  function flash(id, text) {
    var el = document.getElementById(id); if (!el) return;
    var old = el.textContent; el.textContent = text;
    setTimeout(function () { if (el) el.textContent = old; }, 1200);
  }

  /* ---------------- Records ---------------- */
  var RECORD_TYPES = ["Mortality", "Feed purchase", "Vaccination", "Egg collection", "Sale", "Expense", "Note"];

  function renderRecords() {
    var recs = LS.get("flocker.records", []);
    recs.sort(function (a, b) { return b.date < a.date ? -1 : 1; });

    var typeOpts = RECORD_TYPES.map(function (t) { return "<option>" + t + "</option>"; }).join("");
    var today = new Date().toISOString().slice(0, 10);

    var list = recs.length
      ? recs.map(function (r) {
          return (
            "<tr>" +
            "<td>" + esc(r.date) + "</td>" +
            "<td>" + esc(r.type) + "</td>" +
            '<td class="num">' + (r.qty !== "" && r.qty != null ? esc(r.qty) : "—") + "</td>" +
            "<td>" + esc(r.note || "") + "</td>" +
            '<td><button class="link" data-del="' + r.id + '">Delete</button></td>' +
            "</tr>"
          );
        }).join("")
      : '<tr><td colspan="5" class="empty">No records yet. Add your first entry above — it stays on this laptop.</td></tr>';

    main.innerHTML =
      '<h1>Records</h1><p class="sub">Flock &amp; farm log — stored locally, available with no internet.</p>' +
      '<div class="card"><div class="row">' +
      '<div style="flex:1;min-width:130px"><label>Date</label><input id="rDate" type="date" value="' + today + '" /></div>' +
      '<div style="flex:1;min-width:150px"><label>Type</label><select id="rType">' + typeOpts + "</select></div>" +
      '<div style="flex:1;min-width:110px"><label>Quantity / amount</label><input id="rQty" type="text" placeholder="e.g. 5 or GHS 400" /></div>' +
      '<div style="flex:2;min-width:180px"><label>Note</label><input id="rNote" type="text" placeholder="Details (optional)" /></div>' +
      '<div><label>&nbsp;</label><button class="btn" id="addRec">Add record</button></div>' +
      "</div></div>" +
      '<div class="card"><div class="flex-between"><strong>' + recs.length + ' record' + (recs.length === 1 ? "" : "s") + "</strong>" +
      (recs.length ? '<button class="link" id="exportRec">Export CSV</button>' : "") + "</div>" +
      '<table><thead><tr><th>Date</th><th>Type</th><th class="num">Qty/Amount</th><th>Note</th><th></th></tr></thead><tbody>' + list + "</tbody></table></div>";

    document.getElementById("addRec").onclick = function () {
      var rec = {
        id: uid(),
        date: document.getElementById("rDate").value || today,
        type: document.getElementById("rType").value,
        qty: document.getElementById("rQty").value.trim(),
        note: document.getElementById("rNote").value.trim(),
      };
      recs.push(rec); LS.set("flocker.records", recs); renderRecords();
    };
    document.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        recs = recs.filter(function (r) { return r.id !== b.getAttribute("data-del"); });
        LS.set("flocker.records", recs); renderRecords();
      };
    });
    var ex = document.getElementById("exportRec");
    if (ex) ex.onclick = function () {
      var csv = "Date,Type,Quantity,Note\n" + recs.map(function (r) {
        return [r.date, r.type, r.qty, r.note].map(function (v) { return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(",");
      }).join("\n");
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      a.download = "flocker-records.csv"; a.click(); URL.revokeObjectURL(a.href);
    };
  }

  /* ---------------- Router ---------------- */
  function go(view) {
    document.querySelectorAll(".nav").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-view") === view); });
    if (view === "records") renderRecords(); else renderFeed();
  }
  document.querySelectorAll(".nav").forEach(function (n) {
    n.onclick = function () { go(n.getAttribute("data-view")); };
  });
  go("feed");
})();
