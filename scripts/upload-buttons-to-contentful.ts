import { FileSystem, HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schema } from 'effect'
import path from 'path'

const SPACE_ID = '66hjlpng9xzg'
const ENVIRONMENT_ID = 'master'
const BASE_URL = `https://api.contentful.com/spaces/${SPACE_ID}/environments/${ENVIRONMENT_ID}`
const CTA_CONTENT_TYPE = 'callToAction'

const buttonsFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-buttons.json')

interface ButtonRecord {
  text: string
  target: string
  entryId?: string
}

const ButtonRecords = Schema.Array(
  Schema.Struct({
    text: Schema.String,
    target: Schema.String,
    entryId: Schema.optional(Schema.String),
  }),
)

const SysResponse = Schema.Struct({
  sys: Schema.Struct({ id: Schema.String, version: Schema.Number }),
})

void pipe(
  Effect.gen(function* () {
    const token = yield* Effect.fromNullable(process.env['CONTENTFUL_MANAGEMENT_TOKEN']).pipe(
      Effect.mapError(() => new Error('CONTENTFUL_MANAGEMENT_TOKEN env var is not set')),
    )

    const fs = yield* FileSystem.FileSystem
    const client = yield* HttpClient.HttpClient
    const authedClient = client.pipe(HttpClient.mapRequest(HttpClientRequest.bearerToken(token)))

    const raw = yield* fs.readFileString(buttonsFile)
    const records: Array<ButtonRecord> = Array.from(yield* Schema.decodeUnknown(ButtonRecords)(JSON.parse(raw))).map(
      r => ({ ...r }),
    )

    const toProcess = records.filter(r => r.entryId === undefined)
    yield* Effect.logInfo(
      `Creating ${toProcess.length} call-to-action entries (${records.length - toProcess.length} already done)`,
    )

    yield* Effect.forEach(
      toProcess,
      record =>
        Effect.gen(function* () {
          const createResp = yield* authedClient.execute(
            yield* HttpClientRequest.post(`${BASE_URL}/entries`).pipe(
              HttpClientRequest.setHeaders({
                'Content-Type': 'application/vnd.contentful.management.v1+json',
                'X-Contentful-Content-Type': CTA_CONTENT_TYPE,
              }),
              HttpClientRequest.bodyJson({
                fields: {
                  text: { 'en-US': record.text },
                  target: { 'en-US': record.target },
                },
              }),
            ),
          )

          if (createResp.status >= 400) {
            const text = yield* createResp.text
            return yield* Effect.logError(
              `Entry create failed for "${record.text}" (${record.target}): ${createResp.status} ${text}`,
            )
          }

          const entry = yield* createResp.json.pipe(Effect.flatMap(Schema.decodeUnknown(SysResponse)))

          yield* authedClient.execute(
            HttpClientRequest.put(`${BASE_URL}/entries/${entry.sys.id}/published`).pipe(
              HttpClientRequest.setHeader('X-Contentful-Version', String(entry.sys.version)),
            ),
          )

          record.entryId = entry.sys.id
          yield* Effect.logInfo(`Entry ${entry.sys.id} created for "${record.text}"`)
        }).pipe(
          Effect.tapError(e =>
            Effect.logError(`Failed entry for "${record.text}": ${e instanceof Error ? e.message : JSON.stringify(e)}`),
          ),
          Effect.ignore,
        ),
      { concurrency: 2 },
    )

    yield* fs.writeFileString(buttonsFile, JSON.stringify(records, null, 2))
    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, NodeHttpClient.layer, Logger.pretty)),
  Effect.runPromise,
)
