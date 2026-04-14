import { Either, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type * as Personas from '../../../Personas/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { preprintReviewsMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { ChooseYourPersonaForm, InvalidForm } from './ChooseYourPersonaForm.ts'

const definition = (text: string) => `<dfn>${text}</dfn>`

export function ChooseYourPersonaPage({
  form,
  preprint,
  publicPersona,
  pseudonymPersona,
  locale,
}: {
  form: ChooseYourPersonaForm
  preprint: PreprintId
  publicPersona: Personas.PublicPersona
  pseudonymPersona: Personas.PseudonymPersona
  locale: SupportedLocale
}) {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('whatNameWouldYouLikeToUse')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`<a href="${format(preprintReviewsMatch.formatter, { id: preprint })}" class="back"
      ><span>${t('backToPreprint')()}</span></a
    >`,
    main: html`
      <form method="post" action="${Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprint })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(hasAnError ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="choose-your-persona-tip"
            ${rawHtml(hasAnError ? 'aria-invalid="true" aria-errormessage="choose-your-persona-error"' : '')}
          >
            <legend>
              <h1>${t('whatNameWouldYouLikeToUse')()}</h1>
            </legend>

            <p id="choose-your-persona-tip" role="note">${t('chooseBetweenOrcidNameAndPseudonym')()}</p>

            <details>
              <summary><span>${t('whatIsAPrereviewPseudonym')()}</span></summary>

              <div>
                <p>
                  ${rawHtml(
                    t('prereviewPseudonymnExplainer')({
                      definition,
                      pseudonym: pseudonymPersona.pseudonym.replace(' ', '&nbsp;'),
                    }),
                  )}
                </p>

                <p>${t('whyUseAPseudonym')()}</p>
              </div>
            </details>

            ${hasAnError && Either.isLeft(form.chooseYourPersona)
              ? html`
                  <div class="error-message" id="choose-your-persona-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.chooseYourPersona.left, {
                      Missing: t('selectNameYouWouldLikeToUse'),
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="chooseYourPersona"
                    id="choose-your-persona-public"
                    type="radio"
                    value="public"
                    aria-describedby="choose-your-persona-tip-public"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        { _tag: 'CompletedForm', chooseYourPersona: persona => persona === 'public' },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${publicPersona.name}</span>
                </label>
                <p id="choose-your-persona-tip-public" role="note">${t('weWillLinkRequestToYourOrcid')()}</p>
              </li>
              <li>
                <label>
                  <input
                    name="chooseYourPersona"
                    type="radio"
                    value="pseudonym"
                    aria-describedby="choose-your-persona-tip-pseudonym"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        { _tag: 'CompletedForm', chooseYourPersona: persona => persona === 'pseudonym' },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${pseudonymPersona.pseudonym}</span>
                </label>
                <p id="choose-your-persona-tip-pseudonym" role="note">
                  ${t('weWillLinkRequestToOthersThatUseYourPseudonymn')()}
                </p>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.RequestAReviewChooseYourPersona.href({ preprintId: preprint }),
    skipToLabel: 'form',
    js: hasAnError ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: InvalidForm) => html`
  ${Either.isLeft(form.chooseYourPersona)
    ? html`
        <li>
          <a href="#choose-your-persona-public">
            ${Match.valueTags(form.chooseYourPersona.left, {
              Missing: translate(locale, 'request-review-flow', 'selectNameYouWouldLikeToUse'),
            })}
          </a>
        </li>
      `
    : ''}
`
