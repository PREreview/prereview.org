import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Array, Effect, Layer, Logger, pipe, Schema } from 'effect'
import path from 'path'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const CONTENT_TYPE_ID = 'blogPost'
const IMPORT_LIMIT = 5

const importDir = path.resolve(import.meta.dirname, '..', 'contentful-import')

const EntryFields = Schema.Struct({
  fields: Schema.Struct({
    title: Schema.Struct({ 'en-US': Schema.String }),
    slug: Schema.Struct({ 'en-US': Schema.String }),
    content: Schema.Struct({ 'en-US': Schema.Unknown }),
  }),
})

const createEntry = (body: typeof EntryFields.Type) =>
  HttpClientRequest.post(`https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}/entries`).pipe(
    HttpClientRequest.setHeaders({
      'X-Contentful-Content-Type': CONTENT_TYPE_ID,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
    }),
    HttpClientRequest.bodyJson(body),
  )

void pipe(
  Effect.gen(function* () {
    const token = yield* Effect.fromNullable(process.env['CONTENTFUL_MANAGEMENT_TOKEN']).pipe(
      Effect.mapError(() => new Error('CONTENTFUL_MANAGEMENT_TOKEN env var is not set')),
    )
    console.log(token)

    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient

    const authedClient = client.pipe(HttpClient.mapRequest(HttpClientRequest.bearerToken(token)))

    const files = yield* fs.readDirectory(importDir)
    const jsonFiles = files.filter(f => f.endsWith('.json'))
    const limited = Array.take(jsonFiles, IMPORT_LIMIT)

    yield* Effect.logInfo(`Importing ${limited.length} of ${jsonFiles.length} entries`)

    yield* Effect.forEach(
      limited,
      file =>
        Effect.gen(function* () {
          const slug = file.replace(/\.json$/, '')
          const raw = yield* fs.readFileString(path.join(importDir, file))
          const body = yield* Schema.decodeUnknown(EntryFields)(JSON.parse(raw))
          const response = yield* authedClient.execute(yield* createEntry(body))

          if (response.status >= 400) {
            const text = yield* response.text
            yield* Effect.logError(`Failed to create entry for ${slug}: ${response.status} ${text}`)
          } else {
            yield* Effect.logInfo(`Created entry for ${slug}`)
          }

          yield* response.json.pipe(Effect.ignore)
        }),
      { concurrency: 3 },
    )

    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
