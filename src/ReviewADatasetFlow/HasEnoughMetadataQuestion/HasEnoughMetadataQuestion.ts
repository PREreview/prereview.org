import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/uuid.ts'
import type { HasEnoughMetadataForm } from './HasEnoughMetadataForm.ts'

export const HasEnoughMetadataQuestion = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid
  form: HasEnoughMetadataForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Does the dataset have enough metadata?`,
    nav: html`
      <a href="${Routes.ReviewADatasetFollowsFairAndCarePrinciples.href({ datasetReviewId })}" class="back">
        <span>Back</span>
      </a>
    `,
    main: html`
      <form method="post" action="${Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.hasEnoughMetadata)
                    ? html`
                        <li>
                          <a href="#has-enough-metadata-yes">
                            ${pipe(
                              Match.value(form.hasEnoughMetadata.left),
                              Match.tag('Missing', () => 'Select if the dataset has enough metadata'),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <div ${form._tag === 'InvalidForm' ? 'class="error"' : ''}>
          <fieldset
            role="group"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.hasEnoughMetadata)
                ? 'aria-invalid="true" aria-errormessage="has-enough-metadata-error"'
                : '',
            )}
          >
            <legend>
              <h1>Does the dataset have enough metadata?</h1>
            </legend>

            ${form._tag === 'InvalidForm' && Either.isLeft(form.hasEnoughMetadata)
              ? html`
                  <div class="error-message" id="has-enough-metadata-error">
                    <span class="visually-hidden">Error:</span>
                    ${Match.valueTags(form.hasEnoughMetadata.left, {
                      Missing: () => 'Select if the dataset has enough metadata',
                    })}
                  </div>
                `
              : ''}

            <ol>
              <li>
                <label>
                  <input
                    name="hasEnoughMetadata"
                    id="has-enough-metadata-yes"
                    type="radio"
                    value="yes"
                    aria-describedby="has-enough-metadata-tip-yes"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'yes' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Yes</span>
                </label>
                <p id="has-enough-metadata-tip-yes" role="note">
                  The dataset includes enough metadata such as its datatype, tools and methods used to gather and
                  analyze the data, ethical considerations used during data collection and analysis, and support
                  documentation such as a glossary, README, or software recommendations.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasEnoughMetadata"
                    type="radio"
                    value="partly"
                    aria-describedby="has-enough-metadata-tip-partly"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'partly' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>Partly</span>
                </label>
                <p id="has-enough-metadata-tip-partly" role="note">
                  The dataset includes some of the information listed above, but more is needed to fully understand how
                  the data were gathered, analyzed, and otherwise used.
                </p>
              </li>
              <li>
                <label>
                  <input
                    name="hasEnoughMetadata"
                    type="radio"
                    value="no"
                    aria-describedby="has-enough-metadata-tip-no"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'no' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>No</span>
                </label>
                <p id="has-enough-metadata-tip-no" role="note">
                  The dataset does not include enough metadata to help understand how the data were gathered, analyzed,
                  and otherwise used.
                </p>
              </li>
              <li>
                <span>or</span>
                <label>
                  <input
                    name="hasEnoughMetadata"
                    type="radio"
                    value="unsure"
                    aria-describedby="has-enough-metadata-tip-unsure"
                    ${pipe(
                      Match.value(form),
                      Match.when({ _tag: 'CompletedForm', hasEnoughMetadata: 'unsure' }, () => 'checked'),
                      Match.orElse(() => ''),
                    )}
                  />
                  <span>I don’t know</span>
                </label>
              </li>
            </ol>
          </fieldset>
        </div>

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetHasEnoughMetadata.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
