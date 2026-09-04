import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schedule, Schema } from 'effect'
import path from 'path'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const BASE_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`
const CAPTIONED_CONTENT_TYPE = 'captionedAsset'

const imagesFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-images.json')

interface ImageRecord {
  slug: string
  src: string
  caption: string | null
  assetId?: string
  entryId?: string
}

const ImageRecords = Schema.Array(
  Schema.Struct({
    slug: Schema.String,
    src: Schema.String,
    caption: Schema.NullOr(Schema.String),
    assetId: Schema.optional(Schema.String),
    entryId: Schema.optional(Schema.String),
  }),
)

const SysResponse = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
})

const ProcessedAsset = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
  fields: Schema.Struct({
    file: Schema.Struct({
      'en-US': Schema.Struct({ url: Schema.String }),
    }),
  }),
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

function toRichText(text: string) {
  return {
    nodeType: 'document',
    data: {},
    content: [
      {
        nodeType: 'paragraph',
        data: {},
        content: [{ nodeType: 'text', value: text, marks: [], data: {} }],
      },
    ],
  }
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

    const raw = yield* fs.readFileString(imagesFile)
    const records: Array<ImageRecord> = Array.from(yield* Schema.decodeUnknown(ImageRecords)(JSON.parse(raw))).map(
      r => ({ ...r }),
    )

    const toProcess = records.filter(r => r.assetId === undefined)
    yield* Effect.logInfo(`Creating ${toProcess.length} assets (${records.length - toProcess.length} already done)`)

    yield* Effect.forEach(
      toProcess,
      record =>
        Effect.gen(function* () {
          const fileName = fileNameFromUrl(record.src)
          const mimeType = contentTypeFromUrl(record.src)

          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/assets`).pipe(
              HttpClientRequest.setHeader('Content-Type', 'application/vnd.contentful.management.v1+json'),
              HttpClientRequest.bodyJson({
                fields: {
                  title: { 'en-US': fileName },
                  file: { 'en-US': { contentType: mimeType, fileName, upload: record.src } },
                },
              }),
            ),
          )

          if (createResp.status >= 400) {
            const text = yield* createResp.text
            return yield* Effect.logError(
              `Asset create failed for ${record.slug} ${record.src}: ${createResp.status} ${text}`,
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
              return yield* resp.json.pipe(Effect.flatMap(Schema.decodeUnknown(ProcessedAsset)))
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
            Effect.logError(`Failed asset for ${record.src}: ${e instanceof Error ? e.message : JSON.stringify(e)}`),
          ),
          Effect.ignore,
        ),
      { concurrency: 2 },
    )

    yield* fs.writeFileString(imagesFile, JSON.stringify(records, null, 2))

    const toCaption = records.filter(r => r.caption !== null && r.assetId !== undefined && r.entryId === undefined)
    yield* Effect.logInfo(`Creating ${toCaption.length} captionedAsset entries`)

    yield* Effect.forEach(
      toCaption,
      record =>
        Effect.gen(function* () {
          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/entries`).pipe(
              HttpClientRequest.setHeaders({
                'Content-Type': 'application/vnd.contentful.management.v1+json',
                'X-Contentful-Content-Type': CAPTIONED_CONTENT_TYPE,
              }),
              HttpClientRequest.bodyJson({
                fields: {
                  caption: { 'en-US': toRichText(record.caption ?? '') },
                  image: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: record.assetId } } },
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

    yield* fs.writeFileString(imagesFile, JSON.stringify(records, null, 2))
    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
