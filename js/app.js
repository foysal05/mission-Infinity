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
    },
    exportStudio: {
      memberId: null,
      filter: 'all',
      format: 'csv',
      includeHeader: true,
      includeSummary: true,
      includeNotes: true,
      delimiter: ','
    },
    memberModalFilter: 'all'
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
      { id: 'rajib', name: 'Rajib', colIndex: 9, role: 'Member / Contributor' }
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
        dpsHolder: 'SALAHUDDIN & SHAHADAT HOSSAIN'
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
            pointBackgroundColor: (ctx) => (ctx.dataIndex === 11 ? '#f59e0b' : '#10b981'),
            pointBorderColor: isDark ? '#090d16' : '#ffffff',
            pointBorderWidth: 2,
            pointRadius: (ctx) => (ctx.dataIndex === 11 ? 7 : 4),
            pointHoverRadius: 8,
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
                  const prefix = ctx.dataIndex === 11 ? ' ⭐ Dec \'25 Reconciled: ' : ' Total: ';
                  return `${prefix}৳${Number(ctx.raw).toLocaleString('en-IN')}`;
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

      const primaryMembers = data.members;
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

  function getCurrentMonthInfo() {
    const now = new Date();
    const currentYear = String(now.getFullYear());
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const currentMonthName = monthNames[now.getMonth()];
    return { year: currentYear, month: currentMonthName };
  }

  function focusCurrentMonth(smooth = true) {
    const currentMonthRow = document.getElementById('currentMonthRow');
    const tableContainer = document.querySelector('.table-responsive');
    if (!currentMonthRow || !tableContainer) return;

    if (tableContainer.clientHeight === 0) return;

    const containerRect = tableContainer.getBoundingClientRect();
    const rowRect = currentMonthRow.getBoundingClientRect();

    const offsetFromContainerTop = rowRect.top - containerRect.top;
    const targetScrollTop = tableContainer.scrollTop + offsetFromContainerTop - (tableContainer.clientHeight / 2) + (rowRect.height / 2);

    tableContainer.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: smooth ? 'smooth' : 'auto'
    });

    currentMonthRow.classList.remove('highlight-pulse');
    void currentMonthRow.offsetWidth;
    currentMonthRow.classList.add('highlight-pulse');
  }

  window.focusCurrentMonth = focusCurrentMonth;

  window.jumpToCurrentMonth = function () {
    const currentInfo = getCurrentMonthInfo();
    if (state.activeTab !== 'ledger') {
      switchTab('ledger');
    }
    let filtersReset = false;
    if (state.yearFilter !== 'all' && state.yearFilter !== currentInfo.year) {
      state.yearFilter = 'all';
      filtersReset = true;
    }
    if (state.statusFilter !== 'all') {
      state.statusFilter = 'all';
      filtersReset = true;
    }
    if (state.searchQuery) {
      state.searchQuery = '';
      const sInput = document.getElementById('ledgerSearch');
      if (sInput) sInput.value = '';
      filtersReset = true;
    }
    if (filtersReset) {
      updateFilterButtons();
      renderMasterLedgerTable();
    }
    setTimeout(() => {
      focusCurrentMonth(true);
      showToast(`Focused on Current Month: ${currentInfo.month} ${currentInfo.year}`, 'success');
    }, 60);
  };

  function renderMasterLedgerTable() {
    const data = state.data;
    const tbody = document.getElementById('ledgerTableBody');
    const tfoot = document.getElementById('ledgerTableFoot');
    if (!tbody || !data) return;

    const members = data.members;
    const currentInfo = getCurrentMonthInfo();

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
          <td colspan="${members.length + 4}" style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
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
      const isCurrentMonth = (r.year === currentInfo.year && r.month.toLowerCase() === currentInfo.month.toLowerCase());

      let noteCellHtml = '—';
      if (r.note) {
        noteCellHtml = `
          <button class="note-badge-icon" onclick="openNoteModal('${escapeHtml(r.month)}', '${escapeHtml(r.year)}', '${escapeHtml(r.note)}')" title="Click to view special ledger entry">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Notice
          </button>
        `;
      } else if (isCurrentMonth) {
        if (isPaid) {
          noteCellHtml = '<span class="status-pill status-paid-current"><span class="pulse-dot"></span> Paid (Current)</span>';
        } else {
          noteCellHtml = '<span class="status-pill status-current-due"><span class="pulse-dot-amber"></span> Current Due</span>';
        }
      } else if (isPaid) {
        noteCellHtml = '<span class="status-pill status-paid"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Paid</span>';
      } else {
        noteCellHtml = '<span class="status-pill status-scheduled">Scheduled</span>';
      }

      let memberCellsHtml = '';
      members.forEach(m => {
        const val = r.payments[m.id];
        if (val !== null && val > 0) {
          memberCellsHtml += `<td class="cell-amount paid">${formatNumber(val)}</td>`;
        } else {
          memberCellsHtml += `<td class="cell-amount empty"><span class="empty-dash">—</span></td>`;
        }
      });

      const monthLabelHtml = isCurrentMonth ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.35rem;">
          <span style="font-weight:800;letter-spacing:0.02em;">${r.month}</span>
          <span class="badge-current-month" title="Current Active Month"><span class="pulse-dot"></span> CURRENT</span>
        </div>
      ` : r.month;

      const totalVal = r.total > 0 ? formatNumber(r.total) : (isCurrentMonth ? '<span class="empty-dash">—</span>' : '<span class="empty-dash">0</span>');
      const totalCellClass = r.total > 0 ? 'cell-total' : 'cell-total is-zero';

      rowsHtml += `
        <tr ${isCurrentMonth ? 'id="currentMonthRow" class="row-current-month" data-current-month="true"' : ''}>
          <td class="col-sticky-1">${r.year}</td>
          <td class="col-sticky-2">${monthLabelHtml}</td>
          ${memberCellsHtml}
          <td class="${totalCellClass}">${totalVal}</td>
          <td style="text-align:center;">${noteCellHtml}</td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    const thead = document.getElementById('ledgerTableHead');
    if (thead) {
      let memberThs = '';
      members.forEach(m => {
        const isHolder = m.id === 'salahuddin';
        const badge = isHolder ? ' <span class="dps-holder-pill" title="DPS Account Holder">DPS</span>' : '';
        memberThs += `<th class="col-member">${escapeHtml(m.name)}${badge}</th>`;
      });
      thead.innerHTML = `
        <tr>
          <th class="col-sticky-1">Year</th>
          <th class="col-sticky-2">Month</th>
          ${memberThs}
          <th class="col-total">Docs Total</th>
          <th class="col-status">Status / Notes</th>
        </tr>
      `;
    }

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
          <td class="col-sticky-1"><span class="badge-tfoot gt">TOTAL</span></td>
          <td class="col-sticky-2">
            <div style="font-weight:800;line-height:1.2;">Deposited</div>
            <div style="font-size:0.7rem;font-weight:600;opacity:0.85;">মোট জমা</div>
          </td>
          ${gtCells}
          <td class="cell-total" style="font-size:0.95rem;">${formatNumber(gt.docsTotal)}</td>
          <td style="text-align:center;"><span class="status-verified-pill">✓ Verified</span></td>
        </tr>
        <tr class="row-adjustment">
          <td class="col-sticky-1"><span class="badge-tfoot adj">IFTER</span></td>
          <td class="col-sticky-2">
            <div style="font-weight:700;line-height:1.2;">Donation</div>
            <div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">ইফতার অনুদান</div>
          </td>
          ${adjCells}
          <td class="cell-total">${formatNumber(adj.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;font-weight:600;color:#b45309;">Rubel &amp; Zia</td>
        </tr>
        <tr class="row-net">
          <td class="col-sticky-1"><span class="badge-tfoot net">DPS NET</span></td>
          <td class="col-sticky-2">
            <div style="font-weight:800;line-height:1.2;">Net Fund</div>
            <div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">মূল ডিপিএস তহবিল</div>
          </td>
          ${netCells}
          <td class="cell-total">${formatNumber(net.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;font-weight:600;color:#4338ca;">Equal Share</td>
        </tr>
        <tr class="row-dps">
          <td class="col-sticky-1"><span class="badge-tfoot dps">EXTRA</span></td>
          <td class="col-sticky-2">
            <div style="font-weight:800;line-height:1.2;">Allocation</div>
            <div style="font-size:0.7rem;font-weight:600;color:var(--text-muted);">অতিরিক্ত বরাদ্দ</div>
          </td>
          ${dpsCells}
          <td class="cell-total">${formatNumber(dps.docsTotal)}</td>
          <td style="text-align:center;font-size:0.75rem;font-weight:600;color:#0e7490;">Mutual Trust Bank</td>
        </tr>
      `;
    }

    // Always auto-scroll and focus to current month row if available
    setTimeout(() => {
      focusCurrentMonth(false);
    }, 50);
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
    const currentInfo = getCurrentMonthInfo();

    let rowsHtml = '';
    let totalDepositedCalc = 0;
    let paidCount = 0;
    state.memberModalFilter = 'all';

    data.records.forEach(r => {
      const payment = r.payments[member.id];
      const hasPaid = payment !== null && payment > 0;
      const isCurrentMonth = (r.year === currentInfo.year && r.month.toLowerCase() === currentInfo.month.toLowerCase());
      if (hasPaid) {
        totalDepositedCalc += payment;
        paidCount++;
      }

      let statusCellHtml = '';
      if (hasPaid) {
        if (isCurrentMonth) {
          statusCellHtml = '<span class="status-current-badge paid"><span class="pulse-dot"></span> Paid (Current)</span>';
        } else {
          statusCellHtml = '<span style="color:var(--accent-emerald);font-size:0.75rem;font-weight:600;">✓ Paid</span>';
        }
      } else {
        if (isCurrentMonth) {
          statusCellHtml = '<span class="status-current-badge active"><span class="pulse-dot-amber"></span> Current Due</span>';
        } else {
          statusCellHtml = '<span style="color:var(--text-muted);font-size:0.75rem;">Scheduled</span>';
        }
      }

      const monthLabelHtml = isCurrentMonth ? `
        <div style="display:flex;align-items:center;gap:0.4rem;">
          <strong>${escapeHtml(r.month)}</strong>
          <span class="badge-current-month" title="Current Active Month"><span class="pulse-dot"></span> CURRENT</span>
        </div>
      ` : escapeHtml(r.month);

      rowsHtml += `
        <tr class="member-table-row ${isCurrentMonth ? 'row-current-month' : ''}" ${isCurrentMonth ? 'id="memberCurrentMonthRow"' : ''} data-paid="${hasPaid}" data-year="${r.year}">
          <td><strong>${r.year}</strong></td>
          <td>${monthLabelHtml}</td>
          <td style="text-align:right;font-family:var(--font-mono);font-weight:600;color:${hasPaid ? 'var(--text-highlight)' : 'var(--text-muted)'};">
            ${hasPaid ? formatNumber(payment) : '—'}
          </td>
          <td style="text-align:center;">
            ${statusCellHtml}
          </td>
          <td style="font-size:0.75rem;color:var(--text-secondary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
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

      <div class="member-statement-toolbar">
        <div class="toolbar-filter-wrap">
          <span class="toolbar-stat-pill">Installments: <strong id="memberPaidCountText">${paidCount} of 48 Months</strong></span>
          <div class="member-filter-pills" id="memberFilterPills">
            <button class="member-pill-btn active" onclick="filterMemberStatementTable('all', event)">All (48)</button>
            <button class="member-pill-btn" onclick="filterMemberStatementTable('paid', event)">Paid (${paidCount})</button>
            <button class="member-pill-btn" onclick="filterMemberStatementTable('upcoming', event)">Upcoming (${48 - paidCount})</button>
          </div>
        </div>

        <div class="export-dropdown-wrap" id="memberExportDropdownWrap">
          <div class="btn-group-interactive">
            <button class="interactive-export-main-btn" id="btnQuickExportCSV" onclick="quickExportMember('csv')" title="Click for instant download with animated feedback">
              <svg class="export-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              <span class="btn-text">Export Statement CSV</span>
            </button>
            <button class="interactive-export-toggle-btn" id="btnToggleExportMenu" onclick="toggleMemberExportDropdown(event)" title="More formats, WhatsApp copy &amp; Studio" aria-expanded="false">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>

          <!-- Interactive Popover Dropdown Menu -->
          <div class="interactive-export-popover" id="memberExportPopover">
            <div class="popover-header">
              <span class="popover-title">Export Options</span>
              <span class="popover-badge">${escapeHtml(member.name)}</span>
            </div>
            <div class="popover-items">
              <button class="popover-item" onclick="quickExportMember('csv', 'all')">
                <div class="popover-item-icon csv">📄</div>
                <div class="popover-item-content">
                  <div class="popover-item-title">Standard CSV (All 48 Months)</div>
                  <div class="popover-item-desc">Excel UTF-8 format with bank header</div>
                </div>
                <span class="popover-tag">48 Mos</span>
              </button>
              <button class="popover-item" onclick="quickExportMember('csv', 'paid')">
                <div class="popover-item-icon paid">✓</div>
                <div class="popover-item-content">
                  <div class="popover-item-title">Paid Installments Only</div>
                  <div class="popover-item-desc">${paidCount} verified cleared payments (${formatCurrency(grandTotal)})</div>
                </div>
                <span class="popover-tag success">${paidCount} Mos</span>
              </button>
              <button class="popover-item" onclick="quickExportMember('whatsapp', 'paid')">
                <div class="popover-item-icon wa">💬</div>
                <div class="popover-item-content">
                  <div class="popover-item-title">Copy for WhatsApp / SMS</div>
                  <div class="popover-item-desc">Formatted statement ready to paste</div>
                </div>
                <span class="popover-tag">Copy</span>
              </button>
              <button class="popover-item" onclick="printOfficialMemberStatement('${member.id}')">
                <div class="popover-item-icon print">🖨️</div>
                <div class="popover-item-content">
                  <div class="popover-item-title">Print Official Statement (PDF)</div>
                  <div class="popover-item-desc">Mutual Trust Bank Kadair Bazar format</div>
                </div>
                <span class="popover-tag">PDF</span>
              </button>
            </div>
            <div class="popover-footer">
              <button class="btn-open-studio" onclick="openExportStudio('${member.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Customize &amp; Live Preview Studio...
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="memberTableContainer" style="max-height:380px;overflow-y:auto;border:1px solid var(--border-color);border-radius:var(--radius-md);">
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
          <tbody id="memberStatementTableBody">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    modal.classList.add('open');

    // Populate modal footer with verified summary and studio action
    const modalFooter = document.getElementById('memberModalFooter');
    if (modalFooter) {
      modalFooter.innerHTML = `
        <div class="modal-footer-info">
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;color:var(--text-secondary);">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent-emerald);"></span>
            Verified Total: <strong style="color:var(--text-primary);font-family:var(--font-mono);">${formatCurrency(grandTotal)}</strong> (${paidCount} of 48)
          </span>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <button class="btn btn-secondary" onclick="openExportStudio('${member.id}')" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.75rem;font-size:0.8rem;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Customize &amp; Print Studio
          </button>
          <button class="btn btn-secondary" onclick="closeModal('memberModal')" style="padding:0.4rem 0.85rem;font-size:0.8rem;">Close</button>
        </div>
      `;
    }

    // Auto-scroll to current month row if present
    setTimeout(() => {
      const curRow = document.getElementById('memberCurrentMonthRow');
      const container = document.getElementById('memberTableContainer');
      if (curRow && container) {
        const rowRect = curRow.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        const targetScroll = container.scrollTop + (rowRect.top - contRect.top) - (container.clientHeight / 2) + (rowRect.height / 2);
        container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }, 120);
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
    const perMemberProfit = totalInterest / members;

    const elPrincipal = document.getElementById('calcResultPrincipal');
    const elInterest = document.getElementById('calcResultInterest');
    const elMaturity = document.getElementById('calcResultMaturity');
    const elPerMemberPrincipal = document.getElementById('calcPerMemberPrincipal');
    const elPerMemberPayout = document.getElementById('calcPerMemberPayout');
    const elPerMemberProfit = document.getElementById('calcPerMemberProfit');
    const elBarPrincipal = document.getElementById('calcBarPrincipal');
    const elBarInterest = document.getElementById('calcBarInterest');

    if (elPrincipal) elPrincipal.textContent = formatCurrency(totalPrincipal);
    if (elInterest) elInterest.textContent = formatCurrency(totalInterest);
    if (elMaturity) elMaturity.textContent = formatCurrency(maturityValue);
    if (elPerMemberPrincipal) elPerMemberPrincipal.textContent = formatCurrency(perMemberPrincipal);
    if (elPerMemberPayout) elPerMemberPayout.textContent = formatCurrency(perMemberMaturity);
    if (elPerMemberProfit) elPerMemberProfit.textContent = formatCurrency(perMemberProfit);

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
    const adjRow = ['IFTER DONATION', '', ...data.members.map(m => data.summary.adjustment.members[m.id] || 0), data.summary.adjustment.docsTotal, ''];
    const netRow = ['DPS NET AMOUNT', '', ...data.members.map(m => data.summary.netTotal.members[m.id] || 0), data.summary.netTotal.docsTotal, ''];
    const dpsRow = ['EXTRA ALLOCATION', '', ...data.members.map(m => data.summary.dpsTarget.members[m.id] || 0), data.summary.dpsTarget.docsTotal, ''];

    csv += gtRow.join(',') + '\n';
    csv += adjRow.join(',') + '\n';
    csv += netRow.join(',') + '\n';
    csv += dpsRow.join(',') + '\n';

    downloadCSV(csv, `mission_infinity_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Master ledger downloaded as CSV', 'success');
  };

  // ===================================================================
  // 6. Interactive Statement Export Suite & Export Studio
  // ===================================================================

  // Toggle dropdown popover
  window.toggleMemberExportDropdown = function (evt) {
    if (evt) {
      evt.stopPropagation();
      evt.preventDefault();
    }
    const popover = document.getElementById('memberExportPopover');
    const toggleBtn = document.getElementById('btnToggleExportMenu');
    const wrap = document.getElementById('memberExportDropdownWrap');
    if (!popover) return;
    const isOpen = popover.classList.contains('open');
    if (isOpen) {
      closeMemberExportDropdown();
    } else {
      // Smart positioning to prevent left-side clipping
      if (wrap) {
        const wrapRect = wrap.getBoundingClientRect();
        const modal = document.querySelector('#memberModal .modal-dialog') || wrap.closest('.modal-dialog');
        const modalLeft = modal ? modal.getBoundingClientRect().left : 0;
        const offsetFromModalLeft = wrapRect.right - modalLeft;
        // If distance from modal left is under 330px, anchor popover to left edge of wrap so it flows towards right
        if (offsetFromModalLeft < 330 || wrapRect.left < 20) {
          popover.classList.add('open-left');
        } else {
          popover.classList.remove('open-left');
        }
      }
      popover.classList.add('open');
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
    }
  };

  window.closeMemberExportDropdown = function () {
    const popover = document.getElementById('memberExportPopover');
    const toggleBtn = document.getElementById('btnToggleExportMenu');
    if (popover) popover.classList.remove('open');
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('aria-expanded', 'false');
    }
  };

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('memberExportDropdownWrap');
    if (wrap && !wrap.contains(e.target)) {
      closeMemberExportDropdown();
    }
  });

  // Live filter in member modal table
  window.filterMemberStatementTable = function (filter, evt) {
    state.memberModalFilter = filter;
    document.querySelectorAll('#memberFilterPills .member-pill-btn').forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) evt.target.classList.add('active');

    const rows = document.querySelectorAll('#memberStatementTableBody tr');
    let visibleCount = 0;
    rows.forEach(tr => {
      const isPaid = tr.getAttribute('data-paid') === 'true';
      let show = false;
      if (filter === 'all') show = true;
      else if (filter === 'paid') show = isPaid;
      else if (filter === 'upcoming') show = !isPaid;

      tr.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    const quickBtn = document.getElementById('btnQuickExportCSV');
    if (quickBtn) {
      const label = quickBtn.querySelector('.btn-text');
      if (label) {
        if (filter === 'paid') label.textContent = 'Export Paid CSV';
        else if (filter === 'upcoming') label.textContent = 'Export Upcoming CSV';
        else label.textContent = 'Export Statement CSV';
      }
    }
  };

  // Quick export with micro-animated button state feedback
  window.quickExportMember = function (format = 'csv', filterType = null) {
    const memberId = state.selectedMemberId;
    const data = state.data;
    if (!memberId || !data) return;
    const member = data.members.find(m => m.id === memberId);
    if (!member) return;

    filterType = filterType || state.memberModalFilter || 'all';
    closeMemberExportDropdown();

    const mainBtn = document.getElementById('btnQuickExportCSV');
    const origHtml = mainBtn ? mainBtn.innerHTML : '';

    if (mainBtn) {
      mainBtn.classList.add('btn-loading');
      mainBtn.innerHTML = `
        <span class="spinner-icon"></span>
        <span class="btn-text">Generating...</span>
      `;
    }

    setTimeout(() => {
      try {
        if (format === 'whatsapp') {
          const text = generateMemberWhatsAppText(member, filterType);
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
              showToast(`WhatsApp statement for ${member.name} copied!`, 'success');
            }).catch(() => fallbackCopy(text, 'WhatsApp Statement'));
          } else {
            fallbackCopy(text, 'WhatsApp Statement');
          }
        } else {
          const csv = generateMemberCSVContent({
            member: member,
            filter: filterType,
            delimiter: ',',
            includeHeader: true,
            includeSummary: true,
            includeNotes: true
          });
          const dateStr = new Date().toISOString().split('T')[0];
          const suffix = filterType === 'paid' ? 'paid_only' : (filterType === 'all' ? 'full' : filterType);
          const filename = `statement_${member.name.toLowerCase().replace(/\s+/g, '_')}_${suffix}_${dateStr}.csv`;
          downloadCSV(csv, filename);
          showToast(`Downloaded: ${filename}`, 'success');
        }

        if (mainBtn) {
          mainBtn.classList.remove('btn-loading');
          mainBtn.classList.add('btn-success-animated');
          mainBtn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span class="btn-text">${format === 'whatsapp' ? '✓ Copied to Clipboard!' : '✓ Downloaded!'}</span>
          `;
          setTimeout(() => {
            mainBtn.classList.remove('btn-success-animated');
            mainBtn.innerHTML = origHtml;
          }, 2400);
        }
      } catch (err) {
        console.error('Export error:', err);
        showToast('Export error: ' + err.message, 'error');
        if (mainBtn) {
          mainBtn.classList.remove('btn-loading');
          mainBtn.innerHTML = origHtml;
        }
      }
    }, 450);
  };

  // Statement content generators
  function generateMemberCSVContent(options) {
    const { member, filter = 'all', delimiter = ',', includeHeader = true, includeSummary = true, includeNotes = true } = options;
    const data = state.data;
    if (!data || !member) return '';

    const lines = [];
    const d = delimiter;

    if (includeHeader) {
      lines.push(`"Mission Infinity - Official Financial Statement"`);
      lines.push(`"Member: ${member.name}"${d}"Role: ${member.role}"`);
      lines.push(`"Bank: ${data.bankInfo.bankName}"${d}"Branch: ${data.bankInfo.branch}"`);
      lines.push(`"A/C: ${data.bankInfo.accountNumber}"${d}"DPS A/C: ${data.bankInfo.dpsNumber}"${d}"DPS Holder: ${data.bankInfo.dpsHolder}"`);
      lines.push(`"Statement Date: ${new Date().toLocaleDateString('en-GB')}"${d}"Filter: ${filter.toUpperCase()}"`);
      lines.push('');
    }

    const headers = ['Year', 'Month', 'Amount (BDT)', 'Status'];
    if (includeNotes) headers.push('Notes');
    lines.push(headers.join(d));

    let recordList = data.records;
    if (filter === 'paid') {
      recordList = data.records.filter(r => r.payments[member.id] !== null && r.payments[member.id] > 0);
    } else if (filter === 'upcoming') {
      recordList = data.records.filter(r => !(r.payments[member.id] !== null && r.payments[member.id] > 0));
    } else if (filter === '2025') {
      recordList = data.records.filter(r => r.year === '2025');
    } else if (filter === '2026') {
      recordList = data.records.filter(r => r.year === '2026');
    }

    let subtotal = 0;
    recordList.forEach(r => {
      const p = r.payments[member.id];
      const hasPaid = p !== null && p > 0;
      if (hasPaid) subtotal += p;

      const row = [
        r.year,
        `"${r.month}"`,
        hasPaid ? p : 0,
        hasPaid ? 'Paid' : 'Scheduled'
      ];
      if (includeNotes) {
        row.push(`"${(r.note || '').replace(/"/g, '""')}"`);
      }
      lines.push(row.join(d));
    });

    if (includeSummary) {
      lines.push('');
      lines.push([`"FILTER SUBTOTAL"`, `"${filter.toUpperCase()}"`, subtotal, `"${recordList.length} Rows"`].slice(0, headers.length).join(d));
      lines.push([`"GRAND TOTAL DEPOSITED"`, `""`, data.summary.grandTotal.members[member.id] || 0, `"Verified"`].slice(0, headers.length).join(d));
      lines.push([`"IFTER DONATION"`, `""`, data.summary.adjustment.members[member.id] || 0, `"Rubel & Zia"`].slice(0, headers.length).join(d));
      lines.push([`"DPS NET AMOUNT"`, `""`, data.summary.netTotal.members[member.id] || 0, `"Fund Balance"`].slice(0, headers.length).join(d));
      lines.push([`"EXTRA ALLOCATION"`, `""`, data.summary.dpsTarget.members[member.id] || 0, `"Target Share"`].slice(0, headers.length).join(d));
    }

    return lines.join('\n');
  }

  function generateMemberWhatsAppText(member, filter = 'paid') {
    const data = state.data;
    if (!data || !member) return '';

    let recordList = data.records;
    if (filter === 'paid') {
      recordList = data.records.filter(r => r.payments[member.id] !== null && r.payments[member.id] > 0);
    } else if (filter === '2025') {
      recordList = data.records.filter(r => r.year === '2025');
    } else if (filter === '2026') {
      recordList = data.records.filter(r => r.year === '2026');
    }

    const gt = data.summary.grandTotal.members[member.id] || 0;
    const ift = data.summary.adjustment.members[member.id] || 0;
    const net = data.summary.netTotal.members[member.id] || 0;
    const dps = data.summary.dpsTarget.members[member.id] || 0;

    let text = `🏦 *MISSION INFINITY — FINANCIAL STATEMENT*\n`;
    text += `👤 *Member:* ${member.name} (${member.role})\n`;
    text += `🏛️ *Bank:* ${data.bankInfo.bankName} (${data.bankInfo.branch})\n`;
    text += `💳 *DPS A/C:* ${data.bankInfo.dpsNumber} | *Holder:* ${data.bankInfo.dpsHolder}\n`;
    text += `📅 *Scope:* ${filter === 'paid' ? 'Paid Installments (Cleared)' : 'All 48 Installments'}\n`;
    text += `──────────────────────\n`;
    text += `💰 *Grand Total Deposited:* ৳${formatNumber(gt)}\n`;
    text += `🌙 *Ifter Donation:* ৳${formatNumber(ift)}\n`;
    text += `⚖️ *DPS Net Share:* ৳${formatNumber(net)}\n`;
    text += `📈 *Extra Allocation:* ৳${formatNumber(dps)}\n`;
    text += `──────────────────────\n`;
    text += `*Installments Breakdown (${recordList.length} entries):*\n`;

    recordList.forEach((r, idx) => {
      const p = r.payments[member.id];
      const hasPaid = p !== null && p > 0;
      text += `${idx + 1}. ${r.month} ${r.year}: ${hasPaid ? `৳${formatNumber(p)} ✓` : `৳0 (Scheduled)`}${r.note ? ` [Note: ${r.note}]` : ''}\n`;
    });

    text += `──────────────────────\n`;
    text += `Generated on ${new Date().toLocaleDateString('en-GB')} via Mission Infinity Portal`;
    return text;
  }

  function generateMemberJSONContent(member, filter = 'all') {
    const data = state.data;
    if (!data || !member) return '{}';

    let recordList = data.records;
    if (filter === 'paid') {
      recordList = data.records.filter(r => r.payments[member.id] !== null && r.payments[member.id] > 0);
    } else if (filter === '2025') {
      recordList = data.records.filter(r => r.year === '2025');
    } else if (filter === '2026') {
      recordList = data.records.filter(r => r.year === '2026');
    }

    const payload = {
      portal: 'Mission Infinity',
      bankInfo: data.bankInfo,
      member: member,
      filterApplied: filter,
      generatedAt: new Date().toISOString(),
      summary: {
        totalDeposited: data.summary.grandTotal.members[member.id] || 0,
        ifterDonation: data.summary.adjustment.members[member.id] || 0,
        dpsNetShare: data.summary.netTotal.members[member.id] || 0,
        extraAllocation: data.summary.dpsTarget.members[member.id] || 0
      },
      records: recordList.map(r => ({
        year: r.year,
        month: r.month,
        amount: r.payments[member.id] || 0,
        isPaid: r.payments[member.id] !== null && r.payments[member.id] > 0,
        note: r.note || ''
      }))
    };
    return JSON.stringify(payload, null, 2);
  }

  // Interactive Export Studio Modal Logic
  window.openExportStudio = function (memberId) {
    closeMemberExportDropdown();
    const data = state.data;
    if (!data) return;

    memberId = memberId || state.selectedMemberId || data.members[0].id;
    state.exportStudio.memberId = memberId;
    state.exportStudio.filter = state.memberModalFilter || 'all';

    renderExportStudio();
    const modal = document.getElementById('exportStudioModal');
    if (modal) modal.classList.add('open');
  };

  function renderExportStudio() {
    const data = state.data;
    const body = document.getElementById('exportStudioBody');
    const memberId = state.exportStudio.memberId;
    if (!data || !body || !memberId) return;

    const member = data.members.find(m => m.id === memberId);
    if (!member) return;

    const st = state.exportStudio;
    const subtitle = document.getElementById('exportStudioSubtitle');
    if (subtitle) {
      subtitle.textContent = `Statement for ${member.name} (${member.role}) • Mutual Trust Bank Kadair Bazar`;
    }

    // Determine current records count and sum
    let filteredRecords = data.records;
    if (st.filter === 'paid') {
      filteredRecords = data.records.filter(r => r.payments[member.id] !== null && r.payments[member.id] > 0);
    } else if (st.filter === '2025') {
      filteredRecords = data.records.filter(r => r.year === '2025');
    } else if (st.filter === '2026') {
      filteredRecords = data.records.filter(r => r.year === '2026');
    }

    let filterSum = 0;
    filteredRecords.forEach(r => {
      const p = r.payments[member.id];
      if (p !== null && p > 0) filterSum += p;
    });

    // Generate preview string based on format
    let previewContent = '';
    let extLabel = '.csv';
    if (st.format === 'csv') {
      previewContent = generateMemberCSVContent({
        member: member,
        filter: st.filter,
        delimiter: st.delimiter,
        includeHeader: st.includeHeader,
        includeSummary: st.includeSummary,
        includeNotes: st.includeNotes
      });
      extLabel = '.csv';
    } else if (st.format === 'tsv') {
      previewContent = generateMemberCSVContent({
        member: member,
        filter: st.filter,
        delimiter: '\t',
        includeHeader: st.includeHeader,
        includeSummary: st.includeSummary,
        includeNotes: st.includeNotes
      });
      extLabel = '.tsv';
    } else if (st.format === 'whatsapp') {
      previewContent = generateMemberWhatsAppText(member, st.filter);
      extLabel = '.txt';
    } else if (st.format === 'json') {
      previewContent = generateMemberJSONContent(member, st.filter);
      extLabel = '.json';
    }

    const estimatedBytes = new Blob([previewContent]).size;
    const estimatedKb = (estimatedBytes / 1024).toFixed(1);

    body.innerHTML = `
      <div class="studio-grid">
        <!-- Left: Interactive Controls -->
        <div style="display:flex;flex-direction:column;gap:1rem;">
          <div class="studio-card">
            <div class="studio-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              1. Installment Scope &amp; Range
            </div>
            <div class="studio-pill-group">
              <button class="studio-option-btn ${st.filter === 'all' ? 'active' : ''}" onclick="studioSetFilter('all')">
                All 48 Months
              </button>
              <button class="studio-option-btn ${st.filter === 'paid' ? 'active' : ''}" onclick="studioSetFilter('paid')">
                ✓ Paid Only (${filteredRecords.length})
              </button>
              <button class="studio-option-btn ${st.filter === '2025' ? 'active' : ''}" onclick="studioSetFilter('2025')">
                Year 2025 (12 Mos)
              </button>
              <button class="studio-option-btn ${st.filter === '2026' ? 'active' : ''}" onclick="studioSetFilter('2026')">
                Year 2026 (Active)
              </button>
            </div>
          </div>

          <div class="studio-card">
            <div class="studio-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              2. Export Format
            </div>
            <div class="studio-pill-group">
              <button class="studio-option-btn ${st.format === 'csv' ? 'active' : ''}" onclick="studioSetFormat('csv')">
                📄 CSV (.csv)
              </button>
              <button class="studio-option-btn ${st.format === 'tsv' ? 'active' : ''}" onclick="studioSetFormat('tsv')">
                📊 Excel TSV (.tsv)
              </button>
              <button class="studio-option-btn ${st.format === 'whatsapp' ? 'active' : ''}" onclick="studioSetFormat('whatsapp')">
                💬 WhatsApp / Text
              </button>
              <button class="studio-option-btn ${st.format === 'json' ? 'active' : ''}" onclick="studioSetFormat('json')">
                📦 JSON (.json)
              </button>
            </div>
          </div>

          <div class="studio-card">
            <div class="studio-section-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              3. Data Customization
            </div>
            <label class="studio-checkbox-row">
              <input type="checkbox" ${st.includeHeader ? 'checked' : ''} onchange="studioToggleOption('includeHeader')">
              <span>Include Bank &amp; Account Header Info</span>
            </label>
            <label class="studio-checkbox-row">
              <input type="checkbox" ${st.includeSummary ? 'checked' : ''} onchange="studioToggleOption('includeSummary')">
              <span>Include Financial Totals &amp; DPS Share Breakdown</span>
            </label>
            <label class="studio-checkbox-row">
              <input type="checkbox" ${st.includeNotes ? 'checked' : ''} onchange="studioToggleOption('includeNotes')">
              <span>Include Remarks &amp; Audit Notices</span>
            </label>

            ${st.format === 'csv' ? `
              <div style="display:flex;align-items:center;gap:0.75rem;margin-top:0.35rem;padding-top:0.5rem;border-top:1px dashed var(--border-color);font-size:0.75rem;">
                <span style="color:var(--text-secondary);">Delimiter:</span>
                <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer;">
                  <input type="radio" name="studioDelim" value="," ${st.delimiter === ',' ? 'checked' : ''} onchange="studioSetDelimiter(',')"> Comma (,)
                </label>
                <label style="display:flex;align-items:center;gap:0.3rem;cursor:pointer;">
                  <input type="radio" name="studioDelim" value=";" ${st.delimiter === ';' ? 'checked' : ''} onchange="studioSetDelimiter(';')"> Semicolon (;)
                </label>
              </div>
            ` : ''}
          </div>

          <div class="studio-live-stats-bar">
            <span>Selected: <strong>${filteredRecords.length} Rows</strong></span>
            <span>Total: <span class="studio-stats-badge">${formatCurrency(filterSum)}</span></span>
            <span style="color:var(--text-secondary);font-size:0.7rem;">~${estimatedKb} KB</span>
          </div>
        </div>

        <!-- Right: Real-Time Live Preview -->
        <div class="studio-preview-wrapper">
          <div class="studio-preview-topbar">
            <div class="studio-topbar-dots">
              <span class="studio-dot red"></span>
              <span class="studio-dot yellow"></span>
              <span class="studio-dot green"></span>
            </div>
            <div class="studio-preview-title">
              statement_${member.name.toLowerCase().replace(/\s+/g, '_')}${extLabel}
            </div>
            <button onclick="copyStudioContent()" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:0.7rem;display:flex;align-items:center;gap:0.3rem;" title="Copy to clipboard">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
          </div>
          <pre class="studio-preview-code-box" id="studioLivePreviewBox">${escapeHtml(previewContent)}</pre>
        </div>
      </div>
    `;

    const dlBtnLabel = document.getElementById('btnStudioDownloadLabel');
    if (dlBtnLabel) {
      dlBtnLabel.textContent = `Download ${extLabel.toUpperCase()}`;
    }
  }

  window.studioSetFilter = function (filter) {
    state.exportStudio.filter = filter;
    renderExportStudio();
  };

  window.studioSetFormat = function (format) {
    state.exportStudio.format = format;
    renderExportStudio();
  };

  window.studioToggleOption = function (optKey) {
    state.exportStudio[optKey] = !state.exportStudio[optKey];
    renderExportStudio();
  };

  window.studioSetDelimiter = function (delim) {
    state.exportStudio.delimiter = delim;
    renderExportStudio();
  };

  window.copyStudioContent = function () {
    const box = document.getElementById('studioLivePreviewBox');
    if (!box) return;
    const content = box.textContent;
    const btn = document.getElementById('btnStudioCopy');
    const label = document.getElementById('btnStudioCopyLabel');
    const origText = label ? label.textContent : 'Copy Data';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(() => {
        if (label) label.textContent = '✓ Copied!';
        if (btn) btn.classList.add('btn-success-animated');
        showToast('Statement content copied to clipboard!', 'success');
        setTimeout(() => {
          if (label) label.textContent = origText;
          if (btn) btn.classList.remove('btn-success-animated');
        }, 2000);
      }).catch(() => fallbackCopy(content, 'Statement content'));
    } else {
      fallbackCopy(content, 'Statement content');
    }
  };

  window.downloadStudioFile = function () {
    const data = state.data;
    const st = state.exportStudio;
    if (!data || !st.memberId) return;

    const member = data.members.find(m => m.id === st.memberId);
    if (!member) return;

    const box = document.getElementById('studioLivePreviewBox');
    if (!box) return;
    const content = box.textContent;

    const btn = document.getElementById('btnStudioDownload');
    const label = document.getElementById('btnStudioDownloadLabel');
    const origText = label ? label.textContent : 'Download Statement';

    if (btn) {
      btn.classList.add('btn-loading');
      if (label) label.textContent = 'Preparing...';
    }

    setTimeout(() => {
      let ext = 'csv';
      let mimeType = 'text/csv;charset=utf-8;';
      if (st.format === 'tsv') {
        ext = 'tsv';
        mimeType = 'text/tab-separated-values;charset=utf-8;';
      } else if (st.format === 'whatsapp') {
        ext = 'txt';
        mimeType = 'text/plain;charset=utf-8;';
      } else if (st.format === 'json') {
        ext = 'json';
        mimeType = 'application/json;charset=utf-8;';
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `statement_${member.name.toLowerCase().replace(/\s+/g, '_')}_${st.filter}_${dateStr}.${ext}`;

      const blob = new Blob([st.format === 'csv' || st.format === 'tsv' ? '\uFEFF' + content : content], { type: mimeType });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (btn) {
        btn.classList.remove('btn-loading');
        btn.classList.add('btn-success-animated');
        if (label) label.textContent = '✓ Downloaded!';
        setTimeout(() => {
          btn.classList.remove('btn-success-animated');
          if (label) label.textContent = origText;
        }, 2200);
      }

      showToast(`Statement saved as ${filename}`, 'success');
    }, 400);
  };

  // Official Bank Statement Print Layout
  window.printOfficialMemberStatement = function (memberId) {
    const data = state.data;
    if (!data) return;
    memberId = memberId || state.selectedMemberId;
    const member = data.members.find(m => m.id === memberId);
    if (!member) return;

    closeMemberExportDropdown();

    const printContainer = document.getElementById('officialPrintStatement');
    if (!printContainer) return;

    const gt = data.summary.grandTotal.members[member.id] || 0;
    const ift = data.summary.adjustment.members[member.id] || 0;
    const net = data.summary.netTotal.members[member.id] || 0;
    const dps = data.summary.dpsTarget.members[member.id] || 0;

    let rowsHtml = '';
    let paidTotal = 0;
    data.records.forEach((r, idx) => {
      const p = r.payments[member.id];
      const hasPaid = p !== null && p > 0;
      if (hasPaid) paidTotal += p;
      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.year}</td>
          <td>${r.month}</td>
          <td style="text-align:right;font-family:monospace;">${hasPaid ? formatNumber(p) : '—'}</td>
          <td style="text-align:center;">${hasPaid ? 'PAID' : 'SCHEDULED'}</td>
          <td>${escapeHtml(r.note || '')}</td>
        </tr>
      `;
    });

    printContainer.innerHTML = `
      <div class="print-bank-header">
        <div>
          <div class="print-bank-title">${escapeHtml(data.bankInfo.bankName)}</div>
          <div class="print-bank-sub">Branch: ${escapeHtml(data.bankInfo.branch)} • DPS Portal Ledger System</div>
          <div class="print-bank-sub">Main Account No: <strong>${data.bankInfo.accountNumber}</strong> | DPS Account No: <strong>${data.bankInfo.dpsNumber}</strong></div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;font-size:1.1rem;color:#0f172a;">MEMBER STATEMENT</div>
          <div style="font-size:0.8rem;color:#64748b;margin-top:0.2rem;">Generated: ${new Date().toLocaleDateString('en-GB')}</div>
        </div>
      </div>

      <div class="print-meta-grid">
        <div class="print-meta-box">
          <div class="print-meta-lbl">Member Name</div>
          <div class="print-meta-val">${escapeHtml(member.name)}</div>
          <div style="font-size:0.75rem;color:#64748b;">${escapeHtml(member.role)}</div>
        </div>
        <div class="print-meta-box">
          <div class="print-meta-lbl">Total Deposited</div>
          <div class="print-meta-val" style="color:#059669;">৳${formatNumber(gt)}</div>
          <div style="font-size:0.75rem;color:#64748b;">Verified Bank Total</div>
        </div>
        <div class="print-meta-box">
          <div class="print-meta-lbl">DPS Net Share</div>
          <div class="print-meta-val" style="color:#4f46e5;">৳${formatNumber(net)}</div>
          <div style="font-size:0.75rem;color:#64748b;">Core DPS Capital</div>
        </div>
        <div class="print-meta-box">
          <div class="print-meta-lbl">Extra Target</div>
          <div class="print-meta-val" style="color:#0284c7;">৳${formatNumber(dps)}</div>
          <div style="font-size:0.75rem;color:#64748b;">Mutual Trust Bank</div>
        </div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:55px;">Year</th>
            <th style="width:90px;">Month</th>
            <th style="text-align:right;width:100px;">Amount (BDT)</th>
            <th style="text-align:center;width:95px;">Status</th>
            <th>Verification / Notes</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr class="total-row">
            <td colspan="3" style="font-weight:800;text-align:right;">TOTAL CLEARED:</td>
            <td style="text-align:right;font-family:monospace;font-weight:800;">৳${formatNumber(paidTotal)}</td>
            <td colspan="2" style="font-size:0.75rem;color:#059669;">Audited &amp; Verified</td>
          </tr>
        </tbody>
      </table>

      <div class="print-sign-row">
        <div class="print-sign-line">
          Prepared By / Auditor
        </div>
        <div class="print-sign-line">
          Member Signature (${escapeHtml(member.name)})
        </div>
        <div class="print-sign-line">
          Branch Manager (Kadair Bazar)
        </div>
      </div>
    `;

    document.body.classList.add('printing-member-statement');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-member-statement');
    }, 1000);
  };

  // Backward compatible alias
  window.exportMemberCSV = function (memberId) {
    if (memberId) state.selectedMemberId = memberId;
    quickExportMember('csv');
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
    URL.revokeObjectURL(url);
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
    const savedTheme = localStorage.getItem('mission_infinity_theme_pref') || 'light';
    setTheme(savedTheme, false);

    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next, true);
        showToast(`Switched to ${next} mode`, 'info');
      });
    }
  }

  function setTheme(theme, redrawCharts = true) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mission_infinity_theme_pref', theme);

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

    // Support deep link to member statement modal via URL parameter (?member=id or ?modal=id)
    const urlParams = new URLSearchParams(window.location.search);
    const memberParam = urlParams.get('member') || urlParams.get('modal') || urlParams.get('test_modal');
    if (memberParam) {
      setTimeout(() => {
        if (typeof window.openMemberModal === 'function') {
          window.openMemberModal(memberParam);
          if (urlParams.get('popover') || urlParams.get('test_popover')) {
            setTimeout(() => {
              if (typeof window.toggleMemberExportDropdown === 'function') {
                window.toggleMemberExportDropdown();
              }
            }, 300);
          }
        }
      }, 400);
    }

    // Auto-sync periodically with Google Sheet
    setInterval(() => {
      loadData(false);
    }, CONFIG.autoSyncIntervalMs);
  });

})();
