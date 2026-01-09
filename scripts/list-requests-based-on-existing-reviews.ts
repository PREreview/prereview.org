/* eslint-disable import/no-internal-modules */
import { HttpClient, HttpClientResponse, Terminal } from '@effect/platform'
import { NodeHttpClient, NodeRuntime, NodeTerminal } from '@effect/platform-node'
import { Array, Config, Effect, Layer, Logger, LogLevel, Number, Order, pipe, Record, Schema, Tuple } from 'effect'
import * as CachingHttpClient from '../src/CachingHttpClient/index.ts'
import * as DatasetReviews from '../src/DatasetReviews/index.ts'
import * as Datasets from '../src/Datasets/index.ts'
import * as EventStore from '../src/EventStore.ts'
import { Crossref, Datacite, JapanLinkCenter, OpenAlex, Orcid, Philsci, Zenodo } from '../src/ExternalApis/index.ts'
import { OpenAlexWorks } from '../src/ExternalInteractions/index.ts'
import * as FetchHttpClient from '../src/FetchHttpClient.ts'
import { LegacyPrereviewApi } from '../src/legacy-prereview.ts'
import * as LoggingHttpClient from '../src/LoggingHttpClient.ts'
import * as Personas from '../src/Personas/index.ts'
import * as Preprints from '../src/Preprints/index.ts'
import * as Prereviews from '../src/Prereviews/index.ts'
import { PublicUrl } from '../src/public-url.ts'
import * as Redis from '../src/Redis.ts'
import { OrcidId, ProfileId } from '../src/types/index.ts'
import { getKeywordName, type KeywordId } from '../src/types/Keyword.ts'

const orcidId = OrcidId.OrcidId('0000-0001-6478-3815')

const setUpFetch = Layer.effect(FetchHttpClient.Fetch, FetchHttpClient.makeFetch)

const program = Effect.gen(function* () {
  const prereviews = yield* Prereviews.getForProfile(ProfileId.forOrcid(orcidId))

  const preprintIds = pipe(
    prereviews,
    Array.filter(prereview => prereview._tag === 'RecentPreprintPrereview'),
    Array.map(prereview => prereview.preprint.id),
    Array.dedupe,
  )

  const statsRequestsSchema = Schema.Array(
    Schema.Struct({
      preprint: Preprints.IndeterminatePreprintIdFromDoiSchema,
    }),
  )

  const preprintIdsWithRequest = yield* pipe(
    HttpClient.get('https://stats.prereview.org/_file/data/requests.5cefb706.json'),
    Effect.andThen(HttpClientResponse.schemaBodyJson(statsRequestsSchema)),
    Effect.andThen(Array.map(({ preprint }) => preprint)),
  )

  const preprintIdsWithRequestKeywords = (yield* pipe(
    preprintIdsWithRequest,
    Effect.forEach(
      Effect.fn(function* (preprintId) {
        const work = yield* pipe(
          OpenAlexWorks.getCategoriesForAReviewRequest(preprintId),
          Effect.catchIf(
            error => error.cause?._tag === 'WorkIsNotFound',
            () => Effect.succeed({ keywords: [] }),
          ),
        )
        return [preprintId, work.keywords] as const
      }),
      { concurrency: 10 },
    ),
  )) as unknown as ReadonlyArray<[Preprints.PreprintId, ReadonlyArray<{ id: string; confidence: number }>]>

  const preprintKeywords = (yield* pipe(
    preprintIds,
    Effect.forEach(
      Effect.fn(function* (preprintId) {
        const work = yield* OpenAlexWorks.getCategoriesForAReviewRequest(preprintId)
        return [preprintId, work.keywords] as const
      }),
    ),
  )) as unknown as ReadonlyArray<[Preprints.PreprintId, ReadonlyArray<{ id: string; confidence: number }>]>

  const findRequestedPreprintIdsForAKeyword = (keywordId: string) =>
    pipe(
      preprintIdsWithRequestKeywords,
      Array.filter(([, keywords]) =>
        Array.some(keywords, ({ id, confidence }) => id === keywordId && confidence > 0.5),
      ),
      Array.map(Tuple.getFirst),
    )

  const countedKeywords = pipe(
    preprintKeywords,
    Array.flatMap(Tuple.getSecond),
    Array.groupBy(keyword => keyword.id),
    Record.map(Array.map(keyword => keyword.confidence * 10)),
    Record.map(Array.sort(Order.reverse(Order.number))),
    Record.toEntries,
    Array.sortWith(([, confidences]) => confidences.length, Order.reverse(Order.number)),
    Array.map(([keywordId, confidences]) =>
      Tuple.make(keywordId, confidences, findRequestedPreprintIdsForAKeyword(keywordId)),
    ),
    Array.filter(([, , matchingRequests]) => matchingRequests.length > 0),
  )

  const terminal = yield* Terminal.Terminal

  yield* Effect.forEach(preprintKeywords, item =>
    terminal.display(`${item[0].value}: ${item[1].map(({ id }) => getKeywordName(id as KeywordId)).join(', ')}\n`),
  )
  yield* terminal.display('\n')
  yield* Effect.forEach(countedKeywords, item =>
    terminal.display(
      `${getKeywordName(item[0] as KeywordId)}: ${item[1].length} (${item[1].map(Number.round(0)).join(', ')}) => ${item[2].length}\n`,
    ),
  )
})

pipe(
  program,
  Effect.provide(
    pipe(
      Layer.mergeAll(NodeTerminal.layer, Prereviews.layer),
      Layer.provideMerge(
        Layer.mergeAll(
          DatasetReviews.queriesLayer,
          Datasets.layer,
          Preprints.layer,
          Personas.layer,
          OpenAlexWorks.layer,
        ),
      ),
      Layer.provide(
        Layer.mergeAll(
          Layer.effect(
            Zenodo.ZenodoApi,
            Config.all({
              key: Config.redacted('ZENODO_API_KEY'),
              origin: Config.succeed(new URL('https://zenodo.org/')),
            }),
          ),
          Layer.succeed(EventStore.EventStore, {
            all: new EventStore.FailedToGetEvents({}),
            query: () => new EventStore.FailedToGetEvents({}),
            append: () => new EventStore.FailedToCommitEvent({}),
          }),
          Orcid.layer,
          OpenAlex.layer,
          Crossref.layer,
          Datacite.layer,
          JapanLinkCenter.layer,
          Philsci.layer,
          Layer.effect(
            LegacyPrereviewApi,
            Config.all({
              app: Config.string('LEGACY_PREREVIEW_API_APP'),
              key: Config.redacted('LEGACY_PREREVIEW_API_KEY'),
              origin: Config.url('LEGACY_PREREVIEW_URL'),
              update: Config.withDefault(Config.boolean('LEGACY_PREREVIEW_UPDATE'), false),
            }),
          ),
          Layer.effect(
            Prereviews.WasPrereviewRemoved,
            pipe(
              Config.withDefault(Config.array(Config.integer(), 'REMOVED_PREREVIEWS'), []),
              Config.map(removedPrereviews =>
                Prereviews.WasPrereviewRemoved.of(id => Array.contains(removedPrereviews, id)),
              ),
            ),
          ),
        ),
      ),
      Layer.provide(
        Layer.effect(
          Orcid.OrcidApi,
          Config.all({
            origin: Config.withDefault(Config.url('ORCID_API_URL'), new URL('https://pub.orcid.org/')),
            token: Config.option(Config.redacted('ORCID_API_READ_PUBLIC_TOKEN')),
          }),
        ),
      ),
      Layer.provide(setUpFetch),
      Layer.provideMerge(CachingHttpClient.layer('1 day', '20 seconds')),
      Layer.provide(CachingHttpClient.layerRevalidationQueue),
      Layer.provide(CachingHttpClient.layerPersistedToRedis),
      Layer.provide(
        Redis.layerHttpCacheConfig(
          Config.all({
            primaryUri: Config.redacted(Redis.httpCacheRedisUri),
            readonlyFallbackUri: Config.redacted(
              pipe(
                Config.url('HTTP_CACHE_READONLY_FALLBACK_REDIS_URI'),
                Config.orElse(() => Redis.httpCacheRedisUri),
              ),
            ),
          }),
        ),
      ),
      Layer.provide(LoggingHttpClient.layer),
      Layer.provide(NodeHttpClient.layer),
      Layer.provide(Layer.succeed(PublicUrl, new URL('https://prereview.org/'))),
    ),
  ),
  Effect.scoped,
  Logger.withMinimumLogLevel(LogLevel.Warning),
  NodeRuntime.runMain(),
)
