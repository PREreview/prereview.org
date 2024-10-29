import { Either, Match, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type { User } from '../../user.js'
import type * as ChoosePersonaForm from './ChoosePersonaForm.js'

export const ChoosePersonaPage = ({
  feedbackId,
  form,
  locale,
  user,
}: {
  feedbackId: Uuid.Uuid
  form: ChoosePersonaForm.ChoosePersonaForm
  locale: SupportedLocale
  user: User
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title:
      form._tag === 'InvalidForm'
        ? plainText`Error: What name would you like to use?`
        : plainText`What name would you like to use?`,
    nav: html`
      <a href="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'back')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteFeedbackChoosePersona.href({ feedbackId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-feedback-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.persona)
                    ? html`
                        <li>
                          <a href="#persona-public">
                            ${pipe(
                              Match.value(form.persona.left),
                              Match.tag('Missing', () => html`Select the name that you would like to use`),
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
            aria-describedby="persona-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.persona)
                ? 'aria-invalid="true" aria-errormessage="persona-error"'
                : '',
            )}
          >
            <legend>
              <h1>What name would you like to use?</h1>
            </legend>

            <p id="persona-tip" role="note">
              You can choose between the name on your ORCID&nbsp;profile or your PREreview&nbsp;pseudonym.
            </p>

            <details>
              <summary><span>What is a PREreview&nbsp;pseudonym?</span></summary>

              <div>
                <p>
                  A <dfn>PREreview&nbsp;pseudonym</dfn> is an alternate name you can use instead of your real&nbsp;name.
                  It is unique and combines a random color and animal. Your pseudonym is
                  ‘${rawHtml(user.pseudonym.replace(' ', '&nbsp;'))}.’
                </p>

                <p>
                  Using your pseudonym, you can contribute to open preprint review without fearing retribution or
                  judgment that may occur when using your real name. However, using a pseudonym retains an element of
                  accountability.
                </p>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.persona)
              ? html`
                  <div class="error-message" id="persona-error">
                    <span class="visually-hidden">Error:</span>
                    ${pipe(
                      Match.value(form.persona.left),
                      Match.tag('Missing', () => html`Select the name that you would like to use`),
                      Match.exhaustive,
                    )}
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
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', persona: persona => persona === 'public' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${user.name}</span>
                </label>
                <p id="persona-tip-public" role="note">We’ll link your feedback to your ORCID&nbsp;iD.</p>
              </li>
              <li>
                <label>
                  <input
                    name="persona"
                    type="radio"
                    value="pseudonym"
                    aria-describedby="persona-tip-pseudonym"
                    ${pipe(
                      Match.value(form),
                      Match.when(
                        { _tag: 'CompletedForm', persona: persona => persona === 'pseudonym' },
                        () => 'checked',
                      ),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>${user.pseudonym}</span>
                </label>
                <p id="persona-tip-pseudonym" role="note">
                  We’ll only link your feedback to others that also use your pseudonym.
                </p>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'write-feedback-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteFeedbackChoosePersona.href({ feedbackId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })
