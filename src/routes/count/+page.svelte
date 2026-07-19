<script>
  import { onMount } from 'svelte';
  import { fetchAllBins, fetchAssignmentsForBin, fetchAllItems, batchUpdateAssignments, createCount } from '$lib/firestore/data';
  import { getCurrentUser } from '$lib/firestore/auth';

  let bins = [];
  let items = [];
  let selectedBin = null;
  let assignments = [];
  let countItems = [];
  let discrepancies = [];
  let countStarted = false;
  let countCompleted = false;
  let submitting = false;
  let message = null;

  onMount(async () => {
    bins = await fetchAllBins();
    items = await fetchAllItems();
  });

  async function selectBin(binId) {
    selectedBin = bins.find((b) => b.id === binId);
    assignments = await fetchAssignmentsForBin(binId);
    countItems = assignments.map((a) => ({
      assignmentId: a.id,
      itemId: a.itemId,
      expectedQty: a.quantity,
      actualQty: a.quantity,
      itemName: items.find((i) => i.id === a.itemId)?.name || a.itemId
    }));
    discrepancies = [];
    countStarted = true;
    countCompleted = false;
  }

  function updateQty(index, val) {
    countItems[index].actualQty = parseInt(val) || 0;
    recalcDiscrepancies();
  }

  function recalcDiscrepancies() {
    discrepancies = [];
    for (const ci of countItems) {
      if (ci.actualQty !== ci.expectedQty) {
        discrepancies.push({
          assignmentId: ci.assignmentId,
          expected: ci.expectedQty,
          actual: ci.actualQty,
          diff: ci.actualQty - ci.expectedQty
        });
      }
    }
  }

  async function submitCount() {
    submitting = true;
    message = null;

    try {
      const updates = [];
      for (const ci of countItems) {
        updates.push({
          id: ci.assignmentId,
          fields: {
            quantity: ci.actualQty,
            lastCounted: new Date(),
            lastCountedBy: getCurrentUser()?.uid ?? null,
            status: 'verified'
          }
        });
      }

      await batchUpdateAssignments(updates);

      if (discrepancies.length > 0) {
        await createCount(getCurrentUser()?.uid ?? 'anon', discrepancies);
      }

      countCompleted = true;
      message = discrepancies.length > 0
        ? `Count saved with ${discrepancies.length} discrepancy(ies).`
        : 'Count completed. No discrepancies found.';
    } catch (err) {
      message = 'Error saving count: ' + err.message;
    } finally {
      submitting = false;
    }
  }

  function reset() {
    selectedBin = null;
    assignments = [];
    countItems = [];
    discrepancies = [];
    countStarted = false;
    countCompleted = false;
    message = null;
  }
</script>

<div class="count-page">
  <h1>Count & Reconcile</h1>

  {#if message}
    <div class="card {discrepancies.length > 0 ? 'warn' : 'ok'}" style="border-color: var(--{discrepancies.length > 0 ? 'warn' : 'ok'})">
      <p>{message}</p>
      <button on:click={reset} style="margin-top:8px">New Count</button>
    </div>
  {:else if !countStarted}
    <div class="card">
      <p class="muted">Select a bin to begin counting.</p>
      <div class="bin-list" style="margin-top:12px">
        {#if bins.length === 0}
          <p class="muted">No bins available.</p>
        {:else}
          {#each bins as bin}
            <button class="bin-row" on:click={() => selectBin(bin.id)}>
              <span class="bin-label">{bin.label}</span>
              <span class="tag">{bin.itemCount || 0} items</span>
              <span class="muted mono">Z{bin.zone} A{bin.aisle}</span>
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {:else}
    <div class="card">
      <div class="bin-header">
        <h2>{selectedBin?.label}</h2>
        <span class="muted mono">Z{selectedBin?.zone} A{selectedBin?.aisle} S{selectedBin?.shelf} P{selectedBin?.position}</span>
      </div>
      <hr class="hr" />
      {#if countItems.length === 0}
        <p class="muted">No items assigned to this bin.</p>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Expected</th>
              <th>Actual</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each countItems as ci, i}
              <tr class:discrepancy={ci.actualQty !== ci.expectedQty}>
                <td>{ci.itemName}</td>
                <td class="mono">{ci.expectedQty}</td>
                <td>
                  <input
                    type="number"
                    value={ci.actualQty}
                    style="width:80px"
                    on:input={(e) => updateQty(i, e.target.value)}
                  />
                </td>
                <td>
                  {#if ci.actualQty === ci.expectedQty}
                    <span class="tag ok">Match</span>
                  {:else if ci.actualQty > ci.expectedQty}
                    <span class="tag warn">+{ci.actualQty - ci.expectedQty}</span>
                  {:else}
                    <span class="tag err">{ci.actualQty - ci.expectedQty}</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
      <div class="row" style="justify-content:flex-end;margin-top:16px">
        <button on:click={reset}>Cancel</button>
        <button class="primary" on:click={submitCount} disabled={submitting}>
          {submitting ? 'Saving...' : `Save Count (${discrepancies.length} discrepancies)`}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .count-page h1 {
    margin: 0 0 16px 0;
  }
  .bin-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bin-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background var(--duration);
    gap: 8px;
  }
  .bin-row:hover {
    background: var(--bg-elev-2);
  }
  .bin-label {
    font-weight: 600;
    flex: 1;
  }
  .bin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .bin-header h2 {
    margin: 0;
    font-size: 18px;
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
  tr.discrepancy {
    background: rgba(248, 113, 113, 0.05);
  }
  tr.discrepancy td {
    border-bottom-color: rgba(248, 113, 113, 0.2);
  }
  .card.ok {
    border-color: var(--ok);
  }
  .card.warn {
    border-color: var(--warn);
  }
</style>
