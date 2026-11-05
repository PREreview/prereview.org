// oxlint-disable no-comments/disallowComments
import { Array, Effect, pipe, type Redacted, Schema } from 'effect'
import { PgVector, UnableToAddWorksWithRequests, UnableToQuery, type Embedding } from './Shared.ts'
import type { SqlClient, SqlError } from 'effect/sql'
import type { HttpClient } from 'effect/http'
import { generateEmbeddings } from './OpenRouter.ts'
import type { LanguageCode } from 'iso-639-1'
import type { Doi } from '../types/Doi.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import { Temporal } from '@js-temporal/polyfill'
import type { LanguageDetection } from '../ExternalInteractions/LanguageDetection/index.ts'
import type { Tokenizer } from '@huggingface/tokenizers'
import { IndeterminatePreprintIdFromStringSchema, type IndeterminatePreprintId } from '../Preprints/index.ts'

export interface WorkWithRequest {
  preprintId: IndeterminatePreprintId
  title: string
  abstract: string
  authors: ReadonlyArray<OrcidId>
  latestRequest: Temporal.Instant
}

// DOIs are case-insensitive, so the stored form is lowercased to make lookups and conflicts work regardless of case.
const encodePreprintId = (preprintId: IndeterminatePreprintId): string =>
  Schema.encodeSync(IndeterminatePreprintIdFromStringSchema)(preprintId).toLowerCase()

const decodePreprintId = Schema.decodeUnknownEffect(IndeterminatePreprintIdFromStringSchema)

// `sql.in` binds one query parameter per ID, and the SQL compiler spreads them onto an array
// via `Function.apply`, which throws a RangeError once there are tens of thousands of them.
// Chunking keeps each query's parameter list well under that limit.
const FIND_EXISTING_DOIS_CHUNK_SIZE = 5000

export const findExistingWorks: (
  preprintIds: ReadonlyArray<IndeterminatePreprintId>,
  sql: SqlClient.SqlClient,
) => Effect.Effect<Set<IndeterminatePreprintId>, UnableToAddWorksWithRequests> = Effect.fn(
  'Embeddings.findExistingWorks',
)(function* (preprintIds, sql) {
  if (preprintIds.length === 0) return new Set<IndeterminatePreprintId>()

  const normalized = preprintIds.map(encodePreprintId)

  const rows = yield* pipe(
    Array.chunksOf(normalized, FIND_EXISTING_DOIS_CHUNK_SIZE),
    Effect.forEach(
      chunk => sql<{ preprint_id: string }>`
        SELECT
          preprint_id
        FROM
          request_embeddings
        WHERE
          ${sql.in('preprint_id', chunk)}
      `,
      { concurrency: 4 },
    ),
    Effect.map(Array.flatten),
    Effect.andThen(Effect.forEach(row => decodePreprintId(row.preprint_id))),
    Effect.mapError(cause => new UnableToAddWorksWithRequests({ cause })),
  )

  return new Set(rows)
})

export const storeEmbeddings: (
  rows: ReadonlyArray<{
    preprintId: IndeterminatePreprintId
    language: LanguageCode
    authors: ReadonlyArray<OrcidId>
    latestRequest: Temporal.Instant
    embedding: Embedding
  }>,
  sql: SqlClient.SqlClient,
) => Effect.Effect<void, UnableToAddWorksWithRequests> = Effect.fn('Embeddings.storeEmbeddings')(
  function* (rows, sql) {
    if (rows.length === 0) return

    const values = rows.map(row => {
      const encoded = Schema.encodeSync(PgVector)(row.embedding)
      return sql`
        (
          ${encodePreprintId(row.preprintId)},
          ${row.language},
          ${row.authors},
          ${row.latestRequest.toString()},
          ${encoded}::halfvec
        )
      `
    })

    yield* sql`
      INSERT INTO
        request_embeddings (
          preprint_id,
          language,
          authors,
          latest_request,
          embedding
        )
      VALUES
        ${sql.join(',', false)(values)}
      ON CONFLICT (preprint_id) DO NOTHING
    `
  },
  Effect.mapError(cause => new UnableToAddWorksWithRequests({ cause })),
)

export const ensureRequestEmbeddingsTable = (sql: SqlClient.SqlClient): Effect.Effect<void, SqlError.SqlError> =>
  Effect.all([
    sql`
      CREATE TABLE IF NOT EXISTS request_embeddings (
        preprint_id VARCHAR PRIMARY KEY,
        language CHAR(2) NOT NULL,
        authors CHAR(19) [] NOT NULL,
        latest_request TIMESTAMPTZ NOT NULL,
        embedding HALFVEC (1024)
      )
    `,
    sql`DROP INDEX IF EXISTS request_embeddings_idx`,
  ])

export const getMatches =
  (
    limit: number,
    sql: SqlClient.SqlClient,
    languages: ReadonlyArray<LanguageCode>,
    inputOrcidId: OrcidId,
    inputDois: Array.NonEmptyReadonlyArray<Doi>,
  ) =>
  (
    mean: Embedding,
  ): Effect.Effect<
    ReadonlyArray<{ preprintId: IndeterminatePreprintId; distance: number; latestRequest: Temporal.Instant }>,
    UnableToQuery
  > =>
    Effect.gen(function* () {
      const encoded = Schema.encodeSync(PgVector)(mean)

      return yield* sql`
        SELECT
          preprint_id,
          latest_request,
          embedding <=> ${encoded}::halfvec AS distance
        FROM
          request_embeddings
        WHERE
          ${sql.in('language', languages)}
          AND NOT (
            ${inputOrcidId} = ANY (authors)
          )
          AND NOT ${sql.in(
            'preprint_id',
            inputDois.map(doi => `doi:${doi.toLowerCase()}`),
          )}
        ORDER BY
          embedding <=> ${encoded}::halfvec
        LIMIT
          ${limit}
      `
    }).pipe(
      Effect.andThen(Schema.decodeUnknownEffect(RequestEmbeddingsSelect)),
      Effect.andThen(
        Effect.forEach(row =>
          Effect.map(decodePreprintId(row.preprint_id), preprintId => ({
            preprintId,
            distance: row.distance,
            latestRequest: Temporal.Instant.from(row.latest_request.toISOString()),
          })),
        ),
      ),
      Effect.mapError(cause => new UnableToQuery({ cause })),
    )

const RequestEmbeddingsSelect = Schema.Array(
  Schema.Struct({
    preprint_id: Schema.String,
    latest_request: Schema.Date,
    distance: Schema.Number,
  }),
)

// oxlint-disable-next-line no-unused-vars
export const updateLatestRequestDate = (sql: SqlClient.SqlClient) => (inputPapers: ReadonlyArray<WorkWithRequest>) =>
  Effect.void

export const createMissingEmbeddings = (
  apiKey: Redacted.Redacted,
  httpClient: HttpClient.HttpClient,
  sql: SqlClient.SqlClient,
  tokenizer: Tokenizer,
  languageDetection: typeof LanguageDetection.Service,
) =>
  Effect.fn('Embeddings.createMissingEmbeddings')(function* (inputPapers: ReadonlyArray<WorkWithRequest>) {
    const existing = yield* findExistingWorks(
      inputPapers.map(paper => paper.preprintId),
      sql,
    )

    const existingKeys = new Set(Array.map([...existing], encodePreprintId))

    const papersWithoutEmbeddings = inputPapers.filter(paper => !existingKeys.has(encodePreprintId(paper.preprintId)))

    const generated: ReadonlyArray<WorkWithRequest & { embedding: Embedding }> =
      papersWithoutEmbeddings.length > 0
        ? yield* generateEmbeddings(papersWithoutEmbeddings, apiKey, httpClient, tokenizer).pipe(
            Effect.catchTag('UnableToGetMatches', ({ cause }) => new UnableToAddWorksWithRequests({ cause })),
          )
        : []

    const generatedWithLanguage = yield* pipe(
      generated,
      Effect.forEach(
        w => languageDetection.detectLanguage(w.title).pipe(Effect.map(language => ({ ...w, language }))),
        { concurrency: 4 },
      ),
      Effect.catchTag('UnableToDetectLanguage', ({ cause }) => new UnableToAddWorksWithRequests({ cause })),
    )

    yield* storeEmbeddings(generatedWithLanguage, sql)
  })
