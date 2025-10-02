import type { HttpClient } from '@effect/platform'
import KeyvRedis from '@keyv/redis'
import { Duration, Effect, flow, Layer, Match, Option, pipe, Redacted } from 'effect'
import * as CachingHttpClient from './CachingHttpClient/index.ts'
import * as Comments from './Comments/index.ts'
import * as ContactEmailAddress from './contact-email-address.ts'
import { DeprecatedLoggerEnv, ExpressConfig, Locale, SessionStore } from './Context.ts'
import * as DatasetReviews from './DatasetReviews/index.ts'
import * as Datasets from './Datasets/index.ts'
import { AddAnnotationsToLogger } from './DeprecatedServices.ts'
import * as EffectToFpts from './EffectToFpts.ts'
import { createContactEmailAddressVerificationEmailForComment } from './email.ts'
import * as Events from './Events.ts'
import { Crossref, Datacite, Ghost, JapanLinkCenter, Orcid, Philsci, Zenodo } from './ExternalApis/index.ts'
import { collapseRequests } from './fetch.ts'
import * as FetchHttpClient from './FetchHttpClient.ts'
import * as FptsToEffect from './FptsToEffect.ts'
import * as GhostPage from './GhostPage/index.ts'
import { html } from './html.ts'
import * as Keyv from './keyv.ts'
import * as LegacyPrereview from './legacy-prereview.ts'
import { DefaultLocale, translate } from './locales/index.ts'
import { GetPseudonym } from './log-in/index.ts'
import * as LoggingHttpClient from './LoggingHttpClient.ts'
import { Nodemailer, sendEmailWithNodemailer } from './nodemailer.ts'
import * as OpenAlex from './OpenAlex/index.ts'
import * as Personas from './Personas/index.ts'
import * as Preprints from './Preprints/index.ts'
import * as Prereview from './Prereview.ts'
import * as Prereviews from './Prereviews/index.ts'
import { PublicUrl } from './public-url.ts'
import { DataStoreRedis } from './Redis.ts'
import * as RequestCollapsingHttpClient from './RequestCollapsingHttpClient.ts'
import * as ReviewPage from './review-page/index.ts'
import * as ReviewRequests from './ReviewRequests/index.ts'
import * as SqlEventStore from './SqlEventStore.ts'
import { Uuid } from './types/index.ts'
import { WebApp } from './WebApp.ts'
import { createCommentOnZenodo, getPrereviewFromZenodo, publishDepositionOnZenodo } from './zenodo.ts'
import * as ZenodoInteractions from './Zenodo/index.ts'

const getPrereview = Layer.effect(
  Prereview.GetPrereview,
  Effect.gen(function* () {
    const wasPrereviewRemoved = yield* Prereviews.WasPrereviewRemoved
    const fetch = yield* FetchHttpClient.Fetch
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const zenodoApi = yield* Zenodo.ZenodoApi

    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)

    return Effect.fn(function* (id) {
      const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

      return yield* FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
        fetch,
        getPreprint,
        wasPrereviewRemoved,
        zenodoApiKey: Redacted.value(zenodoApi.key),
        zenodoUrl: zenodoApi.origin,
        clock,
        logger,
      })
    })
  }),
)

const getPseudonym = Layer.effect(
  GetPseudonym,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const legacyPrereviewApi = yield* LegacyPrereview.LegacyPrereviewApi

    return user =>
      pipe(
        FptsToEffect.readerTaskEither(LegacyPrereview.getPseudonymFromLegacyPrereview(user.orcid), {
          fetch,
          legacyPrereviewApi: {
            app: legacyPrereviewApi.app,
            key: Redacted.value(legacyPrereviewApi.key),
            url: legacyPrereviewApi.origin,
            update: legacyPrereviewApi.update,
          },
        }),
        Effect.catchIf(
          error => error === 'not-found',
          () =>
            FptsToEffect.readerTaskEither(LegacyPrereview.createUserOnLegacyPrereview(user), {
              fetch,
              legacyPrereviewApi: {
                app: legacyPrereviewApi.app,
                key: Redacted.value(legacyPrereviewApi.key),
                url: legacyPrereviewApi.origin,
                update: legacyPrereviewApi.update,
              },
            }),
        ),
      )
  }),
)

const doesUserHaveAVerifiedEmailAddress = Layer.effect(
  Comments.DoesUserHaveAVerifiedEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* ExpressConfig
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv

    return Effect.fn(
      function* (orcid) {
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          clock,
          logger,
        })
      },
      Effect.map(contactEmailAddress => contactEmailAddress._tag === 'VerifiedContactEmailAddress'),
      Effect.catchIf(
        error => error === 'not-found',
        () => Effect.succeed(false),
      ),
      Effect.orElseFail(() => new Comments.UnableToQuery({})),
    )
  }),
)

const getContactEmailAddress = Layer.effect(
  ContactEmailAddress.GetContactEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* ExpressConfig
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv

    return Effect.fn(
      function* (orcid) {
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          clock,
          logger,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('not-found', () => new ContactEmailAddress.ContactEmailAddressIsNotFound()),
          Match.when('unavailable', () => new ContactEmailAddress.ContactEmailAddressIsUnavailable()),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

const saveContactEmailAddress = Layer.effect(
  ContactEmailAddress.SaveContactEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* ExpressConfig
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv

    return Effect.fn(
      function* (orcid, contactEmailAddress) {
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* FptsToEffect.readerTaskEither(Keyv.saveContactEmailAddress(orcid, contactEmailAddress), {
          contactEmailAddressStore,
          clock,
          logger,
        })
      },
      Effect.mapError(
        flow(
          Match.value,
          Match.when('unavailable', () => new ContactEmailAddress.ContactEmailAddressIsUnavailable()),
          Match.exhaustive,
        ),
      ),
    )
  }),
)

const verifyContactEmailAddressForComment = Layer.effect(
  ContactEmailAddress.VerifyContactEmailAddressForComment,
  Effect.gen(function* () {
    const publicUrl = yield* PublicUrl
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const nodemailer = yield* Nodemailer

    return (user, contactEmailAddress, comment) =>
      pipe(
        Locale,
        Effect.andThen(locale =>
          FptsToEffect.reader(
            createContactEmailAddressVerificationEmailForComment({
              user,
              emailAddress: contactEmailAddress,
              comment,
              locale,
            }),
            { publicUrl },
          ),
        ),
        Effect.andThen(
          Effect.fn(function* (email) {
            const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

            return yield* FptsToEffect.readerTaskEither(sendEmailWithNodemailer(email), { nodemailer, clock, logger })
          }),
        ),
        Effect.mapError(
          flow(
            Match.value,
            Match.when('unavailable', () => new ContactEmailAddress.ContactEmailAddressIsUnavailable()),
            Match.exhaustive,
          ),
        ),
      )
  }),
)

const createRecordOnZenodoForComment = Layer.effect(
  Comments.CreateRecordOnZenodoForComment,
  Effect.gen(function* () {
    const context = yield* Effect.context<Personas.Personas>()
    const fetch = yield* FetchHttpClient.Fetch
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const getPrereview = yield* Prereview.GetPrereview
    const publicUrl = yield* PublicUrl
    const zenodoApi = yield* Zenodo.ZenodoApi

    const env = {
      fetch,
      publicUrl,
      zenodoApiKey: Redacted.value(zenodoApi.key),
      zenodoUrl: zenodoApi.origin,
      clock,
    }

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

        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* pipe(
          FptsToEffect.readerTaskEither(
            createCommentOnZenodo({
              ...comment,
              comment: text,
              author: Personas.match(author, {
                onPublic: persona => ({ name: persona.name, orcid: persona.orcidId }),
                onPseudonym: persona => ({ name: persona.pseudonym }),
              }),
              prereview,
            }),
            { ...env, logger },
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
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const zenodoApi = yield* Zenodo.ZenodoApi

    return Effect.fn(
      function* (comment) {
        const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

        return yield* FptsToEffect.readerTaskEither(publishDepositionOnZenodo(comment), {
          fetch,
          zenodoApiKey: Redacted.value(zenodoApi.key),
          zenodoUrl: zenodoApi.origin,
          clock,
          logger,
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

const getCategories = Layer.effect(
  OpenAlex.GetCategories,
  Effect.gen(function* () {
    const context = yield* Effect.context<HttpClient.HttpClient>()

    return id => pipe(OpenAlex.getCategoriesFromOpenAlex(id), Effect.provide(context))
  }),
)

const commentsForReview = Layer.effect(
  ReviewPage.CommentsForReview,
  Effect.gen(function* () {
    const context = yield* Effect.context<CachingHttpClient.HttpCache | HttpClient.HttpClient | Zenodo.ZenodoApi>()

    return {
      get: reviewDoi => pipe(ZenodoInteractions.getCommentsForPrereviewFromZenodo(reviewDoi), Effect.provide(context)),
      invalidate: prereviewId =>
        pipe(ZenodoInteractions.invalidateCommentsForPrereview(prereviewId), Effect.provide(context)),
    }
  }),
)

const setUpFetch = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.makeFetch
    const { clock, logger: unannotatedLogger } = yield* DeprecatedLoggerEnv
    const logger = yield* AddAnnotationsToLogger(unannotatedLogger)

    return pipe({ fetch, clock, logger }, collapseRequests()).fetch
  }),
).pipe(Layer.provide(CachingHttpClient.layer('10 seconds', '30 seconds')))

export const Program = pipe(
  Layer.mergeAll(
    WebApp,
    DatasetReviews.reactionsWorker,
    Comments.ReactToCommentEvents,
    CachingHttpClient.layerRevalidationWorker,
  ),
  Layer.provide(Layer.mergeAll(publishComment, createRecordOnZenodoForComment)),
  Layer.provide(
    Layer.mergeAll(
      getPrereview,
      Prereviews.layer,
      Layer.provide(ReviewRequests.layer, CachingHttpClient.layer('10 minutes')),
    ),
  ),
  Layer.provide(
    Layer.mergeAll(
      Personas.layer,
      Datasets.layer,
      Layer.provide(Preprints.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(getCategories, CachingHttpClient.layer('10 minutes')),
      Layer.provide(commentsForReview, CachingHttpClient.layer('10 minutes')),
      getPseudonym,
      doesUserHaveAVerifiedEmailAddress,
      getContactEmailAddress,
      saveContactEmailAddress,
      verifyContactEmailAddressForComment,
      Layer.effect(Comments.HandleCommentCommand, Comments.makeHandleCommentCommand),
      Layer.effect(Comments.GetNextExpectedCommandForUser, Comments.makeGetNextExpectedCommandForUser),
      Layer.effect(
        Comments.GetNextExpectedCommandForUserOnAComment,
        Comments.makeGetNextExpectedCommandForUserOnAComment,
      ),
      Layer.effect(Comments.GetComment, Comments.makeGetComment),
      DatasetReviews.layer,
      GhostPage.layer,
      ZenodoInteractions.layer,
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
    ),
  ),
  Layer.provide(
    Layer.mergeAll(
      Layer.provide(Crossref.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(Datacite.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(Ghost.layer, CachingHttpClient.layer('10 seconds')),
      Layer.provide(JapanLinkCenter.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(Orcid.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(Philsci.layer, CachingHttpClient.layer('1 day')),
      Zenodo.layer,
    ),
  ),
  Layer.provide(Layer.mergeAll(setUpFetch, RequestCollapsingHttpClient.layer)),
  Layer.provide(Layer.mergeAll(SqlEventStore.layer, LoggingHttpClient.layer)),
  Layer.provide(Layer.mergeAll(Events.layer, Uuid.layer, CachingHttpClient.layerRevalidationQueue)),
)
