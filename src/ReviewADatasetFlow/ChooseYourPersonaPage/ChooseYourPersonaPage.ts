import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import type * as Personas from '../../Personas/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/index.ts'
import type * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'

export const ChooseYourPersonaPage = ({
  datasetReviewId,
  form,
  publicPersona,
  pseudonymPersona,
}: {
  datasetReviewId: Uuid.Uuid
  form: ChooseYourPersonaForm.ChooseYourPersonaForm
  publicPersona: Personas.PublicPersona
  pseudonymPersona: Personas.PseudonymPersona
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}What name would you like to use?`,
    nav: html`
      <a href="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.chooseYourPersona)
                    ? html`
                        <li>
                          <a href="#choose-your-persona-public">
                            ${pipe(
                              Match.value(form.chooseYourPersona.left),
                              Match.tag('Missing', () => 'Select the name that you would like to use'),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

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
              <h1>What name would you like to use?</h1>
            </legend>

            <p id="choose-your-persona-tip" role="note">
              You can choose between the name on your ORCID&nbsp;record or your PREreview&nbsp;pseudonym.
            </p>

            <details>
              <summary><span>What is a PREreview&nbsp;pseudonym?</span></summary>

              <div>
                <p>
                  A <dfn>PREreview&nbsp;pseudonym</dfn> is an alternate name you can use instead of your real&nbsp;name.
                  It is unique and combines a random color and animal. Your pseudonym is
                  ‘${rawHtml(pseudonymPersona.pseudonym.replace(' ', '&nbsp;'))}’.
                </p>

                <p>
                  Using your pseudonym, you can contribute to open dataset review without fearing retribution or
                  judgment that may occur when using your real name. However, using a pseudonym retains an element of
                  accountability.
                </p>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.chooseYourPersona)
              ? html`
                  <div class="error-message" id="choose-your-persona-error">
                    <span class="visually-hidden">Error:</span>
                    ${pipe(
                      Match.value(form.chooseYourPersona.left),
                      Match.tag('Missing', () => 'Select the name that you would like to use'),
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
                <p id="choose-your-persona-tip-public" role="note">We’ll link your PREreview to your ORCID&nbsp;iD.</p>
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
                  We’ll only link your PREreview to others that also use your pseudonym.
                </p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetChooseYourPersona.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
