import { neon } from '@neondatabase/serverless'

declare const process: { env: Record<string, string | undefined> }

/**
 * One round trip per sync: the client pushes what it changed since its last sync,
 * then gets back everything that changed on the server since its cursor.
 * Anyone holding a hangout's share id can read and write it; the id is the secret.
 */
interface Body {
  id: string
  since?: number
  create?: boolean
  meta?: unknown
  people?: unknown
  receipts?: { id: string }[]
  deleted?: string[]
}

const sql = neon(process.env.DATABASE_URL ?? '')
const SHARE_ID = /^[\w-]{16,64}$/
const ITEM_ID = /^[\w-]{1,64}$/
const MAX_ROWS = 500
const MAX_BYTES = 512 * 1024
// re-send rows a little older than the cursor so clock skew or a slow commit can't hide a write
const OVERLAP = 15_000

let ready: Promise<unknown> | undefined
const setup = () =>
  (ready ??= sql
    .transaction([
      sql`create table if not exists shared_hangouts (
        id text primary key,
        meta jsonb not null,
        people jsonb not null,
        updated_at bigint not null
      )`,
      sql`create table if not exists shared_receipts (
        hangout_id text not null references shared_hangouts (id) on delete cascade,
        id text not null,
        data jsonb,
        updated_at bigint not null,
        primary key (hangout_id, id)
      )`,
    ])
    .catch((e) => {
      ready = undefined
      throw e
    }))

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store' } })

const isObject = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v)

export async function POST(request: Request) {
  const text = await request.text()
  if (text.length > MAX_BYTES) return reply({ error: 'too large' }, 413)
  let body: Body
  try {
    body = JSON.parse(text)
  } catch {
    return reply({ error: 'bad json' }, 400)
  }
  const { id, create = false, meta, people, receipts = [], deleted = [] } = body
  const since = Number(body.since) || 0
  if (
    typeof id !== 'string' || !SHARE_ID.test(id) ||
    !Array.isArray(receipts) || !Array.isArray(deleted) ||
    receipts.length > MAX_ROWS || deleted.length > MAX_ROWS ||
    receipts.some((r) => !isObject(r) || typeof r.id !== 'string' || !ITEM_ID.test(r.id)) ||
    deleted.some((d) => typeof d !== 'string' || !ITEM_ID.test(d)) ||
    (meta !== undefined && !isObject(meta)) ||
    (people !== undefined && !isObject(people)) ||
    (create && (meta === undefined || people === undefined))
  )
    return reply({ error: 'bad request' }, 400)

  await setup()
  if (!create) {
    const found = await sql`select 1 from shared_hangouts where id = ${id}`
    if (!found.length) return reply({ error: 'not found' }, 404)
  }

  const now = Date.now()
  const writes = []
  if (meta !== undefined && people !== undefined)
    writes.push(sql`
      insert into shared_hangouts (id, meta, people, updated_at)
      values (${id}, ${JSON.stringify(meta)}::jsonb, ${JSON.stringify(people)}::jsonb, ${now})
      on conflict (id) do update set meta = excluded.meta, people = excluded.people, updated_at = excluded.updated_at`)
  for (const r of receipts)
    writes.push(sql`
      insert into shared_receipts (hangout_id, id, data, updated_at)
      values (${id}, ${r.id}, ${JSON.stringify(r)}::jsonb, ${now})
      on conflict (hangout_id, id) do update set data = excluded.data, updated_at = excluded.updated_at`)
  for (const d of deleted)
    writes.push(sql`
      insert into shared_receipts (hangout_id, id, data, updated_at)
      values (${id}, ${d}, null, ${now})
      on conflict (hangout_id, id) do update set data = null, updated_at = excluded.updated_at`)
  if (writes.length) await sql.transaction(writes)

  const after = since - OVERLAP
  const [[hangout], rows] = await sql.transaction([
    sql`select meta, people, updated_at from shared_hangouts where id = ${id}`,
    sql`select id, data from shared_receipts where hangout_id = ${id} and updated_at > ${after}`,
  ])
  if (!hangout) return reply({ error: 'not found' }, 404)
  const fresh = Number(hangout.updated_at) > after
  return reply({
    now,
    meta: fresh ? hangout.meta : undefined,
    people: fresh ? hangout.people : undefined,
    receipts: rows,
  })
}
