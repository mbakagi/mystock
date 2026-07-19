<script>
  import '../app.css';
  import { authSubscribe, signInAnon, doSignOut } from '$lib/firestore/auth';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  let user = null;
  let loading = true;

  onMount(() => {
    if (!browser) return;
    const unsub = authSubscribe((u) => {
      user = u;
      loading = false;
      if (!u) {
        signInAnon();
      }
    });
    return unsub;
  });

  async function handleSignOut() {
    await doSignOut();
    signInAnon();
  }
</script>

<main>
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p class="muted">Initializing...</p>
    </div>
  {:else}
    <slot {user} {handleSignOut} />
  {/if}
</main>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    gap: 16px;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
