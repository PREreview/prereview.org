import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'

const definition = (text: string) => `<dfn>${text}</dfn>`

export const ChooseYourPersonaPage = ({
  datasetReviewId,
  form,
  publicPersona,
  pseudonymPersona,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  form: ChooseYourPersonaForm.ChooseYourPersonaForm
  publicPersona: Personas.PublicPersona
  pseudonymPersona: Personas.PseudonymPersona
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('whatNameWouldYouLikeToUse')(), errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}" class="back"
        ><span>${t('back')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            aria-describedby="choose-your-persona-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.chooseYourPersona)
                ? 'aria-invalid="true" aria-errormessage="choose-your-persona-error"'
                : '',
            )}
          >
            <legend>
              <h1>${t('whatNameWouldYouLikeToUse')()}</h1>
            </legend>

            <p id="choose-your-persona-tip" role="note">${t('youCanChooseOrcidOrPseudonym')()}</p>

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

            ${form._tag === 'InvalidForm' && Either.isLeft(form.chooseYourPersona)
              ? html`
                  <div class="error-message" id="choose-your-persona-error">
                    <span class="visually-hidden">${t('error')()}:</span>
                    ${pipe(
                      Match.value(form.chooseYourPersona.left),
                      Match.tag('Missing', t('selectNameYouWouldLikeToUse')),
                      Match.exhaustive,
                    )}
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
                <p id="choose-your-persona-tip-public" role="note">${t('weWillLinkToYourOrcid')()}</p>
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
                <p id="choose-your-persona-tip-pseudonym" role="note">${t('weWillOnlyLinkToYourPseudonym')()}</p>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: ChooseYourPersonaForm.InvalidForm) => html`
  ${Either.isLeft(form.chooseYourPersona)
    ? html`
        <li>
          <a href="#choose-your-persona-public">
            ${pipe(
              Match.value(form.chooseYourPersona.left),
              Match.tag('Missing', translate(locale, 'review-a-dataset-flow', 'selectNameYouWouldLikeToUse')),
              Match.exhaustive,
            )}
          </a>
        </li>
      `
    : ''}
`
