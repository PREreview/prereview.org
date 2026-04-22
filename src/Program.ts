import type { HttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Context, Duration, Effect, flow, Layer, Match, Option, pipe, Redacted, Scope } from 'effect'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Comments from './Comments/index.ts'
import * as ContactEmailAddress from './contact-email-address.ts'
import { SessionStore } from './Context.ts'
import * as CookieSignature from './CookieSignature.ts'
import * as DatasetReviews from './DatasetReviews/index.ts'
import { MakeDeprecatedLoggerEnv } from './DeprecatedServices.ts'
import * as EventDispatcher from './EventDispatcher.ts'
import * as Events from './Events.ts'
import {
  CoarNotify,
  Crossref,
  Datacite,
  Ghost,
  JapanLinkCenter,
  Nodemailer,
  OpenAlex,
  Orcid,
  Philsci,
  Slack,
  Zenodo,
} from './ExternalApis/index.ts'
import {
  CommunitySlack,
  DatasetData,
  Email,
  GhostPage,
  LanguageDetection,
  OpenAlexWorks,
  PreprintData,
  ZenodoRecords,
} from './ExternalInteractions/index.ts'
import { collapseRequests } from './fetch.ts'
import * as FetchHttpClient from './FetchHttpClient.ts'
import { html } from './html.ts'
import * as Keyv from './keyv.ts'
import { DefaultLocale, translate } from './locales/index.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import * as Personas from './Personas/index.ts'
import * as PreprintReviews from './PreprintReviews/index.ts'
import * as Prereviewers from './Prereviewers/index.ts'
import * as Prereviews from './Prereviews/index.ts'
import { PublicUrl } from './public-url.ts'
import * as Queries from './Queries.ts'
import { DataStoreRedis } from './Redis.ts'
import { FptsToEffect } from './RefactoringUtilities/index.ts'
import * as RequestCollapsingHttpClient from './RequestCollapsingHttpClient.ts'
import * as ReviewRequests from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import * as SqlSensitiveDataStore from './SqlSensitiveDataStore.ts'
import { Uuid } from './types/index.ts'
import * as WebApp from './WebApp/index.ts'
import * as ReviewPage from './WebApp/review-page/index.ts' // eslint-disable-line import/no-internal-modules

const doesUserHaveAVerifiedEmailAddress = Layer.effect(
  Comments.DoesUserHaveAVerifiedEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* Keyv.KeyvStores

    return Effect.fn(
      function* (orcid) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          ...loggerEnv,
        })
      },
      Effect.map(contactEmailAddress => contactEmailAddress._tag === 'VerifiedContactEmailAddress'),
      Effect.catchIf(
        error => error === 'not-found',
        () => Effect.succeed(false),
      ),
      Effect.orElseFail(() => new Queries.UnableToQuery({})),
    )
  }),
)

const getContactEmailAddress = Layer.effect(
  ContactEmailAddress.GetContactEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* Keyv.KeyvStores

    return Effect.fn(
      function* (orcid) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          ...loggerEnv,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('not-found', () => new ContactEmailAddress.ContactEmailAddressIsNotFound()),
          Match.when('unavailable', () => new ContactEmailAddress.ContactEmailAddressIsUnavailable({})),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

const saveContactEmailAddress = Layer.effect(
  ContactEmailAddress.SaveContactEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* Keyv.KeyvStores

    return Effect.fn(
      function* (orcid, contactEmailAddress) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(Keyv.saveContactEmailAddress(orcid, contactEmailAddress), {
          contactEmailAddressStore,
          ...loggerEnv,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('unavailable', () => new ContactEmailAddress.ContactEmailAddressIsUnavailable({})),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

const verifyContactEmailAddressForComment = Layer.effect(
  ContactEmailAddress.VerifyContactEmailAddressForComment,
  Effect.gen(function* () {
    const email = yield* Email.Email

    return (name, contactEmailAddress, comment) =>
      pipe(
        email.verifyContactEmailAddressForComment({ name, emailAddress: contactEmailAddress, comment }),
        Effect.catchTag(
          'UnableToSendEmail',
          error => new ContactEmailAddress.ContactEmailAddressIsUnavailable({ cause: error }),
        ),
      )
  }),
)

const createRecordOnZenodoForComment = Layer.effect(
  Comments.CreateRecordOnZenodoForComment,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(
      Effect.context<Personas.Personas | Prereviews.Prereviews>(),
      Context.omit(Scope.Scope),
    )
    const fetch = yield* FetchHttpClient.Fetch
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi

    const env = {
      fetch,
      publicUrl,
      zenodoApiKey: Redacted.value(zenodoApi.key),
      zenodoUrl: zenodoApi.origin,
    }

    return comment =>
      Effect.gen(function* () {
        const prereview = yield* pipe(
          Prereviews.getPrereview(comment.prereviewId),
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

        const author = yield* Effect.catchTag(
          Personas.getPersona({ orcidId: comment.authorId, persona: comment.persona }),
          'UnableToGetPersona',
          error => new Comments.UnableToAssignADoi({ cause: error }),
        )

        const text = html`${comment.comment}

          <h2>${translate(DefaultLocale, 'write-comment-flow', 'competingInterestsHeading')()}</h2>

          <p>
            ${Option.getOrElse(comment.competingInterests, () =>
              translate(DefaultLocale, 'write-comment-flow', 'noCompetingInterests')(),
            )}
          </p>`

        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* pipe(
          FptsToEffect.readerTaskEither(
            ZenodoRecords.createCommentOnZenodo({
              ...comment,
              comment: text,
              author: Personas.match(author, {
                onPublic: persona => ({ name: persona.name, orcid: persona.orcidId }),
                onPseudonym: persona => ({ name: persona.pseudonym }),
              }),
              prereview,
            }),
            { ...env, ...loggerEnv },
          ),
          Effect.mapError(
            flow(
              Match.value,
              Match.when('unavailable', () => new Comments.UnableToAssignADoi({})),
              Match.exhaustive,
            ),
          ),
        )
      }).pipe(Effect.provide(context))
  }),
)

const publishComment = Layer.effect(
  Comments.PublishCommentOnZenodo,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const zenodoApi = yield* Zenodo.ZenodoApi

    return Effect.fn(
      function* (comment) {
        const loggerEnv = yield* MakeDeprecatedLoggerEnv

        return yield* FptsToEffect.readerTaskEither(ZenodoRecords.publishDepositionOnZenodo(comment), {
          fetch,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          ...loggerEnv,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('unavailable', () => new Comments.UnableToPublishComment({})),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

const commentsForReview = Layer.effect(
  ReviewPage.CommentsForReview,
  Effect.gen(function* () {
    const context = yield* Effect.andThen(
      Effect.context<CachingHttpClient.HttpCache | HttpClient.HttpClient | Zenodo.ZenodoApi>(),
      Context.omit(Scope.Scope),
    )

    return {
      get: reviewDoi => pipe(ZenodoRecords.getCommentsForPrereviewFromZenodo(reviewDoi), Effect.provide(context)),
      invalidate: prereviewId =>
        pipe(ZenodoRecords.invalidateCommentsForPrereview(prereviewId), Effect.provide(context)),
    }
  }),
)

const setUpFetch = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.makeFetch
    const loggerEnv = yield* MakeDeprecatedLoggerEnv

    return pipe({ fetch, ...loggerEnv }, collapseRequests()).fetch
  }),
).pipe(Layer.provide(CachingHttpClient.layer('10 seconds', '30 seconds')))

export const Program = pipe(
  Layer.mergeAll(
    WebApp.layer,
    DatasetReviews.reactionsWorker,
    ReviewRequests.reactionsWorker,
    Comments.ReactToCommentEvents,
    CachingHttpClient.layerRevalidationWorker,
    EventDispatcher.worker,
  ),
  Layer.provide(Layer.effectDiscard(EventDispatcher.replayExistingEvents)),
  Layer.provide([PreprintReviews.workflowsLayer, publishComment, createRecordOnZenodoForComment]),
  Layer.provide([Prereviews.layer, ReviewRequests.layer, verifyContactEmailAddressForComment]),
  Layer.provide(Personas.layer),
  Layer.provide([
    DatasetData.layer,
    PreprintData.layer,
    OpenAlexWorks.layer,
    Layer.provide(commentsForReview, CachingHttpClient.layer('10 minutes')),
    Prereviewers.layer,
    doesUserHaveAVerifiedEmailAddress,
    getContactEmailAddress,
    saveContactEmailAddress,
    Layer.effect(Comments.HandleCommentCommand, Comments.makeHandleCommentCommand),
    Layer.effect(Comments.GetNextExpectedCommandForUser, Comments.makeGetNextExpectedCommandForUser),
    Layer.effect(
      Comments.GetNextExpectedCommandForUserOnAComment,
      Comments.makeGetNextExpectedCommandForUserOnAComment,
    ),
    Layer.effect(Comments.GetComment, Comments.makeGetComment),
    DatasetReviews.layer,
    GhostPage.layer,
    CommunitySlack.layer,
    ZenodoRecords.layer,
    Email.layer,
    Layer.effect(
      SessionStore,
      Effect.gen(function* () {
        const maybeRedis = yield* Effect.serviceOption(DataStoreRedis)

        return {
          cookie: 'session',
          store: new Keyv.Keyv({
            emitErrors: false,
            namespace: 'sessions',
            store: Option.match(maybeRedis, {
              onSome: redis => new KeyvRedis(redis).on('error', () => undefined),
              onNone: () => new Map(),
            }),
            ttl: Duration.toMillis('30 days'),
          }),
        }
      }),
    ),
  ]),
  Layer.provide(LanguageDetection.layerCld),
  Layer.provide([
    CoarNotify.layer,
    Layer.provide(Crossref.layer, CachingHttpClient.layer('1 day')),
    Layer.provide(Datacite.layer, CachingHttpClient.layer('1 day')),
    Layer.provide(Ghost.layer, CachingHttpClient.layer('10 seconds')),
    Layer.provide(JapanLinkCenter.layer, CachingHttpClient.layer('1 day')),
    Layer.provide(OpenAlex.layer, CachingHttpClient.layer('10 minutes')),
    Layer.provide(Orcid.layer, CachingHttpClient.layer('1 day')),
    Layer.provide(Philsci.layer, CachingHttpClient.layer('1 day')),
    Slack.layer,
    Zenodo.layer,
    Nodemailer.layer,
  ]),
  Layer.provide([setUpFetch, RequestCollapsingHttpClient.layer]),
  Layer.provide([SqlEventStore.layer, LoggingHttpClient.layer]),
  Layer.provide(SqlSensitiveDataStore.layer),
  Layer.provide([
    Events.layer,
    EventDispatcher.EventDispatcherLayer,
    Uuid.layer,
    CachingHttpClient.layerRevalidationQueue,
    CookieSignature.layer,
  ]),
)
