import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import type { ReviewRequestPreprintId } from '../../../review-request.ts'
import { preprintReviewsMatch, requestReviewPersonaMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { User } from '../../../user.ts'

export interface PersonaForm {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

const definition = (text: string) => `<dfn>${text}</dfn>`

export function personaForm({
  form,
  preprint,
  user,
  locale,
}: {
  form: PersonaForm
  preprint: ReviewRequestPreprintId
  user: User
  locale: SupportedLocale
}) {
  const error = hasAnError(form)
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('whatNameWouldYouLikeToUse')(), errorPrefix(locale, error), plainText),
    nav: html`<a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back"
      ><span>${t('backToPreprint')()}</span></a
    >`,
    main: html`
      <form method="post" action="${format(requestReviewPersonaMatch.formatter, { id: preprint })}" novalidate>
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

            <p id="persona-tip" role="note">${t('chooseBetweenOrcidNameAndPseudonym')()}</p>

            <details>
              <summary><span>${t('whatIsAPrereviewPseudonym')()}</span></summary>

              <div>
                <p>
                  ${t('prereviewPseudonymnExplainer')({ definition, pseudonym: user.pseudonym.replace(' ', '&nbsp;') })}
                </p>

                <p>${t('whyUseAPseudonym')()}</p>
              </div>
            </details>

            ${E.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.persona.left, {
                      MissingE: t('selectNameYouWouldLikeToUse'),
                    })}
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
                <p id="persona-tip-public" role="note">${t('weWillLinkRequestToYourOrcid')()}</p>
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
                <p id="persona-tip-pseudonym" role="note">${t('weWillLinkRequestToOthersThatUseYourPseudonymn')()}</p>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(requestReviewPersonaMatch.formatter, { id: preprint }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: PersonaForm) => html`
  ${E.isLeft(form.persona)
    ? html`
        <li>
          <a href="#persona-public">
            ${Match.valueTags(form.persona.left, {
              MissingE: translate(locale, 'request-review-flow', 'selectNameYouWouldLikeToUse'),
            })}
          </a>
        </li>
      `
    : ''}
`
