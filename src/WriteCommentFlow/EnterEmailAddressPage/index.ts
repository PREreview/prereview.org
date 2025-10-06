import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.ts'
import * as ContactEmailAddress from '../../contact-email-address.ts'
import { Locale } from '../../Context.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Response from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import { Uuid } from '../../types/index.ts'
import { EnsureUserIsLoggedIn } from '../../user.ts'
import { RouteForCommand } from '../Routes.ts'
import * as EnterEmailAddressForm from './EnterEmailAddressForm.ts'
import { EnterEmailAddressPage as MakeResponse } from './EnterEmailAddressPage.ts'

export const EnterEmailAddressPage = ({
  commentId,
}: {
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Comments.GetComment
  | Comments.GetNextExpectedCommandForUserOnAComment
  | Comments.HandleCommentCommand
  | ContactEmailAddress.GetContactEmailAddress
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', comment =>
        Effect.gen(function* () {
          if (comment.verifiedEmailAddressExists) {
            const getNextExpectedCommandForUserOnAComment = yield* Comments.GetNextExpectedCommandForUserOnAComment
            const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

            return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
          }

          const getContactEmailAddress = yield* ContactEmailAddress.GetContactEmailAddress

          return yield* pipe(
            getContactEmailAddress(comment.authorId),
            Effect.andThen(
              pipe(
                Match.type<ContactEmailAddress.ContactEmailAddress>(),
                Match.tag('VerifiedContactEmailAddress', () =>
                  Effect.gen(function* () {
                    const handleCommand = yield* Comments.HandleCommentCommand

                    yield* pipe(
                      handleCommand(new Comments.ConfirmExistenceOfVerifiedEmailAddress({ commentId })),
                      Effect.catchIf(
                        cause => cause._tag !== 'UnableToHandleCommand',
                        cause => new Comments.UnableToHandleCommand({ cause }),
                      ),
                    )

                    const getNextExpectedCommandForUserOnAComment =
                      yield* Comments.GetNextExpectedCommandForUserOnAComment
                    const nextCommand = yield* Effect.flatten(getNextExpectedCommandForUserOnAComment(commentId))

                    return Response.RedirectResponse({ location: RouteForCommand(nextCommand).href({ commentId }) })
                  }),
                ),
                Match.tag('UnverifiedContactEmailAddress', contactEmailAddress =>
                  Effect.succeed(
                    MakeResponse({
                      commentId,
                      form: new EnterEmailAddressForm.CompletedForm({ emailAddress: contactEmailAddress.value }),
                      locale,
                    }),
                  ),
                ),
                Match.exhaustive,
              ),
            ),
            Effect.catchTag('ContactEmailAddressIsNotFound', () =>
              Effect.succeed(
                MakeResponse({
                  commentId,
                  form: new EnterEmailAddressForm.EmptyForm(),
                  locale,
                }),
              ),
            ),
          )
        }),
      ),
      Match.tag('CommentReadyForPublishing', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      CommentHasNotBeenStarted: () => HavingProblemsPage,
      CommentIsBeingPublished: () => HavingProblemsPage,
      CommentWasAlreadyPublished: () => HavingProblemsPage,
      ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )

export const EnterEmailAddressSubmission = ({
  body,
  commentId,
}: {
  body: unknown
  commentId: Uuid.Uuid
}): Effect.Effect<
  Response.PageResponse | Response.StreamlinePageResponse | Response.RedirectResponse | Response.LogInResponse,
  never,
  | Comments.GetComment
  | ContactEmailAddress.SaveContactEmailAddress
  | ContactEmailAddress.VerifyContactEmailAddressForComment
  | Uuid.GenerateUuid
  | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag === 'CommentNotStarted' || !Equal.equals(user.orcid, comment.authorId)) {
      return yield* PageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentInProgress', () =>
        Effect.gen(function* () {
          const form = yield* EnterEmailAddressForm.fromBody(body)

          if (form._tag === 'InvalidForm') {
            return MakeResponse({ commentId, form, locale })
          }

          const saveContactEmailAddress = yield* ContactEmailAddress.SaveContactEmailAddress
          const verifyContactEmailAddressForComment = yield* ContactEmailAddress.VerifyContactEmailAddressForComment

          const verificationToken = yield* Uuid.generateUuid
          const contactEmailAddress = new ContactEmailAddress.UnverifiedContactEmailAddress({
            value: form.emailAddress,
            verificationToken,
          })

          yield* saveContactEmailAddress(user.orcid, contactEmailAddress)
          yield* verifyContactEmailAddressForComment(user, contactEmailAddress, commentId)

          return Response.RedirectResponse({
            location: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
          })
        }),
      ),
      Match.tag('CommentReadyForPublishing', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentCheck.href({ commentId }) })),
      ),
      Match.tag('CommentBeingPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublishing.href({ commentId }) })),
      ),
      Match.tag('CommentPublished', () =>
        Effect.succeed(Response.RedirectResponse({ location: Routes.WriteCommentPublished.href({ commentId }) })),
      ),
      Match.exhaustive,
    )
  }).pipe(
    Effect.catchTags({
      ContactEmailAddressIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )
