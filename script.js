let state = {
    name: '',
    budget: 0,
    expenses: [],      
    tracking: false,
    weekStart: null
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

//day of week index and viewing in the expenses list (0=Mon - 6=Sun)
let selectedDay = null;

//Initialize page load
window.onload = function () {
    loadData();
    if (state.tracking) {
        showDashboard();
        checkEndOfWeek();
    }
};

//date utilities ---------------------------------------------------------
function getMondayOf(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun,1=Mon…6=Sat
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

//(Mon=0 - Sun=6) for today to state.weekStart
function getTodayDayIndex() {
    const now = new Date();
    const monday = new Date(state.weekStart);
    const diffMs = now - monday;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.min(6, Math.max(0, diffDays));
}

//total spending for a given day index
function getDayTotal(dayIndex) {
    return state.expenses
        .filter(e => e.day === dayIndex)
        .reduce((sum, e) => sum + e.amount, 0);
}

//count of expenses for a given day
function getDayCount(dayIndex) {
    return state.expenses.filter(e => e.day === dayIndex).length;
}

//user login and session management ---------------------------------------------------------
function startTracking() {
    const name = document.getElementById('studentName').value.trim();
    const budget = parseFloat(document.getElementById('weeklyBudget').value);
    let ok = true;

    if (!name) {
        document.getElementById('nameErr').style.display = 'block';
        ok = false;
    } else {
        document.getElementById('nameErr').style.display = 'none';
    }

    if (!budget || budget <= 0) {
        document.getElementById('budgetErr').style.display = 'block';
        ok = false;
    } else {
        document.getElementById('budgetErr').style.display = 'none';
    }

    if (!ok) return;

    state.name = name;
    state.budget = budget;
    state.tracking = true;
    state.weekStart = getMondayOf(new Date()).toISOString();
    saveData();
    showDashboard();
}

function logout() {
    if (confirm('Logout? Your data will be saved.')) {
        state.tracking = false;
        saveData();
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
        document.getElementById('studentName').value = state.name;
        document.getElementById('weeklyBudget').value = state.budget;
    }
}

//dashboard 
function showDashboard() {
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';

// Default selected day to today
    selectedDay = getTodayDayIndex();
    updateDashboard();
}

function updateDashboard() {
  // Greeting
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('greetName').textContent = state.name;
    document.querySelector('.greeting').childNodes[0].textContent = greet + ', ';

  // Info banner
    document.getElementById('bannerBudget').textContent = `₱${state.budget.toFixed(2)}`;

  // Totals (entire week)
    const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);
    const remaining = Math.max(0, state.budget - total);
    const pct = Math.min(100, (total / state.budget) * 100);

  // Todays spending
    const todayIdx = getTodayDayIndex();
    const todaySpend = getDayTotal(todayIdx);

    document.getElementById('todayAmt').textContent = `₱${todaySpend.toFixed(2)}`;
    document.getElementById('remainingAmt').textContent = `₱${remaining.toFixed(2)}`;
    document.getElementById('progressBar').style.width = `${100 - pct}%`;

  // Count only expenses of selected day for the (x/4) display
    const selectedCount = getDayCount(selectedDay);
    document.getElementById('expCount').textContent = `(${selectedCount}/4)`;

  // Safe / overspent badge
    const sb = document.getElementById('safeBadge');
    if (total <= state.budget) {
        sb.innerHTML = '<span class="safe-dot"></span> Safe Budget';
        sb.style.color = '#2e8b2e';
    } else {
        sb.innerHTML = '<span class="safe-dot" style="background:#e74c3c"></span> Overspent';
        sb.style.color = '#e74c3c';
    }

  // Add button: disabled if selected day already has 5 expenses
    document.getElementById('addBtn').disabled = getDayCount(selectedDay) >= 4;

    updateBars();
    renderDayTabs();
    renderExpenses();
    checkEndOfWeek();
}

// BARS (one per day Mon–Sun)
function updateBars() {
    const bars = document.getElementById('barsEl').querySelectorAll('.bar');
    const todayIdx = getTodayDayIndex();
    const maxSpend = Math.max(
        ...Array.from({ length: 7 }, (_, i) => getDayTotal(i)),
        1
    );

    bars.forEach((bar, i) => {
        const dayTotal = getDayTotal(i);
        const heightPct = Math.max(6, (dayTotal / maxSpend) * 100);
        bar.style.height = heightPct + '%';
        bar.classList.remove('active', 'bar-selected', 'bar-future');

    if (i === todayIdx) {
        bar.classList.add('active');
    } else if (i > todayIdx) {
        bar.classList.add('bar-future');
    }

    if (i === selectedDay) {
        bar.classList.add('bar-selected');
    }

    bar.onclick = () => selectDay(i);
    bar.style.cursor = 'pointer';
    });
}

//days tab
function renderDayTabs() {
    const container = document.getElementById('dayTabs');
    const todayIdx = getTodayDayIndex();

    container.innerHTML = DAY_NAMES.map((name, i) => {
        const total = getDayTotal(i);
        const count = getDayCount(i);
        const isToday = i === todayIdx;
        const isSelected = i === selectedDay;
        const isFuture = i > todayIdx;

    return `
        <button
            class="day-tab ${isSelected ? 'day-tab-active' : ''} ${isToday ? 'day-tab-today' : ''} ${isFuture ? 'day-tab-future' : ''}"
            onclick="selectDay(${i})">
        <span class="day-tab-name">${name.slice(0, 3)}</span>
        <span class="day-tab-amount">${count > 0 ? '₱' + total.toFixed(0) : '—'}</span>
        ${isToday ? '<span class="day-tab-dot"></span>' : ''}
        </button>
`;
    }).join('');
}

function selectDay(dayIndex) {
    selectedDay = dayIndex;
    updateDashboard();
  // Close add panel when switching days
    document.getElementById('addPanel').classList.add('hidden');
}

//end of week check
function checkEndOfWeek() {
    const todayIdx = getTodayDayIndex();
    const isSunday = todayIdx === 6;
    const summaryEl = document.getElementById('weekSummary');

    if (isSunday) {
    // Build summary
        const total = state.expenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = state.budget - total;
        const overspent = total > state.budget;

    let rows = DAY_NAMES.map((name, i) => {
        const dayTotal = getDayTotal(i);
        return `<div class="summary-row">
            <span>${name}</span>
            <span>₱${dayTotal.toFixed(2)}</span>
        </div>`;
    }).join('');

    const statusLine = overspent
        ? `<div class="summary-status overspent">❌ You overspent by ₱${Math.abs(remaining).toFixed(2)} this week.</div>`
        : `<div class="summary-status safe">✅ Great job! You saved ₱${remaining.toFixed(2)} this week.</div>`;

    document.getElementById('weekSummaryBody').innerHTML = `
        ${rows}
        <div class="summary-divider"></div>
        <div class="summary-row summary-total">
            <span>Total Spent</span>
            <span>₱${total.toFixed(2)}</span>
        </div>
        ${statusLine}`;

        summaryEl.classList.remove('hidden');
    } else {
        summaryEl.classList.add('hidden');
    }
}

function resetWeek() {
    if (confirm('Reset all expenses for a fresh week? This cannot be undone.')) {
        state.expenses = [];
        state.weekStart = getMondayOf(new Date()).toISOString();
        selectedDay = getTodayDayIndex();
        saveData();
        updateDashboard();
    }
}

//expense panel
function toggleAddPanel() {
    const panel = document.getElementById('addPanel');
    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        document.getElementById('pCat').value = '';
        document.getElementById('pDesc').value = '';
        document.getElementById('pAmt').value = '';

            ['pCatErr', 'pDescErr', 'pAmtErr'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });

            ['pCat', 'pDesc', 'pAmt'].forEach(id => {
            document.getElementById(id).style.borderColor = '#e8e8e8';
        });
    }
}

function saveExpense() {
    const cat = document.getElementById('pCat').value;
    const desc = document.getElementById('pDesc').value.trim();
    const amt = parseFloat(document.getElementById('pAmt').value);
    let ok = true;

    if (!cat) {
        document.getElementById('pCatErr').style.display = 'block';
        document.getElementById('pCat').style.borderColor = '#e74c3c';
        ok = false;
    } else {
        document.getElementById('pCatErr').style.display = 'none';
        document.getElementById('pCat').style.borderColor = '#e8e8e8';
    }

    if (!desc) {
        document.getElementById('pDescErr').style.display = 'block';
        document.getElementById('pDesc').style.borderColor = '#e74c3c';
        ok = false;
    } else {
        document.getElementById('pDescErr').style.display = 'none';
        document.getElementById('pDesc').style.borderColor = '#e8e8e8';
    }

    if (!amt || amt <= 0) {
        document.getElementById('pAmtErr').style.display = 'block';
        document.getElementById('pAmt').style.borderColor = '#e74c3c';
        ok = false;
    } else {
        document.getElementById('pAmtErr').style.display = 'none';
        document.getElementById('pAmt').style.borderColor = '#e8e8e8';
    }

    if (!ok) return;

    const expense = {
        id: Date.now(),
        category: cat,
        description: desc,
        amount: amt,
        isHigh: amt > state.budget * 0.25,
        day: selectedDay,
        date: new Date().toISOString()
    };

    state.expenses.push(expense);
    saveData();
    document.getElementById('addPanel').classList.add('hidden');
    updateDashboard();
}

function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
        state.expenses = state.expenses.filter(e => e.id !== id);
        saveData();
        updateDashboard();
    }
}

//expenses (filtered by selectedDay) ──

function renderExpenses() {
    const list = document.getElementById('expList');
    const empty = document.getElementById('emptyState');
    const dayLabel = document.getElementById('expenseDayLabel');

  // Update day label list ------------------------------
    if (dayLabel) {
        const todayIdx = getTodayDayIndex();
        const suffix = selectedDay === todayIdx ? ' (Today)' : '';
        dayLabel.textContent = DAY_NAMES[selectedDay] + suffix;
    }

    const filtered = state.expenses.filter(e => e.day === selectedDay);

    if (filtered.length === 0) {
        empty.style.display = 'block';
        list.innerHTML = '';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = filtered.map(e => `
        <div class="expense-item ${e.isHigh ? 'exp-item-high' : ''}">
        <div class="exp-left">
            <div class="exp-cat">${e.category}</div>
            <div class="exp-desc">${e.description}</div>
        </div>
        <div class="exp-right">
            <div class="exp-amount">₱${e.amount.toFixed(2)}</div>
            ${e.isHigh ? '<div class="exp-high">⚠️ High Expense</div>' : ''}
        </div>
        <button class="delete-btn" onclick="deleteExpense(${e.id})">×</button>
        </div>
    `).join('');
}


//storage area---------------------------------------------------------
function saveData() {
    localStorage.setItem('expenseTracker', JSON.stringify(state));
}

function loadData() {
    const saved = localStorage.getItem('expenseTracker');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.name = parsed.name || '';
        state.budget = parsed.budget || 0;
        state.expenses = parsed.expenses || [];
        state.tracking = parsed.tracking || false;
        state.weekStart = parsed.weekStart || getMondayOf(new Date()).toISOString();

    // If saved week is not the current week, auto-prompt reset
        const savedMonday = new Date(state.weekStart);
        const currentMonday = getMondayOf(new Date());
        if (savedMonday < currentMonday && state.expenses.length > 0) {
        state._needsReset = true;
        }
    }
}

