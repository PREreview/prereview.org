import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInvitePersonaMatch } from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import type { User } from '../../user.js'

export interface PersonaForm {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

export function personaForm({
  form,
  inviteId,
  user,
  locale,
}: {
  form: PersonaForm
  inviteId: Uuid
  user: User
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale, 'author-invite-flow')
  const definition = (text: string) => html`<dfn>${text}</dfn>`.toString()

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: pipe(t('whatNameWouldYouLikeToUse')(), errorPrefix(locale, error), plainText),
    main: html`
      <form method="post" action="${format(authorInvitePersonaMatch.formatter, { id: inviteId })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.persona) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="persona-tip"
            ${rawHtml(E.isLeft(form.persona) ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}
          >
            <legend>
              <h1>${t('whatNameWouldYouLikeToUse')()}</h1>
            </legend>

            <p id="persona-tip" role="note">${rawHtml(t('youCanChooseBetweenOrcidNameAndPrereviewPseudonym')())}</p>

            <details>
              <summary><span>${rawHtml(t('whatIsAPrereviewPseudonym')())}</span></summary>

              <div>
                <p>
                  ${t('pseudonymExplainer')({
                    definition,
                    userPseudonym: user.pseudonym.replace(' ', '&nbsp;'),
                  })}
                </p>

                <p>${t('whyUseAPseudonym')()}</p>
              </div>
            </details>

            ${E.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.persona.left)
                      .with({ _tag: 'MissingE' }, t('selectTheNameYouWouldLikeToUse'))
                      .exhaustive()}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="persona"
                    id="persona-public"
                    type="radio"
                    value="public"
                    aria-describedby="persona-tip-public"
                    ${match(form.persona)
                      .with({ right: 'public' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${user.name}</span>
                </label>
                <p id="persona-tip-public" role="note">${rawHtml(t('weWillLinkYourPrereviewToYourOrcid')())}</p>
              </li>
              <li>
                <label>
                  <input
                    name="persona"
                    type="radio"
                    value="pseudonym"
                    aria-describedby="persona-tip-pseudonym"
                    ${match(form.persona)
                      .with({ right: 'pseudonym' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${user.pseudonym}</span>
                </label>
                <p id="persona-tip-pseudonym" role="note">${t('weWillOnlyLinkToOtherPseudonymPrereviews')()}</p>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(authorInvitePersonaMatch.formatter, { id: inviteId }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: PersonaForm) => html`
  ${E.isLeft(form.persona)
    ? html`
        <li>
          <a href="#persona-public">
            ${match(form.persona.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'author-invite-flow', 'selectTheNameYouWouldLikeToUse'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
