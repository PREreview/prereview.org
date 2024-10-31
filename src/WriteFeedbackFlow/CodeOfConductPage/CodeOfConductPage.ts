import { Either, Function, identity, Match, pipe } from 'effect'
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
    title: plainText(
      translate(
        locale,
        'write-feedback-flow',
        'codeOfConductTitle',
      )({ error: form._tag === 'InvalidForm' ? identity : () => '' }),
    ),
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
                              Match.tag('Missing', () =>
                                translate(
                                  locale,
                                  'write-feedback-flow',
                                  'errorFollowingCodeOfConduct',
                                )({ error: () => '' }),
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
              <h1>${translate(locale, 'write-feedback-flow', 'codeOfConductTitle')({ error: () => '' })}</h1>
            </legend>

            <p id="agree-tip" role="note">
              ${rawHtml(
                translate(
                  locale,
                  'write-feedback-flow',
                  'codeOfConductTip',
                )({
                  link: text =>
                    html`<a href="${format(Routes.codeOfConductMatch.formatter, {})}">${text}</a>`.toString(),
                }),
              )}
            </p>

            <details>
              <summary><span>${translate(locale, 'write-feedback-flow', 'examplesExpectedBehaviors')()}</span></summary>

              <div>
                <ul>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorLanguage')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorConstructive')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorRespectful')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorGraceful')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorCommunity')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'expectedBehaviorEmpathy')()}</li>
                </ul>
              </div>
            </details>

            <details>
              <summary>
                <span>${translate(locale, 'write-feedback-flow', 'examplesUnacceptableBehaviors')()}</span>
              </summary>

              <div>
                <ul>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorAttacks')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorUnconstructive')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorHarassment')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorConfidential')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorSexual')()}</li>
                  <li>${translate(locale, 'write-feedback-flow', 'unacceptableBehaviorOther')()}</li>
                </ul>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.agree)
              ? html`
                  <div class="error-message" id="agree-error">
                    ${pipe(
                      Match.value(form.agree.left),
                      Match.tag('Missing', () =>
                        translate(locale, 'write-feedback-flow', 'errorFollowingCodeOfConduct'),
                      ),
                      Match.exhaustive,
                      Function.apply({ error: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                      rawHtml,
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
              <span>${translate(locale, 'write-feedback-flow', 'followingCodeOfConduct')()} </span>
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
