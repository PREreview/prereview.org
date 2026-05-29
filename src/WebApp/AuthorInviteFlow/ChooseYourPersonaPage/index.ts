import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Personas from '../../../Personas/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { LoggedInUser } from '../../../user.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'
import { renderChooseYourPersonaPage } from './ChooseYourPersonaPage.ts'

export const ChooseYourPersonaPage = ({
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | LoggedInUser | Personas.Personas> =>
  Effect.gen(function* () {
    const locale = yield* Locale
    const user = yield* LoggedInUser
    const form = new ChooseYourPersonaForm.EmptyForm()
    const publicPersona = yield* Personas.getPublicPersona(user.orcid)
    const pseudonymPersona = yield* Personas.getPseudonymPersona(user.orcid)

    return renderChooseYourPersonaPage({ invitationId, form, publicPersona, pseudonymPersona, locale })
  }).pipe(Effect.catchTags({ UnableToGetPersona: () => HavingProblemsPage }))

export const ChooseYourPersonaSubmission = () => HavingProblemsPage
