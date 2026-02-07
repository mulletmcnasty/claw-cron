/**
 * claw-cron - Visual dashboard for cron monitoring
 * 🦞 Born from pain
 */

const ClawCron = {
  jobs: [],
  config: {
    apiUrl: null,
    refreshInterval: 30000,
  },
  
  init(config = {}) {
    Object.assign(this.config, config);
    this.bindEvents();
    this.startClock();
    
    if (this.config.apiUrl) {
      this.fetchFromApi();
      setInterval(() => this.fetchFromApi(), this.config.refreshInterval);
    }
    
    // Check for saved API URL first
    const savedApiUrl = localStorage.getItem('clawcron-api-url');
    if (savedApiUrl) {
      this.config.apiUrl = savedApiUrl;
      this.fetchFromApi();
      this._refreshInterval = setInterval(() => this.fetchFromApi(), this.config.refreshInterval);
    } else {
      // Try to load live manifest (local file or GitHub raw)
      this.loadLiveManifest();
    }
  },
  
  async loadLiveManifest() {
    // Try local file first (works on GitHub Pages)
    try {
      const localResp = await fetch('live-manifest.json?t=' + Date.now());
      if (localResp.ok) {
        const data = await localResp.json();
        if (data && data.jobs) {
          this.loadManifest(data);
          return;
        }
      }
    } catch (e) {
      console.log('Local manifest not found, trying GitHub raw...');
    }
    
    // Fallback to GitHub raw URL
    try {
      const ghResp = await fetch('https://raw.githubusercontent.com/mulletmcnasty/claw-cron/master/live-manifest.json?t=' + Date.now());
      if (ghResp.ok) {
        const data = await ghResp.json();
        if (data && data.jobs) {
          this.loadManifest(data);
          return;
        }
      }
    } catch (e) {
      console.log('GitHub raw fetch failed:', e);
    }
    
    // Last resort: check localStorage
    const saved = localStorage.getItem('clawcron-manifest');
    if (saved) {
      try {
        this.loadManifest(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to load saved manifest:', e);
      }
    }
  },
  
  bindEvents() {
    const refreshBtn = document.getElementById('refreshBtn');
    const modalClose = document.getElementById('modalClose');
    const modal = document.getElementById('jobModal');
    
    refreshBtn.addEventListener('click', () => {
      if (this.config.apiUrl) {
        this.fetchFromApi();
      } else {
        this.render();
      }
    });
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.render(btn.dataset.filter);
      });
    });
    
    // Modal
    modalClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  },
  
  async fetchFromApi() {
    try {
      const response = await fetch(this.config.apiUrl);
      const data = await response.json();
      this.loadManifest(data);
    } catch (err) {
      console.error('Failed to fetch from API:', err);
    }
  },
  
  loadManifest(manifest) {
    this.jobs = manifest.jobs || manifest;
    this.updateLastUpdated();
    this.render();
  },
  
  updateLastUpdated() {
    const el = document.getElementById('lastUpdated');
    el.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  },
  
  startClock() {
    // Update relative times every minute
    setInterval(() => this.updateRelativeTimes(), 60000);
  },
  
  updateRelativeTimes() {
    document.querySelectorAll('[data-next-run]').forEach(el => {
      const nextRun = new Date(el.dataset.nextRun);
      el.textContent = this.formatRelativeTime(nextRun);
    });
  },
  
  render(filter = 'all') {
    const grid = document.getElementById('jobsGrid');
    const jobs = this.filterJobs(filter);
    
    // Update stats
    document.getElementById('totalJobs').textContent = this.jobs.length;
    document.getElementById('activeJobs').textContent = this.jobs.filter(j => j.enabled && j.lastStatus === 'success').length;
    document.getElementById('failedJobs').textContent = this.jobs.filter(j => j.lastStatus === 'failure').length;
    document.getElementById('disabledJobs').textContent = this.jobs.filter(j => !j.enabled).length;
    
    if (jobs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">${this.jobs.length === 0 ? '📋' : '🔍'}</span>
          <p>${this.jobs.length === 0 ? 'No jobs loaded' : 'No matching jobs'}</p>
          <p class="empty-hint">${this.jobs.length === 0 ? 'Load a manifest file or connect to an API' : 'Try a different filter'}</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = jobs.map(job => this.renderJobCard(job)).join('');
    
    // Bind click events
    grid.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const job = this.jobs.find(j => j.id === card.dataset.jobId);
        if (job) this.showJobDetail(job);
      });
    });
  },
  
  filterJobs(filter) {
    switch (filter) {
      case 'active':
        return this.jobs.filter(j => j.enabled && j.lastStatus === 'success');
      case 'failed':
        return this.jobs.filter(j => j.lastStatus === 'failure');
      case 'disabled':
        return this.jobs.filter(j => !j.enabled);
      default:
        return this.jobs;
    }
  },
  
  renderJobCard(job) {
    const status = !job.enabled ? 'disabled' : (job.lastStatus || 'pending');
    const schedule = this.formatSchedule(job.schedule);
    const nextRun = this.calculateNextRun(job);
    const runs = (job.runs || []).slice(0, 10);
    
    return `
      <div class="job-card status-${status}" data-job-id="${job.id}">
        <div class="job-header">
          <div>
            <div class="job-name">${this.escapeHtml(job.name || job.id)}</div>
            <div class="job-id">${this.escapeHtml(job.id)}</div>
          </div>
          <span class="job-status ${status}">${status}</span>
        </div>
        <div class="job-schedule">${schedule}</div>
        ${runs.length > 0 ? `
          <div class="job-runs">
            ${runs.map(r => `<span class="run-dot ${r.status}"></span>`).join('')}
          </div>
        ` : ''}
        <div class="job-meta">
          <span>Last: ${job.lastRun ? this.formatRelativeTime(new Date(job.lastRun)) : 'Never'}</span>
          ${nextRun && job.enabled ? `<span class="job-next" data-next-run="${nextRun.toISOString()}">Next: ${this.formatRelativeTime(nextRun)}</span>` : ''}
        </div>
      </div>
    `;
  },
  
  formatSchedule(schedule) {
    if (!schedule) return 'No schedule';
    
    switch (schedule.kind) {
      case 'every':
        return this.formatInterval(schedule.everyMs);
      case 'cron':
        return this.formatCronExpr(schedule.expr, schedule.tz);
      case 'at':
        return `Once at ${new Date(schedule.at).toLocaleString()}`;
      default:
        return JSON.stringify(schedule);
    }
  },
  
  formatInterval(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `Every ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Every ${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Every ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `Every ${seconds} second${seconds > 1 ? 's' : ''}`;
  },
  
  formatCronExpr(expr, tz) {
    // Simple cron expression to human readable
    const parts = expr.split(' ');
    if (parts.length < 5) return expr;
    
    const [min, hour, dom, mon, dow] = parts;
    let result = '';
    
    // Handle common patterns
    if (min === '0' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') {
      result = `Daily at ${hour}:00`;
    } else if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow !== '*') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      result = `${days[parseInt(dow)] || dow} at ${hour}:${min.padStart(2, '0')}`;
    } else if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') {
      result = `Daily at ${hour}:${min.padStart(2, '0')}`;
    } else {
      result = expr;
    }
    
    if (tz) result += ` (${tz.split('/').pop()})`;
    return result;
  },
  
  calculateNextRun(job) {
    if (!job.enabled || !job.schedule) return null;
    
    const now = new Date();
    const schedule = job.schedule;
    
    if (schedule.kind === 'every' && job.lastRun) {
      return new Date(new Date(job.lastRun).getTime() + schedule.everyMs);
    }
    
    if (schedule.kind === 'at') {
      const at = new Date(schedule.at);
      return at > now ? at : null;
    }
    
    // For cron expressions, just estimate next occurrence
    // (proper cron parsing would require a library)
    return null;
  },
  
  formatRelativeTime(date) {
    const now = new Date();
    const diff = date - now;
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;
    
    const minutes = Math.floor(absDiff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let str;
    if (days > 0) str = `${days}d`;
    else if (hours > 0) str = `${hours}h`;
    else if (minutes > 0) str = `${minutes}m`;
    else str = '<1m';
    
    return isPast ? `${str} ago` : `in ${str}`;
  },
  
  showJobDetail(job) {
    const modal = document.getElementById('jobModal');
    const title = document.getElementById('modalJobName');
    const body = document.getElementById('modalBody');
    
    title.textContent = job.name || job.id;
    
    const status = !job.enabled ? 'disabled' : (job.lastStatus || 'pending');
    const runs = (job.runs || []).slice(0, 10);
    
    body.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">ID</span>
        <span class="detail-value mono">${this.escapeHtml(job.id)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value"><span class="job-status ${status}">${status}</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Schedule</span>
        <span class="detail-value">${this.formatSchedule(job.schedule)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Last Run</span>
        <span class="detail-value">${job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Never'}</span>
      </div>
      ${job.lastDurationMs ? `
        <div class="detail-row">
          <span class="detail-label">Last Duration</span>
          <span class="detail-value">${job.lastDurationMs}ms</span>
        </div>
      ` : ''}
      ${job.category ? `
        <div class="detail-row">
          <span class="detail-label">Category</span>
          <span class="detail-value">${this.escapeHtml(job.category)}</span>
        </div>
      ` : ''}
      
      ${runs.length > 0 ? `
        <div class="run-history">
          <h3>Recent Runs</h3>
          ${runs.map(r => `
            <div class="run-item ${r.status}">
              <span>${new Date(r.at).toLocaleString()}</span>
              <span>${r.durationMs ? r.durationMs + 'ms' : r.status}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
    
    modal.classList.add('active');
  },
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => ClawCron.init());

// Export for external use
window.ClawCron = ClawCron;
