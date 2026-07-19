<script>
  import { onMount, onDestroy } from 'svelte';
  import { Html5Qrcode } from 'html5-qrcode';
  import { fetchBin, fetchItem, fetchAssignment } from '$lib/firestore/data';
  import { parseDeepLink } from '$lib/utils/qr';

  let scannerContainer;
  let scanner = null;
  let scanning = false;
  let lastScan = 0;
  const SCAN_DEBOUNCE = 1500;

  let result = null;
  let error = null;
  let manualInput = '';

  onMount(() => {
    scanner = new Html5Qrcode('scanner');
  });

  onDestroy(() => {
    if (scanner) {
      scanner.stop().catch(() => {});
    }
  });

  async function startScan() {
    if (scanning) return;
    result = null;
    error = null;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccess,
        onScanFailure
      );
      scanning = true;
    } catch (err) {
      error = 'Camera access denied or unavailable.';
    }
  }

  async function stopScan() {
    if (!scanning) return;
    try {
      await scanner.stop();
    } catch (e) {
      //
    }
    scanning = false;
  }

  function onScanSuccess(decodedText) {
    const now = Date.now();
    if (now - lastScan < SCAN_DEBOUNCE) return;
    lastScan = now;

    const parsed = parseDeepLink(decodedText);
    if (parsed) {
      handleDeepLink(parsed);
    } else {
      result = { type: 'raw', data: decodedText };
    }

    stopScan();
  }

  function onScanFailure(err) {
    // Silent - normal during scanning
  }

  async function handleDeepLink(parsed) {
    try {
      if (parsed.type === 'bin') {
        const bin = await fetchBin(parsed.id);
        if (bin) {
          result = { type: 'bin', data: bin };
        } else {
          error = `Bin ${parsed.id} not found.`;
        }
      } else if (parsed.type === 'item') {
        const item = await fetchItem(parsed.id);
        if (item) {
          result = { type: 'item', data: item };
        } else {
          error = `Item ${parsed.id} not found.`;
        }
      } else if (parsed.type === 'assignment') {
        const assignment = await fetchAssignment(parsed.id);
        if (assignment) {
          result = { type: 'assignment', data: assignment };
        } else {
          error = `Assignment ${parsed.id} not found.`;
        }
      }
    } catch (e) {
      error = 'Failed to fetch data.';
    }
  }

  async function handleManualScan() {
    if (!manualInput.trim()) return;
    const parsed = parseDeepLink(manualInput.trim());
    if (parsed) {
      handleDeepLink(parsed);
    } else {
      result = { type: 'raw', data: manualInput.trim() };
    }
    manualInput = '';
  }

  function reset() {
    result = null;
    error = null;
  }
</script>

<div class="scan-page">
  <h1>Scan QR</h1>

  <div class="scanner-area card">
    <div id="scanner" bind:this={scannerContainer} class="scanner-viewport"></div>
    <div class="scanner-controls">
      {#if !scanning}
        <button class="primary" on:click={startScan}>Start Camera</button>
      {:else}
        <button class="danger" on:click={stopScan}>Stop</button>
      {/if}
    </div>
  </div>

  <div class="card manual">
    <div class="row">
      <input
        bind:value={manualInput}
        placeholder="Paste deep link or scan result..."
        on:keydown={(e) => e.key === 'Enter' && handleManualScan()}
      />
      <button class="primary" on:click={handleManualScan}>Lookup</button>
    </div>
  </div>

  {#if error}
    <div class="card error-card">
      <span class="tag err">Error</span>
      <p>{error}</p>
      <button on:click={reset}>Dismiss</button>
    </div>
  {/if}

  {#if result}
    <div class="card result-card">
      <span class="tag ok">Found: {result.type}</span>
      <pre class="mono">{JSON.stringify(result.data, null, 2)}</pre>
      <div class="row" style="justify-content:flex-end">
        <button on:click={reset}>Scan Again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .scan-page h1 {
    margin: 0 0 16px 0;
  }
  .scanner-area {
    margin-bottom: 16px;
  }
  .scanner-viewport {
    width: 100%;
    max-width: 400px;
    margin: 0 auto 12px auto;
    border-radius: var(--radius);
    overflow: hidden;
    background: #000;
    min-height: 250px;
  }
  .scanner-viewport :global(video) {
    width: 100%;
    display: block;
  }
  .scanner-controls {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  .manual {
    margin-bottom: 16px;
  }
  .error-card, .result-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .error-card p, .result-card pre {
    margin: 0;
    word-break: break-all;
    white-space: pre-wrap;
    font-size: 13px;
  }
</style>
