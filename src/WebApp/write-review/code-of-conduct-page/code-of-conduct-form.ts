import { Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { match } from 'ts-pattern'
import { hasAnError, type MissingE } from '../../../form.ts'
import { html, plainText, rawHtml } from '../../../html.ts'
import { type SupportedLocale, translate } from '../../../locales/index.ts'
import type { PreprintTitle } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import { writeReviewCompetingInterestsMatch, writeReviewConductMatch } from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import { backNav, prereviewOfSuffix } from '../shared-elements.ts'

export interface CodeOfConductForm {
  readonly conduct: E.Either<MissingE, 'yes' | undefined>
}

export const codeOfConductForm = (preprint: PreprintTitle, form: CodeOfConductForm, locale: SupportedLocale) => {
  const error = hasAnError(form)
  const t = translate(locale)

  return StreamlinePageResponse({
    status: error ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      t('write-review', 'codeOfConduct')(),
      prereviewOfSuffix(locale, preprint.title),
      errorPrefix(locale, error),
      plainText,
    ),
    nav: backNav(locale, format(writeReviewCompetingInterestsMatch.formatter, { id: preprint.id })),
    main: html`
      <form method="post" action="${format(writeReviewConductMatch.formatter, { id: preprint.id })}" novalidate>
        ${error ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${rawHtml(E.isLeft(form.conduct) ? 'class="error"' : '')}>
          <fieldset
            role="group"
            aria-describedby="conduct-tip"
            ${rawHtml(E.isLeft(form.conduct) ? 'aria-invalid="true" aria-errormessage="conduct-error"' : '')}
          >
            <legend>
              <h1>${t('write-review', 'codeOfConduct')()}</h1>
            </legend>

            <p id="conduct-tip" role="note">
              ${rawHtml(t('write-review', 'expectYouToAbideByCodeOfConduct')({ link: codeOfConductLink }))}
            </p>

            <details>
              <summary><span>${t('write-review', 'examplesOfExpectedBehavior')()}</span></summary>

              <div>
                <ul>
                  <li>${t('write-review', 'expectedBehaviorLanguage')()}</li>
                  <li>${t('write-review', 'expectedBehaviorFeedback')()}</li>
                  <li>${t('write-review', 'expectedBehaviorRespect')()}</li>
                  <li>${t('write-review', 'expectedBehaviorGracefulAcceptance')()}</li>
                  <li>${t('write-review', 'expectedBehaviorBestOfCommunity')()}</li>
                  <li>${t('write-review', 'expectedBehaviorEmpathy')()}</li>
                </ul>
              </div>
            </details>

            <details>
              <summary><span>${t('write-review', 'examplesOfUnacceptableBehavior')()}</span></summary>

              <div>
                <ul>
                  <li>${t('write-review', 'unacceptableBehaviorReviewingOwnPreprint')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorTrollingEtc')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorUnconstructive')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorHarassment')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorPublishingConfidentialInformation')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorSexualizedLanguage')()}</li>
                  <li>${t('write-review', 'unacceptableBehaviorInappropriate')()}</li>
                </ul>
              </div>
            </details>

            ${E.isLeft(form.conduct)
              ? html`
                  <div class="error-message" id="conduct-error">
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.conduct.left, {
                      MissingE: t('write-review', 'confirmCodeOfConduct'),
                    })}
                  </div>
                `
              : ''}

            <label>
              <input
                name="conduct"
                id="conduct-yes"
                type="checkbox"
                value="yes"
                ${match(form.conduct)
                  .with({ right: 'yes' }, () => 'checked')
                  .otherwise(() => '')}
              />
              <span>${t('write-review', 'iAmFollowingCodeOfConduct')()}</span>
            </label>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    js: error ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const codeOfConductLink = (text: string) => html`<a href="${Routes.CodeOfConduct}">${text}</a>`.toString()

const toErrorItems = (locale: SupportedLocale) => (form: CodeOfConductForm) => html`
  ${E.isLeft(form.conduct)
    ? html`
        <li>
          <a href="#conduct-yes">
            ${Match.valueTags(form.conduct.left, {
              MissingE: translate(locale, 'write-review', 'confirmCodeOfConduct'),
            })}
          </a>
        </li>
      `
    : ''}
`
