(function() {
  'use strict';

  const STORAGE_KEY = 'donelist_data';
  const today = new Date();
  let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let selectedEnergy = 'flow';

  const els = {
    currentDate: document.getElementById('currentDate'),
    dateSub: document.getElementById('dateSub'),
    prevDate: document.getElementById('prevDate'),
    nextDate: document.getElementById('nextDate'),
    doneInput: document.getElementById('doneInput'),
    addBtn: document.getElementById('addBtn'),
    tagInput: document.getElementById('tagInput'),
    noteInput: document.getElementById('noteInput'),
    doneList: document.getElementById('doneList'),
    emptyState: document.getElementById('emptyState'),
    todayCount: document.getElementById('todayCount'),
    streakCount: document.getElementById('streakCount'),
    flowCount: document.getElementById('flowCount'),
    insightsToggle: document.getElementById('insightsToggle'),
    insightsPanel: document.getElementById('insightsPanel'),
    topTags: document.getElementById('topTags'),
    timeDist: document.getElementById('timeDist'),
    flowBar: document.getElementById('flowBar'),
    flowHint: document.getElementById('flowHint'),
    randomBtn: document.getElementById('randomBtn'),
    modalOverlay: document.getElementById('modalOverlay'),
    modalClose: document.getElementById('modalClose'),
    modalDate: document.getElementById('modalDate'),
    modalText: document.getElementById('modalText'),
    modalTags: document.getElementById('modalTags'),
    modalNote: document.getElementById('modalNote'),
  };

  // Helpers
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatDateDisplay(date) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = (todayStart - date) / (1000 * 60 * 60 * 24);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === -1) return '明天';
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  }

  function formatDateSub(date) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diff = Math.round((todayStart - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `${date.getMonth() + 1}月${date.getDate()}日`;
    if (diff > 0) return `${diff} 天前`;
    return `${Math.abs(diff)} 天后`;
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Storage
  function loadData() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function getItemsForDate(date) {
    const data = loadData();
    return data[formatDateKey(date)] || [];
  }

  function parseTags(input) {
    if (!input) return [];
    const matches = input.match(/#[一-龥\w\-]+/g);
    if (!matches) return [];
    return matches.map(t => t.slice(1)).filter(Boolean);
  }

  function energyIcon(type) {
    if (type === 'flow') return '🚀';
    if (type === 'normal') return '⚡';
    return '🐢';
  }

  function addItem(text) {
    const data = loadData();
    const key = formatDateKey(currentDate);
    if (!data[key]) data[key] = [];

    const now = new Date();
    const tags = parseTags(els.tagInput.value);
    const note = els.noteInput.value.trim();

    data[key].unshift({
      id: now.getTime(),
      text: text.trim(),
      time: formatTime(now),
      timestamp: now.getTime(),
      energy: selectedEnergy,
      tags: tags,
      note: note || undefined,
    });

    saveData(data);
    clearInputs();
    render();
  }

  function deleteItem(id) {
    const data = loadData();
    const key = formatDateKey(currentDate);
    if (!data[key]) return;
    data[key] = data[key].filter(item => item.id !== id);
    if (data[key].length === 0) delete data[key];
    saveData(data);
    render();
  }

  function clearInputs() {
    els.doneInput.value = '';
    els.tagInput.value = '';
    els.noteInput.value = '';
    setEnergy('flow');
  }

  function setEnergy(type) {
    selectedEnergy = type;
    document.querySelectorAll('.energy-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.energy === type);
    });
  }

  // Stats & Insights
  function updateStats() {
    const data = loadData();
    const todayKey = formatDateKey(new Date());
    const todayItems = data[todayKey] || [];

    animateNumber(els.todayCount, todayItems.length);

    // Streak
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = formatDateKey(d);
      if (data[key] && data[key].length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    animateNumber(els.streakCount, streak);

    // Flow count (all time)
    let flowTotal = 0;
    Object.values(data).forEach(arr => {
      arr.forEach(item => { if (item.energy === 'flow') flowTotal++; });
    });
    animateNumber(els.flowCount, flowTotal);
  }

  function updateInsights() {
    const data = loadData();
    const allItems = Object.values(data).flat();

    if (allItems.length === 0) {
      els.topTags.innerHTML = '—';
      els.timeDist.innerHTML = '—';
      els.flowBar.querySelector('.flow-fill').style.width = '0%';
      els.flowHint.textContent = '记录越多，洞察越准';
      return;
    }

    // Top tags
    const tagCounts = {};
    allItems.forEach(item => {
      (item.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (sortedTags.length === 0) {
      els.topTags.innerHTML = '<span class="tag-pill">暂无标签</span>';
    } else {
      els.topTags.innerHTML = sortedTags.map(([tag, count]) =>
        `<span class="tag-pill">${escapeHtml(tag)} · ${count}</span>`
      ).join('');
    }

    // Time distribution
    const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    allItems.forEach(item => {
      const t = item.time || '12:00';
      const h = parseInt(t.split(':')[0], 10);
      if (h >= 5 && h < 12) hourCounts.morning++;
      else if (h >= 12 && h < 18) hourCounts.afternoon++;
      else if (h >= 18 && h < 23) hourCounts.evening++;
      else hourCounts.night++;
    });
    const max = Math.max(...Object.values(hourCounts)) || 1;
    const bars = [
      { key: 'morning', label: '早晨', count: hourCounts.morning },
      { key: 'afternoon', label: '下午', count: hourCounts.afternoon },
      { key: 'evening', label: '晚上', count: hourCounts.evening },
      { key: 'night', label: '深夜', count: hourCounts.night },
    ];
    els.timeDist.innerHTML = bars.map(b => {
      const pct = Math.round((b.count / max) * 100);
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:0.8rem;color:var(--text-secondary);">
        <span style="width:36px;text-align:right;">${b.label}</span>
        <div style="flex:1;height:6px;background:var(--bg);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:var(--primary);border-radius:3px;transition:width 0.5s;"></div>
        </div>
        <span style="width:20px;text-align:right;font-size:0.75rem;">${b.count}</span>
      </div>`;
    }).join('');

    // Flow ratio
    const flowItems = allItems.filter(i => i.energy === 'flow').length;
    const ratio = Math.round((flowItems / allItems.length) * 100);
    els.flowBar.querySelector('.flow-fill').style.width = `${ratio}%`;
    if (ratio >= 60) {
      els.flowHint.textContent = `心流占比 ${ratio}% — 你在做真正热爱的事`;
    } else if (ratio >= 30) {
      els.flowHint.textContent = `心流占比 ${ratio}% — 还有空间挖掘更深层的热爱`;
    } else {
      els.flowHint.textContent = `心流占比 ${ratio}% — 试着多做一点让你忘记时间的事`;
    }
  }

  function animateNumber(el, target) {
    const current = parseInt(el.textContent, 10);
    if (current === target) return;
    el.classList.add('pop');
    el.textContent = target;
    setTimeout(() => el.classList.remove('pop'), 300);
  }

  // Random Recall
  function showRandomRecall() {
    const data = loadData();
    const allEntries = [];
    Object.entries(data).forEach(([dateKey, items]) => {
      items.forEach(item => allEntries.push({ dateKey, ...item }));
    });
    if (allEntries.length === 0) return;

    const pick = allEntries[Math.floor(Math.random() * allEntries.length)];
    const [y, m, d] = pick.dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    els.modalDate.textContent = `${pick.dateKey} · ${formatDateDisplay(dateObj)}`;
    els.modalText.textContent = pick.text;
    els.modalTags.innerHTML = (pick.tags || []).map(t =>
      `<span class="tag-pill">${escapeHtml(t)}</span>`
    ).join('');
    els.modalNote.textContent = pick.note || '';
    els.modalNote.style.display = pick.note ? 'block' : 'none';

    els.modalOverlay.classList.add('show');
  }

  // Render
  function render() {
    const items = getItemsForDate(currentDate);

    els.currentDate.textContent = formatDateDisplay(currentDate);
    els.dateSub.textContent = formatDateSub(currentDate);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = currentDate.getTime() === todayStart.getTime();
    els.nextDate.disabled = isToday;

    els.doneList.innerHTML = '';

    if (items.length === 0) {
      els.emptyState.classList.add('show');
    } else {
      els.emptyState.classList.remove('show');
      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'done-item';
        li.dataset.id = item.id;

        const tagsHtml = (item.tags || []).map(tag =>
          `<span class="item-tag">${escapeHtml(tag)}</span>`
        ).join('');

        const noteHtml = item.note
          ? `<div class="item-note">${escapeHtml(item.note)}</div>`
          : '';

        const energyClass = item.energy || 'normal';
        const icon = energyIcon(item.energy || 'normal');

        li.innerHTML = `
          <div class="energy-icon ${energyClass}">${icon}</div>
          <div class="item-content">
            <div class="item-text">${escapeHtml(item.text)}</div>
            <div class="item-meta">
              <span class="item-time">${item.time}</span>
              ${tagsHtml ? `<div class="item-tags">${tagsHtml}</div>` : ''}
            </div>
            ${noteHtml}
          </div>
          <button class="delete-btn" title="删除">×</button>
        `;

        li.querySelector('.delete-btn').addEventListener('click', () => {
          li.classList.add('removing');
          setTimeout(() => deleteItem(item.id), 250);
        });

        els.doneList.appendChild(li);
      });
    }

    updateStats();
    updateInsights();
  }

  // Event Listeners
  els.addBtn.addEventListener('click', () => {
    const text = els.doneInput.value;
    if (!text.trim()) return;
    addItem(text);
    els.doneInput.focus();
  });

  els.doneInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') els.addBtn.click();
  });

  els.prevDate.addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    render();
  });

  els.nextDate.addEventListener('click', () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    if (next > todayStart) return;
    currentDate = next;
    render();
  });

  document.querySelectorAll('.energy-btn').forEach(btn => {
    btn.addEventListener('click', () => setEnergy(btn.dataset.energy));
  });

  els.insightsToggle.addEventListener('click', () => {
    const isOpen = els.insightsPanel.classList.toggle('open');
    els.insightsToggle.classList.toggle('open', isOpen);
  });

  els.randomBtn.addEventListener('click', showRandomRecall);

  els.modalClose.addEventListener('click', () => {
    els.modalOverlay.classList.remove('show');
  });

  els.modalOverlay.addEventListener('click', e => {
    if (e.target === els.modalOverlay) els.modalOverlay.classList.remove('show');
  });

  // Init
  render();
  els.doneInput.focus();
})();
