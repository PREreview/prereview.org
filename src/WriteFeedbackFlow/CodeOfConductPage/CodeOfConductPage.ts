import { Either, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as CodeOfConductForm from './CodeOfConductForm.js'

export const CodeOfConductPage = ({
  feedbackId,
  form,
  locale,
}: {
  feedbackId: Uuid.Uuid
  form: CodeOfConductForm.CodeOfConductForm
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: form._tag === 'InvalidForm' ? plainText`Error: Code of Conduct` : plainText`Code of Conduct`,
    nav: html`
      <a href="${Routes.WriteFeedbackChoosePersona.href({ feedbackId })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'back')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteFeedbackCodeOfConduct.href({ feedbackId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-feedback-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.agree)
                    ? html`
                        <li>
                          <a href="#agree-yes">
                            ${pipe(
                              Match.value(form.agree.left),
                              Match.tag(
                                'Missing',
                                () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
                              ),
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
            aria-describedby="agree-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.agree)
                ? 'aria-invalid="true" aria-errormessage="agree-error"'
                : '',
            )}
          >
            <legend>
              <h1>Code of Conduct</h1>
            </legend>

            <p id="agree-tip" role="note">
              As a member of our community, we expect you to abide by the
              <a href="${format(Routes.codeOfConductMatch.formatter, {})}">PREreview Code&nbsp;of&nbsp;Conduct</a>.
            </p>

            <details>
              <summary><span>Examples of expected behaviors</span></summary>

              <div>
                <ul>
                  <li>Using welcoming and inclusive language.</li>
                  <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                  <li>Being respectful of differing viewpoints and experiences.</li>
                  <li>Gracefully accepting constructive criticism.</li>
                  <li>Focusing on what is best for the community.</li>
                  <li>Showing empathy towards other community members.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary><span>Examples of unacceptable behaviors</span></summary>

              <div>
                <ul>
                  <li>Trolling, insulting or derogatory comments, and personal or political attacks.</li>
                  <li>Providing unconstructive or disruptive feedback on PREreview.</li>
                  <li>Public or private harassment.</li>
                  <li>
                    Publishing others’ confidential information, such as a physical or electronic address, without
                    explicit permission.
                  </li>
                  <li>Use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
                  <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
                </ul>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.agree)
              ? html`
                  <div class="error-message" id="agree-error">
                    <span class="visually-hidden">Error:</span>
                    ${pipe(
                      Match.value(form.agree.left),
                      Match.tag('Missing', () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`),
                      Match.exhaustive,
                    )}
                  </div>
                `
              : ''}

            <label>
              <input
                name="agree"
                id="agree-yes"
                type="checkbox"
                value="yes"
                ${pipe(
                  Match.value(form),
                  Match.tag('CompletedForm', () => 'checked'),
                  Match.orElse(() => ''),
                )}
              />
              <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
            </label>
          </fieldset>
        </div>

        <button>${translate(locale, 'write-feedback-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteFeedbackCodeOfConduct.href({ feedbackId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })
