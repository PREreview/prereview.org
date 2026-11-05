import type { OpenRouterClient } from '@effect/ai-openrouter'
import type { SqlClient, SqlError } from 'effect/sql'
import { Effect, Array, Option, Schema, Struct } from 'effect'
import { generateEmbeddings } from './OpenRouter.ts'
import { PgVector, UnableToGetMatches, type Embedding } from './Shared.ts'
import type { Doi } from '../types/Doi.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Tokenizer } from '@huggingface/tokenizers'

export interface MatchmakingInputWork {
  doi: Doi
  title: string
  abstract: string
  authors: ReadonlyArray<OrcidId>
}

const EmbeddingRow = Schema.Struct({
  doi: Schema.String,
  embedding: PgVector,
})

const getStoredEmbedding: (
  doi: Doi,
  sql: SqlClient.SqlClient,
) => Effect.Effect<Option.Option<Embedding>, UnableToGetMatches> = Effect.fnUntraced(
  function* (doi, sql) {
    const rows = yield* sql`
      SELECT
        embedding::text AS embedding
      FROM
        matchmaking_input_works
      WHERE
        doi = ${doi}
    `.pipe(Effect.mapError(cause => new UnableToGetMatches({ cause })))

    if (rows.length === 0) return Option.none()

    const decoded = yield* Schema.decodeUnknownEffect(EmbeddingRow.mapFields(Struct.pick(['embedding'])))(rows[0])

    return Option.some(decoded.embedding)
  },
  Effect.mapError(cause => new UnableToGetMatches({ cause })),
)

const storeEmbedding: (
  doi: Doi,
  embedding: Embedding,
  sql: SqlClient.SqlClient,
) => Effect.Effect<void, UnableToGetMatches> = Effect.fnUntraced(
  function* (doi, embedding, sql) {
    const encoded = Schema.encodeSync(PgVector)(embedding)
    yield* sql`
      INSERT INTO
        matchmaking_input_works (doi, embedding)
      VALUES
        (
          ${doi},
          ${encoded}::halfvec
        )
    `
  },
  Effect.mapError(cause => new UnableToGetMatches({ cause })),
)

export const ensureMatchmakingInputWorksTable = (
  sql: SqlClient.SqlClient,
): Effect.Effect<void, SqlError.SqlError> => sql`
  CREATE TABLE IF NOT EXISTS matchmaking_input_works (doi VARCHAR PRIMARY KEY, embedding HALFVEC (1024))
`

export const getEmbeddingGeneratingAsNeeded = (
  openRouter: OpenRouterClient.Service,
  sql: SqlClient.SqlClient,
  tokenizer: Tokenizer,
) =>
  Effect.fn('Embeddings.getEmbeddingGeneratingAsNeeded')(function* (inputPaper: MatchmakingInputWork) {
    const existing = yield* getStoredEmbedding(inputPaper.doi, sql)

    if (Option.isSome(existing)) {
      return existing.value
    }

    const generated = yield* generateEmbeddings([inputPaper], openRouter, tokenizer).pipe(
      Effect.map(Array.head),
      Effect.map(Option.getOrThrow),
    )

    yield* storeEmbedding(generated.doi, generated.embedding, sql)

    return generated.embedding
  })
