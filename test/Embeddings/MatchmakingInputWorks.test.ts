import type { OpenRouterClient } from '@effect/ai-openrouter'
import { Tokenizer } from '@huggingface/tokenizers'
import { Effect, pipe, Schema } from 'effect'
import { SqlClient } from 'effect/sql'
import {
  ensureMatchmakingInputWorksTable,
  getEmbeddingGeneratingAsNeeded,
  type MatchmakingInputWork,
} from '../../src/Embeddings/MatchmakingInputWorks.ts'
import tokenizerConfig from '../../src/Embeddings/model/tokenizer_config.json' with { type: 'json' }
import tokenizerJson from '../../src/Embeddings/model/tokenizer.json' with { type: 'json' }
import { type Embedding, PgVector } from '../../src/Embeddings/Shared.ts'
import { Doi } from '../../src/types/Doi.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'
import * as TestPgClient from '../TestPgClient.ts'
import { describe, expect, it } from '../vitest.ts'

const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig)

const embedding = (...values: ReadonlyArray<number>): Embedding =>
  Float32Array.from({ length: 1024 }, (_, index) => values[index] ?? 0)

const work: MatchmakingInputWork = {
  doi: Doi('10.1101/input'),
  title: 'Title',
  abstract: 'Abstract',
  authors: [OrcidId('0000-0002-1825-0097')],
}

const openRouterReturning = (embedding: Embedding) =>
  ({
    client: {
      createEmbeddings: () => Effect.succeed({ data: [{ embedding: globalThis.Array.from(embedding), index: 0 }] }),
    },
  }) as unknown as OpenRouterClient.Service

const unavailableOpenRouter = { client: { createEmbeddings: shouldNotBeCalled } } as unknown as OpenRouterClient.Service

const setUp = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient

  yield* sql`CREATE EXTENSION IF NOT EXISTS vector`
  yield* ensureMatchmakingInputWorksTable(sql)

  return sql
})

describe('getEmbeddingGeneratingAsNeeded', () => {
  it.effect('uses a stored embedding', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      yield* sql`
        INSERT INTO
          matchmaking_input_works (doi, embedding)
        VALUES
          (
            ${work.doi},
            ${Schema.encodeSync(PgVector)(embedding(0.5, -0.25))}::halfvec
          )
      `

      const actual = yield* getEmbeddingGeneratingAsNeeded(unavailableOpenRouter, sql, tokenizer)(work)

      expect(actual).toStrictEqual(embedding(0.5, -0.25))
    }).pipe(Effect.provide(TestPgClient.layer)),
  )

  it.effect('generates and stores a missing embedding', () =>
    Effect.gen(function* () {
      const sql = yield* setUp

      const actual = yield* getEmbeddingGeneratingAsNeeded(
        openRouterReturning(embedding(1, 2, 3)),
        sql,
        tokenizer,
      )(work)

      const stored = yield* pipe(
        sql`
          SELECT
            doi,
            embedding::text AS embedding
          FROM
            matchmaking_input_works
        `,
        Effect.andThen(
          Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ doi: Schema.String, embedding: PgVector }))),
        ),
      )

      expect(actual).toStrictEqual(embedding(1, 2, 3))
      expect(stored).toStrictEqual([{ doi: work.doi, embedding: embedding(1, 2, 3) }])
    }).pipe(Effect.provide(TestPgClient.layer)),
  )
})
