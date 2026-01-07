import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import type * as CodeOfConductForm from './CodeOfConductForm.ts'

export const CodeOfConductPage = ({
  commentId,
  form,
  locale,
}: {
  commentId: Uuid.Uuid
  form: CodeOfConductForm.CodeOfConductForm
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      translate(locale, 'write-comment-flow', 'codeOfConductTitle')(),
      errorPrefix(locale, form._tag === 'InvalidForm'),
      plainText,
    ),
    nav: html`
      <a href="${Routes.WriteCommentCompetingInterests.href({ commentId })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentCodeOfConduct.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${Either.isLeft(form.agree)
                    ? html`
                        <li>
                          <a href="#agree-yes">
                            ${pipe(
                              Match.value(form.agree.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorFollowingCodeOfConduct')(),
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
              <h1>${translate(locale, 'write-comment-flow', 'codeOfConductTitle')()}</h1>
            </legend>

            <p id="agree-tip" role="note">
              ${rawHtml(
                translate(
                  locale,
                  'write-comment-flow',
                  'codeOfConductTip',
                )({
                  link: text => html`<a href="${Routes.CodeOfConduct}">${text}</a>`.toString(),
                }),
              )}
            </p>

            <details>
              <summary><span>${translate(locale, 'write-comment-flow', 'examplesExpectedBehaviors')()}</span></summary>

              <div>
                <ul>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorLanguage')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorConstructive')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorRespectful')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorGraceful')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorCommunity')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'expectedBehaviorEmpathy')()}</li>
                </ul>
              </div>
            </details>

            <details>
              ${
                // eslint-disable-next-line no-comments/disallowComments
                // prettier-ignore
                html`<summary><span>${translate(locale, 'write-comment-flow', 'examplesUnacceptableBehaviors')()}</span></summary>`
              }

              <div>
                <ul>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorAttacks')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorUnconstructive')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorHarassment')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorConfidential')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorSexual')()}</li>
                  <li>${translate(locale, 'write-comment-flow', 'unacceptableBehaviorOther')()}</li>
                </ul>
              </div>
            </details>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.agree)
              ? html`
                  <div class="error-message" id="agree-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${pipe(
                      Match.value(form.agree.left),
                      Match.tag('Missing', () =>
                        translate(locale, 'write-comment-flow', 'errorFollowingCodeOfConduct')(),
                      ),
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
              <span>${translate(locale, 'write-comment-flow', 'followingCodeOfConduct')()} </span>
            </label>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentCodeOfConduct.href({ commentId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
  })
