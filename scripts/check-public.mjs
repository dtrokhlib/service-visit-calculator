import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, lstatSync } from 'node:fs'
import { relative, resolve } from 'node:path'

// Never log matching values. Include tracked files even if .gitignore excludes them.
const excluded = new Set(['node_modules', 'dist', '.git', '.env', 'service_visit_codex_context.md', '.DS_Store'])
function walk(dir = '.') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (excluded.has(entry.name) || (entry.name.startsWith('.env.') && entry.name !== '.env.example') || /\.(local|log|pem|key|p12|pfx)$/.test(entry.name)) return []
    const path = resolve(dir, entry.name)
    return entry.isDirectory() ? walk(path) : entry.isFile() ? [relative('.', path)] : []
  })
}
let files
try {
  files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean)
} catch { files = walk() }
const violations = []
for (const file of new Set(files)) {
  if (/(^|\/)(\.env(?:\..+)?|service_visit_codex_context\.md)$/.test(file) && !file.endsWith('.env.example')) {
    violations.push(`${file}: приватний локальний файл`); continue
  }
  if (/\.(pem|key|p12|pfx)$/.test(file) || /^(dist|node_modules)\//.test(file)) {
    violations.push(`${file}: приватний файл або артефакт збірки`); continue
  }
  let content
  try {
    if (!lstatSync(file).isFile()) continue
    content = readFileSync(file, 'utf8')
  } catch { continue }
  if (/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/.test(content)
    || /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/.test(content)
    || /\b[a-f0-9]{32}\b/i.test(content)) {
    violations.push(`${file}: можливий ключ або токен`)
  }
}
if (violations.length) {
  console.error('Перевірка публічних файлів не пройшла:\n' + violations.join('\n'))
  process.exitCode = 1
} else console.log(`Перевірено ${new Set(files).size} файлів: явних ключів і приватних файлів не знайдено. Це базова перевірка, а не гарантія відсутності всіх секретів.`)
