import { HttpClient } from 'effect/http'
import { Array, Config, Context, Effect, Layer, Option, pipe, Random, Struct } from 'effect'
import { UnableToGetMatches, type UnableToAddWorksWithRequests } from './Shared.ts'
import {
  ensureMatchmakingInputWorksTable,
  getEmbeddingsGeneratingAsNeeded,
  type MatchmakingInputWork,
} from './MatchmakingInputWorks.ts'
import {
  createMissingEmbeddings,
  ensureRequestEmbeddingsTable,
  findExistingWorks,
  getMatches,
  type WorkWithRequest,
} from './WorksWithRequests.ts'
import { PgClient } from '@effect/sql-pg'
import type { Temporal } from '@js-temporal/polyfill'
import { calcFloat32ArrayMean } from './Float32Array.ts'
import type { LanguageCode } from 'iso-639-1'
import type { OrcidId } from '../types/OrcidId.ts'
import type { IndeterminatePreprintId } from '../Preprints/index.ts'
import { LanguageDetection } from '../ExternalInteractions/LanguageDetection/index.ts'
import { Tokenizer } from '@huggingface/tokenizers'
import tokenizerConfig from './model/tokenizer_config.json' with { type: 'json' }
import tokenizerJson from './model/tokenizer.json' with { type: 'json' }

export type { MatchmakingInputWork } from './MatchmakingInputWorks.ts'

interface Match {
  preprintId: IndeterminatePreprintId
  distance: number
  latestRequest: Temporal.Instant
  rank: number
  window: string
}

export class Embeddings extends Context.Service<
  Embeddings,
  {
    getMatches: (
      input: Array.NonEmptyReadonlyArray<MatchmakingInputWork>,
      inputOrcidId: OrcidId,
      languages: Array.NonEmptyReadonlyArray<LanguageCode>,
    ) => Effect.Effect<{ picks: Array.NonEmptyReadonlyArray<Match>; candidateCount: number }, UnableToGetMatches>
    addRequests: (input: ReadonlyArray<WorkWithRequest>) => Effect.Effect<void, UnableToAddWorksWithRequests>
    existingWorks: (
      input: ReadonlyArray<IndeterminatePreprintId>,
    ) => Effect.Effect<Set<IndeterminatePreprintId>, UnableToAddWorksWithRequests>
  }
>()('Embeddings') {}

const TOP_WINDOW: readonly [number, number] = [0, 7]

const DEPTH_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [7, 17],
  [17, 39],
  [39, 88],
  [88, 199],
  [199, 446],
  [446, 999],
  [999, 2235],
  [2235, 5000],
]

const windowLabel = ([start, end]: readonly [number, number]): string => `${start}-${end}`

const pickFromWindow = <T>(
  candidates: ReadonlyArray<T>,
  [start, end]: readonly [number, number],
): Effect.Effect<
  Option.Option<
    T & {
      rank: number
      window: string
    }
  >
> => {
  const slice = candidates.slice(start, end)
  if (!Array.isReadonlyArrayNonEmpty(slice)) return Effect.succeed(Option.none())

  return pipe(
    Random.nextIntBetween(0, slice.length),
    Effect.map(relativeIndex =>
      Option.some({
        // oxlint-disable-next-line typescript/no-non-null-assertion
        ...slice[relativeIndex]!,
        rank: start + relativeIndex,
        window: windowLabel([start, end]),
      }),
    ),
  )
}

export const pickSurveyPapers = Effect.fnUntraced(function* <T>(candidates: ReadonlyArray<T>) {
  const top = candidates.slice(...TOP_WINDOW).map((pick, rank) => ({
    ...pick,
    rank,
    window: windowLabel(TOP_WINDOW),
  }))

  const depthPicks = yield* pipe(
    DEPTH_WINDOWS,
    Effect.forEach(window => pickFromWindow(candidates, window)),
    Effect.map(Array.getSomes),
  )

  yield* Effect.logInfo('Selected survey papers').pipe(
    Effect.annotateLogs({
      candidates: candidates.length,
      top: top.length,
      depth: depthPicks.length,
    }),
  )

  return { picks: [...top, ...depthPicks], candidateCount: candidates.length }
})

export const embeddingsLayer = Layer.effect(
  Embeddings,
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient
    const httpClient = yield* HttpClient.HttpClient
    const apiKey = yield* Config.Redacted('OPENROUTER_API_KEY')
    const languageDetection = yield* LanguageDetection

    yield* sql`CREATE EXTENSION IF NOT EXISTS vector`

    const tokenizer = new Tokenizer(tokenizerJson, tokenizerConfig)

    yield* Effect.all([ensureRequestEmbeddingsTable(sql), ensureMatchmakingInputWorksTable(sql)], {
      concurrency: 'unbounded',
    })

    return {
      getMatches: Effect.fnUntraced(
        function* (inputPapers, inputOrcidId, languages) {
          const { picks, candidateCount } = yield* pipe(
            inputPapers,
            getEmbeddingsGeneratingAsNeeded(apiKey, httpClient, sql, tokenizer),
            Effect.map(calcFloat32ArrayMean),
            Effect.andThen(getMatches(5000, sql, languages, inputOrcidId, Array.map(inputPapers, Struct.get('doi')))),
            Effect.catchTag('UnableToQuery', ({ cause }) => new UnableToGetMatches({ cause })),
            Effect.andThen(pickSurveyPapers),
          )

          if (!Array.isReadonlyArrayNonEmpty(picks)) {
            return yield* new UnableToGetMatches({
              cause: 'no candidates found',
            })
          }

          return { picks, candidateCount }
        },
        Effect.tapError(error =>
          Effect.logError('Unable to get matches').pipe(Effect.annotateLogs({ error: error.cause })),
        ),
      ),
      addRequests: createMissingEmbeddings(apiKey, httpClient, sql, tokenizer, languageDetection),
      existingWorks: preprintIds => findExistingWorks(preprintIds, sql),
    }
  }),
)
