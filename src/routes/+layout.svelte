<script>
  import '../app.css';
  import { authSubscribe, signInAnon, doSignOut, getCurrentUser } from '$lib/firestore/auth';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';

  let user = null;
  let loading = true;
  let menuOpen = false;
  let authError = null;

  const nav = [
    { path: '/', label: 'Dashboard' },
    { path: '/bins', label: 'Bins' },
    { path: '/items', label: 'Items' },
    { path: '/scan', label: 'Scan' },
    { path: '/count', label: 'Count' },
    { path: '/routes', label: 'Routes' },
    { path: '/editor', label: 'Editor' }
  ];

  onMount(() => {
    if (!browser) return;
    const timeout = setTimeout(() => {
      loading = false;
      authError = 'Auth timed out. Data access may be limited.';
    }, 8000);

    const unsub = authSubscribe((u) => {
      clearTimeout(timeout);
      user = u;
      loading = false;
      if (!u) {
        signInAnon().catch((err) => {
          authError = 'Sign-in failed: ' + (err?.message || 'unknown error');
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      unsub();
    };
  });

  async function handleSignOut() {
    await doSignOut();
    signInAnon().catch(() => {});
  }

  function closeMenu() {
    menuOpen = false;
  }
</script>

<div class="app">
  <nav class="navbar">
    <div class="nav-brand">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <span>MyStock</span>
    </div>
    <div class="nav-links desktop">
      {#each nav as item}
        <a class:active={$page.url.pathname === item.path} href={item.path}>{item.label}</a>
      {/each}
    </div>
    <div class="nav-right">
      {#if loading}
        <span class="user-id muted">Connecting...</span>
      {:else if user}
        <span class="user-id muted mono">{user.uid.slice(0, 8)}</span>
        <button on:click={handleSignOut} class="muted">Sign out</button>
      {:else}
        <span class="user-id muted">{authError || 'Offline'}</span>
      {/if}
      <button class="mobile-toggle" on:click={() => menuOpen = !menuOpen}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
    </div>
  </nav>

  {#if menuOpen}
    <div class="nav-links mobile open">
      {#each nav as item}
        <a class:active={$page.url.pathname === item.path} href={item.path} on:click={closeMenu}>{item.label}</a>
      {/each}
    </div>
  {/if}

  <div class="content">
    {#if authError}
      <div class="auth-banner" style="background: rgba(248,113,113,0.1); border: 1px solid var(--err); border-radius: var(--radius); padding: 8px 12px; margin-bottom: 16px; font-size: 13px; color: var(--err);">
        {authError}
        <button on:click={() => { authError = null; signInAnon().catch((e) => authError = e.message); } } style="margin-left:8px;font-size:12px;padding:2px 8px;">Retry</button>
      </div>
    {/if}
    <slot />
  </div>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 18px;
  }
  .nav-links.desktop {
    display: flex;
    gap: 4px;
  }
  .nav-links.desktop a {
    padding: 6px 14px;
    border-radius: var(--radius);
    color: var(--fg-dim);
    transition: background var(--duration), color var(--duration);
  }
  .nav-links.desktop a:hover,
  .nav-links.desktop a.active {
    background: var(--bg-elev-2);
    color: var(--fg);
    text-decoration: none;
  }
  .nav-links.mobile {
    display: none;
    flex-direction: column;
    padding: 8px 20px;
    background: var(--bg-elev);
    border-bottom: 1px solid var(--border);
  }
  .nav-links.mobile.open {
    display: flex;
  }
  .nav-links.mobile a {
    padding: 10px 0;
    color: var(--fg-dim);
    border-bottom: 1px solid var(--border);
  }
  .nav-links.mobile a.active {
    color: var(--accent);
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .user-id {
    font-size: 12px;
  }
  .mobile-toggle {
    display: none;
    background: none;
    border: none;
    padding: 4px;
  }
  .content {
    flex: 1;
    padding: 20px;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
  }
  @media (max-width: 768px) {
    .nav-links.desktop {
      display: none;
    }
    .mobile-toggle {
      display: block;
    }
    .user-id {
      display: none;
    }
    .content {
      padding: 12px;
    }
  }
</style>
