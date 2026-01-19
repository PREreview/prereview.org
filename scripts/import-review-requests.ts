/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-internal-modules */
import { HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeHttpClient, NodeRuntime } from '@effect/platform-node'
import { PgClient } from '@effect/sql-pg'
import { Array, Config, Effect, flow, Layer, Logger, LogLevel, Option, pipe, Schema } from 'effect'
import { v5 as uuid5 } from 'uuid'
import * as Events from '../src/Events.ts'
import { CoarNotify, Crossref, Datacite, JapanLinkCenter, OpenAlex, Philsci } from '../src/ExternalApis/index.ts'
import { OpenAlexWorks } from '../src/ExternalInteractions/index.ts'
import * as Preprints from '../src/Preprints/index.ts'
import * as Redis from '../src/Redis.ts'
import * as ReviewRequests from '../src/ReviewRequests/index.ts'
import { CategorizeReviewRequest } from '../src/ReviewRequests/Reactions/CategorizeReviewRequest.ts'
import * as SqlEventStore from '../src/SqlEventStore.ts'
import * as SqlSensitiveDataStore from '../src/SqlSensitiveDataStore.ts'
import { EmailAddress, OrcidId, SciProfilesId, Temporal, Uuid } from '../src/types/index.ts'

const ReviewRequestSchema = Schema.Struct({
  timestamp: Temporal.InstantFromMillisecondsSchema,
  notification: CoarNotify.RequestReviewSchema,
})

const getReviewRequests = pipe(
  Redis.DataStoreRedis,
  Effect.andThen(redis => Effect.tryPromise(() => redis.lrange('notifications', 0, -1))),
  Effect.andThen(Schema.decode(Schema.Array(Schema.parseJson(ReviewRequestSchema)))),
  Effect.andThen(
    Array.filter(({ notification }) => notification.origin.id !== new URL('https://coar-notify.prereview.org/')),
  ),
)
const ActorToRequester = (actor: CoarNotify.RequestReview['actor']) => {
  if (actor.type !== 'Person') {
    return { name: actor.name }
  }

  const emailAddress = Schema.decodeUnknownOption(EmailAddress.EmailAddressFromUrlSchema)(actor.id.href)

  const orcidId = Schema.decodeUnknownOption(OrcidId.OrcidIdFromUrlSchema)(actor.id.href)

  const sciProfilesId = Schema.decodeUnknownOption(SciProfilesId.SciProfilesIdFromUrlSchema)(actor.id.href)

  return {
    name: actor.name,
    emailAddress: Option.getOrUndefined(emailAddress),
    orcidId: Option.getOrUndefined(orcidId),
    sciProfilesId: Option.getOrUndefined(sciProfilesId),
  }
}

const TimestampToUuid = (timestamp: Temporal.Instant): Uuid.Uuid =>
  Uuid.Uuid(uuid5(timestamp.epochMilliseconds.toString(), 'a4de3e41-9fe9-46f1-94d1-cd8884f01a77'))

const PostgresClientLayer = Layer.mergeAll(
  PgClient.layerConfig({
    url: Config.redacted(Config.string('POSTGRES_URL')),
  }),
  Layer.effectDiscard(Effect.logDebug('Postgres Database connected')),
  Layer.scopedDiscard(Effect.addFinalizer(() => Effect.logDebug('Postgres Database disconnected'))),
)

const categorizeReviewRequest = flow(CategorizeReviewRequest, Effect.ignoreLogged)

const program = pipe(
  getReviewRequests,
  Effect.andThen(
    Effect.forEach(
      Effect.fn(function* ({ timestamp, notification }) {
        yield* ReviewRequests.importReviewRequest({
          publishedAt: timestamp,
          preprintId: yield* Preprints.parsePreprintDoi(notification.object['ietf:cite-as']),
          reviewRequestId: TimestampToUuid(timestamp),
          requester: ActorToRequester(notification.actor),
        })
      }),
    ),
  ),
  Effect.andThen(Effect.logDebug('Import done!')),
  Effect.andThen(ReviewRequests.findReviewRequestsNeedingCategorization),
  Effect.andThen(Array.take(100)),
  Effect.andThen(Effect.forEach(categorizeReviewRequest, { concurrency: 5 })),
  Effect.andThen(Effect.logDebug('Categorisation done!')),
)

const httpClient = pipe(
  HttpClient.HttpClient,
  Effect.andThen(
    HttpClient.mapRequest(
      HttpClientRequest.setHeaders({
        'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
      }),
    ),
  ),
  Layer.effect(HttpClient.HttpClient),
  Layer.provide(NodeHttpClient.layer),
)

pipe(
  program,
  Effect.provide(
    pipe(
      Layer.mergeAll(
        ReviewRequests.commandsLayer,
        ReviewRequests.queriesLayer,
        Redis.layerDataStoreConfig(Config.redacted(Config.url('REVIEW_REQUEST_REDIS_URI'))),
        OpenAlexWorks.layer,
        Preprints.layer,
      ),
      Layer.provideMerge(
        Layer.mergeAll(
          SqlEventStore.layer,
          OpenAlex.layer,
          Crossref.layer,
          Datacite.layer,
          JapanLinkCenter.layer,
          Philsci.layer,
        ),
      ),
      Layer.provideMerge(
        Layer.mergeAll(
          Events.layer,
          SqlSensitiveDataStore.layer,
          httpClient,
          OpenAlex.layerApiConfig({ key: Config.redacted('OPENALEX_API_KEY') }),
        ),
      ),
      Layer.provide(Layer.mergeAll(PostgresClientLayer, Uuid.layer)),
    ),
  ),
  Effect.scoped,
  Logger.withMinimumLogLevel(LogLevel.Debug),
  NodeRuntime.runMain(),
)
