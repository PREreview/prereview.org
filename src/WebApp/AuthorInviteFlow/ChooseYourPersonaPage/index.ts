import type { UrlParams } from '@effect/platform'
import { Effect, Match } from 'effect'
import { AuthorInvites } from '../../../AuthorInvites/index.ts'
import { Locale } from '../../../Context.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import { RouteForCommand } from '../RouteForCommand.ts'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'
import { renderChooseYourPersonaPage } from './ChooseYourPersonaPage.ts'

export const ChooseYourPersonaPage = ({
  reviewId,
}: {
  reviewId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Personas.Personas | AuthorInvites> =>
  Effect.gen(function* () {
    const authorInvites = yield* AuthorInvites
    const locale = yield* Locale
    const user = yield* LoggedInUser

    const currentPersona = yield* authorInvites.getPersonaChoice({ reviewId, orcidId: user.orcid })

    const form = ChooseYourPersonaForm.fromPersona(currentPersona)

    const publicPersona = yield* Personas.getPublicPersona(user.orcid)
    const pseudonymPersona = yield* Personas.getPseudonymPersona(user.orcid)

    return renderChooseYourPersonaPage({ reviewId, form, publicPersona, pseudonymPersona, locale })
  }).pipe(
    Effect.catchTags({
      PersonaCannotBeChanged: () =>
        Effect.succeed(RedirectResponse({ location: Routes.AuthorInvitePublished.href({ reviewId }) })),
      PrereviewerIsNotListedOnTheReview: () => PageNotFound,
      UnableToGetPersona: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )

export const ChooseYourPersonaSubmission = ({
  body,
  reviewId,
}: {
  body: UrlParams.UrlParams
  reviewId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Personas.Personas | AuthorInvites> =>
  Effect.gen(function* () {
    const user = yield* LoggedInUser
    const locale = yield* Locale

    const form = yield* ChooseYourPersonaForm.fromBody(body)

    return yield* Match.valueTags(form, {
      CompletedForm: Effect.fnUntraced(
        function* (form: ChooseYourPersonaForm.CompletedForm) {
          const authorInvites = yield* AuthorInvites

          yield* authorInvites.choosePersona({ orcidId: user.orcid, reviewId, persona: form.chooseYourPersona })

          const nextExpectedCommand = yield* authorInvites.getNextExpectedCommandForAPrereviewerOnAReview({
            reviewId,
            orcidId: user.orcid,
          })

          return RedirectResponse({ location: RouteForCommand(nextExpectedCommand).href({ reviewId }) })
        },
        Effect.catchTags({
          NothingToDo: () => HavingProblemsPage,
          PersonaDoesNotNeedToBeChosen: () => HavingProblemsPage,
          PersonaCannotBeChanged: () => HavingProblemsPage,
          PrereviewerIsNotListedOnTheReview: () => HavingProblemsPage,
          UnableToHandleCommand: () => HavingProblemsPage,
          UnableToQuery: () => HavingProblemsPage,
        }),
      ),
      InvalidForm: Effect.fnUntraced(
        function* (form: ChooseYourPersonaForm.InvalidForm) {
          const publicPersona = yield* Personas.getPublicPersona(user.orcid)
          const pseudonymPersona = yield* Personas.getPseudonymPersona(user.orcid)

          return renderChooseYourPersonaPage({ reviewId, form, publicPersona, pseudonymPersona, locale })
        },
        Effect.catchTag('UnableToGetPersona', () => HavingProblemsPage),
      ),
    })
  })
