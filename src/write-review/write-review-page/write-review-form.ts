import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import { type InvalidE, type MissingE, hasAnError } from '../../form'
import { type Html, html, plainText, rawHtml } from '../../html'
import type { PreprintTitle } from '../../preprint'
import { StreamlinePageResponse } from '../../response'
import { writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../../routes'
import { template } from './template'
import { turndown } from './turndown'

export interface WriteReviewForm {
  readonly review: E.Either<MissingE | InvalidE, Html | undefined>
}

export const writeReviewForm = (preprint: PreprintTitle, form: WriteReviewForm) => {
  const error = hasAnError(form)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText`${error ? 'Error: ' : ''}Write your PREreview of “${preprint.title}”`,
    nav: html`
      <a
        href="${format(writeReviewReviewTypeMatch.formatter, {
          id: preprint.id,
        })}"
        class="back"
        >Back</a
      >
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
                              .with({ _tag: P.union('MissingE', 'InvalidE') }, () => 'Enter your PREreview')
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
          <h1><label id="review-label" for="review">Write your PREreview</label></h1>

          <p id="review-tip" role="note">
            We want to support you in contributing high-quality feedback on PREreview. Check out our
            <a href="https://content.prereview.org/resources/">tips and resources for reviewers</a>.
          </p>

          <details>
            <summary><span>Examples of good reviewer behavior</span></summary>

            <div>
              <ul>
                <li>Being respectful of the authors and their work.</li>
                <li>Being humble and aware of how you would like to receive feedback from others.</li>
                <li>Giving clear, constructive, and actionable feedback that can improve the preprint.</li>
              </ul>
            </div>
          </details>

          <details>
            <summary><span>Examples of helpful review sections</span></summary>

            <div>
              <ol>
                <li>Begin with a summary of the research and how it contributes to the field of study.</li>
                <li>Next, share your positive feedback, including the approach’s strengths and results.</li>
                <li>
                  Finally, share major and minor concerns and related clear, constructive, and actionable suggestions
                  for addressing them.
                </li>
              </ol>
            </div>
          </details>

          ${E.isLeft(form.review)
            ? html`
                <div class="error-message" id="review-error">
                  <span class="visually-hidden">Error:</span>
                  ${match(form.review.left)
                    .with({ _tag: P.union('MissingE', 'InvalidE') }, () => 'Enter your PREreview')
                    .exhaustive()}
                </div>
              `
            : ''}

          <html-editor>
            ${match(form.review)
              .with(
                { right: undefined },
                () => html`
                  <textarea id="review" name="review" rows="20" aria-describedby="review-tip">${template}</textarea>
                  <textarea hidden disabled>${markdownIt().render(template)}</textarea>
                `,
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
              .with(
                { left: { _tag: 'InvalidE', actual: P.select() } },
                review => html`
                  <textarea
                    id="review"
                    name="review"
                    rows="20"
                    aria-describedby="review-tip"
                    aria-invalid="true"
                    aria-errormessage="review-error"
                  >
${turndown.turndown(review)}</textarea
                  >
                  <textarea hidden disabled>${rawHtml(review)}</textarea>
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
