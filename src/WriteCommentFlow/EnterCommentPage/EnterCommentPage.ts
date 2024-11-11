import { absurd, Either, Function, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { identity } from 'fp-ts/lib/function.js'
import { StatusCodes } from 'http-status-codes'
import { type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as EnterCommentForm from './EnterCommentForm.js'
import { Turndown } from './Turndown.js'

export const EnterCommentPage = ({
  commentId,
  form,
  locale,
  prereviewId,
}: {
  commentId: Uuid.Uuid
  form: EnterCommentForm.EnterCommentForm
  locale: SupportedLocale
  prereviewId: number
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: plainText(
      translate(
        locale,
        'write-comment-flow',
        'enterYourCommentTitle',
      )({ error: form._tag === 'InvalidForm' ? identity : () => '' }),
    ),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="back"
        >${translate(locale, 'write-comment-flow', 'backToPrereview')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentEnterComment.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-comment-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.comment)
                    ? html`
                        <li>
                          <a href="#comment">
                            ${pipe(
                              Match.value(form.comment.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorEnterComment')({ error: () => '' }),
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
            <label id="comment-label" for="comment"
              >${translate(locale, 'write-comment-flow', 'enterYourCommentTitle')({ error: () => '' })}</label
            >
          </h1>

          ${form._tag === 'InvalidForm' && Either.isLeft(form.comment)
            ? html`
                <div class="error-message" id="comment-error">
                  ${pipe(
                    Match.value(form.comment.left),
                    Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorEnterComment')),
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
              Match.tag('EmptyForm', () => html`<textarea id="comment" name="comment" rows="20"></textarea>`),
              Match.tag('InvalidForm', form =>
                Either.match(form.comment, {
                  onLeft: () => html`
                    <textarea
                      id="comment"
                      name="comment"
                      rows="20"
                      aria-invalid="true"
                      aria-errormessage="comment-error"
                    ></textarea>
                  `,
                  onRight: absurd<Html>,
                }),
              ),
              Match.tag(
                'CompletedForm',
                form => html`
                  <textarea id="comment" name="comment" rows="20">
${Turndown.turndown(form.comment.toString())}</textarea
                  >
                  <textarea hidden disabled>${form.comment}</textarea>
                `,
              ),
              Match.exhaustive,
            )}
          </html-editor>
        </div>

        <button>${translate(locale, 'write-comment-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentEnterComment.href({ commentId }),
    js:
      form._tag === 'InvalidForm'
        ? ['html-editor.js', 'editor-toolbar.js', 'error-summary.js']
        : ['html-editor.js', 'editor-toolbar.js'],
  })
