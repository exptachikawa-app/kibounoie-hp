import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_DIR = path.resolve('public');

const categories = {
  internal: [],
  external_http: [],
  mailto: [],
  tel: [],
  fragment: [],
  data_uri: [],
  javascript: [],
  other_scheme: []
};

const missing = [];
const verified = [];

export function resolveAndValidateTarget(rawRef, sourceFile) {
  if (!rawRef || typeof rawRef !== 'string') return null;
  let ref = rawRef.trim();
  if (!ref) return null;

  // URL scheme classification
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return { type: 'external_http', ref, source: sourceFile };
  }
  if (ref.startsWith('mailto:')) {
    return { type: 'mailto', ref, source: sourceFile };
  }
  if (ref.startsWith('tel:')) {
    return { type: 'tel', ref, source: sourceFile };
  }
  if (ref.startsWith('#')) {
    return { type: 'fragment', ref, source: sourceFile };
  }
  if (ref.startsWith('data:')) {
    return { type: 'data_uri', ref, source: sourceFile };
  }
  if (ref.startsWith('javascript:')) {
    return { type: 'javascript', ref, source: sourceFile };
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(ref)) {
    return { type: 'other_scheme', ref, source: sourceFile };
  }

  // Strip query and hash
  let cleanRef = ref.split('?')[0].split('#')[0].trim();
  if (!cleanRef) {
    return { type: 'fragment', ref, source: sourceFile };
  }

  // URL decoding
  try {
    cleanRef = decodeURIComponent(cleanRef);
  } catch(e) {}

  // Normalize windows backslashes
  cleanRef = cleanRef.replace(/\\/g, '/');

  let resolvedTarget;
  if (cleanRef.startsWith('/')) {
    resolvedTarget = path.resolve(PUBLIC_DIR, '.' + cleanRef);
  } else {
    resolvedTarget = path.resolve(path.dirname(sourceFile), cleanRef);
  }

  // Robust Canonical Path Traversal Check using path.relative
  const rel = path.relative(PUBLIC_DIR, resolvedTarget);
  const isOutside = rel === '..' || rel.startsWith(`..${path.sep}`) || rel.startsWith('../') || rel.startsWith('..\\') || path.isAbsolute(rel);

  if (isOutside) {
    return { type: 'internal', ref, source: sourceFile, resolvedTarget, error: 'Path Traversal Outside Public Dir' };
  }

  return { type: 'internal', ref, source: sourceFile, resolvedTarget };
}

function classifyAndVerify(rawRef, sourceFile) {
  const result = resolveAndValidateTarget(rawRef, sourceFile);
  if (!result) return;

  if (result.type !== 'internal') {
    categories[result.type].push(result);
    return;
  }

  categories.internal.push(result);

  if (result.error) {
    missing.push({ source: sourceFile, ref: result.ref, resolvedTarget: result.resolvedTarget, reason: result.error });
    return;
  }

  let targetExists = fs.existsSync(result.resolvedTarget);
  if (!targetExists && !path.extname(result.resolvedTarget)) {
    if (fs.existsSync(result.resolvedTarget + '.html')) {
      targetExists = true;
    } else if (fs.existsSync(path.join(result.resolvedTarget, 'index.html'))) {
      targetExists = true;
    }
  }

  if (targetExists) {
    verified.push(result);
  } else {
    missing.push({ source: sourceFile, ref: result.ref, resolvedTarget: result.resolvedTarget, reason: 'File Not Found' });
  }
}

function scanHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // 1. href="..."
  const hrefMatches = content.matchAll(/href=["'](.*?)["']/gi);
  for (const m of hrefMatches) {
    classifyAndVerify(m[1], filePath);
  }

  // 2. src="..."
  const srcMatches = content.matchAll(/src=["'](.*?)["']/gi);
  for (const m of srcMatches) {
    classifyAndVerify(m[1], filePath);
  }

  // 3. srcset="..."
  const srcsetMatches = content.matchAll(/srcset=["'](.*?)["']/gi);
  for (const m of srcsetMatches) {
    const parts = m[1].split(',');
    for (const part of parts) {
      const urlCandidate = part.trim().split(/\s+/)[0];
      if (urlCandidate) classifyAndVerify(urlCandidate, filePath);
    }
  }

  // 4. inline style="..." url(...)
  const styleAttrMatches = content.matchAll(/style=["'](.*?)["']/gi);
  for (const m of styleAttrMatches) {
    const urlMatches = m[1].matchAll(/url\(\s*['"]?(.*?)['"]?\s*\)/gi);
    for (const u of urlMatches) {
      classifyAndVerify(u[1], filePath);
    }
  }

  // 5. <style>...</style> url(...)
  const styleTagMatches = content.matchAll(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi);
  for (const m of styleTagMatches) {
    const urlMatches = m[1].matchAll(/url\(\s*['"]?(.*?)['"]?\s*\)/gi);
    for (const u of urlMatches) {
      classifyAndVerify(u[1], filePath);
    }
  }
}

function scanCssFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const urlMatches = content.matchAll(/url\(\s*['"]?(.*?)['"]?\s*\)/gi);
  for (const u of urlMatches) {
    classifyAndVerify(u[1], filePath);
  }
}

function getFiles(dir, exts) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFiles(full, exts));
    } else if (exts.includes(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

// -------------------------------------------------------------
// 1. Run Comprehensive Unit Tests on Path Traversal Boundary Conditions
// -------------------------------------------------------------
const dummySource = path.join(PUBLIC_DIR, 'index.html');
const testCases = [
  { ref: '../outside.html', shouldFail: true, desc: 'Parent traversal' },
  { ref: '../../outside.html', shouldFail: true, desc: 'Double parent traversal' },
  { ref: '../public-evil/file.html', shouldFail: true, desc: 'Sibling directory common prefix traversal' },
  { ref: '%2e%2e%2foutside.html', shouldFail: true, desc: 'URL encoded parent traversal' },
  { ref: '..\\..\\outside.html', shouldFail: true, desc: 'Windows backslash parent traversal' },
  { ref: '/../outside.html', shouldFail: true, desc: 'Root-based parent traversal' },
  { ref: '..example.png', shouldFail: false, desc: 'Valid internal filename starting with double dot' }
];

for (const tc of testCases) {
  const res = resolveAndValidateTarget(tc.ref, dummySource);
  if (tc.shouldFail && (!res || !res.error)) {
    console.error(`Boundary Test FAILED for ${tc.desc} (${tc.ref})`, res);
    process.exit(1);
  }
  if (!tc.shouldFail && res.error) {
    console.error(`Boundary Test FAILED (false positive) for ${tc.desc} (${tc.ref})`, res);
    process.exit(1);
  }
}
console.log('Asset Checker Boundary Unit Tests: 7/7 passed successfully.');

// -------------------------------------------------------------
// 2. Scan All Public Assets
// -------------------------------------------------------------
const htmlFiles = getFiles(PUBLIC_DIR, ['.html']);
const cssFiles = getFiles(PUBLIC_DIR, ['.css']);

for (const hf of htmlFiles) scanHtmlFile(hf);
for (const cf of cssFiles) scanCssFile(cf);

const summary = {
  html_files_scanned: htmlFiles.length,
  css_files_scanned: cssFiles.length,
  internal_references: categories.internal.length,
  verified_existing: verified.length,
  missing_count: missing.length,
  missing_list: missing,
  external_http: categories.external_http.length,
  mailto: categories.mailto.length,
  tel: categories.tel.length,
  fragment: categories.fragment.length,
  data_uri: categories.data_uri.length,
  javascript: categories.javascript.length,
  other_scheme: categories.other_scheme.length
};

console.log(JSON.stringify(summary, null, 2));

if (missing.length > 0) {
  console.error(`Asset Verification FAILED with ${missing.length} missing links!`);
  process.exit(1);
} else {
  console.log('Asset Verification PASSED: All referenced internal assets exist and boundary unit checks passed.');
  process.exit(0);
}
