import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.js'
import { type Html, html, plainText, rawHtml } from '../../html.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../../routes.js'
import { turndown } from './turndown.js'

export interface PasteReviewForm {
  readonly review: E.Either<MissingE, Html | undefined>
}

export const pasteReviewForm = (preprint: PreprintTitle, form: PasteReviewForm) => {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Paste your PREreview of “${preprint.title}”`,
    nav: html`
      <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(form.review)
                    ? html`
                        <li>
                          <a href="#review">
                            ${match(form.review.left)
                              .with({ _tag: 'MissingE' }, () => 'Paste your PREreview')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.review) ? 'class="error"' : '')}>
          <h1><label id="review-label" for="review">Paste your PREreview</label></h1>

          <p id="review-tip" role="note">
            Copy your PREreview and paste it here. We’ll do our best to preserve how it looks.
          </p>

          ${E.isLeft(form.review)
            ? html`
                <div class="error-message" id="review-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.review.left)
                    .with({ _tag: 'MissingE' }, () => 'Paste your PREreview')
                    .exhaustive()}
                </div>
              `
            : ''}

          <html-editor>
            ${match(form.review)
              .with(
                { right: undefined },
                () => html` <textarea id="review" name="review" rows="20" aria-describedby="review-tip"></textarea> `,
              )
              .with(
                { right: P.select(P.not(undefined)) },
                review => html`
                  <textarea id="review" name="review" rows="20" aria-describedby="review-tip">
${turndown.turndown(review.toString())}</textarea
                  >
                  <textarea hidden disabled>${review}</textarea>
                `,
              )
              .with(
                { left: { _tag: 'MissingE' } },
                () => html`
                  <textarea
                    id="review"
                    name="review"
                    rows="20"
                    aria-describedby="review-tip"
                    aria-invalid="true"
                    aria-errormessage="review-error"
                  ></textarea>
                `,
              )
              .exhaustive()}
          </html-editor>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
  })
}
