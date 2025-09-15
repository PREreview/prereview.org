import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewPersonaMatch, writeReviewReadyFullReviewMatch, writeReviewReviewMatch } from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { User } from '../../user.js'
import { prereviewOfSuffix } from '../shared-elements.js'

export interface PersonaForm {
  readonly persona: E.Either<MissingE, 'public' | 'pseudonym' | undefined>
}

export const personaForm = (
  preprint: PreprintTitle,
  form: PersonaForm,
  reviewType: 'freeform' | 'questions' | undefined,
  user: User,
  locale: SupportedLocale,
) => {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('whatNameToUse')(), prereviewOfSuffix(locale, preprint.title), errorPrefix(locale, error), plainText),
    nav: html`
      <a
        href="${format(
          (reviewType === 'questions' ? writeReviewReadyFullReviewMatch : writeReviewReviewMatch).formatter,
          {
            id: preprint.id,
          },
        )}"
        class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewPersonaMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.persona)
                    ? html`
                        <li>
                          <a href="#persona-public">
                            ${Match.valueTags(form.persona.left, {
                              MissingE: () => t('selectTheNameError')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.persona) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="persona-tip"
            ${rawHtml(E.isLeft(form.persona) ? 'aria-invalid="true" aria-errormessage="persona-error"' : '')}
          >
            <legend>
              <h1>${t('whatNameToUse')()}</h1>
            </legend>

            <p id="persona-tip" role="note">${t('youCanChooseBetweenNames')()}</p>

            <details>
              <summary><span>${t('whatIsAPseudonym')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    t('pseudonymIsA')({
                      term: text => html`<dfn>${text}</dfn>`.toString(),
                      pseudonym: user.pseudonym.replace(' ', ' '),
                    }),
                  )}
                </p>

                <p>${t('pseudonymAccountability')()}</p>
              </div>
            </details>

            ${E.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.persona.left, {
                      MissingE: () => t('selectTheNameError')(),
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
                <p id="persona-tip-public" role="note">${t('linkToOrcidId')()}</p>
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
                <p id="persona-tip-pseudonym" role="note">${t('linkToPseudonym')()}</p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
