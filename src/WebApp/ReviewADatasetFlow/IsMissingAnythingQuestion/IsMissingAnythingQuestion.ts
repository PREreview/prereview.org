import { Match, Option, String } from 'effect'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { saveAndContinueButton } from '../../../shared-translation-elements.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import type { IsMissingAnythingForm } from './IsMissingAnythingForm.ts'

export const IsMissingAnythingQuestion = ({
  datasetReviewId,
  form,
  locale,
}: {
  datasetReviewId: Uuid
  form: IsMissingAnythingForm
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    title: plainText(t('anythingMissing')()),
    nav: html`
      <a href="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}" class="back"
        ><span>${t('forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}" novalidate>
        <div>
          <h1>
            <label id="is-missing-anything-label" for="is-missing-anything">
              ${t('anythingMissing')()} ${t('forms', 'optionalSuffix')()}</label
            >
          </h1>

          ${Match.valueTags(form, {
            EmptyForm: () => html`<textarea id="is-missing-anything" name="isMissingAnything" rows="5"></textarea>`,
            CompletedForm: form =>
              html`<textarea id="is-missing-anything" name="isMissingAnything" rows="5">
${Option.getOrElse(form.isMissingAnything, () => String.empty)}</textarea
              >`,
          })}
        </div>

        ${saveAndContinueButton(locale)}
      </form>
    `,
    canonical: Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId }),
    skipToLabel: 'form',
  })
}
