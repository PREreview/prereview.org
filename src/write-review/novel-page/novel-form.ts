import { Match, identity, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { P, match } from 'ts-pattern'
import { type MissingE, hasAnError } from '../../form.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { writeReviewFindingsNextStepsMatch, writeReviewNovelMatch } from '../../routes.ts'
import { errorPrefix } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { prereviewOfSuffix } from '../shared-elements.ts'

export interface NovelForm {
  readonly novel: E.Either<MissingE, 'no' | 'limited' | 'some' | 'substantial' | 'highly' | 'skip' | undefined>
  readonly novelNoDetails: E.Either<never, NonEmptyString | undefined>
  readonly novelLimitedDetails: E.Either<never, NonEmptyString | undefined>
  readonly novelSomeDetails: E.Either<never, NonEmptyString | undefined>
  readonly novelSubstantialDetails: E.Either<never, NonEmptyString | undefined>
  readonly novelHighlyDetails: E.Either<never, NonEmptyString | undefined>
}

export function novelForm(preprint: PreprintTitle, form: NovelForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('advanceKnowledge')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: html`
      <a href="${format(writeReviewFindingsNextStepsMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${format(writeReviewNovelMatch.formatter, { id: preprint.id })}" novalidate>
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${E.isLeft(form.novel)
                    ? html`
                        <li>
                          <a href="#novel-highly">
                            ${Match.valueTags(form.novel.left, {
                              MissingE: () => t('selectAdvanceKnowledge')(),
                            })}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${rawHtml(E.isLeft(form.novel) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(E.isLeft(form.novel) ? 'aria-invalid="true" aria-errormessage="novel-error"' : '')}
            >
              <legend>
                <h1>${t('advanceKnowledge')()}</h1>
              </legend>

              ${E.isLeft(form.novel)
                ? html`
                    <div class="error-message" id="novel-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.novel.left, {
                        MissingE: () => t('selectAdvanceKnowledge')(),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="novel"
                      id="novel-highly"
                      type="radio"
                      value="highly"
                      aria-describedby="novel-tip-highly"
                      aria-controls="novel-highly-control"
                      ${match(form.novel)
                        .with({ right: 'highly' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('advanceKnowledgeHighlyLikely')()}</span>
                  </label>
                  <p id="novel-tip-highly" role="note">${t('advanceKnowledgeHighlyLikelyTip')()}</p>
                  <div class="conditional" id="novel-highly-control">
                    <div>
                      <label for="novel-highly-details" class="textarea"
                        >${t('advanceKnowledgeHighlyLikelyWhy')()}</label
                      >

                      <textarea name="novelHighlyDetails" id="novel-highly-details" rows="5">
${match(form.novelHighlyDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="substantial"
                      aria-describedby="novel-tip-substantial"
                      aria-controls="novel-substantial-control"
                      ${match(form.novel)
                        .with({ right: 'substantial' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('advanceKnowledgeSomewhatLikely')()}</span>
                  </label>
                  <p id="novel-tip-substantial" role="note">${t('advanceKnowledgeSomewhatLikelyTip')()}</p>
                  <div class="conditional" id="novel-substantial-control">
                    <div>
                      <label for="novel-substantial-details" class="textarea"
                        >${t('advanceKnowledgeSomewhatLikelyWhy')()}</label
                      >

                      <textarea name="novelSubstantialDetails" id="novel-substantial-details" rows="5">
${match(form.novelSubstantialDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="some"
                      aria-describedby="novel-tip-some"
                      aria-controls="novel-some-control"
                      ${match(form.novel)
                        .with({ right: 'some' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('advanceKnowledgeModeratelyLikely')()}</span>
                  </label>
                  <p id="novel-tip-some" role="note">${t('advanceKnowledgeModeratelyLikelyTip')()}</p>
                  <div class="conditional" id="novel-some-control">
                    <div>
                      <label for="novel-some-details" class="textarea"
                        >${t('advanceKnowledgeModeratelyLikelyWhy')()}</label
                      >

                      <textarea name="novelSomeDetails" id="novel-some-details" rows="5">
${match(form.novelSomeDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="limited"
                      aria-describedby="novel-tip-limited"
                      aria-controls="novel-limited-control"
                      ${match(form.novel)
                        .with({ right: 'limited' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('advanceKnowledgeNotLikely')()}</span>
                  </label>
                  <p id="novel-tip-limited" role="note">${t('advanceKnowledgeNotLikelyTip')()}</p>
                  <div class="conditional" id="novel-limited-control">
                    <div>
                      <label for="novel-limited-details" class="textarea">${t('advanceKnowledgeNotLikelyWhy')()}</label>

                      <textarea name="novelLimitedDetails" id="novel-limited-details" rows="5">
${match(form.novelLimitedDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="no"
                      aria-describedby="novel-tip-no"
                      aria-controls="novel-no-control"
                      ${match(form.novel)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('advanceKnowledgeNotAtAllLikely')()}</span>
                  </label>
                  <p id="novel-tip-no" role="note">${t('advanceKnowledgeNotAtAllLikelyTip')()}</p>
                  <div class="conditional" id="novel-no-control">
                    <div>
                      <label for="novel-no-details" class="textarea">${t('advanceKnowledgeNotAtAllLikelyWhy')()}</label>

                      <textarea name="novelNoDetails" id="novel-no-details" rows="5">
${match(form.novelNoDetails)
                          .with({ right: P.select(P.string) }, identity)
                          .otherwise(() => '')}</textarea
                      >
                    </div>
                  </div>
                </li>
                <li>
                  <span>${translate(locale, 'forms', 'radioSeparatorLabel')()}</span>
                  <label>
                    <input
                      name="novel"
                      type="radio"
                      value="skip"
                      ${match(form.novel)
                        .with({ right: 'skip' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('iDoNotKnow')()}</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}
