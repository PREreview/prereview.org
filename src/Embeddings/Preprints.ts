// oxlint-disable no-comments/disallowComments
import { Array, Effect, pipe, type Redacted, Schema } from 'effect'
import { PgVector, UnableToAddPreprints, UnableToQuery, type Embedding, type Paper } from './Shared.ts'
import type { SqlClient, SqlError } from '@effect/sql'
import type { HttpClient } from '@effect/platform'
import { generateEmbeddings } from './OpenRouter.ts'
import type { LanguageCode } from 'iso-639-1'
import { Doi } from '../types/Doi.js'
import type { OrcidId } from '../types/OrcidId.ts'
import type { LanguageDetection } from '../ExternalInteractions/LanguageDetection/index.ts'
import type { Tokenizer } from '@huggingface/tokenizers'

// `sql.in` binds one query parameter per DOI, and the SQL compiler spreads them onto an array
// via `Function.apply`, which throws a RangeError once there are tens of thousands of them.
// Chunking keeps each query's parameter list well under that limit.
const FIND_EXISTING_DOIS_CHUNK_SIZE = 5000

export const findExistingDois = (
  dois: ReadonlyArray<Doi>,
  sql: SqlClient.SqlClient,
): Effect.Effect<Set<Doi>, UnableToAddPreprints> =>
  Effect.gen(function* () {
    if (dois.length === 0) return new Set<Doi>()

    const normalized = dois.map(doi => doi.toLowerCase())

    const rows = yield* pipe(
      Array.chunksOf(normalized, FIND_EXISTING_DOIS_CHUNK_SIZE),
      Effect.forEach(
        chunk => sql<{ doi: string }>`
          SELECT
            doi
          FROM
            preprints
          WHERE
            ${sql.in('doi', chunk)}
        `,
        { concurrency: 4 },
      ),
      Effect.map(Array.flatten),
      Effect.mapError(cause => new UnableToAddPreprints({ cause })),
    )

    return new Set(rows.map(row => Doi(row.doi.toLowerCase())))
  })

export const storeEmbeddings = (
  rows: ReadonlyArray<{
    doi: Doi
    language: LanguageCode
    authors: ReadonlyArray<OrcidId>
    embedding: Embedding
  }>,
  sql: SqlClient.SqlClient,
): Effect.Effect<void, UnableToAddPreprints> =>
  Effect.gen(function* () {
    if (rows.length === 0) return

    const values = rows.map(row => {
      const encoded = Schema.encodeSync(PgVector)(row.embedding)
      return sql`
        (
          ${row.doi.toLowerCase()},
          ${row.language},
          ${row.authors},
          ${encoded}::halfvec
        )
      `
    })

    yield* sql`
      INSERT INTO
        preprints (doi, language, authors, embedding)
      VALUES
        ${sql.join(',', false)(values)}
      ON CONFLICT (doi) DO NOTHING
    `
  }).pipe(Effect.mapError(cause => new UnableToAddPreprints({ cause })))

export const ensurePreprintsTable = (sql: SqlClient.SqlClient): Effect.Effect<void, SqlError.SqlError> => sql`
  CREATE TABLE IF NOT EXISTS preprints (
    doi VARCHAR PRIMARY KEY,
    language CHAR(2) NOT NULL,
    authors CHAR(19) [] NOT NULL,
    embedding HALFVEC (1024)
  );

  CREATE INDEX IF NOT EXISTS preprints_embedding_idx ON preprints USING hnsw (embedding halfvec_cosine_ops)
`

export const getRelatedDois =
  (
    limit: number,
    sql: SqlClient.SqlClient,
    languages: ReadonlyArray<LanguageCode>,
    inputOrcidId: OrcidId,
    inputDois: Array.NonEmptyReadonlyArray<Doi>,
  ) =>
  (mean: Embedding): Effect.Effect<ReadonlyArray<{ doi: Doi; distance: number }>, UnableToQuery> =>
    sql
      .withTransaction(
        Effect.gen(function* () {
          const encoded = Schema.encodeSync(PgVector)(mean)

          return yield* sql`
            SELECT
              doi,
              embedding <=> ${encoded}::halfvec AS distance
            FROM
              preprints
            WHERE
              ${sql.in('language', languages)}
              AND NOT (
                ${inputOrcidId} = ANY (authors)
              )
              AND NOT ${sql.in('doi', inputDois)}
            ORDER BY
              embedding <=> ${encoded}::halfvec
            LIMIT
              ${limit}
          `
        }),
      )
      .pipe(
        Effect.map(rows => rows.map(row => row as unknown as { doi: Doi; distance: number })),
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
  (inputPapers: ReadonlyArray<Paper>) =>
    Effect.gen(function* () {
      const existing = yield* findExistingDois(
        inputPapers.map(paper => paper.doi),
        sql,
      )

      const papersWithoutEmbeddings = inputPapers.filter(paper => !existing.has(paper.doi.toLowerCase() as never))

      const generated: ReadonlyArray<Paper & { embedding: Embedding }> =
        papersWithoutEmbeddings.length > 0
          ? yield* generateEmbeddings(papersWithoutEmbeddings, apiKey, httpClient, tokenizer).pipe(
              Effect.catchTag('UnableToGetSurveyPapers', ({ cause }) => new UnableToAddPreprints({ cause })),
            )
          : []

      const generatedWithLanguage = yield* pipe(
        generated,
        Effect.forEach(
          w => languageDetection.detectLanguage(w.title).pipe(Effect.map(language => ({ ...w, language }))),
          { concurrency: 4 },
        ),
        Effect.catchTag('UnableToDetectLanguage', ({ cause }) => new UnableToAddPreprints({ cause })),
      )

      yield* storeEmbeddings(generatedWithLanguage, sql)
    })
