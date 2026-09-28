/**
 * Groq transport for the potential-well planner.
 *
 * The model is used as a *ranking function over measurements*, not as a source of numbers.
 * Everything it is shown comes from `briefAsText` — the API's own wellfield — and the reply is
 * parsed defensively and then screened by `planner.ts` before the page will draw any of it. The
 * one thing the model is trusted to produce is the geological argument: which ground is worth
 * penetrating next, and why the offsets support that reading.
 *
 * Key handling follows the same rule the rest of the product uses — nothing secret is committed.
 * `VITE_GROQ_API_KEY` is for a local `.env`; a key typed into the panel is kept in
 * `sessionStorage` and dies with the tab. There is no server in this build to proxy through, so
 * the call goes to Groq directly.
 */

import { parseCandidates, type LlmCandidate, type PlanningBrief, type Screening, briefAsText, screenAll } from './planner'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
/**
 * Model to place wells with. Overridable with VITE_GROQ_MODEL because Groq retires models
 * (llama-3.3-70b-versatile was removed and every request 404'd with model_not_found), and a
 * lineup change should be an .env edit rather than a code change. `GET /openai/v1/models`
 * against your own key lists what you actually have access to. Pinned in the reply so the
 * section can label the output's provenance.
 */
export const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || 'openai/gpt-oss-120b'
const SESSION_KEY = 'nwis.groq.key'

/**
 * The instruction. It states the job as ranking, forbids the two things that would make the
 * output worthless (inventing wells, inventing numbers), and pins the JSON shape — the same
 * contract the parser in `planner.ts` reads.
 */
const SYSTEM_PROMPT = `You are the placement engine for an oil and gas drilling programme in the Upper Assam basin. You are given a table of measured well data for one field and you decide where the next wells should be drilled.

Rules you must follow:
1. Propose locations as kilometre offsets east and north of the deployment origin. Use the same frame as the existing wells' coordinates in the table.
2. Every candidate must sit inside the stated search radius and at least the stated minimum spacing from every existing well.
3. Never invent a well id. When you cite evidence you must use ids that appear in the table, and the claim must be supportable from the numbers given.
4. Never invent a measurement. Every number you state must be traceable to the table.
5. Prefer ground where the offsets reached the target with a low similarity-to-loss relationship, and say so plainly when the evidence is thin.
6. Be honest about uncertainty. If the archive cannot support a confident call at some ground, lower the confidence and say why in caveats.

Reply with JSON only, no prose and no code fence, in exactly this shape:
{"candidates":[{"name":"<well id>","eastKm":<number>,"northKm":<number>,"targetFormation":"<formation>","wellType":"<Development|Appraisal|Exploratory|Infill>","targetTdM":<number>,"confidence":<0-100>,"rationale":"<one paragraph on why this ground>","citedWells":["<ids from the table>"],"riskOutlook":"<what the offsets suggest will happen here>","confidenceFactors":[{"factor":"<name>","weight":<0-1>,"note":"<why>"}],"drillPlan":[{"step":"<short name>","detail":"<what to do>"}],"caveats":["<what you could not establish>"]}]}`

export interface GroqRun {
  screening: Screening
  model: string
  latencySeconds: number
  /** Candidate count the model returned, including the ones screening refused. */
  proposed: number
}

function readEnvKey(): string {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  return (env?.VITE_GROQ_API_KEY ?? '').trim()
}

function readSessionKey(): string {
  try {
    return sessionStorage.getItem(SESSION_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

/** Env key first, then the key typed for this tab. Empty means the panel asks for one. */
export function activeGroqKey(): string {
  return readEnvKey() || readSessionKey()
}

/** True when a key came from the build rather than the reader, so the panel can hide its field. */
export function groqKeyIsFromEnv(): boolean {
  return Boolean(readEnvKey())
}

export function rememberGroqKey(key: string): void {
  try {
    if (key.trim()) sessionStorage.setItem(SESSION_KEY, key.trim())
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode — the key simply does not persist */
  }
}

export class GroqError extends Error {
  readonly hint: string
  constructor(message: string, hint: string) {
    super(message)
    this.name = 'GroqError'
    this.hint = hint
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    return body.error?.message ?? res.statusText
  } catch {
    return res.statusText
  }
}

/**
 * One placement run.
 *
 * Throws {@link GroqError} for anything the reader has to act on — no key, a rejected key, a
 * rate limit, a network failure — so the panel can say what to do rather than showing an empty
 * map. A reply that parses but is empty is not an error here: it becomes a `Screening` with
 * everything in `rejected`, which the section renders as "the model proposed nothing usable".
 */
export async function runPlacement(brief: PlanningBrief, signal?: AbortSignal): Promise<GroqRun> {
  const key = activeGroqKey()
  if (!key) {
    throw new GroqError('No Groq API key', 'Add a Groq API key below, or set VITE_GROQ_API_KEY in .env, to run the placement engine.')
  }

  const started = performance.now()
  let res: Response
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
      temperature: 0.2,
      // gpt-oss spends a large part of its budget on reasoning tokens before it writes any JSON
      // (3,251 of 4,000 on the first live run), and at 4,000 it hit `finish_reason: length` and
      // returned 2 candidates when 4 were asked for. 16k leaves room for reasoning plus the list.
      max_tokens: 16000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Place ${brief.candidateCount} candidate future well(s) for the field described below.\n\n${briefAsText(brief)}`,
          },
        ],
      }),
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new GroqError('Could not reach Groq', 'Check the network connection, then run the placement engine again.')
  }

  if (!res.ok) {
    const detail = await readError(res)
    if (res.status === 401 || res.status === 403) {
      throw new GroqError('Groq rejected the API key', 'Check the key, or replace it with a current one from console.groq.com.')
    }
    if (res.status === 429) {
      throw new GroqError('Groq rate limit reached', 'Wait a moment before running the placement engine again.')
    }
    throw new GroqError(`Groq error ${res.status}`, detail)
  }

  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = body.choices?.[0]?.message?.content ?? ''
  const candidates: LlmCandidate[] = parseCandidates(content)

  return {
    screening: screenAll(candidates, brief),
    model: GROQ_MODEL,
    latencySeconds: Math.round((performance.now() - started) / 100) / 10,
    proposed: candidates.length,
  }
}
