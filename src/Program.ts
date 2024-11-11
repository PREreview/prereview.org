import { FetchHttpClient } from '@effect/platform'
import { type Array, Effect, flow, Layer, Match, Option, pipe, PubSub, Runtime } from 'effect'
import type { ReadonlyNonEmptyArray } from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import * as Comments from './Comments/index.js'
import { DeprecatedLoggerEnv, DeprecatedSleepEnv, EventStore, ExpressConfig } from './Context.js'
import { makeDeprecatedSleepEnv } from './DeprecatedServices.js'
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
import { createCommentOnZenodo, getPrereviewFromZenodo, publishDepositionOnZenodo } from './zenodo.js'

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

const assignCommentADoi = Layer.effect(
  Comments.AssignCommentADoi,
  Effect.gen(function* () {
    const { legacyPrereviewApi, orcidApiUrl, orcidApiToken, zenodoApiKey, zenodoUrl, publicUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPrereview = yield* Prereview.GetPrereview
    const sleep = yield* DeprecatedSleepEnv

    return comment =>
      Effect.gen(function* () {
        const prereview = yield* pipe(
          getPrereview(comment.prereviewId),
          Effect.mapError(
            flow(
              Match.value,
              Match.tag('PrereviewIsNotFound', error => new Comments.UnableToAssignADoi({ cause: error })),
              Match.tag('PrereviewIsUnavailable', error => new Comments.UnableToAssignADoi({ cause: error })),
              Match.tag('PrereviewWasRemoved', error => new Comments.UnableToAssignADoi({ cause: error })),
              Match.exhaustive,
            ),
          ),
        )

        const author = yield* pipe(
          Match.value(comment.persona),
          Match.when('public', () =>
            pipe(
              Effect.promise(
                getNameFromOrcid(comment.authorId)({ orcidApiUrl, orcidApiToken, fetch, ...sleep, ...logger }),
              ),
              Effect.andThen(
                flow(
                  Match.value,
                  Match.when({ _tag: 'Left' }, () => Effect.fail(new Comments.UnableToAssignADoi({}))),
                  Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
                  Match.exhaustive,
                ),
              ),
              Effect.filterOrElse(
                value => value !== undefined,
                () => Effect.fail(new Comments.UnableToAssignADoi({})),
              ),
              Effect.andThen(name => ({ name, orcid: comment.authorId })),
            ),
          ),
          Match.when('pseudonym', () =>
            pipe(
              Effect.promise(getPseudonymFromLegacyPrereview(comment.authorId)({ fetch, legacyPrereviewApi })),
              Effect.andThen(
                flow(
                  Match.value,
                  Match.when({ _tag: 'Left' }, () => Effect.fail(new Comments.UnableToAssignADoi({}))),
                  Match.when({ _tag: 'Right' }, response => Effect.succeed(response.right)),
                  Match.exhaustive,
                ),
              ),
              Effect.andThen(pseudonym => ({ name: pseudonym })),
            ),
          ),
          Match.exhaustive,
        )

        const text = html`${comment.comment}

          <h2>${translate(DefaultLocale, 'write-comment-flow', 'competingInterestsHeading')()}</h2>

          <p>
            ${Option.getOrElse(comment.competingInterests, () =>
              translate(DefaultLocale, 'write-comment-flow', 'noCompetingInterests')(),
            )}
          </p>`

        return yield* pipe(
          Effect.promise(
            createCommentOnZenodo({ ...comment, comment: text, author, prereview })({
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
              Match.when('unavailable', () => new Comments.UnableToAssignADoi({})),
              Match.exhaustive,
            ),
          ),
        )
      })
  }),
)

const publishFeedback = Layer.effect(
  Comments.PublishFeedbackWithADoi,
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
            Match.when('unavailable', () => new Comments.UnableToPublishFeedback({})),
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
  Layer.mergeAll(WebApp, Comments.ReactToCommentEvents),
  Layer.provide(publishFeedback),
  Layer.provide(assignCommentADoi),
  Layer.provide(getPrereview),
  Layer.provide(getPreprint),
  Layer.provide(Layer.effect(Comments.HandleCommentCommand, Comments.makeHandleCommentCommand)),
  Layer.provide(
    Layer.effect(
      Comments.GetAllUnpublishedCommentsByAnAuthorForAPrereview,
      Comments.makeGetAllUnpublishedCommentsByAnAuthorForAPrereview,
    ),
  ),
  Layer.provide(Layer.effect(Comments.GetComment, Comments.makeGetComment)),
  Layer.provide(
    Layer.scoped(
      Comments.CommentEvents,
      Effect.acquireRelease(
        pipe(
          PubSub.unbounded() satisfies Effect.Effect<typeof Comments.CommentEvents.Service>,
          Effect.tap(Effect.logDebug('Comment events started')),
        ),
        flow(PubSub.shutdown, Effect.tap(Effect.logDebug('Comment events stopped'))),
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
