import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../../Response/index.ts'
import { writeReviewAuthorsMatch, writeReviewPersonaMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export interface AuthorsForm {
  readonly moreAuthors: E.Either<MissingE, 'yes' | 'yes-private' | 'no' | undefined>
  readonly moreAuthorsApproved: E.Either<MissingE, 'yes' | undefined>
}

export function authorsForm(preprint: PreprintTitle, form: AuthorsForm, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('write-review', 'didYouReviewWithAnyoneElse')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewPersonaMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.moreAuthors) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="more-authors-tip"
              ${rawHtml(E.isLeft(form.moreAuthors) ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '')}
            >
              <legend>
                <h1>${t('write-review', 'didYouReviewWithAnyoneElse')()}</h1>
              </legend>

              <p id="more-authors-tip" role="note">${t('write-review', 'thisCanIncludePeopleWho')()}</p>

              ${E.isLeft(form.moreAuthors)
                ? html`
                    <div class="error-message" id="more-authors-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.moreAuthors.left, {
                        MissingE: t('write-review', 'selectYesIfYouReviewedWithSomeoneElse'),
                      })}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      id="more-authors-no"
                      type="radio"
                      value="no"
                      ${match(form.moreAuthors)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'noIReviewedAlone')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      type="radio"
                      value="yes-private"
                      ${match(form.moreAuthors)
                        .with({ right: 'yes-private' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'yesButDoNotWantToBeListed')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="moreAuthors"
                      type="radio"
                      value="yes"
                      aria-controls="more-authors-yes-control"
                      ${match(form.moreAuthors)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'yesAndWantToBeListed')()}</span>
                  </label>
                  <div class="conditional" id="more-authors-yes-control">
                    <div ${rawHtml(E.isLeft(form.moreAuthorsApproved) ? 'class="error"' : '')}>
                      ${E.isLeft(form.moreAuthorsApproved)
                        ? html`
                            <div class="error-message" id="more-authors-approved-error">
                              <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                              ${Match.valueTags(form.moreAuthorsApproved.left, {
                                MissingE: translate(locale, 'write-review', 'confirmOtherAuthorsHaveReadAndApproved'),
                              })}
                            </div>
                          `
                        : ''}

                      <label>
                        <input
                          name="moreAuthorsApproved"
                          id="more-authors-approved-yes"
                          type="checkbox"
                          value="yes"
                          ${match(form.moreAuthorsApproved)
                            .with({ right: 'yes' }, () => 'checked')
                            .with({ right: undefined }, () => '')
                            .with(
                              { left: { _tag: 'MissingE' } },
                              () => html`aria-invalid="true" aria-errormessage="more-authors-approved-error"`,
                            )
                            .exhaustive()}
                        />
                        <span>${t('write-review', 'theyHaveReadAndApproved')()}</span>
                      </label>
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipToLabel: 'form',
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: AuthorsForm) => html`
  ${E.isLeft(form.moreAuthors)
    ? html`
        <li>
          <a href="#more-authors-no">
            ${Match.valueTags(form.moreAuthors.left, {
              MissingE: translate(locale, 'write-review', 'selectYesIfYouReviewedWithSomeoneElse'),
            })}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.moreAuthorsApproved)
    ? html`
        <li>
          <a href="#more-authors-approved-yes">
            ${Match.valueTags(form.moreAuthorsApproved.left, {
              MissingE: translate(locale, 'write-review', 'confirmOtherAuthorsHaveReadAndApproved'),
            })}
          </a>
        </li>
      `
    : ''}
`
