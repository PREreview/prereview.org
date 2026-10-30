// oxlint-disable no-comments/disallowComments
import { Array, Effect, pipe, type Redacted, Schema } from 'effect'
import { PgVector, UnableToAddWorksWithRequests, UnableToQuery, type Embedding } from './Shared.ts'
import type { SqlClient, SqlError } from '@effect/sql'
import type { HttpClient } from '@effect/platform'
import { generateEmbeddings } from './OpenRouter.ts'
import type { LanguageCode } from 'iso-639-1'
import type { Doi } from '../types/Doi.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { LanguageDetection } from '../ExternalInteractions/LanguageDetection/index.ts'
import type { Tokenizer } from '@huggingface/tokenizers'
import { IndeterminatePreprintIdFromStringSchema, type IndeterminatePreprintId } from '../Preprints/index.ts'

export interface WorkWithRequest {
  preprintId: IndeterminatePreprintId
  title: string
  abstract: string
  authors: ReadonlyArray<OrcidId>
}

// DOIs are case-insensitive, so the stored form is lowercased to make lookups and conflicts work regardless of case.
const encodePreprintId = (preprintId: IndeterminatePreprintId): string =>
  Schema.encodeSync(IndeterminatePreprintIdFromStringSchema)(preprintId).toLowerCase()

const decodePreprintId = Schema.decodeUnknown(IndeterminatePreprintIdFromStringSchema)

// `sql.in` binds one query parameter per ID, and the SQL compiler spreads them onto an array
// via `Function.apply`, which throws a RangeError once there are tens of thousands of them.
// Chunking keeps each query's parameter list well under that limit.
const FIND_EXISTING_DOIS_CHUNK_SIZE = 5000

export const findExistingWorks = (
  preprintIds: ReadonlyArray<IndeterminatePreprintId>,
  sql: SqlClient.SqlClient,
): Effect.Effect<Set<IndeterminatePreprintId>, UnableToAddWorksWithRequests> =>
  Effect.gen(function* () {
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

export const storeEmbeddings = (
  rows: ReadonlyArray<{
    preprintId: IndeterminatePreprintId
    language: LanguageCode
    authors: ReadonlyArray<OrcidId>
    embedding: Embedding
  }>,
  sql: SqlClient.SqlClient,
): Effect.Effect<void, UnableToAddWorksWithRequests> =>
  Effect.gen(function* () {
    if (rows.length === 0) return

    const values = rows.map(row => {
      const encoded = Schema.encodeSync(PgVector)(row.embedding)
      return sql`
        (
          ${encodePreprintId(row.preprintId)},
          ${row.language},
          ${row.authors},
          ${encoded}::halfvec
        )
      `
    })

    yield* sql`
      INSERT INTO
        request_embeddings (preprint_id, language, authors, embedding)
      VALUES
        ${sql.join(',', false)(values)}
      ON CONFLICT (preprint_id) DO NOTHING
    `
  }).pipe(Effect.mapError(cause => new UnableToAddWorksWithRequests({ cause })))

export const ensureRequestEmbeddingsTable = (sql: SqlClient.SqlClient): Effect.Effect<void, SqlError.SqlError> => sql`
  CREATE TABLE IF NOT EXISTS request_embeddings (
    preprint_id VARCHAR PRIMARY KEY,
    language CHAR(2) NOT NULL,
    authors CHAR(19) [] NOT NULL,
    embedding HALFVEC (1024)
  );

  CREATE INDEX IF NOT EXISTS request_embeddings_idx ON request_embeddings USING hnsw (embedding halfvec_cosine_ops)
`

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
  ): Effect.Effect<ReadonlyArray<{ preprintId: IndeterminatePreprintId; distance: number }>, UnableToQuery> =>
    sql
      .withTransaction(
        Effect.gen(function* () {
          const encoded = Schema.encodeSync(PgVector)(mean)

          return yield* sql<{ preprint_id: string; distance: number }>`
            SELECT
              preprint_id,
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
        }),
      )
      .pipe(
        Effect.andThen(
          Effect.forEach(row =>
            Effect.map(decodePreprintId(row.preprint_id), preprintId => ({ preprintId, distance: row.distance })),
          ),
        ),
        Effect.mapError(cause => new UnableToQuery({ cause })),
      )

export const createMissingEmbeddings =
  (
    apiKey: Redacted.Redacted,
    httpClient: HttpClient.HttpClient,
    sql: SqlClient.SqlClient,
    tokenizer: Tokenizer,
    languageDetection: typeof LanguageDetection.Service,
  ) =>
  (inputPapers: ReadonlyArray<WorkWithRequest>) =>
    Effect.gen(function* () {
      const existing = yield* findExistingWorks(
        inputPapers.map(paper => paper.preprintId),
        sql,
      )

      const existingKeys = new Set(Array.map([...existing], encodePreprintId))

      const papersWithoutEmbeddings = inputPapers.filter(paper => !existingKeys.has(encodePreprintId(paper.preprintId)))

      const generated: ReadonlyArray<WorkWithRequest & { embedding: Embedding }> =
        papersWithoutEmbeddings.length > 0
          ? yield* generateEmbeddings(papersWithoutEmbeddings, apiKey, httpClient, tokenizer).pipe(
              Effect.catchTag('UnableToGetSurveyPapers', ({ cause }) => new UnableToAddWorksWithRequests({ cause })),
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
