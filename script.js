(() => {
  "use strict";

  const STORAGE_KEY = "shizuku-journal-entries-v1";

  /* ---------------------------------------------------------
     Utilities
  --------------------------------------------------------- */
  const todayISO = () => {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  };

  const formatDateJP = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return `${m}月${d}日(${days[dt.getDay()]})`;
  };

  const loadEntries = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("読み込みに失敗しました", e);
      return [];
    }
  };

  const saveEntries = (entries) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  };

  let entries = loadEntries();

  /* ---------------------------------------------------------
     Tabs
  --------------------------------------------------------- */
  const tabs = document.querySelectorAll(".tab");
  const pages = document.querySelectorAll(".page");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("is-active"));
      pages.forEach((p) => p.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.getElementById(`page-${tab.dataset.tab}`).classList.add("is-active");
      if (tab.dataset.tab === "history") renderHistory();
      if (tab.dataset.tab === "stats") renderStats();
    });
  });

  /* ---------------------------------------------------------
     Mood dial
  --------------------------------------------------------- */
  const CX = 120, CY = 130, R = 82;
  const moodLevels = [1, 2, 3, 4, 5];
  let selectedMood = 3;

  const angleForMood = (mood) => 180 - (mood - 1) * 45; // math degrees, 180=left .. 0=right
  const pointForMood = (mood, radius = R) => {
    const rad = (angleForMood(mood) * Math.PI) / 180;
    return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
  };

  const tickGroup = document.getElementById("dialTicks");
  const needle = document.getElementById("dialNeedle");

  moodLevels.forEach((mood) => {
    const p = pointForMood(mood);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", p.x.toFixed(1));
    circle.setAttribute("cy", p.y.toFixed(1));
    circle.setAttribute("r", 9);
    circle.classList.add("dial-tick");
    circle.dataset.mood = mood;
    circle.addEventListener("click", () => setMood(mood));
    tickGroup.appendChild(circle);
  });

  function setMood(mood) {
    selectedMood = mood;
    needle.style.transform = `rotate(${(mood - 1) * 45 - 90}deg)`;
    document.querySelectorAll(".dial-tick").forEach((t) => {
      t.classList.toggle("is-selected", Number(t.dataset.mood) === mood);
    });
  }

  const moodMeta = {
    1: { label: "あらし", color: "#B5766A" },
    2: { label: "くもり", color: "#A89A6A" },
    3: { label: "おだやか", color: "#8B9080" },
    4: { label: "はれ", color: "#7C9468" },
    5: { label: "快晴", color: "#5C6E52" },
  };

  /* ---------------------------------------------------------
     Urge toggle + chips
  --------------------------------------------------------- */
  const urgeToggle = document.getElementById("urgeToggle");
  const urgeDetail = document.getElementById("urgeDetail");
  const triggerChips = document.getElementById("triggerChips");
  let urgeState = null; // "yes" | "no" | null
  let selectedTriggers = new Set();

  urgeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest(".urge-btn");
    if (!btn) return;
    urgeState = btn.dataset.urge;
    urgeToggle.querySelectorAll(".urge-btn").forEach((b) => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    urgeDetail.hidden = urgeState !== "yes";
  });

  triggerChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const trig = chip.dataset.trigger;
    if (selectedTriggers.has(trig)) {
      selectedTriggers.delete(trig);
      chip.classList.remove("is-selected");
    } else {
      selectedTriggers.add(trig);
      chip.classList.add("is-selected");
    }
  });

  /* ---------------------------------------------------------
     Today page: load existing entry for today, if any
  --------------------------------------------------------- */
  const gratitudeInput = document.getElementById("gratitude");
  const freeWriteInput = document.getElementById("freeWrite");
  const urgeResponseInput = document.getElementById("urgeResponse");
  const saveStatus = document.getElementById("saveStatus");

  function hydrateToday() {
    const iso = todayISO();
    document.getElementById("todayDate").textContent = formatDateJP(iso);

    const existing = entries.find((en) => en.date === iso);
    if (!existing) {
      setMood(3);
      return;
    }
    setMood(existing.mood);
    gratitudeInput.value = existing.gratitude || "";
    freeWriteInput.value = existing.freeWrite || "";
    urgeResponseInput.value = existing.urgeResponse || "";
    urgeState = existing.urge ? "yes" : "no";
    urgeToggle.querySelectorAll(".urge-btn").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.urge === urgeState);
    });
    urgeDetail.hidden = urgeState !== "yes";
    selectedTriggers = new Set(existing.triggers || []);
    triggerChips.querySelectorAll(".chip").forEach((c) => {
      c.classList.toggle("is-selected", selectedTriggers.has(c.dataset.trigger));
    });
  }

  document.getElementById("saveBtn").addEventListener("click", () => {
    const iso = todayISO();
    const entry = {
      date: iso,
      mood: selectedMood,
      urge: urgeState === "yes",
      triggers: urgeState === "yes" ? Array.from(selectedTriggers) : [],
      urgeResponse: urgeState === "yes" ? urgeResponseInput.value.trim() : "",
      gratitude: gratitudeInput.value.trim(),
      freeWrite: freeWriteInput.value.trim(),
      savedAt: new Date().toISOString(),
    };

    const idx = entries.findIndex((en) => en.date === iso);
    if (idx >= 0) entries[idx] = entry;
    else entries.push(entry);

    saveEntries(entries);
    saveStatus.textContent = "保存しました";
    saveStatus.classList.add("is-visible");
    setTimeout(() => saveStatus.classList.remove("is-visible"), 2200);
  });

  /* ---------------------------------------------------------
     History page
  --------------------------------------------------------- */
  const historyList = document.getElementById("historyList");

  function renderHistory() {
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
    if (sorted.length === 0) {
      historyList.innerHTML = '<p class="empty-note">まだ記録がありません。「今日」のページから書き始めてみましょう。</p>';
      return;
    }

    historyList.innerHTML = "";
    sorted.forEach((en) => {
      const wrap = document.createElement("div");
      wrap.className = "history-entry";

      const snippet = en.freeWrite || en.gratitude || "（本文なし）";
      wrap.innerHTML = `
        <button type="button" class="history-entry-head">
          <span class="history-date">${formatDateJP(en.date)}</span>
          <span class="history-mood-dot" style="background:${moodMeta[en.mood].color}"></span>
          <span class="history-snippet">${escapeHTML(snippet)}</span>
        </button>
        <div class="history-entry-body">
          <div class="history-row"><span class="history-row-label">気分</span>${moodMeta[en.mood].label}</div>
          ${en.gratitude ? `<div class="history-row"><span class="history-row-label">今日の感謝</span>${escapeHTML(en.gratitude)}</div>` : ""}
          <div class="history-row"><span class="history-row-label">SNSへの衝動</span>${en.urge ? "あった" : "なかった"}</div>
          ${en.urge && en.triggers.length ? `<div class="history-row"><span class="history-row-label">きっかけ</span>${en.triggers.join(" / ")}</div>` : ""}
          ${en.urge && en.urgeResponse ? `<div class="history-row"><span class="history-row-label">代わりにしたこと</span>${escapeHTML(en.urgeResponse)}</div>` : ""}
          ${en.freeWrite ? `<div class="history-row"><span class="history-row-label">自由記述</span>${escapeHTML(en.freeWrite)}</div>` : ""}
        </div>
      `;
      wrap.querySelector(".history-entry-head").addEventListener("click", () => {
        wrap.classList.toggle("is-open");
      });
      historyList.appendChild(wrap);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  /* ---------------------------------------------------------
     Stats page
  --------------------------------------------------------- */
  function computeStreak() {
    const dates = new Set(entries.map((en) => en.date));
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const iso = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      if (dates.has(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function renderStats() {
    document.getElementById("statStreak").textContent = computeStreak();
    document.getElementById("statTotal").textContent = entries.length;

    const calmPct = entries.length
      ? Math.round((entries.filter((en) => !en.urge).length / entries.length) * 100)
      : 0;
    document.getElementById("statCalm").textContent = `${calmPct}%`;

    renderMoodChart();
    renderTriggerBreakdown();
  }

  function renderMoodChart() {
    const svg = document.getElementById("moodChart");
    svg.innerHTML = "";
    const sorted = [...entries].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-30);

    if (sorted.length < 2) {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", 300);
      text.setAttribute("y", 90);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#8B9080");
      text.setAttribute("font-family", "IBM Plex Mono, monospace");
      text.setAttribute("font-size", "13");
      text.textContent = "記録が2件以上たまるとグラフが表示されます";
      svg.appendChild(text);
      return;
    }

    const W = 600, H = 180, PAD = 24;
    const stepX = (W - PAD * 2) / (sorted.length - 1);
    const yFor = (mood) => H - PAD - ((mood - 1) / 4) * (H - PAD * 2);

    // gridlines
    [1, 2, 3, 4, 5].forEach((m) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", PAD);
      line.setAttribute("x2", W - PAD);
      line.setAttribute("y1", yFor(m));
      line.setAttribute("y2", yFor(m));
      line.setAttribute("stroke", "#D2CDBC");
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-dasharray", "3 4");
      svg.appendChild(line);
    });

    const points = sorted.map((en, i) => `${PAD + i * stepX},${yFor(en.mood)}`).join(" ");
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "#BD8A34");
    polyline.setAttribute("stroke-width", "2.5");
    polyline.setAttribute("stroke-linejoin", "round");
    polyline.setAttribute("stroke-linecap", "round");
    svg.appendChild(polyline);

    sorted.forEach((en, i) => {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", PAD + i * stepX);
      c.setAttribute("cy", yFor(en.mood));
      c.setAttribute("r", 3.5);
      c.setAttribute("fill", moodMeta[en.mood].color);
      svg.appendChild(c);
    });
  }

  function renderTriggerBreakdown() {
    const box = document.getElementById("triggerBreakdown");
    const counts = {};
    entries.forEach((en) => {
      (en.triggers || []).forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const list = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    if (list.length === 0) {
      box.innerHTML = '<p class="empty-note">まだデータがありません。</p>';
      return;
    }

    const max = list[0][1];
    box.innerHTML = list
      .map(
        ([label, count]) => `
        <div class="trigger-bar-row">
          <span class="trigger-bar-label">${escapeHTML(label)}</span>
          <span class="trigger-bar-track"><span class="trigger-bar-fill" style="width:${(count / max) * 100}%"></span></span>
          <span class="trigger-bar-count">${count}</span>
        </div>`
      )
      .join("");
  }

  /* ---------------------------------------------------------
     Settings: export / import / clear
  --------------------------------------------------------- */
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shizuku-journal-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById("importInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("形式が正しくありません");
        const byDate = new Map(entries.map((en) => [en.date, en]));
        imported.forEach((en) => {
          if (en && en.date) byDate.set(en.date, en);
        });
        entries = Array.from(byDate.values());
        saveEntries(entries);
        alert(`${imported.length}件の記録を読み込みました。`);
        hydrateToday();
        renderHistory();
        renderStats();
      } catch (err) {
        alert("ファイルを読み込めませんでした。正しいJSONファイルか確認してください。");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clearBtn").addEventListener("click", () => {
    if (!confirm("すべての記録を消去します。この操作は取り消せません。よろしいですか？")) return;
    entries = [];
    saveEntries(entries);
    hydrateToday();
    renderHistory();
    renderStats();
  });

  /* ---------------------------------------------------------
     Init
  --------------------------------------------------------- */
  hydrateToday();
})();
