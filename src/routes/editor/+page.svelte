<script>
  import { onMount } from 'svelte';
  import { fetchAllBins, fetchAllItems, fetchAllAssignments, batchUpdateAssignments } from '$lib/firestore/data';
  import { createUndoStack } from '$lib/utils/undoStack';

  let bins = [];
  let items = [];
  let assignments = [];
  let loading = true;
  let dragging = null;
  let dropTarget = null;
  let message = null;

  const undoStack = createUndoStack(20);

  onMount(async () => {
    [bins, items, assignments] = await Promise.all([
      fetchAllBins(),
      fetchAllItems(),
      fetchAllAssignments()
    ]);
    undoStack.push({ assignments: JSON.parse(JSON.stringify(assignments)) });
    loading = false;
  });

  function handleDragStart(e, assignmentId) {
    dragging = assignmentId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', assignmentId);
  }

  function handleDragOver(e, binId) {
    e.preventDefault();
    dropTarget = binId;
  }

  function handleDragLeave() {
    dropTarget = null;
  }

  async function handleDrop(e, targetBinId) {
    e.preventDefault();
    const assignmentId = dragging;
    dragging = null;
    dropTarget = null;

    if (!assignmentId || !targetBinId) return;

    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const oldBinId = assignment.binId;
    if (oldBinId === targetBinId) return;

    undoStack.push({ assignments: JSON.parse(JSON.stringify(assignments)) });

    assignment.binId = targetBinId;
    assignments = [...assignments];

    message = `Moved ${items.find((i) => i.id === assignment.itemId)?.sku || assignment.itemId} to bin ${targetBinId.slice(0, 6)}`;
    setTimeout(() => message = null, 3000);
  }

  function adjustQuantity(assignmentId, delta) {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const oldQty = assignment.quantity;
    const newQty = Math.max(0, oldQty + delta);

    if (oldQty !== newQty) {
      undoStack.push({ assignments: JSON.parse(JSON.stringify(assignments)) });
      assignment.quantity = newQty;
      assignments = [...assignments];
    }
  }

  function inlineQuantityChange(assignmentId, newVal) {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;
    undoStack.push({ assignments: JSON.parse(JSON.stringify(assignments)) });
    assignment.quantity = parseInt(newVal) || 0;
    assignments = [...assignments];
  }

  function undo() {
    const state = undoStack.undo();
    if (state) {
      assignments = JSON.parse(JSON.stringify(state.assignments));
      message = 'Undo applied';
      setTimeout(() => message = null, 2000);
    }
  }

  function redo() {
    const state = undoStack.redo();
    if (state) {
      assignments = JSON.parse(JSON.stringify(state.assignments));
      message = 'Redo applied';
      setTimeout(() => message = null, 2000);
    }
  }

  async function saveChanges() {
    const updates = assignments.map((a) => ({
      id: a.id,
      fields: {
        binId: a.binId,
        quantity: a.quantity
      }
    }));

    try {
      await batchUpdateAssignments(updates);
      message = 'All changes saved successfully.';
    } catch (err) {
      message = 'Error saving: ' + err.message;
    }
    setTimeout(() => message = null, 3000);
  }

  function handleFileDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.assignments && Array.isArray(data.assignments)) {
          undoStack.push({ assignments: JSON.parse(JSON.stringify(assignments)) });
          assignments = data.assignments;
          message = `Imported ${assignments.length} assignments.`;
        }
      } catch (err) {
        message = 'Invalid file format.';
      }
      setTimeout(() => message = null, 3000);
    };
    reader.readAsText(file);
  }

  function exportData() {
    const data = JSON.stringify({ assignments, bins: bins.map(b => ({ id: b.id, ...b })), items: items.map(i => ({ id: i.id, ...i })) }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mystock-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  $: binsWithAssignments = bins.map((bin) => ({
    ...bin,
    assignments: assignments.filter((a) => a.binId === bin.id)
  }));
</script>

<div class="editor-page">
  <div class="header">
    <h1>Editor</h1>
    <div class="row">
      <button on:click={undo} disabled={!undoStack.canUndo}>Undo</button>
      <button on:click={redo} disabled={!undoStack.canRedo}>Redo</button>
      <button on:click={exportData}>Export</button>
      <button class="primary" on:click={saveChanges}>Save All</button>
    </div>
  </div>

  {#if message}
    <div class="card" style="border-color: var(--accent); margin-bottom: 12px;">
      <p>{message}</p>
    </div>
  {/if}

  <div class="drop-zone card" role="region" aria-label="File import zone"
       on:dragover={(e) => e.preventDefault()}
       on:drop={handleFileDrop}>
    <p class="muted" style="text-align:center;font-size:13px">
      Drag & drop a JSON configuration file here to import
    </p>
  </div>

  {#if loading}
    <p class="muted">Loading...</p>
  {:else}
    <div class="editor-grid grid">
      {#each binsWithAssignments as bin}
        <div
          class="bin-zone card"
          class:drop-active={dropTarget === bin.id}
          role="region"
          aria-label={`Bin zone: ${bin.label}`}
          on:dragover={(e) => handleDragOver(e, bin.id)}
          on:dragleave={handleDragLeave}
          on:drop={(e) => handleDrop(e, bin.id)}
        >
          <div class="bin-zone-header">
            <span class="bin-label">{bin.label}</span>
            <span class="tag">{bin.assignments.length} / {bin.maxCapacity || 100}</span>
          </div>
          <div class="bin-location muted mono">
            Z{bin.zone} A{bin.aisle} S{bin.shelf} P{bin.position}
          </div>
          {#if bin.assignments.length === 0}
            <div class="empty-zone">Drop items here</div>
          {:else}
            {#each bin.assignments as assignment}
              <div
                class="assignment-card"
                draggable="true"
                role="button"
                tabindex="0"
                aria-label={`Drag to move: ${items.find((i) => i.id === assignment.itemId)?.sku || assignment.itemId.slice(0, 8)}`}
                on:dragstart={(e) => handleDragStart(e, assignment.id)}
              >
                <div class="assignment-info">
                  <span class="sku mono">
                    {items.find((i) => i.id === assignment.itemId)?.sku || assignment.itemId.slice(0, 8)}
                  </span>
                  <span class="item-name muted">
                    {items.find((i) => i.id === assignment.itemId)?.name || ''}
                  </span>
                </div>
                <div class="qty-controls">
                  <button on:click={() => adjustQuantity(assignment.id, -1)}>-</button>
                  <input
                    type="number"
                    value={assignment.quantity}
                    on:input={(e) => inlineQuantityChange(assignment.id, e.target.value)}
                    style="width:50px;text-align:center"
                  />
                  <button on:click={() => adjustQuantity(assignment.id, 1)}>+</button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .editor-page h1 {
    margin: 0 0 16px 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .header .row {
    gap: 8px;
  }
  .drop-zone {
    margin-bottom: 16px;
    border: 2px dashed var(--border);
    background: transparent;
    box-shadow: none;
  }
  .drop-zone:hover {
    border-color: var(--accent);
  }
  .editor-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
  .bin-zone {
    transition: border-color var(--duration), background var(--duration);
    min-height: 100px;
  }
  .bin-zone.drop-active {
    border-color: var(--accent);
    background: rgba(56, 189, 248, 0.05);
  }
  .bin-zone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .bin-label {
    font-weight: 600;
    font-size: 15px;
  }
  .bin-location {
    font-size: 11px;
    margin-bottom: 8px;
  }
  .empty-zone {
    text-align: center;
    padding: 20px;
    color: var(--fg-mute);
    font-size: 13px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
  }
  .assignment-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 6px;
    cursor: grab;
    transition: border-color var(--duration);
  }
  .assignment-card:hover {
    border-color: var(--accent);
  }
  .assignment-card:active {
    cursor: grabbing;
  }
  .assignment-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .sku {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .item-name {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .qty-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .qty-controls button {
    width: 24px;
    height: 24px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
  }
  .qty-controls input {
    width: 50px;
    text-align: center;
    padding: 2px;
    font-size: 13px;
  }

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
