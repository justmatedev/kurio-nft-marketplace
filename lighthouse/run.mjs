import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from '@playwright/test'
import { throttling } from 'lighthouse/core/config/constants.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = process.env.LIGHTHOUSE_OUTPUT_DIR || path.join(root, 'lighthouse/reports/latest')
const runs = Number(process.env.LIGHTHOUSE_RUNS || 3)
const base = 'http://127.0.0.1:4173'
const run = (cmd, args) => new Promise((resolve, reject) => {
  const child = spawn(cmd, args, { cwd: root, stdio: 'inherit' })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)))
})
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
async function available() { try { return (await fetch(base)).ok } catch { return false } }
await mkdir(outDir, { recursive: true })
await run('npm', ['run', 'build'])
let preview
if (!(await available())) {
  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: root, stdio: 'inherit' })
  for (let i = 0; i < 60 && !(await available()); i++) await new Promise(r => setTimeout(r, 500))
  if (!(await available())) throw new Error('Preview unavailable')
}
const targets = {}
let chromeVersion
let lighthouseVersion
try {
  for (const [label, pagePath] of [['home', '/'], ['detail', '/nfts/nft_001']]) {
    if (process.env.LIGHTHOUSE_PAGE && process.env.LIGHTHOUSE_PAGE !== label) continue
    targets[label] = {}
    for (const profile of ['mobile', 'desktop']) {
      const samples = []
      for (let index = 1; index <= runs; index++) {
        const chrome = await chromeLauncher.launch({ chromePath: process.env.CHROME_PATH || chromium.executablePath(), chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] })
        try {
          const result = await lighthouse(`${base}${pagePath}`, {
            port: chrome.port, output: ['json', 'html'], logLevel: 'error',
            formFactor: profile,
            throttling: profile === 'desktop' ? throttling.desktopDense4G : throttling.mobileSlow4G,
            screenEmulation: profile === 'desktop' ? { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false } : undefined,
            onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
          })
          if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message)
          lighthouseVersion = result.lhr.lighthouseVersion
          chromeVersion = result.lhr.environment.hostUserAgent
          const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, value.score * 100]))
          const audits = result.lhr.audits
          const metrics = { lcpMs: audits['largest-contentful-paint'].numericValue, cls: audits['cumulative-layout-shift'].numericValue, tbtMs: audits['total-blocking-time'].numericValue }
          samples.push({ scores, metrics })
          const filename = `${label}-${profile}-run${index}`
          await writeFile(path.join(outDir, `${filename}.json`), result.report[0])
          await writeFile(path.join(outDir, `${filename}.html`), result.report[1])
          console.log(filename, JSON.stringify({ scores, metrics }))
        } finally { await chrome.kill() }
      }
      targets[label][profile] = {
        scores: Object.fromEntries(Object.keys(samples[0].scores).map(key => [key, median(samples.map(s => s.scores[key]))])),
        metrics: Object.fromEntries(Object.keys(samples[0].metrics).map(key => [key, median(samples.map(s => s.metrics[key]))])),
      }
    }
  }
  const report = { generatedAt: new Date().toISOString(), runsPerTarget: runs, environment: { node: process.version, lighthouse: lighthouseVersion, chromium: chromeVersion, os: `${os.type()} ${os.release()} ${os.arch()}`, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), base }, conditions: { scenario: 'default', storage: 'fresh Chrome profile per measurement', throttling: { mobile: throttling.mobileSlow4G, desktop: throttling.desktopDense4G }, build: 'production, all images/fonts/MSW/Socket.IO enabled' }, targets, goals: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 } }
  await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(report, null, 2))
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
  console.log('Audit finished with lockfileVersion', lock.lockfileVersion)
} finally { preview?.kill('SIGTERM') }
