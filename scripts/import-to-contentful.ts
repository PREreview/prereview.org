/* eslint-disable no-comments/disallowComments */
import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schema } from 'effect'
import path from 'path'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const BASE_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`
const CONTENT_TYPE_ID = 'blogPost'
const IMPORT_LIMIT = 500

const importDir = path.resolve(import.meta.dirname, '..', 'contentful-import', 'entries')

const EntryLink = Schema.Struct({
  sys: Schema.Struct({ type: Schema.Literal('Link'), linkType: Schema.Literal('Entry'), id: Schema.String }),
})

const EntryFields = Schema.Struct({
  fields: Schema.Struct({
    title: Schema.Struct({ 'en-US': Schema.String }),
    slug: Schema.Struct({ 'en-US': Schema.String }),
    authors: Schema.Struct({ 'en-US': Schema.Array(EntryLink) }),
    content: Schema.Struct({ 'en-US': Schema.Unknown }),
    firstPublishedAtOverride: Schema.Struct({ 'en-US': Schema.String }),
    publishedAtOverride: Schema.Struct({ 'en-US': Schema.String }),
  }),
})

const SysResponse = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
})

const createEntry = (body: typeof EntryFields.Type) =>
  HttpClientRequest.post(`${BASE_URL}/entries`).pipe(
    HttpClientRequest.setHeaders({
      'X-Contentful-Content-Type': CONTENT_TYPE_ID,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    }),
    HttpClientRequest.bodyJson(body),
  )

const publishEntry = (entryId: string, version: number) =>
  HttpClientRequest.put(`${BASE_URL}/entries/${entryId}/published`).pipe(
    HttpClientRequest.setHeader('X-Contentful-Version', String(version)),
  )

const firstPublishedAtOverrideTime = (entry: { slug: string; body: typeof EntryFields.Type }) =>
  new Date(entry.body.fields.firstPublishedAtOverride['en-US']).getTime()

void pipe(
  Effect.gen(function* () {
    const token = yield* Effect.fromNullable(process.env['CONTENTFUL_MANAGEMENT_TOKEN']).pipe(
      Effect.mapError(() => new Error('CONTENTFUL_MANAGEMENT_TOKEN env var is not set')),
    )

    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient

    const authedClient = client.pipe(HttpClient.mapRequest(HttpClientRequest.bearerToken(token)))

    const files = yield* fs.readDirectory(importDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const entries = yield* Effect.forEach(jsonFiles, file =>
      Effect.gen(function* () {
        const raw = yield* fs.readFileString(path.join(importDir, file))
        const body = yield* Schema.decodeUnknown(EntryFields)(JSON.parse(raw))
        return { slug: body.fields.slug['en-US'], body }
      }),
    )

    const ordered = [...entries].sort((a, b) => firstPublishedAtOverrideTime(a) - firstPublishedAtOverrideTime(b))
    const limited = ordered.slice(0, IMPORT_LIMIT)

    yield* Effect.logInfo(`Importing ${limited.length} of ${ordered.length} entries, oldest first`)

    // Entries are created and published one at a time, oldest firstPublishedAtOverride
    // first, so that Contentful's own sys.firstPublishedAt timestamps (set to the wall-clock
    // time of each publish call) come out in the same chronological order and can be used
    // as a fallback sort for retrieving blog posts.
    yield* Effect.forEach(limited, ({ slug, body }) =>
      Effect.gen(function* () {
        const createResponse = yield* authedClient.execute(yield* createEntry(body))

        if (createResponse.status >= 400) {
          const text = yield* createResponse.text
          return yield* Effect.logError(`Failed to create entry for ${slug}: ${createResponse.status} ${text}`)
        }

        const created = yield* createResponse.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))

        const publishResponse = yield* authedClient.execute(publishEntry(created.sys.id, created.sys.version))

        if (publishResponse.status >= 400) {
          const text = yield* publishResponse.text
          return yield* Effect.logError(
            `Created but failed to publish entry for ${slug} (${created.sys.id}): ${publishResponse.status} ${text}`,
          )
        }

        yield* Effect.logInfo(`Created and published entry for ${slug} (${created.sys.id})`)
      }).pipe(
        Effect.tapError(e =>
          Effect.logError(`Failed entry for ${slug}: ${e instanceof Error ? e.message : JSON.stringify(e)}`),
        ),
        Effect.ignore,
      ),
    )

    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
