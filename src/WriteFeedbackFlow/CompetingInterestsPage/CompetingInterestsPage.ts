import { Either, Match, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as CompetingInterestsForm from './CompetingInterestsForm.js'

export const CompetingInterestsPage = ({
  feedbackId,
  form,
  locale,
}: {
  feedbackId: Uuid.Uuid
  form: CompetingInterestsForm.CompetingInterestsForm
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Do you have any competing interests?`,
    nav: html`
      <a href="${Routes.WriteFeedbackChoosePersona.href({ feedbackId })}" class="back"
        >${translate(locale, 'write-feedback-flow', 'back')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteFeedbackCompetingInterests.href({ feedbackId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-feedback-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.competingInterests)
                    ? html`
                        <li>
                          <a href="#competing-interests-no">
                            ${pipe(
                              Match.value(form.competingInterests.left),
                              Match.tag('Missing', () => 'Select yes if you have any competing interests'),
                              Match.exhaustive,
                            )}
                          </a>
                        </li>
                      `
                    : ''}
                  ${Either.isLeft(form.competingInterestsDetails)
                    ? html`
                        <li>
                          <a href="#competing-interests-details">
                            ${pipe(
                              Match.value(form.competingInterestsDetails.left),
                              Match.tag('Missing', () => 'Enter details of your competing interests'),
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
          <conditional-inputs>
            <fieldset
              role="group"
              aria-describedby="competing-interests-tip"
              ${rawHtml(
                form._tag === 'InvalidForm' && Either.isLeft(form.competingInterests)
                  ? 'aria-invalid="true" aria-errormessage="competing-interests-error"'
                  : '',
              )}
            >
              <legend>
                <h1>Do you have any competing interests?</h1>
              </legend>

              <p id="competing-interests-tip" role="note">
                A competing interest is anything that could interfere with the objective of the feedback on a PREreview.
              </p>

              <details>
                <summary><span>Examples</span></summary>

                <div>
                  <ul>
                    <li>You have a personal relationship with the author of the preprint.</li>
                    <li>You are a rival or competitor of the author of the preprint.</li>
                    <li>You have recently worked with the author of the preprint.</li>
                    <li>You work at the same place the author of the preprint works.</li>
                    <li>You collaborate with the author of the preprint.</li>
                    <li>You have published with the author of the preprint in the last five years.</li>
                    <li>You hold a grant with the author of the preprint or have other financial ties.</li>
                    <li>
                      Any of these same criteria hold true between you and another commenter who has already published a
                      comment on this preprint.
                    </li>
                  </ul>
                </div>
              </details>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.competingInterests)
                ? html`
                    <div class="error-message" id="competing-interests-error">
                      <span class="visually-hidden">Error:</span>
                      ${pipe(
                        Match.value(form.competingInterests.left),
                        Match.tag('Missing', () => 'Select yes if you have any competing interests'),
                        Match.exhaustive,
                      )}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      id="competing-interests-no"
                      type="radio"
                      value="no"
                      ${pipe(
                        Match.value(form),
                        Match.tag('CompletedFormNo', () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="competingInterests"
                      type="radio"
                      value="yes"
                      aria-controls="competing-interests-details-control"
                      ${pipe(
                        Match.value(form),
                        Match.tag('CompletedFormYes', () => 'checked'),
                        Match.when({ _tag: 'InvalidForm', competingInterests: { _tag: 'Right' } }, () => 'checked'),
                        Match.orElse(() => ''),
                      )}
                    />
                    <span>Yes</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div
                      ${rawHtml(
                        form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                          ? 'class="error"'
                          : '',
                      )}
                    >
                      <label for="competing-interests-details" class="textarea">What are they?</label>

                      ${form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">Error:</span>
                              ${pipe(
                                Match.value(form.competingInterestsDetails.left),
                                Match.tag('Missing', () => 'Enter details of your competing interests'),
                                Match.exhaustive,
                              )}
                            </div>
                          `
                        : ''}

                      <textarea
                        name="competingInterestsDetails"
                        id="competing-interests-details"
                        rows="5"
                        ${rawHtml(
                          form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                            ? 'aria-invalid="true" aria-errormessage="competing-interests-details-error"'
                            : '',
                        )}
                      >
${pipe(
                          Match.value(form),
                          Match.tag('CompletedFormYes', form => form.competingInterestsDetails),
                          Match.orElse(() => ''),
                        )}</textarea
                      >
                    </div>
                  </div>
                </li>
              </ol>
            </fieldset>
          </conditional-inputs>
        </div>

        <button>${translate(locale, 'write-feedback-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteFeedbackCompetingInterests.href({ feedbackId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
