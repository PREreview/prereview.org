import type { HttpClient } from '@effect/platform'
import type { SqlClient, SqlError } from '@effect/sql'
import { Effect, Option, pipe, type Redacted, Schema } from 'effect'
import { generateEmbeddings } from './OpenRouter.ts'
import { PgVector, type OurTokenizer, UnableToGetSurveyPapers, type Embedding, type Paper } from './Shared.ts'
import type { Doi } from '../types/Doi.ts'

const EmbeddingRow = Schema.Struct({
  doi: Schema.String,
  embedding: PgVector,
})

const getStoredEmbedding = (
  doi: Doi,
  sql: SqlClient.SqlClient,
): Effect.Effect<Option.Option<Embedding>, UnableToGetSurveyPapers> =>
  Effect.gen(function* () {
    const rows = yield* sql`
      SELECT
        embedding
      FROM
        research_area_works
      WHERE
        doi = ${doi}
    `.pipe(Effect.mapError(cause => new UnableToGetSurveyPapers({ cause })))

    if (rows.length === 0) return Option.none()

    const decoded = yield* Schema.decodeUnknown(EmbeddingRow.pick('embedding'))(rows[0])

    return Option.some(decoded.embedding)
  }).pipe(Effect.mapError(cause => new UnableToGetSurveyPapers({ cause })))

const storeEmbedding = (
  doi: Doi,
  embedding: Embedding,
  sql: SqlClient.SqlClient,
): Effect.Effect<void, UnableToGetSurveyPapers> =>
  Effect.gen(function* () {
    const encoded = Schema.encodeSync(PgVector)(embedding)
    yield* sql`
      INSERT INTO
        research_area_works (doi, embedding)
      VALUES
        (
          ${doi},
          ${encoded}::halfvec
        )
    `
  }).pipe(Effect.mapError(cause => new UnableToGetSurveyPapers({ cause })))

export const ensureResearchAreaWorksTable = (sql: SqlClient.SqlClient): Effect.Effect<void, SqlError.SqlError> => sql`
  CREATE TABLE IF NOT EXISTS research_area_works (doi VARCHAR PRIMARY KEY, embedding HALFVEC (1024))
`

export const getEmbeddingsGeneratingAsNeeded =
  (
    apiKey: Redacted.Redacted,
    httpClient: HttpClient.HttpClient,
    sql: SqlClient.SqlClient,
    tokenizer: typeof OurTokenizer.Service,
  ) =>
  (inputPapers: ReadonlyArray<Paper>) =>
    Effect.gen(function* () {
      const papersWithExistingEmbeddings = yield* pipe(
        inputPapers,
        Effect.forEach(paper =>
          getStoredEmbedding(paper.doi, sql).pipe(Effect.map(embedding => ({ paper, embedding }))),
        ),
      )

      const papersWithoutEmbeddings = papersWithExistingEmbeddings.flatMap(({ paper, embedding }) =>
        Option.isNone(embedding) ? [paper] : [],
      )

      const generated: ReadonlyArray<Paper & { embedding: Embedding }> =
        papersWithoutEmbeddings.length > 0
          ? yield* generateEmbeddings(papersWithoutEmbeddings, apiKey, httpClient, tokenizer)
          : []

      yield* Effect.forEach(generated, p => storeEmbedding(p.doi, p.embedding, sql))

      const generatedByDoi = new Map(generated.map(p => [p.doi, p.embedding]))
      const allEmbeddings = papersWithExistingEmbeddings.flatMap(({ paper, embedding }) => {
        if (Option.isSome(embedding)) return [embedding.value]
        const e = generatedByDoi.get(paper.doi)
        return e !== undefined ? [e] : []
      })

      return allEmbeddings
    })
