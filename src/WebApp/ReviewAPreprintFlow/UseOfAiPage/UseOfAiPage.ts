import { Either, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewReviewTypeMatch,
  writeReviewUseOfAiMatch,
} from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as UseOfAiForm from './UseOfAiForm.ts'

export const renderUseOfAiPage = ({
  alreadyWritten,
  form,
  locale,
  moreAuthors,
  preprint,
}: {
  alreadyWritten?: 'yes' | 'no'
  form: UseOfAiForm.UseOfAiForm
  locale: SupportedLocale
  moreAuthors?: 'yes' | 'yes-private' | 'no'
  preprint: PreprintTitle
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const otherAuthors = moreAuthors !== 'no'
  const backMatch =
    alreadyWritten === 'yes'
      ? writeReviewReviewTypeMatch
      : moreAuthors === 'yes'
        ? writeReviewAddAuthorsMatch
        : writeReviewAuthorsMatch
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      html`${t('useOfAi')()} – ${t('prereviewOf')({ preprintTitle: preprint.title })}`,
      errorPrefix(locale, hasAnError),
      plainText,
    ),
    nav: html`<a href="${format(backMatch.formatter, { id: preprint.id })}" class="back"
      >${t('forms', 'backLink')()}</a
    >`,
    main: html`
      <form method="post" action="${format(writeReviewUseOfAiMatch.formatter, { id: preprint.id })}" novalidate>
        ${hasAnError ? pipe(form, toErrorItems(otherAuthors, locale), errorSummary(locale)) : ''}

        <h1>${t('useOfAi')()}</h1>

        <p>${t('discloseAiIdeas')()}</p>

        <p>${t('aiEditing')()}</p>

        <p>${t('understandHowCreated')()}</p>

        <div ${rawHtml(form._tag === 'InvalidForm' && Either.isLeft(form.generativeAiIdeas) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.generativeAiIdeas)
                ? 'aria-invalid="true" aria-errormessage="generative-ai-ideas-error"'
                : '',
            )}
          >
            <legend>
              <h2>${t(otherAuthors ? 'didAuthorsUseAi' : 'didYouUseAi')()}</h2>
            </legend>

            ${
              form._tag === 'InvalidForm' && Either.isLeft(form.generativeAiIdeas)
                ? html`
                    <div class="error-message" id="generative-ai-ideas-error">
                      <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                      ${Match.valueTags(form.generativeAiIdeas.left, {
                        Missing: () => t(otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
                      })}
                    </div>
                  `
                : ''
            }

            <ol>
              <li>
                <label>
                  <input
                    name="generativeAiIdeas"
                    id="generative-ai-ideas-no"
                    type="radio"
                    value="no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', generativeAiIdeas: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('no')()}
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="generativeAiIdeas"
                    type="radio"
                    value="yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', generativeAiIdeas: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  ${t('yes')()}
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: format(writeReviewUseOfAiMatch.formatter, { id: preprint.id }),
    skipToLabel: 'form',
    js: hasAnError ? ['error-summary.js'] : [],
  })
}

const toErrorItems = (otherAuthors: boolean, locale: SupportedLocale) => (form: UseOfAiForm.InvalidForm) => html`
  ${
    Either.isLeft(form.generativeAiIdeas)
      ? html`
          <li>
            <a href="#generative-ai-ideas-no">
              ${Match.valueTags(form.generativeAiIdeas.left, {
                Missing: () =>
                  translate(locale, 'write-review', otherAuthors ? 'selectYesIfAuthorsUsedAi' : 'selectYesIfUsedAi')(),
              })}
            </a>
          </li>
        `
      : ''
  }
`
