import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { templatePage } from '../../page.js'
import type { PreprintTitle } from '../../preprint.js'
import { writeReviewAuthorsMatch, writeReviewPersonaMatch } from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import type { User } from '../../user.js'
import { backNav, prereviewOfSuffix } from '../shared-elements.js'

export interface AuthorsForm {
  readonly moreAuthors: E.Either<MissingE, 'yes' | 'yes-private' | 'no' | undefined>
  readonly moreAuthorsApproved: E.Either<MissingE, 'yes' | undefined>
}

export function authorsForm(preprint: PreprintTitle, form: AuthorsForm, user: User, locale: SupportedLocale) {
  const error = hasAnError(form)
  const t = translate(locale)

  return templatePage({
    title: pipe(
      t('write-review', 'didYouReviewWithAnyoneElse')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    content: html`
      <nav>${backNav(locale, format(writeReviewPersonaMatch.formatter, { id: preprint.id }))}</nav>

      <main id="form">
        <form method="post" action="${format(writeReviewAuthorsMatch.formatter, { id: preprint.id })}" novalidate>
          ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

          <div ${rawHtml(E.isLeft(form.moreAuthors) ? 'class="error"' : '')}>
            <conditional-inputs>
              <fieldset
                role="group"
                aria-describedby="more-authors-tip"
                ${rawHtml(
                  E.isLeft(form.moreAuthors) ? 'aria-invalid="true" aria-errormessage="more-authors-error"' : '',
                )}
              >
                <legend>
                  <h1>${t('write-review', 'didYouReviewWithAnyoneElse')()}</h1>
                </legend>

                <p id="more-authors-tip" role="note">${t('write-review', 'thisCanIncludePeopleWho')()}</p>

                ${E.isLeft(form.moreAuthors)
                  ? html`
                      <div class="error-message" id="more-authors-error">
                        <span class="visually-hidden">Error:</span>
                        ${match(form.moreAuthors.left)
                          .with({ _tag: 'MissingE' }, t('write-review', 'selectYesIfYouReviewedWithSomeoneElse'))
                          .exhaustive()}
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
                                <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                                ${match(form.moreAuthorsApproved.left)
                                  .with(
                                    { _tag: 'MissingE' },
                                    t('write-review', 'confirmOtherAuthorsHaveReadAndApproved'),
                                  )
                                  .exhaustive()}
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
      </main>
    `,
    js: ['conditional-inputs.js', 'error-summary.js'],
    skipLinks: [[html`Skip to form`, '#form']],
    type: 'streamline',
    locale,
    user,
  })
}

const toErrorItems = (locale: SupportedLocale) => (form: AuthorsForm) => html`
  ${E.isLeft(form.moreAuthors)
    ? html`
        <li>
          <a href="#more-authors-no">
            ${match(form.moreAuthors.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'selectYesIfYouReviewedWithSomeoneElse'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
  ${E.isLeft(form.moreAuthorsApproved)
    ? html`
        <li>
          <a href="#more-authors-approved-yes">
            ${match(form.moreAuthorsApproved.left)
              .with({ _tag: 'MissingE' }, translate(locale, 'write-review', 'confirmOtherAuthorsHaveReadAndApproved'))
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
