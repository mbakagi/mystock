<script>
  import { onMount } from 'svelte';
  import { fetchAllBins, fetchAllItems, fetchAllAssignments } from '$lib/firestore/data';

  let bins = [];
  let items = [];
  let assignments = [];
  let loading = true;

  $: totalBins = bins.length;
  $: totalItems = items.length;
  $: activeAssignments = assignments.filter((a) => a.status === 'active').length;
  $: avgFill = totalBins > 0
    ? Math.round(bins.reduce((s, b) => s + (b.itemCount || 0), 0) / totalBins)
    : 0;

  onMount(async () => {
    [bins, items, assignments] = await Promise.all([
      fetchAllBins(),
      fetchAllItems(),
      fetchAllAssignments()
    ]);
    loading = false;
  });
</script>

<div class="dashboard">
  <h1>Dashboard</h1>

  {#if loading}
    <p class="muted">Loading data...</p>
  {:else}
    <div class="stats grid">
      <div class="stat card">
        <span class="stat-label muted">Total Bins</span>
        <span class="stat-value">{totalBins}</span>
      </div>
      <div class="stat card">
        <span class="stat-label muted">Total Items</span>
        <span class="stat-value">{totalItems}</span>
      </div>
      <div class="stat card">
        <span class="stat-label muted">Active Assignments</span>
        <span class="stat-value">{activeAssignments}</span>
      </div>
      <div class="stat card">
        <span class="stat-label muted">Avg Fill / Bin</span>
        <span class="stat-value">{avgFill}</span>
      </div>
    </div>

    <div class="quick-links">
      <h2>Quick Actions</h2>
      <div class="grid">
        <a href="/scan" class="card action">
          <span class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="7" y1="8" x2="17" y2="8"/>
              <line x1="7" y1="12" x2="17" y2="12"/>
              <line x1="7" y1="16" x2="13" y2="16"/>
            </svg>
          </span>
          <span>Scan QR</span>
        </a>
        <a href="/bins" class="card action">
          <span class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </span>
          <span>Manage Bins</span>
        </a>
        <a href="/items" class="card action">
          <span class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          <span>Manage Items</span>
        </a>
        <a href="/count" class="card action">
          <span class="action-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
            </svg>
          </span>
          <span>Start Count</span>
        </a>
      </div>
    </div>

    <div class="recent">
      <h2>Recent Assignments</h2>
      <div class="card">
        {#if assignments.length === 0}
          <p class="muted">No assignments yet.</p>
        {:else}
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Bin</th>
                <th>Qty</th>
                <th>Lot</th>
              </tr>
            </thead>
            <tbody>
              {#each assignments.slice(0, 8) as a}
                <tr>
                  <td><span class="tag {a.status}">{a.status}</span></td>
                  <td class="mono">{a.binId.slice(0, 8)}</td>
                  <td>{a.quantity}</td>
                  <td class="mono">{a.lotNumber || '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard h1 {
    margin: 0 0 20px 0;
    font-size: 24px;
  }
  .dashboard h2 {
    font-size: 16px;
    margin: 24px 0 12px 0;
    color: var(--fg-dim);
  }
  .stats {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stat-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--accent);
  }
  .quick-links .grid {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }
  .action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px;
    text-align: center;
    color: var(--fg);
    text-decoration: none;
    transition: border-color var(--duration), transform var(--duration);
  }
  .action:hover {
    border-color: var(--accent);
    transform: translateY(-2px);
    text-decoration: none;
  }
  .action-icon {
    color: var(--accent);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  th {
    color: var(--fg-dim);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }
  tr:hover td {
    background: rgba(56, 189, 248, 0.03);
  }
</style>
