import { absurd, Either, Function, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { identity } from 'fp-ts/lib/function.js'
import { StatusCodes } from 'http-status-codes'
import { type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as EnterFeedbackForm from './EnterFeedbackForm.js'
import { Turndown } from './Turndown.js'

export const EnterFeedbackPage = ({
  feedbackId,
  form,
  locale,
  prereviewId,
}: {
  feedbackId: Uuid.Uuid
  form: EnterFeedbackForm.EnterFeedbackForm
  locale: SupportedLocale
  prereviewId: number
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: plainText(
      translate(
        locale,
        'write-feedback-flow',
        'enterYourFeedbackTitle',
      )({ error: form._tag === 'InvalidForm' ? identity : () => '' }),
    ),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteFeedbackEnterFeedback.href({ feedbackId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-feedback-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.feedback)
                    ? html`
                        <li>
                          <a href="#feedback">
                            ${pipe(
                              Match.value(form.feedback.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-feedback-flow', 'errorEnterFeedback')({ error: () => '' }),
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
          <h1>
            <label id="feedback-label" for="feedback"
              >${translate(locale, 'write-feedback-flow', 'enterYourFeedbackTitle')({ error: () => '' })}</label
            >
          </h1>

          ${form._tag === 'InvalidForm' && Either.isLeft(form.feedback)
            ? html`
                <div class="error-message" id="feedback-error">
                  ${pipe(
                    Match.value(form.feedback.left),
                    Match.tag('Missing', () => translate(locale, 'write-feedback-flow', 'errorEnterFeedback')),
                    Match.exhaustive,
                    Function.apply({ error: text => html`<span class="visually-hidden">${text}</span>`.toString() }),
                    rawHtml,
                  )}
                </div>
              `
            : ''}

          <html-editor>
            ${pipe(
              Match.value(form),
              Match.tag('EmptyForm', () => html`<textarea id="feedback" name="feedback" rows="20"></textarea>`),
              Match.tag('InvalidForm', form =>
                Either.match(form.feedback, {
                  onLeft: () => html`
                    <textarea
                      id="feedback"
                      name="feedback"
                      rows="20"
                      aria-invalid="true"
                      aria-errormessage="feedback-error"
                    ></textarea>
                  `,
                  onRight: absurd<Html>,
                }),
              ),
              Match.tag(
                'CompletedForm',
                form => html`
                  <textarea id="feedback" name="feedback" rows="20">
${Turndown.turndown(form.feedback.toString())}</textarea
                  >
                  <textarea hidden disabled>${form.feedback}</textarea>
                `,
              ),
              Match.exhaustive,
            )}
          </html-editor>
        </div>

        <button>${translate(locale, 'write-feedback-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteFeedbackEnterFeedback.href({ feedbackId }),
    js:
      form._tag === 'InvalidForm'
        ? ['html-editor.js', 'editor-toolbar.js', 'error-summary.js']
        : ['html-editor.js', 'editor-toolbar.js'],
  })
