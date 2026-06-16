import { format } from 'fp-ts-routing'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { ProfileId, type Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderConfirmAuthorChoicesPage = ({
  reviewId,
  persona,
  locale,
}: {
  reviewId: Uuid.Uuid
  persona: Personas.Persona
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'author-invite-flow')

  return StreamlinePageResponse({
    title: plainText(t('checkYourDetails')()),
    main: html`
      <form method="post" action="${Routes.AuthorInviteConfirmAuthorChoices.href({ reviewId })}" novalidate>
        <h1>${t('checkYourDetails')()}</h1>

        <div class="summary-card">
          <div>
            <h2>${t('yourDetails')()}</h2>
          </div>

          <dl class="summary-list">
            <div>
              <dt>${t('publishedName')()}</dt>
              <dd>${displayAuthor(persona)}</dd>
              <dd>
                <a href="${Routes.AuthorInviteChooseYourPersona.href({ reviewId })}"
                  >${t('changeName')({ visuallyHidden: text => html`<span class="visually-hidden">${text}</span>` })}</a
                >
              </dd>
            </div>
          </dl>
        </div>

        <h2>${t('nowPublish')()}</h2>

        <p>${t('weWillAddYourName')()}</p>

        <button>${t('updatePrereview')()}</button>
      </form>
    `,
    canonical: Routes.AuthorInviteConfirmAuthorChoices.href({ reviewId }),
    skipToLabel: 'form',
  })
}

const displayAuthor = Personas.match({
  onPublic: persona =>
    html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      class="orcid"
      dir="auto"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" dir="auto"
      >${persona.pseudonym}</a
    >`,
})
