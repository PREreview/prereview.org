import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.js'
import { type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../../routes.js'
import { errorPrefix } from '../../shared-translation-elements.js'
import * as StatusCodes from '../../StatusCodes.js'
import { turndown } from './turndown.js'

export interface PasteReviewForm {
  readonly review: E.Either<MissingE, Html | undefined>
}

export const pasteReviewForm = (preprint: PreprintTitle, form: PasteReviewForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('write-review', 'pasteYourReview')(), errorPrefix(locale, error), plainText),
    nav: html`
      <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.review)
                    ? html`
                        <li>
                          <a href="#review">
                            ${Match.valueTags(form.review.left, {
                              MissingE: () => t('write-review', 'pasteYourReviewError')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.review) ? 'class="error"' : '')}>
          <h1>
            <label id="review-label" for="review">${t('write-review', 'pasteYourReview')()}</label>
          </h1>

          <p id="review-tip" role="note">${t('write-review', 'copyAndPasteReview')()}</p>

          ${E.isLeft(form.review)
            ? html`
                <div class="error-message" id="review-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.review.left, {
                    MissingE: () => t('write-review', 'pasteYourReviewError')(),
                  })}
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

        <button>${t('forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
  })
}
