import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { StatusCodes } from 'http-status-codes'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.js'
import { html, plainText, rawHtml } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import type { PreprintTitle } from '../../preprint.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorsMatch, writeReviewAuthorsMatch, writeReviewUseOfAiMatch } from '../../routes.js'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.js'
import { backNav, prereviewOfSuffix } from '../shared-elements.js'

export interface UseOfAiForm {
  readonly generativeAiIdeas: E.Either<MissingE, 'yes' | 'no' | undefined>
}

export function useOfAiForm(
  preprint: PreprintTitle,
  form: UseOfAiForm,
  locale: SupportedLocale,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = moreAuthors === 'yes' ? writeReviewAddAuthorsMatch : writeReviewAuthorsMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: pipe(
      t('write-review', 'useOfAi')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewUseOfAiMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(otherAuthors, locale), errorSummary(locale)) : ''}

        <h1>${t('write-review', 'useOfAi')()}</h1>

        <p>${t('write-review', 'discloseAiIdeas')()}</p>

        <p>${t('write-review', 'aiEditing')()}</p>

        <p>${t('write-review', 'understandHowCreated')()}</p>

        <div ${rawHtml(E.isLeft(form.generativeAiIdeas) ? 'class="error"' : '')}>
          <conditional-inputs>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.generativeAiIdeas)
                  ? 'aria-invalid="true" aria-errormessage="generative-ai-ideas-error"'
                  : '',
              )}
            >
              <legend>
                <h2>${t('write-review', otherAuthors ? 'didAuthorsUseAi' : 'didYouUseAi')()}</h2>
              </legend>

              ${E.isLeft(form.generativeAiIdeas)
                ? html`
                    <div class="error-message" id="generative-ai-ideas-error">
                      <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                      ${match(form.generativeAiIdeas.left)
                        .with({ _tag: 'MissingE' }, () =>
                          t('write-review', otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
                        )
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="generativeAiIdeas"
                      id="generative-ai-ideas-no"
                      type="radio"
                      value="no"
                      ${match(form.generativeAiIdeas)
                        .with({ right: 'no' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'no')()}</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="generativeAiIdeas"
                      type="radio"
                      value="yes"
                      ${match(form.generativeAiIdeas)
                        .with({ right: 'yes' }, () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>${t('write-review', 'yes')()}</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: error ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (otherAuthors: boolean, locale: SupportedLocale) => (form: UseOfAiForm) => html`
  ${E.isLeft(form.generativeAiIdeas)
    ? html`
        <li>
          <a href="#generative-ai-ideas-no">
            ${match(form.generativeAiIdeas.left)
              .with({ _tag: 'MissingE' }, () =>
                translate(locale, 'write-review', otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
