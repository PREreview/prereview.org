import { Array, Effect, flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/lib/Json.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import { match } from 'ts-pattern'
import { createAuthorInvite, type OpenAuthorInvite } from '../../../author-invite.ts'
import { Nodemailer } from '../../../ExternalApis/index.ts'
import { Email, OpenAlexWorks, ZenodoRecords } from '../../../ExternalInteractions/index.ts'
import { withEnv } from '../../../Fpts.ts'
import * as Keyv from '../../../keyv.ts'
import { createPrereviewOnLegacyPrereview, isLegacyCompatiblePrereview } from '../../../legacy-prereview.ts'
import * as PreprintReviews from '../../../PreprintReviews/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { Uuid } from '../../../types/index.ts'
import { generateUuidIO } from '../../../types/uuid.ts'
import type * as Response from '../../Response/index.ts'
import {
  type NewPrereview,
  writeReview,
  writeReviewAddAuthor,
  writeReviewAddAuthors,
  writeReviewAuthors,
  writeReviewChangeAuthor,
  writeReviewCompetingInterests,
  writeReviewConduct,
  writeReviewDataPresentation,
  writeReviewEnterEmailAddress,
  writeReviewFindingsNextSteps,
  writeReviewIntroductionMatches,
  writeReviewLanguageEditing,
  writeReviewMethodsAppropriate,
  writeReviewNeedToVerifyEmailAddress,
  writeReviewNovel,
  writeReviewPersona,
  writeReviewPublish,
  writeReviewPublished,
  writeReviewReadyFullReview,
  writeReviewRemoveAuthor,
  writeReviewResultsSupported,
  writeReviewReview,
  writeReviewReviewType,
  writeReviewShouldRead,
  writeReviewStart,
  writeReviewUseOfAi,
  writeReviewUseOfAiSubmission,
  writeReviewVerifyEmailAddress,
} from '../../write-review/index.ts'
import type { Env } from './index.ts'

export const WriteReviewRouter = pipe(
  [
    pipe(
      Routes.writeReviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReview({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),

    pipe(
      Routes.writeReviewStartMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewStart({
              askAiReviewEarly: env.featureFlags.askAiReviewEarly(env.loggedInUser),
              id,
              locale: env.locale,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewReviewTypeMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewReviewType({
              askAiReviewEarly: env.featureFlags.askAiReviewEarly(env.loggedInUser),
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewReviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewReview({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewIntroductionMatchesMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewIntroductionMatches({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewMethodsAppropriateMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewMethodsAppropriate({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewResultsSupportedMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewResultsSupported({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewDataPresentationMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewDataPresentation({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewFindingsNextStepsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewFindingsNextSteps({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewNovelMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewNovel({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewLanguageEditingMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewLanguageEditing({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewShouldReadMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewShouldRead({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewReadyFullReviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewReadyFullReview({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewPersonaMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewPersona({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewAuthorsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewAuthors({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewAddAuthorMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewAddAuthor({
              body: env.body,
              canAddMultipleAuthors: env.featureFlags.canAddMultipleAuthors(env.loggedInUser),
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewChangeAuthorMatch.parser,
      P.map(
        ({ id, number }) =>
          (env: Env) =>
            writeReviewChangeAuthor({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              number,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewRemoveAuthorMatch.parser,
      P.map(
        ({ id, number }) =>
          (env: Env) =>
            writeReviewRemoveAuthor({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              number,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewAddAuthorsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewAddAuthors({
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewUseOfAiMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            (env.method === 'POST' ? writeReviewUseOfAiSubmission : writeReviewUseOfAi)({
              askAiReviewEarly: env.featureFlags.askAiReviewEarly(env.loggedInUser),
              body: env.body,
              id,
              locale: env.locale,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewCompetingInterestsMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewCompetingInterests({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewConductMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewConduct({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewEnterEmailAddressMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewEnterEmailAddress({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewNeedToVerifyEmailAddressMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewNeedToVerifyEmailAddress({
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewVerifyEmailAddressMatch.parser,
      P.map(
        ({ id, verify }) =>
          (env: Env) =>
            writeReviewVerifyEmailAddress({
              id,
              locale: env.locale,
              user: env.loggedInUser,
              verify,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewPublishMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewPublish({
              aiReviewsAsCc0: env.featureFlags.aiReviewsAsCc0(env.loggedInUser),
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.writeReviewPublishedMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewPublished({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        addToSession: withEnv(
          (key: string, value: Json) =>
            typeof env.sessionId === 'string'
              ? Keyv.addToSession(env.sessionId, key, value)
              : RTE.left('unavailable' as const),
          { sessionStore: env.sessionStore, ...env.logger },
        ),
        formStore: env.formStore,
        generateUuid: EffectToFpts.toIO(Uuid.generateUuid, env.runtime),
        getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, {
          contactEmailAddressStore: env.users.contactEmailAddressStore,
          ...env.logger,
        }),
        getPreprint: EffectToFpts.toTaskEitherK(Preprints.getPreprint, env.runtime),
        getPreprintTitle: EffectToFpts.toTaskEitherK(Preprints.getPreprintTitle, env.runtime),
        popFromSession: withEnv(
          (key: string) =>
            typeof env.sessionId === 'string'
              ? Keyv.popFromSession(env.sessionId, key)
              : RTE.left('unavailable' as const),
          { sessionStore: env.sessionStore, ...env.logger },
        ),
        publicUrl: env.publicUrl,
        publishPrereview: withEnv(publishPrereview, {
          createAuthorInvite: withEnv(
            (authorInvite: OpenAuthorInvite) =>
              pipe(
                RTE.rightReaderIO(generateUuidIO),
                RTE.chainFirstW(uuid => Keyv.saveAuthorInvite(uuid, authorInvite)),
              ),
            {
              authorInviteStore: env.authorInviteStore,
              generateUuid: EffectToFpts.toIO(Uuid.generateUuid, env.runtime),
              ...env.logger,
            },
          ),
          fetch: env.fetch,
          getPreprintSubjects: withEnv(
            (id: PreprintId) =>
              pipe(
                match(id)
                  .with({ _tag: 'PhilsciPreprintId' }, () => RTE.of([]))
                  .otherwise(EffectToFpts.toReaderTaskEitherK(id => OpenAlexWorks.getCategories(id.value))),
                RTE.match(
                  () => [],
                  Array.map(category => ({ id: category.id, name: category.display_name })),
                ),
              ),
            { runtime: env.runtime },
          ),
          isReviewRequested: EffectToFpts.toTaskK(ReviewRequests.isReviewRequested, env.runtime),
          legacyPrereviewApi: {
            app: env.legacyPrereviewApiConfig.app,
            key: Redacted.value(env.legacyPrereviewApiConfig.key),
            url: env.legacyPrereviewApiConfig.origin,
            update: env.legacyPrereviewApiConfig.update,
          },
          publicUrl: env.publicUrl,
          runtime: env.runtime,
          sendEmail: withEnv(Nodemailer.sendEmailWithNodemailer, { nodemailer: env.nodemailer, ...env.logger }),
          zenodoApiKey: Redacted.value(env.zenodoApiConfig.key),
          zenodoUrl: env.zenodoApiConfig.origin,
          ...env.logger,
        }),
        saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, {
          contactEmailAddressStore: env.users.contactEmailAddressStore,
          ...env.logger,
        }),
        verifyContactEmailAddressForReview: withEnv(Email.sendContactEmailAddressVerificationEmailForReview, {
          locale: env.locale,
          publicUrl: env.publicUrl,
          sendEmail: withEnv(Nodemailer.sendEmailWithNodemailer, { nodemailer: env.nodemailer, ...env.logger }),
        }),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>

const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    ZenodoRecords.createRecordOnZenodo(newPrereview),
    RTE.chainFirstW(
      isLegacyCompatiblePrereview(newPrereview)
        ? flow(
            ([doi]) => doi,
            createPrereviewOnLegacyPrereview(newPrereview),
            RTE.altW(() => RTE.right(undefined)),
          )
        : () => RTE.right(undefined),
    ),
    RTE.chainFirstW(([, review]) =>
      pipe(
        newPrereview.otherAuthors,
        RTE.traverseSeqArray(otherAuthor =>
          pipe(
            createAuthorInvite({ status: 'open', emailAddress: otherAuthor.emailAddress, review }),
            RTE.chainReaderKW(authorInvite =>
              Email.createAuthorInviteEmail(
                otherAuthor,
                authorInvite,
                {
                  ...newPrereview,
                  author: match(newPrereview.persona)
                    .with('public', () => newPrereview.user.name)
                    .with('pseudonym', () => newPrereview.user.pseudonym)
                    .exhaustive(),
                },
                newPrereview.locale,
              ),
            ),
            RTE.chainW(Nodemailer.sendEmail),
          ),
        ),
      ),
    ),
    RTE.chainFirstReaderTaskKW(([, reviewId]) =>
      EffectToFpts.toReaderTaskEither(
        Effect.all(
          [
            PreprintReviews.NotifyCommunitySlackOfPreprintReview.execute({ reviewId }, { discard: true }),
            PreprintReviews.NotifyPreprintServerOfReview.execute({ reviewId }, { discard: true }),
          ],
          { concurrency: 'inherit' },
        ),
      ),
    ),
    RTE.chainFirstW(([, review]) =>
      EffectToFpts.toReaderTaskEither(
        ZenodoRecords.invalidatePrereviewInCache({
          prereviewId: review,
          preprintId: newPrereview.preprint.id,
          user: newPrereview.user,
        }),
      ),
    ),
  )
