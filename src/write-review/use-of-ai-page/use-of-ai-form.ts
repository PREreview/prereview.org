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
import { backNav } from '../shared-elements.js'

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
      `Use of Artificial Intelligence (AI) – PREreview of “${preprint.title.toString()}”`,
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(backMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewUseOfAiMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(otherAuthors), errorSummary(locale)) : ''}

        <h1>Use of Artificial Intelligence (AI)</h1>

        <p>
          We ask all reviewers to disclose the use of AI that helped them generate new ideas for their PREreview.
          Examples of generative AI tools are ChatGPT and Gemini.
        </p>

        <p>
          You don’t need to declare AI tools used purely for language editing or accessibility needs, as long as the
          ideas in your PREreview are your own.
        </p>

        <p>
          We ask this to help readers understand how the review was created: whether it is human feedback, machine
          feedback, or a mix of both. We may remove any review with ideas entirely generated by AI.
        </p>

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
                <h2>
                  Did you${otherAuthors ? ', or any of the other authors,' : ''} use AI to generate ideas for this
                  review?
                </h2>
              </legend>

              ${E.isLeft(form.generativeAiIdeas)
                ? html`
                    <div class="error-message" id="generative-ai-ideas-error">
                      <span class="visually-hidden">${t('write-review', 'error')()}:</span>
                      ${match(form.generativeAiIdeas.left)
                        .with(
                          { _tag: 'MissingE' },
                          () =>
                            `Select yes if you${otherAuthors ? ', or any of the other authors,' : ''} used AI to generate ideas for this
                  review`,
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

const toErrorItems = (otherAuthors: boolean) => (form: UseOfAiForm) => html`
  ${E.isLeft(form.generativeAiIdeas)
    ? html`
        <li>
          <a href="#generative-ai-ideas-no">
            ${match(form.generativeAiIdeas.left)
              .with(
                { _tag: 'MissingE' },
                () =>
                  `Select yes if you${otherAuthors ? ', or any of the other authors,' : ''} used AI to generate ideas for this
                  review`,
              )
              .exhaustive()}
          </a>
        </li>
      `
    : ''}
`
