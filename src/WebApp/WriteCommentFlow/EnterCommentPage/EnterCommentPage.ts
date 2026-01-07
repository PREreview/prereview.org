import { absurd, Either, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { type Html, html, plainText } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as EnterCommentForm from './EnterCommentForm.ts'
import { Turndown } from './Turndown.ts'

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
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      translate(locale, 'write-comment-flow', 'enterYourCommentTitle')(),
      errorPrefix(locale, form._tag === 'InvalidForm'),
      plainText,
    ),
    nav: html`
      <a href="${format(Routes.reviewMatch.formatter, { id: prereviewId })}" class="back"
        ><span>${translate(locale, 'write-comment-flow', 'backToPrereview')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentEnterComment.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${Either.isLeft(form.comment)
                    ? html`
                        <li>
                          <a href="#comment">
                            ${pipe(
                              Match.value(form.comment.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorEnterComment')(),
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
              >${translate(locale, 'write-comment-flow', 'enterYourCommentTitle')()}</label
            >
          </h1>

          ${form._tag === 'InvalidForm' && Either.isLeft(form.comment)
            ? html`
                <div class="error-message" id="comment-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${pipe(
                    Match.value(form.comment.left),
                    Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorEnterComment')()),
                    Match.exhaustive,
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentEnterComment.href({ commentId }),
    js:
      form._tag === 'InvalidForm'
        ? ['html-editor.js', 'editor-toolbar.js', 'error-summary.js']
        : ['html-editor.js', 'editor-toolbar.js'],
  })
