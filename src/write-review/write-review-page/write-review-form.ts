import { identity } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import markdownIt from 'markdown-it'
import { P, match } from 'ts-pattern'
import { type InvalidE, type MissingE, hasAnError } from '../../form.js'
import { type Html, html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewReviewMatch, writeReviewReviewTypeMatch } from '../../routes.js'
import { template } from './template.js'
import { turndown } from './turndown.js'

export interface WriteReviewForm {
  readonly review: E.Either<MissingE | InvalidE, Html | undefined>
}

export const writeReviewForm = (preprint: PreprintTitle, form: WriteReviewForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? Status.BadRequest : Status.OK,
    title: plainText(t('write-review', 'writeYourReview')({ error: error ? identity : () => '' })),
    nav: html`
      <a href="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('write-review', 'backNav')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${t('write-review', 'thereIsAProblem')()}</h2>
                <ul>
                  ${E.isLeft(form.review)
                    ? html`
                        <li>
                          <a href="#review">
                            ${match(form.review.left)
                              .with({ _tag: P.union('MissingE', 'InvalidE') }, () =>
                                t('write-review', 'enterYourReviewError')({ error: () => '' }),
                              )
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
          <h1>
            <label id="review-label" for="review">${t('write-review', 'writeYourReview')({ error: () => '' })}</label>
          </h1>

          <p id="review-tip" role="note">
            ${rawHtml(
              t(
                'write-review',
                'writeReviewSupport',
              )({ link: text => html`<a href="https://content.prereview.org/resources/">${text}</a>`.toString() }),
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
                  ${match(form.review.left)
                    .with({ _tag: P.union('MissingE', 'InvalidE') }, () =>
                      rawHtml(t('write-review', 'enterYourReviewError')({ error: visuallyHidden })),
                    )
                    .exhaustive()}
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

        <button>${t('write-review', 'saveAndContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewMatch.formatter, { id: preprint.id }),
    js: error ? ['html-editor.js', 'error-summary.js', 'editor-toolbar.js'] : ['html-editor.js', 'editor-toolbar.js'],
  })
}

const visuallyHidden = (text: string): string => html`<span class="visually-hidden">${text}</span>`.toString()
