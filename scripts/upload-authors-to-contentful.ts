import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schedule, Schema } from 'effect'
import path from 'path'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const BASE_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`
const AUTHOR_CONTENT_TYPE = 'author'

const authorsFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-authors.json')

interface AuthorRecord {
  slug: string
  name: string
  profileImageSrc: string | null
  assetId?: string
  entryId?: string
}

const AuthorRecords = Schema.Array(
  Schema.Struct({
    slug: Schema.String,
    name: Schema.String,
    profileImageSrc: Schema.NullOr(Schema.String),
    assetId: Schema.optional(Schema.String),
    entryId: Schema.optional(Schema.String),
  }),
)

const SysResponse = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
})

function contentTypeFromUrl(url: string): string {
  const ext = url.split('/').pop()?.split('?')[0]?.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'svg':
      return 'image/svg+xml'
    default:
      return 'image/jpeg'
  }
}

function fileNameFromUrl(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? 'image.jpg'
}

const pollSchedule = Schedule.addDelay(Schedule.recurs(10), () => '2 seconds')

void pipe(
  Effect.gen(function* () {
    const token = yield* Effect.fromNullable(process.env['CONTENTFUL_MANAGEMENT_TOKEN']).pipe(
      Effect.mapError(() => new Error('CONTENTFUL_MANAGEMENT_TOKEN env var is not set')),
    )

    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient
    const authedClient = client.pipe(HttpClient.mapRequest(HttpClientRequest.bearerToken(token)))

    const raw = yield* fs.readFileString(authorsFile)
    const records: Array<AuthorRecord> = Array.from(yield* Schema.decodeUnknown(AuthorRecords)(JSON.parse(raw))).map(
      r => ({ ...r }),
    )

    const toProcessAssets = records.filter(r => r.profileImageSrc !== null && r.assetId === undefined)
    yield* Effect.logInfo(
      `Creating ${toProcessAssets.length} profile picture assets (${records.length - toProcessAssets.length} already done or no picture)`,
    )

    yield* Effect.forEach(
      toProcessAssets,
      record =>
        Effect.gen(function* () {
          const src = record.profileImageSrc
          if (src === null) return

          const fileName = fileNameFromUrl(src)
          const mimeType = contentTypeFromUrl(src)

          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/assets`).pipe(
              HttpClientRequest.setHeader('Content-Type', 'application/vnd.contentful.management.v1+json'),
              HttpClientRequest.bodyJson({
                fields: {
                  title: { 'en-US': `${record.name} profile picture` },
                  file: { 'en-US': { contentType: mimeType, fileName, upload: src } },
                },
              }),
            ),
          )

          if (createResp.status >= 400) {
            const text = yield* createResp.text
            return yield* Effect.logError(
              `Asset create failed for ${record.slug} ${src}: ${createResp.status} ${text}`,
            )
          }

          const created = yield* createResp.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))

          yield* authedClient.execute(
            HttpClientRequest.put(`${BASE_URL}/assets/${created.sys.id}/files/en-US/process`).pipe(
              HttpClientRequest.setHeader('X-Contentful-Version', String(created.sys.version)),
            ),
          )

          const processed = yield* Effect.retry(
            Effect.gen(function* () {
              const resp = yield* authedClient.execute(HttpClientRequest.get(`${BASE_URL}/assets/${created.sys.id}`))
              return yield* resp.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))
            }),
            pollSchedule,
          )

          yield* authedClient.execute(
            HttpClientRequest.put(`${BASE_URL}/assets/${processed.sys.id}/published`).pipe(
              HttpClientRequest.setHeader('X-Contentful-Version', String(processed.sys.version)),
            ),
          )

          record.assetId = processed.sys.id
          yield* Effect.logInfo(`Asset ${processed.sys.id} created for ${record.slug}`)
        }).pipe(
          Effect.tapError(e =>
            Effect.logError(`Failed asset for ${record.slug}: ${e instanceof Error ? e.message : JSON.stringify(e)}`),
          ),
          Effect.ignore,
        ),
      { concurrency: 2 },
    )

    yield* fs.writeFileString(authorsFile, JSON.stringify(records, null, 2))

    const toProcessEntries = records.filter(r => r.entryId === undefined)
    yield* Effect.logInfo(`Creating ${toProcessEntries.length} author entries`)

    yield* Effect.forEach(
      toProcessEntries,
      record =>
        Effect.gen(function* () {
          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/entries`).pipe(
              HttpClientRequest.setHeaders({
                'Content-Type': 'application/vnd.contentful.management.v1+json',
                'X-Contentful-Content-Type': AUTHOR_CONTENT_TYPE,
              }),
              HttpClientRequest.bodyJson({
                fields: {
                  name: { 'en-US': record.name },
                  ...(record.assetId !== undefined
                    ? { picture: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: record.assetId } } } }
                    : {}),
                },
              }),
            ),
          )

          if (createResp.status >= 400) {
            const text = yield* createResp.text
            return yield* Effect.logError(`Entry create failed for ${record.slug}: ${createResp.status} ${text}`)
          }

          const entry = yield* createResp.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))

          yield* authedClient.execute(
            HttpClientRequest.put(`${BASE_URL}/entries/${entry.sys.id}/published`).pipe(
              HttpClientRequest.setHeader('X-Contentful-Version', String(entry.sys.version)),
            ),
          )

          record.entryId = entry.sys.id
          yield* Effect.logInfo(`Entry ${entry.sys.id} created for ${record.slug}`)
        }).pipe(
          Effect.tapError(e =>
            Effect.logError(`Failed entry for ${record.slug}: ${e instanceof Error ? e.message : JSON.stringify(e)}`),
          ),
          Effect.ignore,
        ),
      { concurrency: 2 },
    )

    yield* fs.writeFileString(authorsFile, JSON.stringify(records, null, 2))
    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
