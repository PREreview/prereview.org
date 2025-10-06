import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { preprintReviewsMatch, writeReviewReviewTypeMatch } from '../../routes.ts'
import { errorPrefix, errorSummary } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface ReviewTypeForm {
  readonly reviewType: E.Either<MissingE, 'questions' | 'freeform' | 'already-written' | undefined>
}

export function reviewTypeForm(preprint: PreprintTitle, form: ReviewTypeForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('howWouldYouLikeToStart')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(preprintReviewsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${t('backToPreprint')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewReviewTypeMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.reviewType) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(E.isLeft(form.reviewType) ? 'aria-invalid="true" aria-errormessage="review-type-error"' : '')}
          >
            <legend>
              <h1>${t('howWouldYouLikeToStart')()}</h1>
            </legend>

            ${E.isLeft(form.reviewType)
              ? html`
                  <div class="error-message" id="review-type-error">
                    <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.reviewType.left, {
                      MissingE: () => t('selectHowToStart')(),
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="reviewType"
                    id="review-type-questions"
                    type="radio"
                    value="questions"
                    aria-describedby="review-type-tip-questions"
                    ${match(form.reviewType)
                      .with({ right: 'questions' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('withPrompts')()}</span>
                </label>
                <p id="review-type-tip-questions" role="note">${t('weWillAskQuestions')()}</p>
              </li>
              <li>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="freeform"
                    aria-describedby="review-type-tip-freeform"
                    ${match(form.reviewType)
                      .with({ right: 'freeform' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('withTemplate')()}</span>
                </label>
                <p id="review-type-tip-freeform" role="note">${t('weWillTemplate')()}</p>
              </li>
              <li>
                <span>${translate(locale, 'forms', 'radioSeparatorLabel')()}</span>
                <label>
                  <input
                    name="reviewType"
                    type="radio"
                    value="already-written"
                    ${match(form.reviewType)
                      .with({ right: 'already-written' }, () => 'checked')
                      .otherwise(() => '')}
                  />
                  <span>${t('alreadyWritten')()}</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>${translate(locale, 'forms', 'continueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: format(writeReviewReviewTypeMatch.formatter, { id: preprint.id }),
    js: error ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: ReviewTypeForm) =>
  E.isLeft(form.reviewType)
    ? html`
        <li>
          <a href="#review-type-questions">
            ${Match.valueTags(form.reviewType.left, {
              MissingE: () => translate(locale, 'write-review', 'selectHowToStart')(),
            })}
          </a>
        </li>
      `
    : html``
