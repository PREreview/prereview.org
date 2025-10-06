import { Either, Match, pipe } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import { errorPrefix } from '../../shared-translation-elements.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/index.ts'
import type * as CompetingInterestsForm from './CompetingInterestsForm.ts'

export const CompetingInterestsPage = ({
  commentId,
  form,
  locale,
}: {
  commentId: Uuid.Uuid
  form: CompetingInterestsForm.CompetingInterestsForm
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: pipe(
      translate(locale, 'write-comment-flow', 'competingInterestsTitle')(),
      errorPrefix(locale, form._tag === 'InvalidForm'),
      plainText,
    ),
    nav: html`
      <a href="${Routes.WriteCommentChoosePersona.href({ commentId })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentCompetingInterests.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'forms', 'errorSummaryTitle')()}</h2>
                <ul>
                  ${Either.isLeft(form.competingInterests)
                    ? html`
                        <li>
                          <a href="#competing-interests-no">
                            ${pipe(
                              Match.value(form.competingInterests.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorCompetingInterests')(),
                              ),
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
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorCompetingInterestsDetails')(),
                              ),
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
                <h1>${translate(locale, 'write-comment-flow', 'competingInterestsTitle')()}</h1>
              </legend>

              <p id="competing-interests-tip" role="note">
                ${translate(locale, 'write-comment-flow', 'competingInterestsTip')()}
              </p>

              <details>
                ${
                  // eslint-disable-next-line no-comments/disallowComments
                  // prettier-ignore
                  html`<summary><span>${translate(locale, 'write-comment-flow', 'examplesCompetingInterests')()}</span></summary>`
                }

                <div>
                  <ul>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsRelationship')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsCompetitor')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsWorkedWith')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsWorkPlace')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsCollaborate')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsPublishedWith')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsGrantWith')()}</li>
                    <li>${translate(locale, 'write-comment-flow', 'competingInterestsCommenter')()}</li>
                  </ul>
                </div>
              </details>

              ${form._tag === 'InvalidForm' && Either.isLeft(form.competingInterests)
                ? html`
                    <div class="error-message" id="competing-interests-error">
                      <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                      ${pipe(
                        Match.value(form.competingInterests.left),
                        Match.tag('Missing', () =>
                          translate(locale, 'write-comment-flow', 'errorCompetingInterests')(),
                        ),
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
                    <span>${translate(locale, 'write-comment-flow', 'competingInterestsNo')()}</span>
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
                    <span>${translate(locale, 'write-comment-flow', 'competingInterestsYes')()}</span>
                  </label>
                  <div class="conditional" id="competing-interests-details-control">
                    <div
                      ${rawHtml(
                        form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                          ? 'class="error"'
                          : '',
                      )}
                    >
                      <label for="competing-interests-details" class="textarea"
                        >${translate(locale, 'write-comment-flow', 'competingInterestsDetailsTitle')()}</label
                      >

                      ${form._tag === 'InvalidForm' && Either.isLeft(form.competingInterestsDetails)
                        ? html`
                            <div class="error-message" id="competing-interests-details-error">
                              <span class="visually-hidden">${translate(locale, 'forms', 'errorPrefix')()}:</span>
                              ${pipe(
                                Match.value(form.competingInterestsDetails.left),
                                Match.tag('Missing', () =>
                                  translate(locale, 'write-comment-flow', 'errorCompetingInterestsDetails')(),
                                ),
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

        <button>${translate(locale, 'forms', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentCompetingInterests.href({ commentId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
