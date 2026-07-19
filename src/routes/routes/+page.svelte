<script>
  import { onMount } from 'svelte';
  import { fetchAllBins } from '$lib/firestore/data';
  import { findPath } from '$lib/utils/pathfinding';

  let bins = [];
  let loading = true;
  let startBin = '';
  let targetBins = [];
  let selectedTargets = [];
  let routeResult = null;

  onMount(async () => {
    bins = await fetchAllBins();
    if (bins.length > 0) {
      startBin = bins[0].id;
    }
    loading = false;
  });

  function toggleTarget(binId) {
    const idx = selectedTargets.indexOf(binId);
    if (idx >= 0) {
      selectedTargets.splice(idx, 1);
    } else {
      selectedTargets.push(binId);
    }
    selectedTargets = [...selectedTargets];
    routeResult = null;
  }

  async function calculateRoute() {
    if (!startBin || selectedTargets.length === 0) return;
    routeResult = null;
    routeResult = findPath(bins, startBin, selectedTargets);
  }

  $: startLabel = bins.find((b) => b.id === startBin)?.label || 'None';
</script>

<div class="routes-page">
  <h1>Route Planning</h1>

  <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
    <div class="col">
      <div class="card">
        <h3>Start Position</h3>
        <select bind:value={startBin}>
          {#each bins as bin}
            <option value={bin.id}>{bin.label}</option>
          {/each}
        </select>
        <p class="muted" style="margin-top:4px;font-size:12px">Selected: {startLabel}</p>
      </div>

      <div class="card">
        <h3>Target Bins</h3>
        <p class="muted" style="font-size:12px;margin-bottom:8px">Select bins to visit (click to toggle)</p>
        <div class="target-list">
          {#each bins as bin}
            {#if bin.id !== startBin}
              <button
                class="target-btn {selectedTargets.includes(bin.id) ? 'selected' : ''}"
                on:click={() => toggleTarget(bin.id)}
              >
                {bin.label}
                <span class="tag">{bin.itemCount || 0}</span>
              </button>
            {/if}
          {/each}
        </div>
        <p class="muted" style="margin-top:8px;font-size:12px">
          {selectedTargets.length} bin(s) selected
        </p>
        <button class="primary" on:click={calculateRoute} disabled={selectedTargets.length === 0} style="margin-top:8px">
          Calculate Route
        </button>
      </div>
    </div>

    <div class="col">
      {#if routeResult}
        <div class="card">
          <h3>Route Result</h3>
          <div class="stats-row">
            <span class="stat-item">
              <span class="muted">Stops</span>
              <strong>{routeResult.orderedBinIds.length}</strong>
            </span>
            <span class="stat-item">
              <span class="muted">Distance</span>
              <strong>{routeResult.totalDistance} units</strong>
            </span>
          </div>
          <div class="svg-container">
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
              {#each bins as bin}
                <rect
                  x={(bin.aisle || 0) * 60 + 20}
                  y={(bin.shelf || 0) * 40 + (bin.position || 0) * 20 + 10}
                  width="20"
                  height="14"
                  rx="2"
                  fill={selectedTargets.includes(bin.id) ? 'var(--accent)' : bin.id === startBin ? 'var(--ok)' : 'var(--bg-elev-2)'}
                  stroke="var(--border)"
                />
                {#if selectedTargets.includes(bin.id) || bin.id === startBin}
                  <text
                    x={(bin.aisle || 0) * 60 + 30}
                    y={(bin.shelf || 0) * 40 + (bin.position || 0) * 20 + 22}
                    text-anchor="middle"
                    font-size="6"
                    fill="var(--fg)"
                  >{bin.label?.slice(0, 4)}</text>
                {/if}
              {/each}
              {#if routeResult.svgPath}
                <path
                  d={routeResult.svgPath}
                  fill="none"
                  stroke="var(--accent)"
                  stroke-width="2"
                  stroke-dasharray="4 2"
                />
              {/if}
            </svg>
          </div>
          <div class="route-list">
            <h4>Visit Order</h4>
            {#each routeResult.orderedBinIds as binId, i}
              <div class="route-step">
                <span class="step-num">{i + 1}</span>
                <span>{bins.find((b) => b.id === binId)?.label || binId.slice(0, 8)}</span>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="card">
          <p class="muted">Select a start position and target bins, then click "Calculate Route" to see the optimized path.</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .routes-page h1 {
    margin: 0 0 16px 0;
  }
  h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
  }
  h4 {
    margin: 12px 0 8px 0;
    font-size: 13px;
    color: var(--fg-dim);
  }
  .target-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .target-btn {
    padding: 4px 10px;
    font-size: 12px;
    background: var(--bg-elev-2);
    border: 1px solid var(--border);
  }
  .target-btn.selected {
    border-color: var(--accent);
    background: rgba(56, 189, 248, 0.15);
    color: var(--accent);
  }
  .stats-row {
    display: flex;
    gap: 24px;
    margin: 8px 0;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .stat-item strong {
    font-size: 20px;
    color: var(--accent);
  }
  .svg-container {
    background: var(--bg);
    border-radius: var(--radius);
    padding: 12px;
    margin: 12px 0;
    overflow: hidden;
  }
  .svg-container svg {
    width: 100%;
    height: auto;
  }
  .route-list {
    margin-top: 12px;
  }
  .route-step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 13px;
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent);
    color: #0b1220;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr !important;
    }
  }
</style>
