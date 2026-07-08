import { Effect } from 'effect'
import { AuthorInvites } from '../../../AuthorInvites/index.ts'
import { Locale } from '../../../Context.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import * as Routes from '../../../routes.ts'
import { Temporal } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { renderConfirmAuthorChoicesPage } from './ConfirmAuthorChoicesPage.ts'

export const ConfirmAuthorChoicesPage = ({
  reviewId,
}: {
  reviewId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Prereviewers.Prereviewers | AuthorInvites> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const choices = yield* authorInvites.getAuthorChoicesToConfirm({ reviewId, orcidId: user.orcid })

    const persona = yield* Prereviewers.getPersona({ orcidId: user.orcid, persona: choices.persona })

    return renderConfirmAuthorChoicesPage({ reviewId, persona, locale })
  }).pipe(
    Effect.catchTags({
      ChoicesHaveBeenConfirmed: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInvitePublished.href({ reviewId }) })),
      PersonaHasNotBeenChosen: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInviteChooseYourPersona.href({ reviewId }) })),
      PrereviewerIsNotListedOnTheReview: () => PageNotFound,
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const ConfirmAuthorChoicesSubmission = ({
  reviewId,
}: {
  reviewId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | AuthorInvites> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const user = yield* LoggedInUser
    const confirmedAt = yield* Temporal.currentInstant

    yield* authorInvites.confirmAuthorChoices({ orcidId: user.orcid, reviewId, confirmedAt })

    return RedirectResponse({ location: Routes.AuthorInvitePublished.href({ reviewId }) })
  }).pipe(
    Effect.catchTags({
      ChoicesCannotBeChanged: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInvitePublished.href({ reviewId }) })),
      ChoicesDoNotNeedToBeConfirmed: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
    }),
  )
