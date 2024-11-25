import { Effect, Equal, Match, pipe } from 'effect'
import * as Comments from '../../Comments/index.js'
import * as ContactEmailAddress from '../../contact-email-address.js'
import { Locale } from '../../Context.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import * as Response from '../../response.js'
import * as Routes from '../../routes.js'
import { Uuid } from '../../types/index.js'
import { EnsureUserIsLoggedIn } from '../../user.js'
import { RouteForCommand } from '../Routes.js'
import * as EnterEmailAddressForm from './EnterEmailAddressForm.js'
import { EnterEmailAddressPage as MakeResponse } from './EnterEmailAddressPage.js'

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

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
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
                      handleCommand({
                        commentId,
                        command: new Comments.ConfirmExistenceOfVerifiedEmailAddress(),
                      }),
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
      CommentHasNotBeenStarted: () => Effect.succeed(havingProblemsPage),
      CommentIsBeingPublished: () => Effect.succeed(havingProblemsPage),
      CommentWasAlreadyPublished: () => Effect.succeed(havingProblemsPage),
      ContactEmailAddressIsUnavailable: () => Effect.succeed(havingProblemsPage),
      UnableToHandleCommand: () => Effect.succeed(havingProblemsPage),
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
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
  Comments.GetComment | ContactEmailAddress.SaveContactEmailAddress | Uuid.GenerateUuid | Locale
> =>
  Effect.gen(function* () {
    const user = yield* EnsureUserIsLoggedIn

    const getComment = yield* Comments.GetComment

    const comment = yield* getComment(commentId)

    if (comment._tag !== 'CommentNotStarted' && !Equal.equals(user.orcid, comment.authorId)) {
      return pageNotFound
    }

    const locale = yield* Locale

    return yield* pipe(
      Match.value(comment),
      Match.tag('CommentNotStarted', () => Effect.succeed(pageNotFound)),
      Match.tag('CommentInProgress', () =>
        Effect.gen(function* () {
          const form = yield* EnterEmailAddressForm.fromBody(body)

          if (form._tag === 'InvalidForm') {
            return MakeResponse({ commentId, form, locale })
          }

          const generateUuid = yield* Uuid.GenerateUuid
          const saveContactEmailAddress = yield* ContactEmailAddress.SaveContactEmailAddress

          const verificationToken = yield* generateUuid
          const contactEmailAddress = new ContactEmailAddress.UnverifiedContactEmailAddress({
            value: form.emailAddress,
            verificationToken,
          })

          yield* saveContactEmailAddress(user.orcid, contactEmailAddress)

          return havingProblemsPage
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
      ContactEmailAddressIsUnavailable: () => Effect.succeed(havingProblemsPage),
      UnableToQuery: () => Effect.succeed(havingProblemsPage),
      UserIsNotLoggedIn: () =>
        Effect.succeed(Response.LogInResponse({ location: Routes.WriteCommentEnterEmailAddress.href({ commentId }) })),
    }),
  )
