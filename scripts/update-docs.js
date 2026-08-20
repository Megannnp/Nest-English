import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const GENERATED_START = '<!-- AUTO-GENERATED:START -->';
const GENERATED_END = '<!-- AUTO-GENERATED:END -->';

const sourceFiles = {
  packageJson: 'package.json',
  clientPackageJson: 'client/package.json',
  serverPackageJson: 'server/package.json',
  routes: 'client/src/app/routes.js',
  navigation: 'client/src/app/navigation.js',
  serverApp: 'server/app.js',
  serverServer: 'server/server.js',
  serverRoutesDir: 'server/routes',
};

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return fs.readFileSync(absolutePath, 'utf8');
}

function readJson(relativePath) {
  const content = read(relativePath);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function listFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const results = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        results.push(rel(absolutePath));
      }
    }
  };
  walk(absoluteDir);
  return results.sort();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function formatList(items, fallback = '- TODO: 待人工补充') {
  if (!items.length) return fallback;
  return items.map((item) => `- ${item}`).join('\n');
}

function formatTable(headers, rows, fallback = 'TODO: 待人工补充') {
  if (!rows.length) return fallback;
  const headerLine = `| ${headers.join(' |')} |`;
  const dividerLine = `| ${headers.map(() => '---').join(' |')} |`;
  const rowLines = rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replaceAll('\n', ' ')).join(' |')} |`);
  return [headerLine, dividerLine, ...rowLines].join('\n');
}

function extractObjectMappings(content, objectName) {
  if (!content) return [];
  const objectMatch = content.match(new RegExp(`const\\s+${objectName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!objectMatch) return [];
  return [...objectMatch[1].matchAll(/["']?([A-Za-z0-9_-]+)["']?\s*:\s*["']([^"']+)["']/g)]
    .map((match) => ({ page: match[1], pathname: match[2] }));
}

function extractRoutePatterns(content) {
  if (!content) return [];
  const rows = [];
  const itemRegex = /\{\s*page:\s*["']([^"']+)["'][\s\S]*?match:\s*\(pathname\)\s*=>\s*([^}]+)\}/g;
  for (const match of content.matchAll(itemRegex)) {
    const page = match[1];
    const expression = match[2];
    const paths = unique([...expression.matchAll(/pathname\s*===\s*["']([^"']+)["']/g)].map((pathMatch) => pathMatch[1]));
    for (const pathname of paths) rows.push({ page, pathname, source: sourceFiles.routes });
  }
  return rows;
}

function extractSetPages(content, setName) {
  if (!content) return [];
  const match = content.match(new RegExp(`const\\s+${setName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`));
  if (!match) return [];
  return unique([...match[1].matchAll(/["']([^"']+)["']/g)].map((pageMatch) => pageMatch[1])).sort();
}

function extractNavItems(content) {
  if (!content) return [];
  return [...content.matchAll(/\{\s*id:\s*["']([^"']+)["'],\s*icon:\s*["']([^"']+)["'],\s*label:\s*["']([^"']+)["']/g)]
    .map((match) => ({ id: match[1], icon: match[2], label: match[3] }));
}

function fallbackRouteLabel(page) {
  return page
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function fallbackRouteIcon(page) {
  if (page.includes('writing')) return 'writing';
  if (page.includes('grammar')) return 'book-open';
  if (page.includes('reading')) return 'book-open';
  if (page.includes('listening')) return 'headphones';
  if (page.includes('phonetics')) return 'mic';
  if (page.includes('vocab')) return 'book-open';
  if (page.includes('camp')) return 'book-open';
  if (page.includes('teacher') || page.includes('workbench')) return 'workbench';
  if (page.includes('parent') || page.includes('records') || page.includes('growth')) return 'records';
  if (page.includes('admin') || page.includes('management')) return 'workbench';
  return 'page';
}

function dynamicPathByPage(page) {
  const paths = {
    'teacher-writing-detail': '/app/writings/:writingId',
    'camp-course-detail': '/camp/courses/:courseId',
    'camp-my-course-detail': '/camp/my-courses/:courseId',
  };
  return paths[page];
}

function canonicalRoutePage(page) {
  const aliases = {
    grammar: 'grammar-analyzer',
    listening: 'listening-basics',
    phonetics: 'phonetics-sound',
    reading: 'reading-analyzer',
    vocab: 'vocab-reading',
    'writing-refine': 'writing-refine-sentence',
  };
  return aliases[page] || page;
}

function parseRoutes() {
  const routesContent = read(sourceFiles.routes);
  const navigationContent = read(sourceFiles.navigation);
  const routePatterns = extractRoutePatterns(routesContent);
  const pathnameMappings = extractObjectMappings(routesContent, 'PATHNAME_BY_PAGE');
  const pathByPage = new Map(pathnameMappings.map((item) => [item.page, item.pathname]));
  const navByPage = new Map(extractNavItems(navigationContent).map((item) => [item.id, item]));
  const roleSets = {
    public: extractSetPages(navigationContent, 'PUBLIC_PAGES'),
    common: extractSetPages(navigationContent, 'COMMON_PAGES'),
    admin: extractSetPages(navigationContent, 'ADMIN_PAGES'),
    student: extractSetPages(navigationContent, 'STUDENT_PAGES'),
    teacher: extractSetPages(navigationContent, 'TEACHER_PAGES'),
    parent: extractSetPages(navigationContent, 'PARENT_PAGES'),
  };
  const pages = unique([
    ...routePatterns.map((item) => item.page),
    ...pathnameMappings.map((item) => item.page),
    ...Object.values(roleSets).flat(),
  ]).sort();
  const rows = pages.map((page) => {
    const paths = unique([
      ...routePatterns.filter((item) => item.page === page).map((item) => item.pathname),
      pathByPage.get(page),
      dynamicPathByPage(page),
    ]);
    const canonicalPage = canonicalRoutePage(page);
    const roles = Object.entries(roleSets)
      .filter(([, values]) => values.includes(page) || values.includes(canonicalPage))
      .map(([role]) => role);
    const nav = navByPage.get(page);
    return {
      page,
      paths,
      roles,
      label: nav?.label || fallbackRouteLabel(page),
      icon: nav?.icon || fallbackRouteIcon(page),
    };
  });
  return {
    rows,
    routePatterns,
    pathnameMappings,
    navItems: extractNavItems(navigationContent),
    roleSets,
    todos: [
      ...(!routesContent ? [`TODO: Missing ${sourceFiles.routes}`] : []),
      ...(!navigationContent ? [`TODO: Missing ${sourceFiles.navigation}`] : []),
    ],
  };
}

function extractImports(content) {
  if (!content) return new Map();
  const imports = new Map();
  const importRegex = /import\s+(?:(?:\{\s*([^}]+)\s*\})|([A-Za-z0-9_$]+))\s+from\s+["'](\.\/routes\/[^"']+)["']/g;
  for (const match of content.matchAll(importRegex)) {
    const named = match[1];
    const defaultName = match[2];
    const importPath = match[3];
    const normalizedPath = `${importPath.replace('./', 'server/').replace(/\.js$/, '')}.js`;
    if (named) {
      for (const name of named.split(',').map((item) => item.trim().split(/\s+as\s+/).pop()).filter(Boolean)) {
        imports.set(name, normalizedPath);
      }
    }
    if (defaultName) imports.set(defaultName, normalizedPath);
  }
  return imports;
}

function extractMounts(content) {
  const imports = extractImports(content);
  const mounts = [];
  if (!content) return mounts;
  const useRegex = /app\.use\(\s*["']([^"']+)["']\s*,\s*([A-Za-z0-9_$]+)/g;
  for (const match of content.matchAll(useRegex)) {
    const basePath = match[1];
    const routerName = match[2];
    mounts.push({
      basePath,
      routerName,
      sourceFile: imports.get(routerName) || sourceFiles.serverApp,
    });
  }
  const directRouteRegex = /app\.(get|post|put|patch|delete|all)\(\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(directRouteRegex)) {
    mounts.push({
      method: match[1].toUpperCase(),
      fullPath: match[2],
      routerName: 'app',
      sourceFile: sourceFiles.serverApp,
    });
  }
  return mounts;
}

function joinPaths(basePath, routePath) {
  if (!routePath || routePath === '/') return basePath;
  return `${basePath.replace(/\/$/, '')}/${routePath.replace(/^\//, '')}`;
}

function extractLocalRouterImports(content, routeFile) {
  const imports = new Map();
  if (!content) return imports;
  const importRegex = /import\s+([A-Za-z0-9_$]+)\s+from\s+["'](\.[^"']+)["']/g;
  for (const match of content.matchAll(importRegex)) {
    const importPath = match[2].endsWith('.js') ? match[2] : `${match[2]}.js`;
    imports.set(match[1], rel(path.resolve(ROOT, path.dirname(routeFile), importPath)));
  }
  return imports;
}

function extractRouterEndpoints(routeFile, basePath, visited = new Set()) {
  if (visited.has(routeFile)) return [];
  visited.add(routeFile);
  const content = read(routeFile);
  if (!content) return [];
  const endpoints = [];
  const imports = extractLocalRouterImports(content, routeFile);
  const routeRegex = /(?:router|[A-Za-z0-9_$]+Router)\.(get|post|put|patch|delete|all|use)\(\s*["']([^"']+)["']/g;
  for (const match of content.matchAll(routeRegex)) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    endpoints.push({
      method: method === 'USE' ? 'USE' : method,
      path: joinPaths(basePath, routePath),
      routePath,
      sourceFile: routeFile,
    });
  }
  const delegatedRouterRegex = /router\.use\(\s*([A-Za-z0-9_$]+)\s*\)/g;
  for (const match of content.matchAll(delegatedRouterRegex)) {
    const nestedFile = imports.get(match[1]);
    if (nestedFile) endpoints.push(...extractRouterEndpoints(nestedFile, basePath, visited));
  }
  return endpoints;
}

function isRouterFile(file) {
  const content = read(file);
  return Boolean(content && /\bRouter\s*\(/.test(content));
}

function parseApi() {
  const appContent = read(sourceFiles.serverApp);
  const mounts = extractMounts(appContent);
  const routeFiles = listFiles(sourceFiles.serverRoutesDir).filter(isRouterFile);
  const endpoints = [];
  for (const mount of mounts) {
    if (mount.fullPath) {
      endpoints.push({
        method: mount.method,
        path: mount.fullPath,
        sourceFile: mount.sourceFile,
        mount: '',
      });
      continue;
    }
    if (mount.sourceFile.startsWith(sourceFiles.serverRoutesDir)) {
      const fileEndpoints = extractRouterEndpoints(mount.sourceFile, mount.basePath);
      if (fileEndpoints.length) {
        endpoints.push(...fileEndpoints.map((endpoint) => ({ ...endpoint, mount: mount.basePath })));
      } else {
        endpoints.push({
          method: 'TODO',
          path: `${mount.basePath}/*`,
          sourceFile: mount.sourceFile,
          mount: mount.basePath,
          note: 'TODO: Router file has no directly recognized router.METHOD calls or delegates to nested routers.',
        });
      }
    }
  }
  const mountedFiles = new Set([
    ...mounts.map((mount) => mount.sourceFile),
    ...endpoints.map((endpoint) => endpoint.sourceFile),
  ]);
  const unmountedRouteFiles = routeFiles.filter((file) => !mountedFiles.has(file));
  return {
    endpoints: endpoints.sort((a, b) => `${a.path} ${a.method}`.localeCompare(`${b.path} ${b.method}`)),
    mounts,
    routeFiles,
    unmountedRouteFiles,
    todos: [
      ...(!appContent ? [`TODO: Missing ${sourceFiles.serverApp}`] : []),
      ...unmountedRouteFiles.map((file) => `TODO: ${file} is not directly mounted in ${sourceFiles.serverApp}; it may be nested or unused.`),
      ...endpoints.filter((endpoint) => endpoint.note).map((endpoint) => endpoint.note),
    ],
  };
}

function parsePackages() {
  const packageFiles = [sourceFiles.packageJson, sourceFiles.clientPackageJson, sourceFiles.serverPackageJson];
  return packageFiles
    .map((file) => ({ file, json: readJson(file) }))
    .filter((item) => item.json);
}

function buildPackageSummary(packages) {
  const scripts = packages.flatMap(({ file, json }) =>
    Object.entries(json.scripts || {}).map(([name, command]) => ({ file, name, command }))
  );
  const deps = unique(packages.flatMap(({ json }) => [
    ...Object.keys(json.dependencies || {}),
    ...Object.keys(json.devDependencies || {}),
  ])).sort();
  const stackHints = deps.filter((dep) =>
    ['@vitejs/plugin-react', 'vite', 'react', 'express', 'mysql2', 'redis', 'jsonwebtoken', 'vitest', 'eslint'].includes(dep)
  );
  return { scripts, deps, stackHints };
}

function buildHeader(title, sources, generatedAt) {
  return [
    GENERATED_START,
    '',
    `# ${title}`,
    '',
    '> Auto-generated by `scripts/update-docs.js`. Do not edit the generated block by hand.',
    '',
    `Last updated: ${generatedAt}`,
    '',
    'Source files:',
    formatList(sources.map((source) => `\`${source}\``)),
    '',
  ].join('\n');
}

function finishBlock(content) {
  return `${content.trim()}\n\n${GENERATED_END}\n`;
}

function writeGeneratedDoc(relativePath, title, sources, body, generatedAt) {
  const targetPath = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const generated = finishBlock(`${buildHeader(title, sources, generatedAt)}${body}`);
  if (!fs.existsSync(targetPath)) {
    fs.writeFileSync(targetPath, `${generated}\n`, 'utf8');
    return;
  }
  const existing = fs.readFileSync(targetPath, 'utf8');
  const start = existing.indexOf(GENERATED_START);
  const end = existing.indexOf(GENERATED_END);
  if (start === -1 || end === -1 || end < start) {
    fs.writeFileSync(targetPath, `${existing.trimEnd()}\n\n${generated}`, 'utf8');
    return;
  }
  const before = existing.slice(0, start);
  const after = existing.slice(end + GENERATED_END.length);
  fs.writeFileSync(targetPath, `${before}${generated}${after.replace(/^\n+/, '\n')}`, 'utf8');
}

function buildApiDoc(api, generatedAt) {
  const rows = api.endpoints.map((endpoint) => [
    endpoint.method,
    `\`${endpoint.path}\``,
    `\`${endpoint.sourceFile}\``,
    endpoint.note || '',
  ]);
  const mountRows = api.mounts
    .filter((mount) => mount.basePath)
    .map((mount) => [`\`${mount.basePath}\``, mount.routerName, `\`${mount.sourceFile}\``]);
  const body = [
    '## API Routes',
    '',
    formatTable(['Method', 'Path', 'Source', 'Notes'], rows),
    '',
    '## Express Mounts',
    '',
    formatTable(['Base path', 'Router', 'Source'], mountRows),
    '',
    '## Open Items',
    '',
    formatList(unique(api.todos), '- 无'),
  ].join('\n');
  writeGeneratedDoc('docs/API.md', 'API', [sourceFiles.serverApp, sourceFiles.serverServer, sourceFiles.serverRoutesDir], body, generatedAt);
}

function buildRoutesDoc(routes, generatedAt) {
  const rows = routes.rows.map((route) => [
    route.page,
    route.paths.length ? route.paths.map((item) => `\`${item}\``).join(', ') : 'TODO',
    route.roles.length ? route.roles.join(', ') : 'TODO',
    route.label || 'TODO',
    route.icon || 'TODO',
  ]);
  const navRows = routes.navItems.map((item) => [item.id, item.label, item.icon]);
  const body = [
    '## Frontend Routes',
    '',
    formatTable(['Page', 'Pathnames', 'Roles/Sets', 'Nav label', 'Icon'], rows),
    '',
    '## Navigation Items',
    '',
    formatTable(['Page', 'Label', 'Icon'], navRows),
    '',
    '## Open Items',
    '',
    formatList(unique(routes.todos), '- 无'),
  ].join('\n');
  writeGeneratedDoc('docs/ROUTES.md', 'Routes', [sourceFiles.routes, sourceFiles.navigation], body, generatedAt);
}

function buildContextDoc({ packages, packageSummary, routes, api }, generatedAt) {
  const sources = [
    sourceFiles.packageJson,
    sourceFiles.clientPackageJson,
    sourceFiles.serverPackageJson,
    sourceFiles.routes,
    sourceFiles.navigation,
    sourceFiles.serverApp,
    sourceFiles.serverServer,
    sourceFiles.serverRoutesDir,
  ].filter((source) => source.endsWith('routes') || exists(source));
  const scriptRows = packageSummary.scripts.map((script) => [`\`${script.file}\``, script.name, `\`${script.command}\``]);
  const topApiRows = api.endpoints.slice(0, 40).map((endpoint) => [endpoint.method, `\`${endpoint.path}\``, `\`${endpoint.sourceFile}\``]);
  const topRouteRows = routes.rows.map((route) => [
    route.page,
    route.paths.length ? route.paths.map((item) => `\`${item}\``).join(', ') : 'TODO',
    route.roles.length ? route.roles.join(', ') : 'TODO',
  ]);
  const todos = unique([
    ...routes.todos,
    ...api.todos,
    ...(!packages.find((item) => item.file === sourceFiles.clientPackageJson) ? [`TODO: Missing ${sourceFiles.clientPackageJson}`] : []),
    ...(!packages.find((item) => item.file === sourceFiles.serverPackageJson) ? [`TODO: Missing ${sourceFiles.serverPackageJson}`] : []),
  ]);
  const body = [
    '## Project Overview',
    '',
    '- Product: Nest English.',
    '- Purpose: AI-assisted English learning product.',
    '- Repository role: Application source code, tests, runtime configuration, deployment scripts, and generated application docs.',
    '- AI instruction: Read this file first, then inspect the source files linked below before changing code.',
    '',
    '## Technology Stack Signals',
    '',
    packageSummary.stackHints.length
      ? formatList(packageSummary.stackHints.map((dep) => `\`${dep}\``))
      : '- TODO: 待人工补充',
    '',
    '## Package Scripts',
    '',
    formatTable(['Package', 'Script', 'Command'], scriptRows),
    '',
    '## Core Source Map',
    '',
    formatList(sources.map((source) => `\`${source}\``)),
    '',
    '## Frontend Route Summary',
    '',
    formatTable(['Page', 'Pathnames', 'Roles/Sets'], topRouteRows),
    '',
    '## Backend API Summary',
    '',
    formatTable(['Method', 'Path', 'Source'], topApiRows),
    '',
    '## Current Open Items',
    '',
    formatList(todos, '- 无'),
  ].join('\n');
  writeGeneratedDoc('docs/NESTOS_CONTEXT.md', 'NestOS Context', sources, body, generatedAt);
}

// ── Module Knowledge Graph ──────────────────────────────────────────────────

const MODULE_EXCLUDE_DIRS = new Set(['app', 'components', 'hooks', 'utils', 'styles', 'constants', 'api', 'test', 'content']);

function discoverModuleNames() {
  const absoluteDir = path.join(ROOT, 'client/src');
  if (!fs.existsSync(absoluteDir)) return [];
  return fs.readdirSync(absoluteDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !MODULE_EXCLUDE_DIRS.has(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function listDirFiles(relativeDir, extensions) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const results = [];
  const extSet = new Set(extensions);
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile() && extSet.has(path.extname(entry.name))) {
        results.push(rel(absolutePath));
      }
    }
  };
  walk(absoluteDir);
  return results.sort();
}

function buildModuleGraph(moduleName, api, routes) {
  const clientDir = `client/src/${moduleName}`;
  const allClientFiles = listDirFiles(clientDir, ['.jsx', '.js']);
  const pages = allClientFiles.filter((f) => !f.includes('.test.') && !f.includes('.spec.'));
  const clientTests = allClientFiles.filter((f) => f.includes('.test.') || f.includes('.spec.'));

  const hooksDir = 'client/src/hooks';
  const moduleHooks = listDirFiles(hooksDir, ['.js']).filter((f) =>
    path.basename(f).toLowerCase().includes(moduleName.toLowerCase())
  );

  const routeVariants = [moduleName, `${moduleName}s`, `${moduleName}Routes`];
  const serverRouteFiles = [];
  for (const variant of routeVariants) {
    const singleFile = `server/routes/${variant}.js`;
    if (exists(singleFile)) serverRouteFiles.push(singleFile);
    const dirVariant = `server/routes/${variant}`;
    if (exists(dirVariant)) serverRouteFiles.push(...listDirFiles(dirVariant, ['.js']));
  }

  const lowerModule = moduleName.toLowerCase();
  const moduleEndpoints = api.endpoints.filter((e) => {
    const p = e.path.toLowerCase();
    return p.includes(`/${lowerModule}`) || p.includes(`/${lowerModule}s`);
  });

  const moduleRoutes = routes.rows.filter((r) =>
    r.page.toLowerCase().includes(lowerModule)
  );

  const serverTests = listDirFiles('server/tests', ['.js']).filter((f) =>
    path.basename(f).toLowerCase().includes(lowerModule)
  );

  return {
    name: moduleName,
    pages,
    hooks: moduleHooks,
    serverRouteFiles,
    endpoints: moduleEndpoints,
    frontendRoutes: moduleRoutes,
    tests: [...clientTests, ...serverTests],
  };
}

function formatModuleSection(graph) {
  const lines = [`### ${graph.name.charAt(0).toUpperCase() + graph.name.slice(1)}`];
  lines.push('');

  const pages = graph.pages.map((f) => `- \`${f}\``);
  lines.push('**Frontend**');
  lines.push(pages.length ? pages.join('\n') : '- (none)');
  lines.push('');

  if (graph.hooks.length) {
    lines.push('**Hooks**');
    lines.push(graph.hooks.map((f) => `- \`${path.basename(f)}\``).join('\n'));
    lines.push('');
  }

  if (graph.serverRouteFiles.length) {
    lines.push('**Backend Routes**');
    lines.push(graph.serverRouteFiles.map((f) => `- \`${f}\``).join('\n'));
    lines.push('');
  }

  if (graph.endpoints.length) {
    lines.push('**API Endpoints**');
    lines.push(graph.endpoints.map((e) => `- \`${e.method} ${e.path}\``).join('\n'));
    lines.push('');
  }

  if (graph.frontendRoutes.length) {
    lines.push('**Frontend Routes**');
    lines.push(graph.frontendRoutes.map((r) =>
      `- \`${r.page}\` → ${r.paths.length ? r.paths.join(', ') : 'no path'} [${r.roles.join(', ') || 'no role'}]`
    ).join('\n'));
    lines.push('');
  }

  if (graph.tests.length) {
    lines.push('**Tests**');
    lines.push(graph.tests.map((f) => `- \`${path.basename(f)}\``).join('\n'));
    lines.push('');
  }

  return lines.join('\n');
}

function markStatus(hasFull, hasPartial = false) {
  if (hasFull) return '接入完整';
  return hasPartial ? '接入部分' : '接入缺失';
}

function hasProgressEndpoint(graph) {
  return graph.endpoints.some((endpoint) =>
    /\/(progress|records?|tasks?)(\/|$)/i.test(endpoint.path)
  ) || graph.frontendRoutes.some((route) =>
    /(progress|records?|tasks?)/i.test(route.page)
  ) || graph.pages.some((file) =>
    /(ProgressPage|\/records\/)/.test(file)
  );
}

function buildModuleCompletenessRows(moduleGraphs) {
  return moduleGraphs.map((graph) => {
    const hasEntry = graph.frontendRoutes.some((route) => route.paths.length);
    const hasPage = graph.pages.some((file) => file.endsWith('Page.jsx'));
    const hasApi = graph.endpoints.length > 0 || graph.serverRouteFiles.length > 0;
    const hasTeacher = graph.frontendRoutes.some((route) => route.roles.includes('teacher'))
      || graph.endpoints.some((endpoint) => endpoint.path.includes('/teacher/'));
    const hasAdmin = graph.frontendRoutes.some((route) => route.roles.includes('admin'))
      || graph.endpoints.some((endpoint) => endpoint.path.includes('/admin/'));
    const hasClientTest = graph.tests.some((file) => file.startsWith('client/'));
    const hasServerTest = graph.tests.some((file) => file.startsWith('server/'));
    const completeCount = [hasEntry, hasPage, hasApi, hasProgressEndpoint(graph), hasTeacher, hasAdmin, hasClientTest || hasServerTest]
      .filter(Boolean).length;

    return [
      graph.name,
      markStatus(hasEntry),
      markStatus(hasPage),
      markStatus(hasApi),
      markStatus(hasProgressEndpoint(graph)),
      markStatus(hasTeacher),
      markStatus(hasAdmin),
      markStatus(hasClientTest && hasServerTest, hasClientTest || hasServerTest),
      markStatus(completeCount >= 6, completeCount >= 2),
    ];
  });
}

function buildModulesDoc(moduleGraphs, generatedAt) {
  const sources = ['client/src', 'server/routes', 'server/tests'];
  const body = [
    '## Module Completeness',
    '',
    'Derived from source files, routes, API endpoints, and tests. Values describe code integration only, not product-quality acceptance.',
    '',
    formatTable(['模块', '前端入口', '页面渲染', 'API', '进度记录', '教师端', '管理端', '测试', '接入状态'], buildModuleCompletenessRows(moduleGraphs)),
    '',
    '## Module Knowledge Graph',
    '',
    'Each section shows a feature module and its cross-layer connections.',
    'Frontend files, hooks, backend routes, API endpoints, and tests grouped together.',
    '',
    moduleGraphs.map(formatModuleSection).join('\n---\n\n'),
  ].join('\n');
  writeGeneratedDoc('docs/MODULES.md', 'NestOS Module Map', sources, body, generatedAt);
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const generatedAt = new Date().toISOString();
  const packages = parsePackages();
  const packageSummary = buildPackageSummary(packages);
  const routes = parseRoutes();
  const api = parseApi();
  const moduleNames = discoverModuleNames();
  const moduleGraphs = moduleNames.map((name) => buildModuleGraph(name, api, routes));
  buildContextDoc({ packages, packageSummary, routes, api }, generatedAt);
  buildApiDoc(api, generatedAt);
  buildRoutesDoc(routes, generatedAt);
  buildModulesDoc(moduleGraphs, generatedAt);
  const todoCount = unique([...routes.todos, ...api.todos]).length;
  console.log('Generated docs:');
  console.log('- docs/NESTOS_CONTEXT.md');
  console.log('- docs/API.md');
  console.log('- docs/ROUTES.md');
  console.log('- docs/MODULES.md');
  console.log(`Modules discovered: ${moduleNames.join(', ')}`);
  console.log(`TODO count: ${todoCount}`);
}

main();
