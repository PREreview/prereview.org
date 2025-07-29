import type { HttpClient } from '@effect/platform'
import { LibsqlClient } from '@effect/sql-libsql'
import { Config, Effect, flow, Layer, Match, Option, pipe } from 'effect'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import * as Comments from './Comments/index.js'
import * as ContactEmailAddress from './contact-email-address.js'
import { DeprecatedLoggerEnv, ExpressConfig, Locale } from './Context.js'
import * as DatasetReviews from './DatasetReviews/index.js'
import * as EffectToFpts from './EffectToFpts.js'
import { createContactEmailAddressVerificationEmailForComment } from './email.js'
import * as Events from './Events.js'
import { collapseRequests } from './fetch.js'
import * as FetchHttpClient from './FetchHttpClient.js'
import * as FptsToEffect from './FptsToEffect.js'
import * as GhostPage from './GhostPage/index.js'
import { html } from './html.js'
import * as Keyv from './keyv.js'
import { getPseudonymFromLegacyPrereview } from './legacy-prereview.js'
import { DefaultLocale, translate } from './locales/index.js'
import * as LoggingHttpClient from './LoggingHttpClient.js'
import { Nodemailer, sendEmailWithNodemailer } from './nodemailer.js'
import * as OpenAlex from './OpenAlex/index.js'
import { getNameFromOrcid } from './orcid.js'
import * as Preprints from './Preprints/index.js'
import * as Prereview from './Prereview.js'
import * as Prereviews from './Prereviews/index.js'
import { PublicUrl } from './public-url.js'
import * as RequestCollapsingHttpClient from './RequestCollapsingHttpClient.js'
import * as ReviewPage from './review-page/index.js'
import * as ReviewRequests from './ReviewRequests/index.js'
import * as SqlEventStore from './SqlEventStore.js'
import { Uuid } from './types/index.js'
import { WebApp } from './WebApp.js'
import { createCommentOnZenodo, getPrereviewFromZenodo, publishDepositionOnZenodo } from './zenodo.js'
import * as Zenodo from './Zenodo/index.js'

const getPrereview = Layer.effect(
  Prereview.GetPrereview,
  Effect.gen(function* () {
    const { wasPrereviewRemoved, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv

    const getPreprint = yield* EffectToFpts.makeTaskEitherK(Preprints.getPreprint)

    return id =>
      FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
        fetch,
        getPreprint,
        wasPrereviewRemoved,
        zenodoApiKey,
        zenodoUrl,
        ...logger,
      })
  }),
)

const doesUserHaveAVerifiedEmailAddress = Layer.effect(
  Comments.DoesUserHaveAVerifiedEmailAddress,
  Effect.gen(function* () {
    const { contactEmailAddressStore } = yield* ExpressConfig
    const logger = yield* DeprecatedLoggerEnv

    return orcid =>
      pipe(
        FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          ...logger,
        }),
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
    const logger = yield* DeprecatedLoggerEnv

    return orcid =>
      pipe(
        FptsToEffect.readerTaskEither(Keyv.getContactEmailAddress(orcid), {
          contactEmailAddressStore,
          ...logger,
        }),
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
    const logger = yield* DeprecatedLoggerEnv

    return (orcid, contactEmailAddress) =>
      pipe(
        FptsToEffect.readerTaskEither(Keyv.saveContactEmailAddress(orcid, contactEmailAddress), {
          contactEmailAddressStore,
          ...logger,
        }),
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
    const logger = yield* DeprecatedLoggerEnv
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
        Effect.andThen(email =>
          FptsToEffect.readerTaskEither(sendEmailWithNodemailer(email), { nodemailer, ...logger }),
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
    const { legacyPrereviewApi, orcidApiUrl, orcidApiToken, zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv
    const getPrereview = yield* Prereview.GetPrereview
    const publicUrl = yield* PublicUrl

    const env = {
      fetch,
      legacyPrereviewApi,
      orcidApiUrl,
      orcidApiToken,
      publicUrl,
      zenodoApiKey,
      zenodoUrl,
      ...logger,
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

        const author = yield* pipe(
          Match.value(comment.persona),
          Match.when('public', () =>
            pipe(
              FptsToEffect.readerTaskEither(getNameFromOrcid(comment.authorId), env),
              Effect.filterOrFail(name => name !== undefined),
              Effect.mapBoth({
                onFailure: () => new Comments.UnableToAssignADoi({}),
                onSuccess: name => ({ name, orcid: comment.authorId }),
              }),
            ),
          ),
          Match.when('pseudonym', () =>
            pipe(
              FptsToEffect.readerTaskEither(getPseudonymFromLegacyPrereview(comment.authorId), env),
              Effect.mapBoth({
                onFailure: () => new Comments.UnableToAssignADoi({}),
                onSuccess: pseudonym => ({ name: pseudonym }),
              }),
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
          FptsToEffect.readerTaskEither(createCommentOnZenodo({ ...comment, comment: text, author, prereview }), env),
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

const publishComment = Layer.effect(
  Comments.PublishCommentOnZenodo,
  Effect.gen(function* () {
    const { zenodoApiKey, zenodoUrl } = yield* ExpressConfig
    const fetch = yield* FetchHttpClient.Fetch
    const logger = yield* DeprecatedLoggerEnv

    return comment =>
      pipe(
        FptsToEffect.readerTaskEither(publishDepositionOnZenodo(comment), {
          fetch,
          zenodoApiKey,
          zenodoUrl,
          ...logger,
        }),
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
    const context = yield* Effect.context<CachingHttpClient.HttpCache | HttpClient.HttpClient | Zenodo.ZenodoOrigin>()

    return {
      get: reviewDoi => pipe(Zenodo.getCommentsForPrereviewFromZenodo(reviewDoi), Effect.provide(context)),
      invalidate: prereviewId => pipe(Zenodo.invalidateCommentsForPrereview(prereviewId), Effect.provide(context)),
    }
  }),
)

const setUpFetch = Layer.effect(
  FetchHttpClient.Fetch,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.makeFetch
    const logger = yield* DeprecatedLoggerEnv

    return pipe({ fetch, ...logger }, collapseRequests()).fetch
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
      Layer.provide(Preprints.layer, CachingHttpClient.layer('1 day')),
      Layer.provide(getCategories, CachingHttpClient.layer('10 minutes')),
      Layer.provide(commentsForReview, CachingHttpClient.layer('10 minutes')),
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
      pipe(
        DatasetReviews.layer,
        Layer.provide(SqlEventStore.layer),
        Layer.provide(
          LibsqlClient.layerConfig({
            url: Config.withDefault(Config.string('DATASET_REVIEWS_LIBSQL_URL'), 'file::memory:?cache=shared'),
          }),
        ),
        Layer.fresh,
      ),
      Layer.provide(GhostPage.layer, CachingHttpClient.layer('10 seconds')),
      Zenodo.layer,
    ),
  ),
  Layer.provide(Layer.mergeAll(setUpFetch, RequestCollapsingHttpClient.layer)),
  Layer.provide(Layer.mergeAll(SqlEventStore.layer, LoggingHttpClient.layer)),
  Layer.provide(Layer.mergeAll(Events.layer, Uuid.layer, CachingHttpClient.layerRevalidationQueue)),
)
