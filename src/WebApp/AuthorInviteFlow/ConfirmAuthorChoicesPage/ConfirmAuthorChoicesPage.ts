import { format } from 'fp-ts-routing'
import { html, plainText } from '../../../html.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { ProfileId, type Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderConfirmAuthorChoicesPage = ({
  reviewId,
  persona,
}: {
  reviewId: Uuid.Uuid
  persona: Personas.Persona
}) => {
  return StreamlinePageResponse({
    title: plainText('Check your details'),
    main: html`
      <form method="post" action="${Routes.AuthorInviteConfirmAuthorChoices.href({ reviewId })}" novalidate>
        <h1>Check your details</h1>

        <div class="summary-card">
          <div>
            <h2>Your details</h2>
          </div>

          <dl class="summary-list">
            <div>
              <dt><span>Published name</span></dt>
              <dd>${displayAuthor(persona)}</dd>
              <dd>
                <a href="${Routes.AuthorInviteChooseYourPersona.href({ reviewId })}"
                  >Change <span class="visually-hidden">name</span></a
                >
              </dd>
            </div>
          </dl>
        </div>

        <h2>Now publish your updated PREreview</h2>

        <p>We will add your name to the author list.</p>

        <button>Update PREreview</button>
      </form>
    `,
    canonical: Routes.AuthorInviteConfirmAuthorChoices.href({ reviewId }),
    skipToLabel: 'form',
  })
}

const displayAuthor = Personas.match({
  onPublic: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" class="orcid"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      >${persona.pseudonym}</a
    >`,
})
