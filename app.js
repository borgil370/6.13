(function() {
  'use strict';

  const STORAGE_KEY = 'donelist_data';
  const today = new Date();
  let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // DOM Elements
  const els = {
    currentDate: document.getElementById('currentDate'),
    dateSub: document.getElementById('dateSub'),
    prevDate: document.getElementById('prevDate'),
    nextDate: document.getElementById('nextDate'),
    doneInput: document.getElementById('doneInput'),
    addBtn: document.getElementById('addBtn'),
    doneList: document.getElementById('doneList'),
    emptyState: document.getElementById('emptyState'),
    todayCount: document.getElementById('todayCount'),
    streakCount: document.getElementById('streakCount'),
    totalCount: document.getElementById('totalCount'),
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

    if (diff === 0) {
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
    if (diff > 0) {
      return `${diff} 天前`;
    }
    return `${Math.abs(diff)} 天后`;
  }

  function formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
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

  function addItem(text) {
    const data = loadData();
    const key = formatDateKey(currentDate);
    if (!data[key]) data[key] = [];

    const now = new Date();
    data[key].unshift({
      id: now.getTime(),
      text: text.trim(),
      time: formatTime(now),
      timestamp: now.getTime(),
    });

    saveData(data);
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

  // Stats
  function updateStats() {
    const data = loadData();
    const todayKey = formatDateKey(new Date());

    // Today count
    const todayItems = data[todayKey] || [];
    animateNumber(els.todayCount, todayItems.length);

    // Total count
    let total = 0;
    Object.values(data).forEach(arr => total += arr.length);
    animateNumber(els.totalCount, total);

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
  }

  function animateNumber(el, target) {
    const current = parseInt(el.textContent, 10);
    if (current === target) return;

    el.classList.add('pop');
    el.textContent = target;
    setTimeout(() => el.classList.remove('pop'), 300);
  }

  // Render
  function render() {
    const items = getItemsForDate(currentDate);

    // Date display
    els.currentDate.textContent = formatDateDisplay(currentDate);
    els.dateSub.textContent = formatDateSub(currentDate);

    // Nav buttons
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = currentDate.getTime() === todayStart.getTime();
    els.nextDate.disabled = isToday;

    // List
    els.doneList.innerHTML = '';

    if (items.length === 0) {
      els.emptyState.classList.add('show');
    } else {
      els.emptyState.classList.remove('show');
      items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'done-item';
        li.dataset.id = item.id;
        li.innerHTML = `
          <div class="check-mark">✓</div>
          <div class="item-content">
            <div class="item-text">${escapeHtml(item.text)}</div>
            <div class="item-time">${item.time}</div>
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
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Event Listeners
  els.addBtn.addEventListener('click', () => {
    const text = els.doneInput.value;
    if (!text.trim()) return;
    addItem(text);
    els.doneInput.value = '';
    els.doneInput.focus();
  });

  els.doneInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      els.addBtn.click();
    }
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

  // Init
  render();
  els.doneInput.focus();
})();
