import { Array, Effect, flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/lib/Json.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import { match } from 'ts-pattern'
import type { OpenAuthorInvite } from '../../../author-invite.ts'
import * as AuthorInviteStore from '../../../AuthorInviteStore.ts'
import { OpenAlexWorks } from '../../../ExternalInteractions/index.ts'
import { withEnv } from '../../../Fpts.ts'
import * as LegacySessionStore from '../../../legacy-session-store.ts'
import { publishPrereview } from '../../../PreprintReviews/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { Uuid } from '../../../types/index.ts'
import type * as Response from '../../Response/index.ts'
import {
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
              canAddMultipleAuthors: EffectToFpts.toTask(
                env.featureFlags.canAddMultipleAuthors(env.loggedInUser),
                env.runtime,
              ),
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
      Routes.writeReviewPublishMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReviewPublish({
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
        addToSession: EffectToFpts.toTaskEitherK(
          (key: string, value: Json) =>
            typeof env.sessionId === 'string'
              ? LegacySessionStore.addToSession(env.sessionId, key, value)
              : Effect.fail('unavailable' as const),
          env.runtime,
        ),
        popFromSession: EffectToFpts.toTaskEitherK(
          (key: string) =>
            typeof env.sessionId === 'string'
              ? LegacySessionStore.popFromSession(env.sessionId, key)
              : Effect.fail('unavailable' as const),
          env.runtime,
        ),
        publicUrl: env.publicUrl,
        publishPrereview: withEnv(publishPrereview, {
          createAuthorInvite: EffectToFpts.toTaskEitherK(
            (authorInvite: OpenAuthorInvite) =>
              Effect.tap(Uuid.v4(), uuid => AuthorInviteStore.save(uuid, authorInvite)),
            env.runtime,
          ),
          fetch: env.fetch,
          getPreprintSubjects: EffectToFpts.toTaskK(
            (id: PreprintId) =>
              pipe(
                match(id)
                  .with({ _tag: 'PhilsciPreprintId' }, () => Effect.succeed([]))
                  .otherwise(id => OpenAlexWorks.getCategories(id.value)),
                Effect.match({
                  onFailure: () => [],
                  onSuccess: Array.map(category => ({ id: category.id, name: category.display_name })),
                }),
              ),
            env.runtime,
          ),
          isReviewRequested: EffectToFpts.toTaskEitherK(
            flow(
              (preprintId: Preprints.IndeterminatePreprintId) =>
                ReviewRequests.doesAPreprintHaveAReviewRequest({ preprintId }),
              Effect.mapError(() => 'unavailable' as const),
            ),
            env.runtime,
          ),
          publicUrl: env.publicUrl,
          runtime: env.runtime,
          zenodoApiKey: Redacted.value(env.zenodoApiConfig.key),
          zenodoUrl: env.zenodoApiConfig.origin,
          ...env.logger,
        }),
        runtime: env.runtime,
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
