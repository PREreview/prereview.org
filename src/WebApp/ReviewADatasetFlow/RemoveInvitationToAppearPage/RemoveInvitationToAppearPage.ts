import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { errorPrefix, errorSummary, saveAndContinueButton } from '../../../shared-translation-elements.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { NonEmptyString, Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type * as RemoveInvitationToAppearForm from './RemoveInvitationToAppearForm.ts'

export const RemoveInvitationToAppearPage = ({
  authorName,
  datasetReviewId,
  invitationId,
  form,
  locale,
}: {
  authorName: NonEmptyString.NonEmptyString
  datasetReviewId: Uuid.Uuid
  invitationId: Uuid.Uuid
  form: RemoveInvitationToAppearForm.RemoveInvitationToAppearForm
  locale: SupportedLocale
}) => {
  const hasAnError = form._tag === 'InvalidForm'
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(`Are you sure you want to remove ${authorName}?`, errorPrefix(locale, hasAnError), plainText),
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetRemoveInvitationToAppear.href({ datasetReviewId, invitationId })}"
        novalidate
      >
        ${hasAnError ? pipe(form, toErrorItems(locale, authorName), errorSummary(locale)) : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.removeAuthor)
                ? 'aria-invalid="true" aria-errormessage="remove-author-error"'
                : '',
            )}
          >
            <legend>
              <h1>Are you sure you want to remove ${authorName}?</h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.removeAuthor)
              ? html`
                  <div class="error-message" id="remove-author-error">
                    <span class="visually-hidden">${t('forms', 'errorPrefix')()}:</span>
                    ${pipe(
                      Match.value(form.removeAuthor.left),
                      Match.tag('Missing', () => `Select yes if you want to remove ${authorName}`),
                      Match.exhaustive,
                    )}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="removeAuthor"
                    id="remove-author-no"
                    type="radio"
                    value="no"
                    aria-describedby="remove-author-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', removeAuthor: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    name="removeAuthor"
                    type="radio"
                    value="yes"
                    aria-describedby="remove-author-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', removeAuthor: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetAddInvitationToAppear.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}

const toErrorItems =
  (locale: SupportedLocale, authorName: NonEmptyString.NonEmptyString) =>
  (form: RemoveInvitationToAppearForm.InvalidForm) => html`
    ${Either.isLeft(form.removeAuthor)
      ? html`
          <li>
            <a href="#remove-author-no">
              ${pipe(
                Match.value(form.removeAuthor.left),
                Match.tag('Missing', () => `Select yes if you want to remove ${authorName}`),
                Match.exhaustive,
              )}
            </a>
          </li>
        `
      : ''}
  `
