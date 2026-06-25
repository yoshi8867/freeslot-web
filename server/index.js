import express from 'express'
import iconv from 'iconv-lite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// 컴시간 매직넘버 (2026-06-25 /st 로더와 일치 확인). 회전 가능성 대비 환경변수로 덮어쓰기 허용.
const ROUTE = process.env.COMCI_ROUTE || '36179' // 라우트 prefix: /36179_T?...
const PREFIX = process.env.COMCI_PREFIX || '73629' // sc_data prefix: 73629_
const SEARCH = process.env.COMCI_SEARCH || '17384l' // 학교검색 prefix: /36179?17384l{euckr}
const COMCI_BASE = process.env.COMCI_BASE || 'http://comci.net:4082'

app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'))

// 프록시: 브라우저는 http(mixed content)·CORS로 comci.net 직접 호출 불가 → 서버가 대신 호출.
// 응답은 실측 UTF-8(EUC-KR 아님). trailing garbage는 lastIndexOf('}')까지 잘라서 반환.
app.get('/api/timetable', async (req, res) => {
  const school = String(req.query.school ?? '16213').replace(/[^0-9]/g, '')
  const r = String(req.query.r ?? '').replace(/[^0-9]/g, '')
  if (!school) return res.status(400).json({ error: 'school code required' })

  const payload = `${PREFIX}_${school}_0_${r}`
  const b64 = Buffer.from(payload, 'utf8').toString('base64')
  const url = `${COMCI_BASE}/${ROUTE}_T?${b64}`

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const buf = Buffer.from(await upstream.arrayBuffer())
    const clean = stripTrailingGarbage(decodeBody(buf))
    JSON.parse(clean) // 유효성 검증(깨졌으면 throw → 502)
    res.type('application/json').send(clean)
  } catch (e) {
    res.status(502).json({ error: 'upstream fetch/parse failed', detail: String(e?.message ?? e) })
  }
})

// 학교 검색 프록시. 검색어를 EUC-KR로 인코딩해 comci에 넘기고(응답은 UTF-8),
// 결과 배열 [_, 지역, 학교명, 코드]를 {name, code, region}으로 정규화해 반환.
app.get('/api/schools', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) return res.json([])

  // 검색어는 EUC-KR 바이트를 percent-encoding 해야 comci가 인식한다.
  const term = [...iconv.encode(q, 'euc-kr')]
    .map((b) => '%' + b.toString(16).padStart(2, '0').toUpperCase())
    .join('')
  const url = `${COMCI_BASE}/${ROUTE}?${SEARCH}${term}`

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    const buf = Buffer.from(await upstream.arrayBuffer())
    const obj = JSON.parse(stripTrailingGarbage(decodeBody(buf)))
    const list = Array.isArray(obj['학교검색']) ? obj['학교검색'] : []
    const schools = list.map((e) => ({
      name: String(e[2] ?? ''),
      code: String(e[3] ?? ''),
      region: String(e[1] ?? ''),
    }))
    res.json(schools)
  } catch (e) {
    res.status(502).json({ error: 'school search failed', detail: String(e?.message ?? e) })
  }
})

// 프로덕션 정적 서빙: vite build 산출물(dist/). 개발 시엔 vite dev 서버가 클라이언트를 담당.
const dist = path.join(__dirname, '..', 'dist')
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.listen(PORT, () => console.log(`freeslot-web listening on :${PORT}`))

/** 데이터 응답은 UTF-8. strict 디코딩 실패 시에만 EUC-KR로 폴백(방어적). */
function decodeBody(buf) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('euc-kr').decode(buf)
  }
}

function stripTrailingGarbage(text) {
  const last = text.lastIndexOf('}')
  return last === -1 ? text : text.slice(0, last + 1)
}
