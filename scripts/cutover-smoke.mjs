function parseArgs(argv) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.split('=');
    map.set(key, rest.join('='));
  }

  const brandIds = (map.get('--brand-ids') || process.env.CUTOVER_BRAND_IDS || '431,428,1')
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);

  return {
    appUrl: (map.get('--app-url') || process.env.CUTOVER_APP_URL || 'https://brnd.land').replace(/\/$/, ''),
    apiBase: (map.get('--api-base') || process.env.CUTOVER_API_BASE || 'https://api.brnd.land').replace(/\/$/, ''),
    brandIds,
    strictCategory: argv.includes('--strict-category'),
  };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { Accept: 'text/html,application/json' } });
  const body = await res.text();
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url} :: ${body.slice(0, 160)}`);
  }
  return JSON.parse(body);
}

const isNumericName = (value) => typeof value === 'string' && /^\d+$/.test(value.trim());

async function run() {
  const options = parseArgs(process.argv.slice(2));

  const failures = [];
  const warnings = [];

  console.log('🚦 Cutover smoke check');
  console.log(`App: ${options.appUrl}`);
  console.log(`API: ${options.apiBase}`);
  console.log(`Brand IDs: ${options.brandIds.join(', ')}`);

  const appRoutes = ['/', '/brand/431', '/vote', '/profile'];
  for (const route of appRoutes) {
    const url = `${options.appUrl}${route}`;
    try {
      const response = await fetchText(url);
      if (!response.ok) {
        failures.push(`route ${route} returned ${response.status}`);
        continue;
      }

      if (route === '/') {
        if (response.body.includes('/src/main.tsx') || response.body.includes('@vite/client')) {
          failures.push('homepage looks like dev bundle (contains /src/main.tsx or @vite/client)');
        }
        if (!response.body.includes('/assets/') && !response.body.includes('dist/assets')) {
          warnings.push('homepage does not include obvious assets path marker');
        }
      }

      console.log(`✅ route ok: ${route}`);
    } catch (error) {
      failures.push(`route ${route} fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const id of options.brandIds) {
    try {
      const detail = await fetchJson(`${options.apiBase}/brand-service/brand/${id}`);
      const brand = detail?.brand;
      const beforeCount = failures.length;
      if (!brand) {
        failures.push(`brand ${id}: missing brand in payload`);
        continue;
      }

      const guardianTypeValid = typeof brand.guardianFid === 'number' || brand.guardianFid === null;
      if (!guardianTypeValid) failures.push(`brand ${id}: guardianFid type invalid`);

      if (brand.tokenTicker !== (brand.ticker ?? null)) {
        failures.push(`brand ${id}: tokenTicker alias mismatch`);
      }
      if (brand.tokenContractAddress !== (brand.contractAddress ?? null)) {
        failures.push(`brand ${id}: tokenContractAddress alias mismatch`);
      }

      if (brand.guardianFid == null && brand.onChainFid == null) {
        warnings.push(`brand ${id}: no guardianFid and no onChainFid`);
      }

      const categoryName = brand?.category?.name;
      if (isNumericName(categoryName)) {
        const message = `brand ${id}: numeric category name (${categoryName})`;
        if (options.strictCategory) failures.push(message);
        else warnings.push(message);
      }

      if (failures.length === beforeCount) {
        console.log(`✅ brand contract ok: ${id}`);
      } else {
        console.log(`❌ brand contract failed: ${id}`);
      }
    } catch (error) {
      failures.push(`brand ${id}: API fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  for (const warning of warnings) {
    console.log(`⚠️ ${warning}`);
  }

  console.log(`\nSummary: ${failures.length} failure(s), ${warnings.length} warning(s)`);
  if (failures.length > 0) {
    for (const failure of failures) console.log(`❌ ${failure}`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('❌ cutover smoke failed:', error);
  process.exitCode = 1;
});
