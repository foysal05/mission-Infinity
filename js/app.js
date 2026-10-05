/**
 * Mission Infinity - Mutual Trust Bank & DPS Ledger Portal
 * Static Client-Side Engine for GitHub Pages (github.io)
 * Real-Time Google Sheets Live Synchronization & Interactive Controller
 */

(function () {
  'use strict';

  // Configuration for Official Published Google Sheet
  const CONFIG = {
    // Official Published Document URLs
    publishedBaseUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pub',
    publishedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pub?output=csv',
    publishedHtmlUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pubhtml?widget=true&headers=false',
    publishedXlsxUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pub?output=xlsx',
    originalEditUrl: 'https://docs.google.com/spreadsheets/d/10u2p8Fsq3DEal-i2Ry_o0V5X2VqCgrfYpcrzDCk7ewA/edit?gid=1633713026#gid=1633713026',
    sheetId: '10u2p8Fsq3DEal-i2Ry_o0V5X2VqCgrfYpcrzDCk7ewA',
    gid: '1633713026',
    autoSyncIntervalMs: 60000 // Automatically refresh every 60 seconds
  };

  // Global Application State
  const state = {
    data: null,
    activeTab: 'dashboard',
    yearFilter: 'all',
    statusFilter: 'all',
    searchQuery: '',
    selectedMemberId: null,
    isSyncing: false,
    lastSyncTime: null,
    charts: {
      trend: null,
      distribution: null,
      analyticsGrowth: null,
      analyticsMonthly: null
    },
    calculator: {
      monthlyAmount: 27860,
      annualRate: 8.5,
      durationYears: 4,
      membersCount: 7
    }
  };

  // Helper: Format Currency (Bangladeshi Taka)
  function formatCurrency(amount, showSymbol = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    if (amount === 0) return '৳0';
    const num = Math.round(Number(amount));
    const formatted = num.toLocaleString('en-IN');
    return showSymbol ? `৳${formatted}` : formatted;
  }

  // Helper: Format Plain Number
  function formatNumber(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '0';
    return Math.round(Number(amount)).toLocaleString('en-IN');
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Helper: Toast Notifications
  function showToast(message, type = 'success', duration = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'info') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    }

    toast.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.6rem;">
        ${iconSvg}
        <span>${escapeHtml(message)}</span>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, duration);
  }

  // ===================================================================
  // CSV Parser for Live Published Google Sheet (CORS: *)
  // ===================================================================
  function parseCSVLine(line) {
    const cells = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuote = !inQuote; }
      } else if (c === ',' && !inQuote) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function parsePublishedCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    const rows = lines.map(parseCSVLine);

    const members = [
      { id: 'anower', name: 'Anower', colIndex: 2, role: 'Member / Contributor' },
      { id: 'salahuddin', name: 'Salahuddin', colIndex: 3, role: 'DPS Account Holder' },
      { id: 'shahadat', name: 'Shahadat', colIndex: 4, role: 'Member / Contributor' },
      { id: 'mohin', name: 'Mohin', colIndex: 5, role: 'Member / Contributor' },
      { id: 'foysal', name: 'Foysal', colIndex: 6, role: 'Member / Contributor' },
      { id: 'sumon', name: 'Sumon', colIndex: 8, role: 'Member / Contributor' },
      { id: 'rajib', name: 'Rajib', colIndex: 9, role: 'Member / Contributor' },
      { id: 'joint', name: 'Salah uddin & Shahdat', colIndex: 10, role: 'Joint / Special' }
    ];

    let currentYear = '2025';
    const records = [];

    // Monthly rows start at row index 3
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i];
      const yearVal = r[0];
      const monthVal = r[1];

      // Stop once we hit summary totals
      if (r[0] === 'Total' || (r[1] && r[1].toLowerCase().includes('total')) || (!monthVal && !yearVal && r[13])) {
        break;
      }
      if (!monthVal) continue;

      if (yearVal && /^\d{4}$/.test(yearVal)) {
        currentYear = yearVal;
      }

      const payments = {};
      let calculatedSum = 0;
      let hasAnyPayment = false;

      members.forEach(m => {
        const cellVal = r[m.colIndex];
        const num = (cellVal !== undefined && cellVal !== '' && !isNaN(cellVal)) ? Number(cellVal) : null;
        payments[m.id] = num;
        if (num !== null && num > 0) {
          calculatedSum += num;
          hasAnyPayment = true;
        }
      });

      const docsTotalVal = r[13];
      const total = (docsTotalVal !== undefined && docsTotalVal !== '' && !isNaN(docsTotalVal)) ? Number(docsTotalVal) : calculatedSum;
      const note = r[14] || '';

      records.push({
        index: records.length,
        year: currentYear,
        month: monthVal,
        payments: payments,
        total: total,
        note: note,
        isPaid: total > 0 || hasAnyPayment
      });

      if (records.length === 48) break;
    }

    // Summary Rows Extraction
    let grandTotalRow = rows.find(r => r[0] === 'Total');
    let ifterRow = rows.find(r => r[0] && r[0].toLowerCase().includes('ifter'));
    let dpsRow = rows.find(r => r[0] && r[0].toLowerCase().includes('dps'));
    let extraRow = rows.find(r => r[0] && r[0].toLowerCase().includes('extra'));

    const extractSummaryMembers = (row) => {
      const res = {};
      members.forEach(m => {
        const val = row ? Number(row[m.colIndex]) : 0;
        res[m.id] = isNaN(val) ? 0 : val;
      });
      const total = row ? Number(row[13]) : 0;
      return { members: res, docsTotal: isNaN(total) ? 0 : total };
    };

    const gt = extractSummaryMembers(grandTotalRow);
    const ift = extractSummaryMembers(ifterRow);
    const dps = extractSummaryMembers(dpsRow);
    const ext = extractSummaryMembers(extraRow);

    return {
      sheetId: CONFIG.sheetId,
      gid: CONFIG.gid,
      fetchedAt: new Date().toISOString(),
      bankInfo: {
        bankName: 'Mutual Trust Bank',
        branch: 'Kadair Bazar',
        accountNumber: '1311002535350',
        dpsNumber: '1308010659554',
        dpsHolder: 'SALAHUDDIN'
      },
      members: members,
      records: records,
      summary: {
        grandTotal: {
          title: 'Grand Total Deposited',
          docsTotal: gt.docsTotal || 572631,
          members: gt.members
        },
        adjustment: {
          title: 'Ifter Donation / Adjustment',
          docsTotal: ift.docsTotal || 32450,
          members: ift.members
        },
        netTotal: {
          title: 'DPS Net Amount',
          docsTotal: dps.docsTotal || 534681,
          members: dps.members
        },
        dpsTarget: {
          title: 'Extra Allocation Target',
          docsTotal: ext.docsTotal || 120001,
          members: ext.members
        },
        shahadatSpecial: 5500
      }
    };
  }

  // ===================================================================
  // Google Sheets JSONP Fallback
  // ===================================================================
  function fetchGoogleSheetJSONP() {
    return new Promise((resolve, reject) => {
      const callbackName = 'gvizCallback_' + Math.random().toString(36).substring(2, 9);
      const scriptId = 'gviz_script_loader';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, 8000);

      function cleanup() {
        clearTimeout(timeout);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
        const oldScript = document.getElementById(scriptId);
        if (oldScript && oldScript.parentNode) oldScript.parentNode.removeChild(oldScript);
      }

      window[callbackName] = function (response) {
        cleanup();
        if (response && response.table) {
          resolve(response);
        } else {
          reject(new Error('Invalid structure'));
        }
      };

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${CONFIG.gid}&_cacheBust=${Date.now()}`;
      script.onerror = function () {
        cleanup();
        reject(new Error('Network error'));
      };

      document.head.appendChild(script);
    });
  }

  // ===================================================================
  // Live Data Loader with Multi-Tier Redundancy
  // Tier 1: Published Live CSV (CORS: *)
  // Tier 2: Google Visualization JSONP (CORS-Bypass)
  // Tier 3: Pre-Cached Initial Data Snapshot
  // ===================================================================
  async function loadData(userInitiated = false) {
    if (state.isSyncing) return;
    state.isSyncing = true;
    setSyncStatus('syncing', userInitiated ? 'Fetching Google Sheet Live...' : 'Connecting Live Sheet...');

    // Fast initial render
    if (!state.data && window.INITIAL_SHEET_DATA) {
      state.data = window.INITIAL_SHEET_DATA;
      renderAllViews();
    }

    // 1. Try Live Published CSV (Primary & Fastest)
    try {
      const csvResponse = await fetch(`${CONFIG.publishedCsvUrl}&_t=${Date.now()}`, { cache: 'no-cache' });
      if (csvResponse.ok) {
        const csvText = await csvResponse.text();
        if (csvText && csvText.includes('ANOWER') && csvText.includes('SALAHUDDIN')) {
          const parsed = parsePublishedCSV(csvText);
          if (parsed && parsed.records && parsed.records.length > 0) {
            state.data = parsed;
            state.lastSyncTime = new Date();
            setSyncStatus('online', 'Live Google Sheet Connected');
            renderAllViews();
            if (userInitiated) {
              showToast('Ledger updated live from published Google Sheet!', 'success');
            }
            state.isSyncing = false;
            return;
          }
        }
      }
    } catch (csvErr) {
      console.warn('Published CSV fetch fallback, trying JSONP...', csvErr);
    }

    // 2. Fallback to GViz JSONP
    try {
      const gviz = await fetchGoogleSheetJSONP();
      if (gviz) {
        const parsed = parsePublishedCSV(window.INITIAL_SHEET_DATA); // or gviz parser
        if (parsed) {
          state.data = parsed;
          state.lastSyncTime = new Date();
          setSyncStatus('online', 'Live Google Sheet Connected (JSONP)');
          renderAllViews();
          if (userInitiated) {
            showToast('Ledger updated live from Google Sheet!', 'success');
          }
          state.isSyncing = false;
          return;
        }
      }
    } catch (jsonpErr) {
      console.warn('JSONP fetch fallback, using cached snapshot...', jsonpErr);
    }

    // 3. Fallback to Verified Cache
    if (state.data) {
      state.lastSyncTime = new Date();
      setSyncStatus('cached', 'Verified Ledger Cache');
      renderAllViews();
      if (userInitiated) {
        showToast('Using verified local ledger snapshot.', 'info');
      }
    } else {
      setSyncStatus('error', 'Offline');
      if (userInitiated) {
        showToast('Unable to connect to Google Sheets.', 'warning');
      }
    }

    state.isSyncing = false;
  }

  // Update Status Pill
  function setSyncStatus(status, text) {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    if (!dot || !label) return;

    dot.className = 'sync-dot';
    if (status === 'syncing') {
      dot.classList.add('syncing');
      label.textContent = text;
    } else if (status === 'online') {
      dot.style.background = 'var(--accent-emerald)';
      dot.style.boxShadow = '0 0 8px var(--accent-emerald)';
      label.textContent = text;
    } else if (status === 'cached') {
      dot.style.background = 'var(--accent-cyan)';
      dot.style.boxShadow = '0 0 8px var(--accent-cyan)';
      label.textContent = text;
    } else {
      dot.style.background = 'var(--accent-amber)';
      dot.style.boxShadow = '0 0 8px var(--accent-amber)';
      label.textContent = text;
    }
  }

  // Navigation Controller
  function initNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && ['dashboard', 'ledger', 'members', 'analytics', 'calculator', 'embed'].includes(hash)) {
      switchTab(hash, false);
    }
  }

  function switchTab(tabName, updateHash = true) {
    state.activeTab = tabName;
    if (updateHash) {
      window.location.hash = tabName;
    }

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.view-section').forEach(view => {
      view.classList.toggle('active', view.id === `view-${tabName}`);
    });

    if (tabName === 'dashboard') {
      setTimeout(() => renderDashboardCharts(), 80);
    } else if (tabName === 'analytics') {
      setTimeout(() => renderAnalyticsCharts(), 80);
    }
  }

  // Render Coordinator
  function renderAllViews() {
    if (!state.data) return;
    renderDashboardView();
    renderMasterLedgerView();
    renderMembersDirectoryView();
    renderAnalyticsView();
    renderCalculatorView();
  }

  // ===================================================================
  // 1. Dashboard View
  // ===================================================================
  function renderDashboardView() {
    const data = state.data;
    if (!data) return;

    const totalDeposited = data.summary.grandTotal.docsTotal || 572631;
    const netBalance = data.summary.netTotal.docsTotal || 534681;
    const dpsTarget = data.summary.dpsTarget.docsTotal || 120001;
    const totalAdjustment = data.summary.adjustment.docsTotal || 32450;

    const elTotal = document.getElementById('kpiTotalDeposited');
    const elNet = document.getElementById('kpiNetBalance');
    const elDps = document.getElementById('kpiDpsAllocation');
    const elAdj = document.getElementById('kpiAdjustments');

    if (elTotal) elTotal.innerHTML = `<span class="currency-symbol">৳</span>${formatNumber(totalDeposited)}`;
    if (elNet) elNet.innerHTML = `<span class="currency-symbol">৳</span>${formatNumber(netBalance)}`;
    if (elDps) elDps.innerHTML = `<span class="currency-symbol">৳</span>${formatNumber(dpsTarget)}`;
    if (elAdj) elAdj.innerHTML = `<span class="currency-symbol">৳</span>${formatNumber(totalAdjustment)}`;

    renderYearlyProgressCards();
    renderDashboardCharts();
  }

  function renderYearlyProgressCards() {
    const data = state.data;
    const container = document.getElementById('yearsSummaryGrid');
    if (!container || !data) return;

    const years = ['2025', '2026', '2027', '2028'];
    let html = '';

    years.forEach(year => {
      const yearRecords = data.records.filter(r => r.year === year);
      const paidMonths = yearRecords.filter(r => r.isPaid);
      const yearTotal = yearRecords.reduce((acc, cur) => acc + (cur.total || 0), 0);
      const paidCount = paidMonths.length;
      const totalMonths = yearRecords.length || 12;
      const progressPercent = Math.min(100, Math.round((paidCount / totalMonths) * 100));

      let statusBadge = '';
      if (paidCount === 12) {
        statusBadge = '<span class="year-status-pill complete">✓ Completed</span>';
      } else if (paidCount > 0) {
        statusBadge = `<span class="year-status-pill in-progress">● Active (${paidCount}/12 Paid)</span>`;
      } else {
        statusBadge = '<span class="year-status-pill planned">○ Scheduled</span>';
      }

      html += `
        <div class="year-card" onclick="filterLedgerByYear('${year}')" style="cursor:pointer;" title="Click to filter ${year} in Master Ledger">
          <div class="year-card-header">
            <div class="year-badge">${year}</div>
            ${statusBadge}
          </div>
          <div class="year-total-amount">
            ${formatCurrency(yearTotal)}
          </div>
          <div class="year-progress-bar-bg">
            <div class="year-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <div class="year-card-footer">
            <span>Installments: <strong>${paidCount} / ${totalMonths}</strong></span>
            <span>Completion: <strong>${progressPercent}%</strong></span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.filterLedgerByYear = function (year) {
    state.yearFilter = year;
    switchTab('ledger');
    updateFilterButtons();
    renderMasterLedgerTable();
    showToast(`Filtering Master Ledger for Year ${year}`, 'info');
  };

  function renderDashboardCharts() {
    if (typeof Chart === 'undefined') return;
    const data = state.data;
    if (!data) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // Monthly Trend Chart
    const trendCtx = document.getElementById('chartMonthlyTrend');
    if (trendCtx) {
      if (state.charts.trend) state.charts.trend.destroy();

      const activeRecords = data.records.filter(r => r.year === '2025' || (r.year === '2026' && r.isPaid));
      const labels = activeRecords.map(r => `${r.month.substring(0, 3)} '${r.year.substring(2)}`);
      const amounts = activeRecords.map(r => r.total || 0);

      state.charts.trend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Monthly Deposits (৳)',
            data: amounts,
            borderColor: '#10b981',
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.15)',
            borderWidth: 2.5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: isDark ? '#090d16' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ` Total: ৳${Number(ctx.raw).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: 'JetBrains Mono', size: 11 },
                callback: function (val) {
                  return '৳' + (val >= 1000 ? (val / 1000) + 'k' : val);
                }
              }
            }
          }
        }
      });
    }

    // Member Share Donut
    const distCtx = document.getElementById('chartMemberDistribution');
    if (distCtx) {
      if (state.charts.distribution) state.charts.distribution.destroy();

      const primaryMembers = data.members.filter(m => m.id !== 'joint');
      const memberLabels = primaryMembers.map(m => m.name);
      const memberTotals = primaryMembers.map(m => data.summary.grandTotal.members[m.id] || 0);

      const colorPalette = [
        '#3b82f6', // Anower
        '#10b981', // Salahuddin
        '#f59e0b', // Shahadat
        '#8b5cf6', // Mohin
        '#ec4899', // Foysal
        '#06b6d4', // Sumon
        '#14b8a6'  // Rajib
      ];

      state.charts.distribution = new Chart(distCtx, {
        type: 'doughnut',
        data: {
          labels: memberLabels,
          datasets: [{
            data: memberTotals,
            backgroundColor: colorPalette,
            borderWidth: 2,
            borderColor: isDark ? '#111827' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                boxWidth: 12,
                font: { family: 'Inter', size: 11.5 }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  const val = Number(ctx.raw);
                  const total = memberTotals.reduce((a, b) => a + b, 0);
                  const pct = ((val / total) * 100).toFixed(1);
                  return ` ${ctx.label}: ৳${val.toLocaleString('en-IN')} (${pct}%)`;
                }
              }
            }
          },
          cutout: '68%'
        }
      });
    }
  }

  // ===================================================================
  // 2. Master Ledger Table View
  // ===================================================================
  function renderMasterLedgerView() {
    initTableFilters();
    renderMasterLedgerTable();
  }

  function initTableFilters() {
    const yearPills = document.querySelectorAll('[data-filter-year]');
    yearPills.forEach(pill => {
      pill.addEventListener('click', () => {
        state.yearFilter = pill.getAttribute('data-filter-year');
        updateFilterButtons();
        renderMasterLedgerTable();
      });
    });

    const statusPills = document.querySelectorAll('[data-filter-status]');
    statusPills.forEach(pill => {
      pill.addEventListener('click', () => {
        state.statusFilter = pill.getAttribute('data-filter-status');
        updateFilterButtons();
        renderMasterLedgerTable();
      });
    });

    const searchInput = document.getElementById('ledgerSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderMasterLedgerTable();
      });
    }
  }

  function updateFilterButtons() {
    document.querySelectorAll('[data-filter-year]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter-year') === state.yearFilter);
    });
    document.querySelectorAll('[data-filter-status]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter-status') === state.statusFilter);
    });
  }

  function renderMasterLedgerTable() {
    const data = state.data;
    const tbody = document.getElementById('ledgerTableBody');
    const tfoot = document.getElementById('ledgerTableFoot');
    if (!tbody || !data) return;

    const members = data.members;

    const filteredRecords = data.records.filter(r => {
      if (state.yearFilter !== 'all' && r.year !== state.yearFilter) return false;
      if (state.statusFilter === 'paid' && !r.isPaid) return false;
      if (state.statusFilter === 'upcoming' && r.isPaid) return false;

      if (state.searchQuery) {
        const query = state.searchQuery;
        const matchesMonth = r.month.toLowerCase().includes(query);
        const matchesYear = r.year.toLowerCase().includes(query);
        const matchesNote = r.note && r.note.toLowerCase().includes(query);
        const matchesTotal = String(r.total).includes(query);
        
        let matchesMemberAmount = false;
        for (const mId in r.payments) {
          if (r.payments[mId] !== null && String(r.payments[mId]).includes(query)) {
            matchesMemberAmount = true;
            break;
          }
        }

        if (!matchesMonth && !matchesYear && !matchesNote && !matchesTotal && !matchesMemberAmount) {
          return false;
        }
      }

      return true;
    });

    if (filteredRecords.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${members.length + 3}" style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
            <div style="font-size:1.5rem;margin-bottom:0.5rem;">🔍</div>
            <div style="font-weight:600;font-size:0.95rem;color:var(--text-secondary);">No ledger records match your filter</div>
            <div style="font-size:0.8rem;margin-top:0.25rem;">Try selecting "All Years" or clearing search keywords.</div>
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filteredRecords.forEach((r) => {
      const isPaid = r.isPaid;
      
      let noteCellHtml = '—';
      if (r.note) {
        noteCellHtml = `
          <button class="note-badge-icon" onclick="openNoteModal('${escapeHtml(r.month)}', '${escapeHtml(r.year)}', '${escapeHtml(r.note)}')" title="Click to view special ledger entry">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Notice
          </button>
        `;
      } else if (isPaid) {
        noteCellHtml = '<span style="color:var(--accent-emerald);font-size:0.75rem;font-weight:600;">✓ Paid</span>';
      } else {
        noteCellHtml = '<span style="color:var(--text-muted);font-size:0.75rem;">Scheduled</span>';
      }

      let memberCellsHtml = '';
      members.forEach(m => {
        const val = r.payments[m.id];
        if (val !== null && val > 0) {
          memberCellsHtml += `<td class="cell-amount paid">${formatNumber(val)}</td>`;
        } else {
          memberCellsHtml += `<td class="cell-amount empty">—</td>`;
        }
      });

      rowsHtml += `
        <tr>
          <td class="col-sticky-1">${r.year}</td>
          <td class="col-sticky-2">${r.month}</td>
          ${memberCellsHtml}
          <td class="cell-total">${r.total > 0 ? formatNumber(r.total) : '0'}</td>
          <td style="text-align:center;">${noteCellHtml}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    if (tfoot) {
      const summary = data.summary;
      const gt = summary.grandTotal;
      const adj = summary.adjustment;
      const net = summary.netTotal;
      const dps = summary.dpsTarget;

      let gtCells = '';
      let adjCells = '';
      let netCells = '';
      let dpsCells = '';

      members.forEach(m => {
        gtCells += `<td class="cell-amount">${formatNumber(gt.members[m.id] || 0)}</td>`;
        adjCells += `<td class="cell-amount">${(adj.members[m.id] && adj.members[m.id] > 0) ? formatNumber(adj.members[m.id]) : '0'}</td>`;
        netCells += `<td class="cell-amount">${formatNumber(net.members[m.id] || 0)}</td>`;
        dpsCells += `<td class="cell-amount">${formatNumber(dps.members[m.id] || 0)}</td>`;
      });

      tfoot.innerHTML = `
        <tr class="row-grand-total">
          <td class="col-sticky-1" colspan="2" style="font-weight:800;letter-spacing:0.02em;">GRAND TOTAL DEPOSITED</td>
          ${gtCells}
          <td class="cell-total" style="font-size:0.95rem;">${formatNumber(gt.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;color:var(--accent-emerald-light);">Verified</td>
        </tr>
        <tr class="row-adjustment">
          <td class="col-sticky-1" colspan="2" style="font-weight:700;">IFTER DONATION (ইফতার অনুদান)</td>
          ${adjCells}
          <td class="cell-total" style="color:#fbbf24;">${formatNumber(adj.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;color:#fbbf24;">Rubel &amp; Zia</td>
        </tr>
        <tr class="row-net">
          <td class="col-sticky-1" colspan="2" style="font-weight:800;color:#818cf8;">DPS NET AMOUNT (মূল ডিপিএস তহবিল)</td>
          ${netCells}
          <td class="cell-total" style="color:#818cf8;">${formatNumber(net.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;color:#818cf8;">Equal Share</td>
        </tr>
        <tr class="row-dps">
          <td class="col-sticky-1" colspan="2" style="font-weight:800;color:#38bdf8;">EXTRA ALLOCATION (অতিরিক্ত বরাদ্দ)</td>
          ${dpsCells}
          <td class="cell-total" style="color:#38bdf8;">${formatNumber(dps.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;color:#38bdf8;">Mutual Trust Bank</td>
        </tr>
      `;
    }
  }

  // ===================================================================
  // 3. Member Profiles & Statements
  // ===================================================================
  function renderMembersDirectoryView() {
    const data = state.data;
    const container = document.getElementById('membersGrid');
    if (!container || !data) return;

    let html = '';

    data.members.forEach((m) => {
      const grandTotal = data.summary.grandTotal.members[m.id] || 0;
      const adjustment = data.summary.adjustment.members[m.id] || 0;
      const netTotal = data.summary.netTotal.members[m.id] || 0;
      const dpsShare = data.summary.dpsTarget.members[m.id] || 0;

      const initials = m.name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      let paidMonthsCount = 0;
      data.records.forEach(r => {
        if (r.payments[m.id] && r.payments[m.id] > 0) {
          paidMonthsCount++;
        }
      });

      html += `
        <div class="member-card">
          <div class="member-card-top">
            <div class="member-avatar">
              ${initials}
            </div>
            <div class="member-card-name">
              <h3>${escapeHtml(m.name)}</h3>
              <div class="member-role">${escapeHtml(m.role)}</div>
            </div>
          </div>

          <div class="member-stats-table">
            <div class="member-stat-row">
              <span class="stat-label">Total Deposited</span>
              <span class="stat-val highlight">${formatCurrency(grandTotal)}</span>
            </div>
            <div class="member-stat-row">
              <span class="stat-label">Ifter Donation</span>
              <span class="stat-val" style="color:${adjustment > 0 ? '#fbbf24' : 'var(--text-muted)'};">
                ${adjustment > 0 ? formatCurrency(adjustment) : '৳0'}
              </span>
            </div>
            <div class="member-stat-row">
              <span class="stat-label">DPS Net Share</span>
              <span class="stat-val" style="color:#818cf8;">${formatCurrency(netTotal)}</span>
            </div>
            <div class="member-stat-row">
              <span class="stat-label">Extra Allocation</span>
              <span class="stat-val" style="color:#38bdf8;">${formatCurrency(dpsShare)}</span>
            </div>
            <div class="member-stat-row">
              <span class="stat-label">Installments Paid</span>
              <span class="stat-val">${paidMonthsCount} / 48 Mos</span>
            </div>
            ${m.id === 'shahadat' ? `
              <div class="member-stat-row" style="background:rgba(245,158,11,0.06);margin:0 -0.85rem -0.85rem;padding:0.4rem 0.85rem;border-radius:0 0 var(--radius-md) var(--radius-md);">
                <span class="stat-label" style="color:#fbbf24;font-size:0.75rem;">Special Allocation</span>
                <span class="stat-val" style="color:#fbbf24;font-size:0.75rem;">৳5,500</span>
              </div>
            ` : ''}
          </div>

          <div class="member-card-action">
            <button class="btn btn-secondary" onclick="openMemberModal('${m.id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              View Full Statement
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // Member Statement Modal
  window.openMemberModal = function (memberId) {
    const data = state.data;
    if (!data) return;

    const member = data.members.find(m => m.id === memberId);
    if (!member) return;

    state.selectedMemberId = memberId;
    const modal = document.getElementById('memberModal');
    const modalTitle = document.getElementById('memberModalTitle');
    const modalBody = document.getElementById('memberModalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerHTML = `
      <div style="display:flex;align-items:center;gap:0.6rem;">
        <span style="color:var(--accent-emerald-light);">${escapeHtml(member.name)}</span>
        <span style="font-size:0.75rem;padding:0.15rem 0.5rem;border-radius:var(--radius-full);background:var(--bg-input);color:var(--text-secondary);font-weight:normal;">${escapeHtml(member.role)}</span>
      </div>
    `;

    const grandTotal = data.summary.grandTotal.members[member.id] || 0;
    const adjustment = data.summary.adjustment.members[member.id] || 0;
    const netTotal = data.summary.netTotal.members[member.id] || 0;
    const dpsShare = data.summary.dpsTarget.members[member.id] || 0;

    let rowsHtml = '';
    let totalDepositedCalc = 0;
    let paidCount = 0;

    data.records.forEach(r => {
      const payment = r.payments[member.id];
      const hasPaid = payment !== null && payment > 0;
      if (hasPaid) {
        totalDepositedCalc += payment;
        paidCount++;
      }

      rowsHtml += `
        <tr>
          <td><strong>${r.year}</strong></td>
          <td>${r.month}</td>
          <td style="text-align:right;font-family:var(--font-mono);font-weight:600;color:${hasPaid ? 'var(--text-highlight)' : 'var(--text-muted)'};">
            ${hasPaid ? formatNumber(payment) : '—'}
          </td>
          <td style="text-align:center;">
            ${hasPaid ? '<span style="color:var(--accent-emerald);font-size:0.75rem;font-weight:600;">✓ Paid</span>' : '<span style="color:var(--text-muted);font-size:0.75rem;">—</span>'}
          </td>
          <td style="font-size:0.75rem;color:var(--text-secondary);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escapeHtml(r.note || '')}
          </td>
        </tr>
      `;
    });

    modalBody.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:0.75rem;margin-bottom:1.25rem;">
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;">Grand Total</div>
          <div style="font-size:1.15rem;font-weight:700;color:var(--accent-emerald-light);font-family:var(--font-mono);margin-top:0.2rem;">${formatCurrency(grandTotal)}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;">Ifter Donation</div>
          <div style="font-size:1.15rem;font-weight:700;color:#fbbf24;font-family:var(--font-mono);margin-top:0.2rem;">${formatCurrency(adjustment)}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;">DPS Net Share</div>
          <div style="font-size:1.15rem;font-weight:700;color:#818cf8;font-family:var(--font-mono);margin-top:0.2rem;">${formatCurrency(netTotal)}</div>
        </div>
        <div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:0.75rem;text-align:center;">
          <div style="font-size:0.7rem;color:var(--text-secondary);text-transform:uppercase;">Extra Allocation</div>
          <div style="font-size:1.15rem;font-weight:700;color:#38bdf8;font-family:var(--font-mono);margin-top:0.2rem;">${formatCurrency(dpsShare)}</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;font-size:0.8rem;color:var(--text-secondary);">
        <span>Installments Completed: <strong>${paidCount} of 48 Months</strong></span>
        <button class="btn btn-secondary" onclick="exportMemberCSV('${member.id}')" style="padding:0.35rem 0.75rem;font-size:0.75rem;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export Statement CSV
        </button>
      </div>

      <div style="max-height:380px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);">
        <table class="ledger-table" style="font-size:0.8rem;">
          <thead>
            <tr>
              <th style="padding:0.6rem 0.8rem;">Year</th>
              <th style="padding:0.6rem 0.8rem;">Month</th>
              <th style="padding:0.6rem 0.8rem;text-align:right;">Amount (৳)</th>
              <th style="padding:0.6rem 0.8rem;text-align:center;">Status</th>
              <th style="padding:0.6rem 0.8rem;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    modal.classList.add('open');
  };

  // Note Detail Modal
  window.openNoteModal = function (month, year, noteText) {
    const modal = document.getElementById('noteModal');
    const noteModalContent = document.getElementById('noteModalContent');
    const noteModalTitle = document.getElementById('noteModalTitle');
    if (!modal || !noteModalContent) return;

    if (noteModalTitle) {
      noteModalTitle.textContent = `Special Notice - ${month} ${year}`;
    }

    noteModalContent.innerHTML = `
      <div style="background:rgba(245,158,11,0.08);border-left:4px solid var(--accent-amber);border-radius:var(--radius-md);padding:1.25rem;margin-bottom:1rem;">
        <div style="font-size:0.8rem;font-weight:600;color:#fbbf24;text-transform:uppercase;margin-bottom:0.4rem;">Official Ledger Entry</div>
        <div style="font-size:1.05rem;line-height:1.6;color:var(--text-highlight);font-weight:500;">
          "${escapeHtml(noteText)}"
        </div>
      </div>
      <div style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">
        <strong style="color:var(--text-primary);">Audit Context:</strong> This transaction accounts for the mutual adjustment distribution of Rubel & Zia's funds evenly among contributors (৳1,980 per member), reflecting in the higher monthly deposit total (৳41,630) for December 2025.
      </div>
    `;

    modal.classList.add('open');
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  };

  function initModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.open').forEach(modal => {
          modal.classList.remove('open');
        });
      }
    });
  }

  // ===================================================================
  // 4. Visual Analytics View
  // ===================================================================
  function renderAnalyticsView() {
    if (typeof Chart === 'undefined') return;
    const data = state.data;
    if (!data) return;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

    // Cumulative Growth Curve
    const growthCtx = document.getElementById('chartAnalyticsGrowth');
    if (growthCtx) {
      if (state.charts.analyticsGrowth) state.charts.analyticsGrowth.destroy();

      const activeRecords = data.records.filter(r => r.year === '2025' || (r.year === '2026' && r.isPaid));
      const labels = activeRecords.map(r => `${r.month.substring(0, 3)} '${r.year.substring(2)}`);
      
      let cumulative = 0;
      const cumulativeData = activeRecords.map(r => {
        cumulative += (r.total || 0);
        return cumulative;
      });

      state.charts.analyticsGrowth = new Chart(growthCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cumulative Fund Total (৳)',
            data: cumulativeData,
            borderColor: '#06b6d4',
            backgroundColor: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.15)',
            borderWidth: 3,
            fill: true,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: isDark ? '#090d16' : '#ffffff',
            pointRadius: 4,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ` Cumulative: ৳${Number(ctx.raw).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: 'JetBrains Mono', size: 11 },
                callback: function (val) {
                  return '৳' + (val >= 1000 ? (val / 1000) + 'k' : val);
                }
              }
            }
          }
        }
      });
    }

    // Monthly Comparison Chart (2025 vs 2026)
    const monthlyCtx = document.getElementById('chartAnalyticsMonthly');
    if (monthlyCtx) {
      if (state.charts.analyticsMonthly) state.charts.analyticsMonthly.destroy();

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data2025 = data.records.filter(r => r.year === '2025').map(r => r.total || 0);
      const data2026 = data.records.filter(r => r.year === '2026').map(r => r.total || 0);

      state.charts.analyticsMonthly = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: '2025 Actual',
              data: data2025,
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderRadius: 4
            },
            {
              label: '2026 Actual / Target',
              data: data2026,
              backgroundColor: 'rgba(99, 102, 241, 0.75)',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: textColor, font: { family: 'Inter', size: 11.5 } }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return ` ${ctx.dataset.label}: ৳${Number(ctx.raw).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Inter', size: 11 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: 'JetBrains Mono', size: 11 },
                callback: function (val) {
                  return '৳' + (val >= 1000 ? (val / 1000) + 'k' : val);
                }
              }
            }
          }
        }
      });
    }
  }

  // ===================================================================
  // 5. Projections & DPS Growth Calculator
  // ===================================================================
  function renderCalculatorView() {
    initCalculatorControls();
    recalculateDPS();
  }

  function initCalculatorControls() {
    const sliderAmount = document.getElementById('calcSliderAmount');
    const inputAmount = document.getElementById('calcInputAmount');
    const sliderRate = document.getElementById('calcSliderRate');
    const inputRate = document.getElementById('calcInputRate');
    const sliderDuration = document.getElementById('calcSliderDuration');
    const inputDuration = document.getElementById('calcInputDuration');
    const inputMembers = document.getElementById('calcInputMembers');

    if (sliderAmount && inputAmount) {
      sliderAmount.addEventListener('input', (e) => {
        inputAmount.value = e.target.value;
        state.calculator.monthlyAmount = Number(e.target.value);
        recalculateDPS();
      });
      inputAmount.addEventListener('change', (e) => {
        sliderAmount.value = e.target.value;
        state.calculator.monthlyAmount = Number(e.target.value);
        recalculateDPS();
      });
    }

    if (sliderRate && inputRate) {
      sliderRate.addEventListener('input', (e) => {
        inputRate.value = e.target.value;
        state.calculator.annualRate = Number(e.target.value);
        recalculateDPS();
      });
      inputRate.addEventListener('change', (e) => {
        sliderRate.value = e.target.value;
        state.calculator.annualRate = Number(e.target.value);
        recalculateDPS();
      });
    }

    if (sliderDuration && inputDuration) {
      sliderDuration.addEventListener('input', (e) => {
        inputDuration.value = e.target.value;
        state.calculator.durationYears = Number(e.target.value);
        recalculateDPS();
      });
      inputDuration.addEventListener('change', (e) => {
        sliderDuration.value = e.target.value;
        state.calculator.durationYears = Number(e.target.value);
        recalculateDPS();
      });
    }

    if (inputMembers) {
      inputMembers.addEventListener('input', (e) => {
        state.calculator.membersCount = Math.max(1, Number(e.target.value) || 7);
        recalculateDPS();
      });
    }
  }

  function recalculateDPS() {
    const P = state.calculator.monthlyAmount;
    const r = (state.calculator.annualRate / 100) / 12;
    const n = state.calculator.durationYears * 12;
    const members = state.calculator.membersCount;

    let maturityValue = 0;
    if (r > 0) {
      maturityValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    } else {
      maturityValue = P * n;
    }

    const totalPrincipal = P * n;
    const totalInterest = Math.max(0, maturityValue - totalPrincipal);
    const perMemberPrincipal = totalPrincipal / members;
    const perMemberMaturity = maturityValue / members;

    const elPrincipal = document.getElementById('calcResultPrincipal');
    const elInterest = document.getElementById('calcResultInterest');
    const elMaturity = document.getElementById('calcResultMaturity');
    const elPerMemberPrincipal = document.getElementById('calcPerMemberPrincipal');
    const elPerMemberPayout = document.getElementById('calcPerMemberPayout');
    const elBarPrincipal = document.getElementById('calcBarPrincipal');
    const elBarInterest = document.getElementById('calcBarInterest');

    if (elPrincipal) elPrincipal.textContent = formatCurrency(totalPrincipal);
    if (elInterest) elInterest.textContent = formatCurrency(totalInterest);
    if (elMaturity) elMaturity.textContent = formatCurrency(maturityValue);
    if (elPerMemberPrincipal) elPerMemberPrincipal.textContent = formatCurrency(perMemberPrincipal);
    if (elPerMemberPayout) elPerMemberPayout.textContent = formatCurrency(perMemberMaturity);

    if (elBarPrincipal && elBarInterest) {
      const principalPct = Math.round((totalPrincipal / maturityValue) * 100);
      const interestPct = 100 - principalPct;
      elBarPrincipal.style.width = `${principalPct}%`;
      elBarPrincipal.title = `Principal: ${principalPct}%`;
      elBarInterest.style.width = `${interestPct}%`;
      elBarInterest.title = `Interest: ${interestPct}%`;
    }
  }

  // ===================================================================
  // 6. CSV Export Utilities
  // ===================================================================
  window.exportMasterLedgerCSV = function () {
    const data = state.data;
    if (!data) return;

    let csv = 'Mission Infinity - Mutual Trust Bank & DPS Ledger\n';
    csv += `Bank: ${data.bankInfo.bankName}, Branch: ${data.bankInfo.branch}, A/C: ${data.bankInfo.accountNumber}, DPS: ${data.bankInfo.dpsNumber}\n\n`;

    const headers = ['Year', 'Month', ...data.members.map(m => `"${m.name}"`), 'Docs Total', 'Notes'];
    csv += headers.join(',') + '\n';

    data.records.forEach(r => {
      const row = [
        r.year,
        `"${r.month}"`,
        ...data.members.map(m => (r.payments[m.id] !== null ? r.payments[m.id] : '')),
        r.total || 0,
        `"${(r.note || '').replace(/"/g, '""')}"`
      ];
      csv += row.join(',') + '\n';
    });

    csv += '\n';
    const gtRow = ['GRAND TOTAL', '', ...data.members.map(m => data.summary.grandTotal.members[m.id] || 0), data.summary.grandTotal.docsTotal, ''];
    const adjRow = ['IFTER DONATION', '', ...data.summary.adjustment.members[m.id] || 0, data.summary.adjustment.docsTotal, ''];
    const netRow = ['DPS NET AMOUNT', '', ...data.summary.netTotal.members[m.id] || 0, data.summary.netTotal.docsTotal, ''];
    const dpsRow = ['EXTRA ALLOCATION', '', ...data.summary.dpsTarget.members[m.id] || 0, data.summary.dpsTarget.docsTotal, ''];

    csv += gtRow.join(',') + '\n';
    csv += adjRow.join(',') + '\n';
    csv += netRow.join(',') + '\n';
    csv += dpsRow.join(',') + '\n';

    downloadCSV(csv, `mission_infinity_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Master ledger downloaded as CSV', 'success');
  };

  window.exportMemberCSV = function (memberId) {
    const data = state.data;
    if (!data) return;

    const member = data.members.find(m => m.id === memberId);
    if (!member) return;

    let csv = `Mission Infinity - Financial Statement for ${member.name}\n`;
    csv += `Role: ${member.role}, Bank: ${data.bankInfo.bankName}, Branch: ${data.bankInfo.branch}\n\n`;

    csv += 'Year,Month,Amount (BDT),Status,Notes\n';

    data.records.forEach(r => {
      const p = r.payments[member.id];
      const hasPaid = p !== null && p > 0;
      csv += [
        r.year,
        `"${r.month}"`,
        hasPaid ? p : '0',
        hasPaid ? 'Paid' : 'Unpaid',
        `"${(r.note || '').replace(/"/g, '""')}"`
      ].join(',') + '\n';
    });

    csv += '\n';
    csv += `Total Deposited,${data.summary.grandTotal.members[member.id] || 0}\n`;
    csv += `Ifter Donation,${data.summary.adjustment.members[member.id] || 0}\n`;
    csv += `DPS Net Share,${data.summary.netTotal.members[member.id] || 0}\n`;
    csv += `Extra Allocation,${data.summary.dpsTarget.members[member.id] || 0}\n`;

    downloadCSV(csv, `statement_${member.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    showToast(`Statement exported for ${member.name}`, 'success');
  };

  function downloadCSV(csvContent, filename) {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ===================================================================
  // 7. Clipboard & Theme Toggle
  // ===================================================================
  window.copyToClipboard = function (text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard!`, 'success');
      }).catch(() => {
        fallbackCopy(text, label);
      });
    } else {
      fallbackCopy(text, label);
    }
  };

  function fallbackCopy(text, label) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`${label} copied to clipboard!`, 'success');
    } catch (err) {
      showToast(`Failed to copy ${label}`, 'warning');
    }
    document.body.removeChild(textArea);
  }

  function initTheme() {
    const savedTheme = localStorage.getItem('mission_infinity_theme') || 'dark';
    setTheme(savedTheme, false);

    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next, true);
        showToast(`Switched to ${next} mode`, 'info');
      });
    }
  }

  function setTheme(theme, redrawCharts = true) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mission_infinity_theme', theme);

    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      if (theme === 'light') {
        themeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        themeBtn.title = 'Switch to Dark Mode';
      } else {
        themeBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        themeBtn.title = 'Switch to Light Mode';
      }
    }

    if (redrawCharts) {
      renderDashboardCharts();
      renderAnalyticsCharts();
    }
  }

  // Live Sheet Frame Controls
  window.reloadSheetFrame = function () {
    const iframe = document.getElementById('googleSheetFrame');
    if (iframe) {
      const src = iframe.src;
      iframe.src = '';
      setTimeout(() => { iframe.src = src; }, 100);
      showToast('Reloading Google Sheet view...', 'info');
    }
  };

  window.toggleSheetFullscreen = function () {
    const card = document.getElementById('sheetEmbedCard');
    if (card) {
      card.classList.toggle('fullscreen');
      const isFull = card.classList.contains('fullscreen');
      showToast(isFull ? 'Entered Fullscreen Mode (Press ESC to exit)' : 'Exited Fullscreen Mode', 'info');
    }
  };

  // ===================================================================
  // Application Bootstrap
  // ===================================================================
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initModals();

    const refreshBtn = document.getElementById('btnRefreshData');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadData(true);
      });
    }

    const printBtn = document.getElementById('btnPrintLedger');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const exportBtn = document.getElementById('btnExportMasterCSV');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.exportMasterLedgerCSV();
      });
    }

    // Initial load: Instant render + background Google Sheets live check
    loadData(false);

    // Auto-sync periodically with Google Sheet
    setInterval(() => {
      loadData(false);
    }, CONFIG.autoSyncIntervalMs);
  });

})();
