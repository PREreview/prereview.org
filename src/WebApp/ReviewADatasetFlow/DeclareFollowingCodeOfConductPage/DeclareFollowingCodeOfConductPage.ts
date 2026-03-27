import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as DeclareFollowingCodeOfConductForm from './DeclareFollowingCodeOfConductForm.ts'

export const DeclareFollowingCodeOfConductPage = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  form: DeclareFollowingCodeOfConductForm.DeclareFollowingCodeOfConductForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: hasAnError ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe('Code of Conduct', errorPrefix(locale, hasAnError), plainText),
    nav: html`
      <a href="${Routes.ReviewADatasetDeclareCompetingInterests.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale), errorSummary(locale)) : ''}

        <div ${hasAnError ? 'class="error"' : ''}>
          <fieldset
            role="group"
            aria-describedby="following-code-of-conduct-tip"
            ${rawHtml(
              hasAnError && Either.isLeft(form.followingCodeOfConduct)
                ? 'aria-invalid="true" aria-errormessage="following-code-of-conduct-error"'
                : '',
            )}
          >
            <legend>
              <h1>Code of Conduct</h1>
            </legend>

            <p id="following-code-of-conduct-tip" role="note">
              As a member of our community, we expect you to abide by the
              <a href="${Routes.CodeOfConduct}">PREreview Code&nbsp;of&nbsp;Conduct</a>.
            </p>

            <details>
              <summary><span>Examples of expected behaviors</span></summary>

              <div>
                <ul>
                  <li>Using welcoming and inclusive language.</li>
                  <li>Providing feedback that is constructive, i.e. useful, to the receiver.</li>
                  <li>Being respectful of differing viewpoints and experiences.</li>
                  <li>Gracefully accepting constructive criticism.</li>
                  <li>Focusing on what is best for the community.</li>
                  <li>Showing empathy towards other community members.</li>
                </ul>
              </div>
            </details>

            <details>
              <summary><span>Examples of unacceptable behaviors</span></summary>

              <div>
                <ul>
                  <li>Trolling, insulting or derogatory comments, and personal or political attacks.</li>
                  <li>Providing unconstructive or disruptive feedback on PREreview.</li>
                  <li>Public or private harassment.</li>
                  <li>
                    Publishing others’ confidential information, such as a physical or electronic address, without
                    explicit permission.
                  </li>
                  <li>Use of sexualized language or imagery and unwelcome sexual attention or advances.</li>
                  <li>Reviewing your own dataset.</li>
                  <li>Other conduct which could reasonably be considered inappropriate in a professional setting.</li>
                </ul>
              </div>
            </details>

            ${hasAnError && Either.isLeft(form.followingCodeOfConduct)
              ? html`
                  <div class="error-message" id="following-code-of-conduct-error">
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${Match.valueTags(form.followingCodeOfConduct.left, {
                      Missing: () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
                    })}
                  </div>
                `
              : ''}

            <label>
              <input
                name="followingCodeOfConduct"
                id="following-code-of-conduct-yes"
                type="checkbox"
                value="yes"
                ${Match.valueTags(form, {
                  CompletedForm: () => 'checked',
                  EmptyForm: () => '',
                  InvalidForm: () => '',
                })}
              />
              <span>I’m following the Code&nbsp;of&nbsp;Conduct</span>
            </label>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId }),
    js: hasAnError ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const toErrorItems = (locale: SupportedLocale) => (form: DeclareFollowingCodeOfConductForm.InvalidForm) =>
  Either.isLeft(form.followingCodeOfConduct)
    ? html`
        <li>
          <a href="#following-code-of-conduct-yes">
            ${Match.valueTags(form.followingCodeOfConduct.left, {
              Missing: () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
            })}
          </a>
        </li>
      `
    : html``
