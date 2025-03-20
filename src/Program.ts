import { FetchHttpClient, HttpClient } from '@effect/platform'
import { LibsqlMigrator } from '@effect/sql-libsql'
import { Effect, flow, Layer, Match, Option, pipe, PubSub } from 'effect'
import { fileURLToPath } from 'url'
import * as CachingHttpClient from './CachingHttpClient/index.js'
import * as Comments from './Comments/index.js'
import * as ContactEmailAddress from './contact-email-address.js'
import { DeprecatedLoggerEnv, DeprecatedSleepEnv, ExpressConfig, Locale } from './Context.js'
import { makeDeprecatedSleepEnv } from './DeprecatedServices.js'
import * as EffectToFpts from './EffectToFpts.js'
import { createContactEmailAddressVerificationEmailForComment } from './email.js'
import { collapseRequests, logFetch } from './fetch.js'
import * as FptsToEffect from './FptsToEffect.js'
import { getPreprint as getPreprintUtil } from './get-preprint.js'
import * as GhostPage from './GhostPage.js'
import { html } from './html.js'
import * as Keyv from './keyv.js'
import { getPseudonymFromLegacyPrereview } from './legacy-prereview.js'
import * as LibsqlEventStore from './LibsqlEventStore.js'
import { DefaultLocale, translate } from './locales/index.js'
import { Nodemailer, sendEmailWithNodemailer } from './nodemailer.js'
import * as OpenAlex from './OpenAlex/index.js'
import { getNameFromOrcid } from './orcid.js'
import * as Preprint from './preprint.js'
import * as Prereview from './Prereview.js'
import { PublicUrl } from './public-url.js'
import * as ReviewPage from './review-page/index.js'
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
    const getPreprintService = yield* Preprint.GetPreprint
    const sleep = yield* DeprecatedSleepEnv

    const getPreprint = yield* EffectToFpts.makeTaskEitherK(getPreprintService)

    return id =>
      pipe(
        FptsToEffect.readerTaskEither(getPrereviewFromZenodo(id), {
          fetch,
          getPreprint,
          ...sleep,
          wasPrereviewRemoved,
          zenodoApiKey,
          zenodoUrl,
          ...logger,
        }),
        Effect.mapBoth({
          onFailure: flow(
            Match.value,
            Match.when('not-found', () => new Prereview.PrereviewIsNotFound()),
            Match.when('removed', () => new Prereview.PrereviewWasRemoved()),
            Match.when('unavailable', () => new Prereview.PrereviewIsUnavailable()),
            Match.exhaustive,
          ),
          onSuccess: response =>
            new Prereview.Prereview({
              ...response,
              authors: {
                ...response.authors,
                named: FptsToEffect.array(response.authors.named),
              },
              id,
            }),
        }),
      )
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
    const sleep = yield* DeprecatedSleepEnv
    const publicUrl = yield* PublicUrl

    const env = {
      fetch,
      legacyPrereviewApi,
      orcidApiUrl,
      orcidApiToken,
      publicUrl,
      zenodoApiKey,
      zenodoUrl,
      ...sleep,
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

const commentEvents = Layer.scoped(
  Comments.CommentEvents,
  Effect.acquireRelease(
    pipe(
      PubSub.unbounded() satisfies Effect.Effect<typeof Comments.CommentEvents.Service>,
      Effect.tap(Effect.logDebug('Comment events started')),
    ),
    flow(PubSub.shutdown, Effect.tap(Effect.logDebug('Comment events stopped'))),
  ),
)

const getPreprint = Layer.effect(
  Preprint.GetPreprint,
  Effect.gen(function* () {
    const fetch = yield* FetchHttpClient.Fetch
    const sleep = yield* DeprecatedSleepEnv
    const httpClient = yield* HttpClient.HttpClient

    return id =>
      pipe(
        getPreprintUtil(id),
        Effect.provideService(HttpClient.HttpClient, httpClient),
        Effect.provideService(FetchHttpClient.Fetch, fetch),
        Effect.provideService(DeprecatedSleepEnv, sleep),
      )
  }),
)

const getCategories = Layer.effect(
  OpenAlex.GetCategories,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient

    return id => pipe(OpenAlex.getCategoriesFromOpenAlex(id), Effect.provideService(HttpClient.HttpClient, httpClient))
  }),
)

const commentsForReview = Layer.effect(
  ReviewPage.CommentsForReview,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const zenodoOrigin = yield* Zenodo.ZenodoOrigin

    return {
      get: id =>
        pipe(
          Zenodo.getCommentsForPrereviewFromZenodo(id),
          Effect.provideService(HttpClient.HttpClient, httpClient),
          Effect.provideService(Zenodo.ZenodoOrigin, zenodoOrigin),
        ),
    }
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

const MigratorLive = LibsqlMigrator.layer({
  loader: LibsqlMigrator.fromFileSystem(fileURLToPath(new URL('migrations', import.meta.url))),
  schemaDirectory: 'src/migrations',
})

export const Program = pipe(
  Layer.mergeAll(WebApp, Comments.ReactToCommentEvents),
  Layer.provide(Layer.mergeAll(publishComment, createRecordOnZenodoForComment)),
  Layer.provide(Layer.mergeAll(getPrereview)),
  Layer.provide(
    Layer.mergeAll(
      Layer.provide(getPreprint, CachingHttpClient.layer('10 minutes')),
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
      Layer.provide(GhostPage.layer, CachingHttpClient.layer('10 seconds')),
    ),
  ),
  Layer.provide(Layer.mergeAll(commentEvents, LibsqlEventStore.layer, setUpFetch)),
  Layer.provide(Layer.mergeAll(Uuid.layer, Layer.effect(DeprecatedSleepEnv, makeDeprecatedSleepEnv), MigratorLive)),
)
