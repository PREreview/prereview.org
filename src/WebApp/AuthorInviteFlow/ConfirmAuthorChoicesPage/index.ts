import { Effect } from 'effect'
import { AuthorInvites } from '../../../AuthorInvites/index.ts'
import type { Locale } from '../../../Context.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { Temporal } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { renderConfirmAuthorChoicesPage } from './ConfirmAuthorChoicesPage.ts'

export const ConfirmAuthorChoicesPage = ({
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Personas.Personas | AuthorInvites> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const user = yield* LoggedInUser

    const choices = yield* authorInvites.getAuthorChoicesToConfirm({ invitationId, orcidId: user.orcid })

    const persona = yield* Personas.getPersona({ orcidId: user.orcid, persona: choices.persona })

    return renderConfirmAuthorChoicesPage({ invitationId, persona })
  }).pipe(
    Effect.catchTags({
      ChoicesHaveBeenConfirmed: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInvitePublished.href({ invitationId }) })),
      PersonaHasNotBeenChosen: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInviteChooseYourPersona.href({ invitationId }) })),
      PrereviewerIsNotListedOnTheReview: () => PageNotFound,
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const ConfirmAuthorChoicesSubmission = ({
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | AuthorInvites> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const user = yield* LoggedInUser
    const confirmedAt = yield* Temporal.currentInstant

    yield* authorInvites.confirmAuthorChoices({ orcidId: user.orcid, invitationId, confirmedAt })

    return RedirectResponse({ location: Routes.AuthorInvitePublished.href({ invitationId }) })
  }).pipe(
    Effect.catchTags({
      ChoicesCannotBeChanged: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInvitePublished.href({ invitationId }) })),
      ChoicesDoNotNeedToBeConfirmed: () => HavingProblemsPage,
      UnableToHandleCommand: () => HavingProblemsPage,
    }),
  )
