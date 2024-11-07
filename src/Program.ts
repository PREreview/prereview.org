import { FetchHttpClient } from '@effect/platform'
import { type Array, Effect, flow, Layer, Match, Option, pipe, PubSub, Runtime } from 'effect'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { DeprecatedLoggerEnv, DeprecatedSleepEnv, EventStore, ExpressConfig } from './Context.js'
import { makeDeprecatedSleepEnv } from './DeprecatedServices.js'
import * as Feedback from './Feedback/index.js'
import { collapseRequests, logFetch } from './fetch.js'
import { getPreprint as getPreprintUtil } from './get-preprint.js'
import { html } from './html.js'
import { getPseudonymFromLegacyPrereview } from './legacy-prereview.js'
import * as LibsqlEventStore from './LibsqlEventStore.js'
import { DefaultLocale, translate } from './locales/index.js'
import { getNameFromOrcid } from './orcid.js'
import * as Preprint from './preprint.js'
import * as Prereview from './Prereview.js'
import { Uuid } from './types/index.js'
import type { IndeterminatePreprintId } from './types/preprint-id.js'
import { WebApp } from './WebApp.js'
import { createFeedbackOnZenodo, getPrereviewFromZenodo, publishDepositionOnZenodo } from './zenodo.js'

const getPrereview = Layer.effect(
  Prereview.GetPrereview,
  Effect.gen(function* () {
    const { wasPrereviewRemoved, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPreprintService = yield* Preprint.GetPreprint
    const runtime = yield* Effect.runtime()
    const sleep = yield* DeprecatedSleepEnv

    const getPreprint = (id: IndeterminatePreprintId) => () =>
      Runtime.runPromise(runtime)(
        pipe(
          getPreprintService(id),
          Effect.catchTags({
            PreprintIsNotFound: () => Effect.fail('not-found' as const),
            PreprintIsUnavailable: () => Effect.fail('unavailable' as const),
          }),
          Effect.either,
        ),
      )

    return id =>
      pipe(
        Effect.promise(
          getPrereviewFromZenodo(id)({
            fetch,
            getPreprint,
            ...sleep,
            wasPrereviewRemoved,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
        ),
        Effect.andThen(
          flow(
            Match.value,
            Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
            Match.when({ _tag: 'Right' }, response =>
              Effect.succeed(
                new Prereview.Prereview({
                  ...response.right,
                  authors: {
                    ...response.right.authors,
                    named: fixArrayType(response.right.authors.named),
                  },
                  id,
                }),
              ),
            ),
            Match.exhaustive,
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new Prereview.PrereviewIsNotFound()),
            Match.when('removed', () => new Prereview.PrereviewWasRemoved()),
            Match.when('unavailable', () => new Prereview.PrereviewIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const assignFeedbackADoi = Layer.effect(
  Feedback.AssignFeedbackADoi,
  Effect.gen(function* () {
    const { legacyPrereviewApi, orcidApiUrl, orcidApiToken, zenodoApiKey, zenodoUrl, publicUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPrereview = yield* Prereview.GetPrereview
    const sleep = yield* DeprecatedSleepEnv

    return feedback =>
      Effect.gen(function* () {
        const prereview = yield* pipe(
          getPrereview(feedback.prereviewId),
          Effect.mapError(
            flow(
              Match.value,
              Match.tag('PrereviewIsNotFound', error => new Feedback.UnableToAssignADoi({ cause: error })),
              Match.tag('PrereviewIsUnavailable', error => new Feedback.UnableToAssignADoi({ cause: error })),
              Match.tag('PrereviewWasRemoved', error => new Feedback.UnableToAssignADoi({ cause: error })),
              Match.exhaustive,
            ),
          ),
        )

        const author = yield* pipe(
          Match.value(feedback.persona),
          Match.when('public', () =>
            pipe(
              Effect.promise(
                getNameFromOrcid(feedback.authorId)({ orcidApiUrl, orcidApiToken, fetch, ...sleep, ...logger }),
              ),
              Effect.andThen(
                flow(
                  Match.value,
                  Match.when({ _tag: 'Left' }, () => Effect.fail(new Feedback.UnableToAssignADoi({}))),
                  Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
                  Match.exhaustive,
                ),
              ),
              Effect.filterOrElse(
                value => value !== undefined,
                () => Effect.fail(new Feedback.UnableToAssignADoi({})),
              ),
              Effect.andThen(name => ({ name, orcid: feedback.authorId })),
            ),
          ),
          Match.when('pseudonym', () =>
            pipe(
              Effect.promise(getPseudonymFromLegacyPrereview(feedback.authorId)({ fetch, legacyPrereviewApi })),
              Effect.andThen(
                flow(
                  Match.value,
                  Match.when({ _tag: 'Left' }, () => Effect.fail(new Feedback.UnableToAssignADoi({}))),
                  Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
                  Match.exhaustive,
                ),
              ),
              Effect.andThen(pseudonym => ({ name: pseudonym })),
            ),
          ),
          Match.exhaustive,
        )

        const text = html`${feedback.feedback}

          <h2>${translate(DefaultLocale, 'write-feedback-flow', 'competingInterestsHeading')()}</h2>

          <p>
            ${Option.getOrElse(feedback.competingInterests, () =>
              translate(DefaultLocale, 'write-feedback-flow', 'noCompetingInterests')(),
            )}
          </p>`

        return yield* pipe(
          Effect.promise(
            createFeedbackOnZenodo({ ...feedback, feedback: text, author, prereview })({
              fetch,
              publicUrl,
              zenodoApiKey,
              zenodoUrl,
              ...logger,
            }),
          ),
          Effect.andThen(
            flow(
              Match.value,
              Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
              Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
              Match.exhaustive,
            ),
          ),
          Effect.mapError(
            flow(
              Match.value,
              Match.when('unavailable', () => new Feedback.UnableToAssignADoi({})),
              Match.exhaustive,
            ),
          ),
        )
      })
  }),
)

const publishFeedback = Layer.effect(
  Feedback.PublishFeedbackWithADoi,
  Effect.gen(function* () {
    const { zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv

    return feedback =>
      pipe(
        Effect.promise(
          publishDepositionOnZenodo(feedback)({
            fetch,
            zenodoApiKey,
            zenodoUrl,
            ...logger,
          }),
        ),
        Effect.andThen(
          flow(
            Match.value,
            Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
            Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
            Match.exhaustive,
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('unavailable', () => new Feedback.UnableToPublishFeedback({})),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const getPreprint = Layer.effect(
  Preprint.GetPreprint,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const sleep = yield* DeprecatedSleepEnv

    return id =>
      pipe(
        Effect.promise(getPreprintUtil(id)({ fetch, ...sleep })),
        Effect.andThen(
          flow(
            Match.value,
            Match.when({ _tag: 'Left' }, response => Effect.fail(response.left)),
            Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
            Match.exhaustive,
          ),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('not-found', () => new Preprint.PreprintIsNotFound()),
            Match.when('unavailable', () => new Preprint.PreprintIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const setUpFetch = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv

    return pipe({ fetch, ...logger }, logFetch(), collapseRequests()).fetch
  }),
)

export const Program = pipe(
  Layer.mergeAll(WebApp, Feedback.ReactToFeedbackEvents),
  Layer.provide(publishFeedback),
  Layer.provide(assignFeedbackADoi),
  Layer.provide(getPrereview),
  Layer.provide(getPreprint),
  Layer.provide(Layer.effect(Feedback.HandleFeedbackCommand, Feedback.makeHandleFeedbackCommand)),
  Layer.provide(
    Layer.effect(
      Feedback.GetAllUnpublishedFeedbackByAnAuthorForAPrereview,
      Feedback.makeGetAllUnpublishedFeedbackByAnAuthorForAPrereview,
    ),
  ),
  Layer.provide(Layer.effect(Feedback.GetFeedback, Feedback.makeGetFeedback)),
  Layer.provide(
    Layer.scoped(
      Feedback.FeedbackEvents,
      Effect.acquireRelease(
        pipe(
          PubSub.unbounded() satisfies Effect.Effect<typeof Feedback.FeedbackEvents.Service>,
          Effect.tap(Effect.logDebug('Feedback events started')),
        ),
        flow(PubSub.shutdown, Effect.tap(Effect.logDebug('Feedback events stopped'))),
      ),
    ),
  ),
  Layer.provide(Layer.effect(EventStore, LibsqlEventStore.make)),
  Layer.provide(setUpFetch),
  Layer.provide(Layer.effect(Uuid.GenerateUuid, Uuid.make)),
  Layer.provide(Layer.effect(DeprecatedSleepEnv, makeDeprecatedSleepEnv)),
)

function fixArrayType<A>(array: ReadonlyNonEmptyArray<A>): Array.NonEmptyReadonlyArray<A> {
  return array as Array.NonEmptyReadonlyArray<A>
}
