import { OpenRouterClient } from '@effect/ai-openrouter'
import { Array, Context, Effect, Layer, pipe, Struct } from 'effect'
import { UnableToGetMatches, type UnableToAddWorksWithRequests } from './Shared.ts'
import {
  ensureMatchmakingInputWorksTable,
  getEmbeddingGeneratingAsNeeded,
  type MatchmakingInputWork,
} from './MatchmakingInputWorks.ts'
import {
  createMissingEmbeddings,
  ensureRequestEmbeddingsTable,
  findExistingWorks,
  getMatches,
  updateLatestRequestDate,
  type WorkWithRequest,
} from './WorksWithRequests.ts'
import { PgClient } from '@effect/sql-pg'
import type { Temporal } from '@js-temporal/polyfill'
import { calcFloat32ArrayMean } from './Float32Array.ts'
import type { LanguageCode } from 'iso-639-1'
import type { OrcidId } from '../types/OrcidId.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import { Tokenizer } from '@huggingface/tokenizers'
import tokenizerConfig from './model/tokenizer_config.json' with { type: 'json' }
import tokenizerJson from './model/tokenizer.json' with { type: 'json' }

export type { MatchmakingInputWork } from './MatchmakingInputWorks.ts'

interface Match {
  preprintId: IndeterminatePreprintId
  distance: number
  latestRequest: Temporal.Instant
}

export class Embeddings extends Context.Service<
  Embeddings,
  {
    getMatches: (
      input: Array.NonEmptyReadonlyArray<MatchmakingInputWork>,
      inputOrcidId: OrcidId,
      languages: Array.NonEmptyReadonlyArray<LanguageCode>,
    ) => Effect.Effect<ReadonlyArray<Match>, UnableToGetMatches>
    addRequests: (input: ReadonlyArray<WorkWithRequest>) => Effect.Effect<void, UnableToAddWorksWithRequests>
    existingWorks: (
      input: ReadonlyArray<IndeterminatePreprintId>,
    ) => Effect.Effect<Set<IndeterminatePreprintId>, UnableToAddWorksWithRequests>
  }
>()('Embeddings') {}

export const embeddingsLayer = pipe(
  Layer.effect(
    Embeddings,
    Effect.gen(function* () {
      const sql = yield* PgClient.PgClient
      const openRouter = yield* OpenRouterClient.OpenRouterClient

      yield* sql`CREATE EXTENSION IF NOT EXISTS vector`

      const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig)

      yield* Effect.all([ensureRequestEmbeddingsTable(sql), ensureMatchmakingInputWorksTable(sql)], {
        concurrency: 'unbounded',
      })

      return {
        getMatches: Effect.fnUntraced(
          function* (inputPapers, inputOrcidId, languages) {
            return yield* pipe(
              inputPapers,
              Effect.forEach(getEmbeddingGeneratingAsNeeded(openRouter, sql, tokenizer), {
                concurrency: 'unbounded',
              }),
              Effect.map(calcFloat32ArrayMean),
              Effect.andThen(getMatches(5, sql, languages, inputOrcidId, Array.map(inputPapers, Struct.get('doi')))),
              Effect.catchTag('UnableToQuery', ({ cause }) => new UnableToGetMatches({ cause })),
            )
          },
          Effect.tapError(error =>
            Effect.logError('Unable to get matches').pipe(Effect.annotateLogs({ error: error.cause })),
          ),
        ),
        addRequests: (inputPapers: ReadonlyArray<WorkWithRequest>) =>
          pipe(
            createMissingEmbeddings(openRouter, sql, tokenizer)(inputPapers),
            Effect.andThen(updateLatestRequestDate(sql)(inputPapers)),
          ),
        existingWorks: preprintIds => findExistingWorks(preprintIds, sql),
      }
    }),
  ),
)
