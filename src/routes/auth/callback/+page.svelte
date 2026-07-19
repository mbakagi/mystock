<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { isEmailLink, confirmEmailLink } from '$lib/firestore/auth';
  import { base } from '$app/paths';

  let status = 'checking';
  let errorMessage = '';

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const link = window.location.href;

    if (!email || !isEmailLink(link)) {
      status = 'error';
      errorMessage = 'Invalid or expired sign-in link.';
      return;
    }

    try {
      await confirmEmailLink(email, link);
      status = 'success';
      window.history.replaceState({}, '', base);
      setTimeout(() => {
        window.location.href = base;
      }, 1500);
    } catch (err) {
      status = 'error';
      errorMessage = err.message || 'Sign-in failed.';
    }
  });
</script>

<div class="auth-callback">
  {#if status === 'checking'}
    <div class="spinner"></div>
    <p class="muted">Verifying sign-in link...</p>
  {:else if status === 'success'}
    <div class="checkmark">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <p>Sign-in successful. Redirecting...</p>
  {:else}
    <div class="error">
      <span class="tag err">Error</span>
      <p>{errorMessage}</p>
      <a href="{base}/">Go to Dashboard</a>
    </div>
  {/if}
</div>

<style>
  .auth-callback {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    gap: 16px;
    text-align: center;
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
  .checkmark {
    color: var(--ok);
  }
  .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
</style>
