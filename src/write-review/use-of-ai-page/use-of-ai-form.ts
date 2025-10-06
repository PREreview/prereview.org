import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../form.ts'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import type { PreprintTitle } from '../../Preprints/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewReviewTypeMatch,
  writeReviewUseOfAiMatch,
} from '../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export interface UseOfAiForm {
  readonly generativeAiIdeas: E.Either<MissingE, 'yes' | 'no' | undefined>
}

export function useOfAiForm(
  preprint: PreprintTitle,
  form: UseOfAiForm,
  locale: SupportedLocale,
  moreAuthors?: 'yes' | 'yes-private' | 'no',
  askAiReviewEarly = false,
) {
  const error = hasAnError(form)
  const otherAuthors = moreAuthors !== 'no'
  const backMatch = askAiReviewEarly
    ? writeReviewReviewTypeMatch
    : moreAuthors === 'yes'
      ? writeReviewAddAuthorsMatch
      : writeReviewAuthorsMatch
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
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
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.generativeAiIdeas.left, {
                        MissingE: () =>
                          t('write-review', otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
                      })}
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
            ${Match.valueTags(form.generativeAiIdeas.left, {
              MissingE: () =>
                translate(locale, 'write-review', otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
            })}
          </a>
        </li>
      `
    : ''}
`
