<script>
  import { onMount } from 'svelte';
  import { fetchAllBins, createBin } from '$lib/firestore/data';
  import { generateQR, binDeepLink } from '$lib/utils/qr';

  let bins = [];
  let loading = true;
  let showForm = false;
  let newLabel = '';
  let newZone = 1;
  let newAisle = 1;
  let newShelf = 1;
  let newPosition = 1;
  let qrModal = null;

  onMount(async () => {
    bins = await fetchAllBins();
    loading = false;
  });

  async function handleCreate() {
    if (!newLabel.trim()) return;
    const id = await createBin({
      label: newLabel.trim(),
      zone: newZone,
      aisle: newAisle,
      shelf: newShelf,
      position: newPosition
    });
    bins.push({
      id,
      label: newLabel.trim(),
      zone: newZone,
      aisle: newAisle,
      shelf: newShelf,
      position: newPosition,
      itemCount: 0
    });
    resetForm();
  }

  function resetForm() {
    newLabel = '';
    newZone = 1;
    newAisle = 1;
    newShelf = 1;
    newPosition = 1;
    showForm = false;
  }

  function showQR(bin) {
    qrModal = {
      svg: generateQR(binDeepLink(bin.id)),
      data: binDeepLink(bin.id),
      bin
    };
  }

  function closeQR() {
    qrModal = null;
  }

  function copyLink(data) {
    navigator.clipboard.writeText(data);
  }
</script>

<div class="bins-page">
  <div class="header">
    <h1>Bins</h1>
    <button class="primary" on:click={() => showForm = !showForm}>
      {showForm ? 'Cancel' : '+ New Bin'}
    </button>
  </div>

  {#if showForm}
    <div class="card form">
      <div class="row">
        <input bind:value={newLabel} placeholder="Label (e.g., A-01-02-03)" />
      </div>
      <div class="row">
        <input type="number" bind:value={newZone} placeholder="Zone" style="width:80px" />
        <input type="number" bind:value={newAisle} placeholder="Aisle" style="width:80px" />
        <input type="number" bind:value={newShelf} placeholder="Shelf" style="width:80px" />
        <input type="number" bind:value={newPosition} placeholder="Pos" style="width:80px" />
        <button class="primary" on:click={handleCreate}>Create</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="muted">Loading...</p>
  {:else if bins.length === 0}
    <div class="card">
      <p class="muted">No bins yet. Create your first bin above.</p>
    </div>
  {:else}
    <div class="bins-grid grid">
      {#each bins as bin}
        <div class="bin-card card">
          <div class="bin-header">
            <span class="bin-label">{bin.label}</span>
            <span class="tag {bin.itemCount > 80 ? 'err' : bin.itemCount > 50 ? 'warn' : 'ok'}">
              {bin.itemCount || 0} items
            </span>
          </div>
          <div class="bin-location muted mono">
            Z{bin.zone} / A{bin.aisle} / S{bin.shelf} / P{bin.position}
          </div>
          <div class="bin-actions">
            <button on:click={() => showQR(bin)}>QR</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if qrModal}
    <!-- svelte-ignore a11y_interactive_supports_focus a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="QR Code modal" on:click={closeQR} on:keydown={(e) => e.key === 'Escape' && closeQR()}>
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div class="modal card" role="document" on:click|stopPropagation on:keydown={(e) => e.key === 'Escape' && closeQR()}>
        <h3>QR Code: {qrModal.bin.label}</h3>
        <div class="qr-display"><span innerHTML={qrModal.svg}></span></div>
        <p class="mono muted" style="word-break:break-all;font-size:12px">{qrModal.data}</p>
        <div class="row" style="justify-content:flex-end">
          <button on:click={() => copyLink(qrModal.data)}>Copy Link</button>
          <button class="primary" on:click={closeQR}>Close</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .bins-page h1 {
    margin: 0 0 16px 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  .form {
    margin-bottom: 16px;
  }
  .form .row {
    gap: 8px;
  }
  .bins-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .bin-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .bin-label {
    font-weight: 600;
    font-size: 16px;
  }
  .bin-location {
    font-size: 12px;
  }
  .bin-actions {
    margin-top: 8px;
  }
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    padding: 20px;
  }
  .modal {
    max-width: 400px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal h3 {
    margin: 0;
  }
  .qr-display {
    display: flex;
    justify-content: center;
    background: #f1f5f9;
    border-radius: var(--radius);
    padding: 16px;
  }
  .qr-display :global(svg) {
    width: 200px;
    height: 200px;
  }
</style>
