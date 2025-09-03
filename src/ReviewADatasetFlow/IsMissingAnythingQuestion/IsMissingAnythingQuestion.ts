import { Match, Option, String } from 'effect'
import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/uuid.js'
import type { IsMissingAnythingForm } from './IsMissingAnythingForm.js'

export const IsMissingAnythingQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: IsMissingAnythingForm
}) => {
  return StreamlinePageResponse({
    title: plainText`What else, if anything, would it be helpful for the researcher to include with this dataset to make it easier to find, understand and reuse in ethical and responsible ways?`,
    nav: html`
      <a href="${Routes.ReviewADatasetIsReadyToBeShared.href({ datasetReviewId })}" class="back"><span>Back</span></a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId })}" novalidate>
        <div>
          <h1>
            <label id="is-missing-anything-label" for="is-missing-anything">
              What else, if anything, would it be helpful for the researcher to include with this dataset to make it
              easier to find, understand and reuse in ethical and responsible ways? (optional)</label
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

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetIsMissingAnything.href({ datasetReviewId }),
    skipToLabel: 'form',
  })
}
