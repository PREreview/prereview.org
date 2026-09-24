import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schedule, Schema } from 'effect'
import { parse as parseHtml } from 'node-html-parser'
import path from 'path'
import { type Inline, toInlines, type Warn } from './rich-text-inline.ts'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const BASE_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`
const HERO_IMAGE_CONTENT_TYPE = 'heroImage'
const MAX_TITLE_LENGTH = 256

const heroImagesFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-hero-images.json')

interface HeroImageRecord {
  slug: string
  title: string
  src: string
  alt: string | null
  captionHtml: string | null
  assetId?: string
  entryId?: string
}

const HeroImageRecords = Schema.Array(
  Schema.Struct({
    slug: Schema.String,
    title: Schema.String,
    src: Schema.String,
    alt: Schema.NullOr(Schema.String),
    captionHtml: Schema.NullOr(Schema.String),
    assetId: Schema.optional(Schema.String),
    entryId: Schema.optional(Schema.String),
  }),
)

const SysResponse = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
})

function baseFileNameFromUrl(url: string): string {
  return url.split('/').pop()?.split('?')[0] ?? 'image'
}

function extensionFromFileName(fileName: string): string | undefined {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()?.toLowerCase() : undefined
}

function contentTypeFromUrl(url: string): string {
  const fileName = baseFileNameFromUrl(url)
  const ext = extensionFromFileName(fileName)
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
  const fileName = baseFileNameFromUrl(url)
  if (extensionFromFileName(fileName) !== undefined) return fileName

  return `${fileName}.jpg`
}

function captionToRichText(captionHtml: string, warn: Warn) {
  const root = parseHtml(captionHtml)
  const inlines: Array<Inline> = root.childNodes.flatMap(child => toInlines(child, [], warn))
  if (!inlines.length) return null

  return {
    nodeType: 'document',
    data: {},
    content: [{ nodeType: 'paragraph', data: {}, content: inlines }],
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

    const raw = yield* fs.readFileString(heroImagesFile)
    const records: Array<HeroImageRecord> = Array.from(
      yield* Schema.decodeUnknown(HeroImageRecords)(JSON.parse(raw)),
    ).map(r => ({ ...r }))

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

    yield* fs.writeFileString(heroImagesFile, JSON.stringify(records, null, 2))

    const toEntry = records.filter(r => r.assetId !== undefined && r.entryId === undefined)
    yield* Effect.logInfo(`Creating ${toEntry.length} hero image entries`)

    yield* Effect.forEach(
      toEntry,
      record =>
        Effect.gen(function* () {
          const warn: Warn = msg => console.log(`[warn] ${msg} (${record.slug} ${record.src})`)
          const caption = record.captionHtml !== null ? captionToRichText(record.captionHtml, warn) : null

          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/entries`).pipe(
              HttpClientRequest.setHeaders({
                'Content-Type': 'application/vnd.contentful.management.v1+json',
                'X-Contentful-Content-Type': HERO_IMAGE_CONTENT_TYPE,
              }),
              HttpClientRequest.bodyJson({
                fields: {
                  title: { 'en-US': record.title.slice(0, MAX_TITLE_LENGTH) },
                  image: { 'en-US': { sys: { type: 'Link', linkType: 'Asset', id: record.assetId } } },
                  ...(caption !== null ? { caption: { 'en-US': caption } } : {}),
                  ...(record.alt !== null ? { altText: { 'en-US': record.alt } } : {}),
                },
              }),
            ),
          )

          if (createResp.status >= 400) {
            const text = yield* createResp.text
            return yield* Effect.logError(`Entry create failed for ${record.slug}: ${createResp.status} ${text}`)
          }

          const entry = yield* createResp.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))

          const publishResp = yield* authedClient.execute(
            HttpClientRequest.put(`${BASE_URL}/entries/${entry.sys.id}/published`).pipe(
              HttpClientRequest.setHeader('X-Contentful-Version', String(entry.sys.version)),
            ),
          )

          if (publishResp.status >= 400) {
            const text = yield* publishResp.text
            return yield* Effect.logError(
              `Entry created but publish failed for ${record.slug} (${entry.sys.id}), likely the image is smaller than the required 800x500: ${publishResp.status} ${text}`,
            )
          }

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

    yield* fs.writeFileString(heroImagesFile, JSON.stringify(records, null, 2))
    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
