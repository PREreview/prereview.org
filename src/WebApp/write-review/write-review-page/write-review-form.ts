import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import { type InvalidE, type MissingE, hasAnError } from '../../../form.ts'
import { type Html, html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import * as Routes from '../../../routes.ts'
import { writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../../../routes.ts'
import { errorPrefix } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { template } from './template.ts'
import { turndown } from './turndown.ts'

export interface WriteReviewForm {
  readonly review: E.Either<MissingE | InvalidE, Html | undefined>
}

export const writeReviewForm = (preprint: PreprintTitle, form: WriteReviewForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(t('write-review', 'writeYourReview')(), errorPrefix(locale, error), plainText),
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
                              MissingE: () => t('write-review', 'enterYourReviewError')(),
                              InvalidE: () => t('write-review', 'enterYourReviewError')(),
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
            <label id="review-label" for="review">${t('write-review', 'writeYourReview')()}</label>
          </h1>

          <p id="review-tip" role="note">
            ${rawHtml(
              t(
                'write-review',
                'writeReviewSupport',
              )({ link: text => html`<a href="${Routes.Resources}">${text}</a>`.toString() }),
            )}
          </p>

          <details>
            <summary><span>${t('write-review', 'goodBehaviorExamples')()}</span></summary>

            <div>
              <ul>
                <li>${t('write-review', 'goodBehaviorRespectful')()}</li>
                <li>${t('write-review', 'goodBehaviorHumble')()}</li>
                <li>${t('write-review', 'goodBehaviorActionable')()}</li>
              </ul>
            </div>
          </details>

          <details>
            <summary><span>${t('write-review', 'reviewSectionsExamples')()}</span></summary>

            <div>
              <ol>
                <li>${t('write-review', 'beginSummary')()}</li>
                <li>${t('write-review', 'sharePositiveFeedback')()}</li>
                <li>${t('write-review', 'shareConcerns')()}</li>
              </ol>
            </div>
          </details>

          ${E.isLeft(form.review)
            ? html`
                <div class="error-message" id="review-error">
                  <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                  ${Match.valueTags(form.review.left, {
                    MissingE: () => t('write-review', 'enterYourReviewError')(),
                    InvalidE: () => t('write-review', 'enterYourReviewError')(),
                  })}
                </div>
              `
            : ''}

          <html-editor>
            ${match(form.review)
              .with(
                { right: undefined },
                () => html`
                  <textarea id="review" name="review" rows="20" aria-describedby="review-tip">
${template(locale)}</textarea
                  >
                  <textarea hidden disabled>${markdownIt().render(template(locale))}</textarea>
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

        <button>${t('forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
  })
}
