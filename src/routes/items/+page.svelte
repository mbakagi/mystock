<script>
  import { onMount } from 'svelte';
  import { fetchAllItems, createItem } from '$lib/firestore/data';
  import { buildSearchIndex, search } from '$lib/utils/search';

  let items = [];
  let loading = true;
  let showForm = false;
  let searchQuery = '';
  let searchResults = [];
  let searchActive = false;

  let newSku = '';
  let newName = '';
  let newDescription = '';
  let newCategory = '';
  let newUnit = 'pcs';

  const categories = ['electronics', 'hardware', 'consumables', 'other'];

  onMount(async () => {
    items = await fetchAllItems();
    buildSearchIndex([], items, []);
    loading = false;
  });

  function handleSearchInput() {
    if (searchQuery.trim().length === 0) {
      searchResults = [];
      searchActive = false;
      return;
    }
    searchResults = search(searchQuery);
    searchActive = true;
  }

  function clearSearch() {
    searchQuery = '';
    searchResults = [];
    searchActive = false;
  }

  async function handleCreate() {
    if (!newSku.trim() || !newName.trim()) return;
    const id = await createItem({
      sku: newSku.trim(),
      name: newName.trim(),
      description: newDescription.trim(),
      category: newCategory || 'other',
      unit: newUnit
    });
    items.push({
      id,
      sku: newSku.trim(),
      name: newName.trim(),
      description: newDescription.trim(),
      category: newCategory || 'other',
      unit: newUnit
    });
    buildSearchIndex([], items, []);
    newSku = '';
    newName = '';
    newDescription = '';
    newCategory = '';
    showForm = false;
  }

  $: displayedItems = searchActive
    ? searchResults.filter(r => r.type === 'item')
    : items;
</script>

<div class="items-page">
  <div class="header">
    <h1>Items</h1>
    <div class="row">
      <div class="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          bind:value={searchQuery}
          on:input={handleSearchInput}
          placeholder="Search items..."
        />
        {#if searchQuery}
          <button class="clear-btn" on:click={clearSearch}>×</button>
        {/if}
      </div>
      <button class="primary" on:click={() => showForm = !showForm}>
        {showForm ? 'Cancel' : '+ New Item'}
      </button>
    </div>
  </div>

  {#if showForm}
    <div class="card form">
      <div class="row">
        <input bind:value={newSku} placeholder="SKU" style="width:120px" />
        <input bind:value={newName} placeholder="Name" class="grow" />
        <select bind:value={newCategory}>
          <option value="">Category</option>
          {#each categories as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
        <select bind:value={newUnit} style="width:100px">
          <option value="pcs">pcs</option>
          <option value="kg">kg</option>
          <option value="L">L</option>
          <option value="m">m</option>
        </select>
      </div>
      <div class="row">
        <input bind:value={newDescription} placeholder="Description" class="grow" />
        <button class="primary" on:click={handleCreate}>Create</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <p class="muted">Loading...</p>
  {:else if displayedItems.length === 0}
    <div class="card">
      <p class="muted">{searchActive ? 'No matching items found.' : 'No items yet. Create your first item above.'}</p>
    </div>
  {:else}
    <div class="card">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Category</th>
            <th>Unit</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {#each displayedItems as item}
            <tr>
              <td class="mono">{item.sku}</td>
              <td>{item.name}</td>
              <td><span class="tag">{item.category}</span></td>
              <td class="muted">{item.unit}</td>
              <td class="muted">{item.description}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .items-page h1 {
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
    flex-wrap: wrap;
  }
  .search-box {
    position: relative;
    width: 240px;
  }
  .search-box svg {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--fg-mute);
    pointer-events: none;
  }
  .search-box input {
    padding-left: 32px;
  }
  .clear-btn {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--fg-dim);
    font-size: 18px;
    padding: 4px 8px;
  }
  .form {
    margin-bottom: 16px;
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

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
      align-items: flex-start;
    }
    .search-box {
      width: 100%;
    }
  }
</style>
