import { Either, Function, identity, Match, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { html, plainText, rawHtml } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { Uuid } from '../../types/index.js'
import type * as CompetingInterestsForm from './CompetingInterestsForm.js'

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
    status: form._tag === 'InvalidForm' ? StatusCodes.BAD_REQUEST : StatusCodes.OK,
    title: plainText(
      translate(
        locale,
        'write-comment-flow',
        'competingInterestsTitle',
      )({ error: form._tag === 'InvalidForm' ? identity : () => '' }),
    ),
    nav: html`
      <a href="${Routes.WriteCommentChoosePersona.href({ commentId })}" class="back"
        >${translate(locale, 'write-comment-flow', 'back')()}</a
      >
    `,
    main: html`
      <form method="post" action="${Routes.WriteCommentCompetingInterests.href({ commentId })}" novalidate>
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">${translate(locale, 'write-comment-flow', 'errorSummaryHeading')()}</h2>
                <ul>
                  ${Either.isLeft(form.competingInterests)
                    ? html`
                        <li>
                          <a href="#competing-interests-no">
                            ${pipe(
                              Match.value(form.competingInterests.left),
                              Match.tag('Missing', () =>
                                translate(locale, 'write-comment-flow', 'errorCompetingInterests')({ error: () => '' }),
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
                                translate(
                                  locale,
                                  'write-comment-flow',
                                  'errorCompetingInterestsDetails',
                                )({ error: () => '' }),
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
                <h1>${translate(locale, 'write-comment-flow', 'competingInterestsTitle')({ error: () => '' })}</h1>
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
                      ${pipe(
                        Match.value(form.competingInterests.left),
                        Match.tag('Missing', () => translate(locale, 'write-comment-flow', 'errorCompetingInterests')),
                        Match.exhaustive,
                        Function.apply({
                          error: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                        }),
                        rawHtml,
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
                              ${pipe(
                                Match.value(form.competingInterestsDetails.left),
                                Match.tag('Missing', () =>
                                  translate(locale, 'write-comment-flow', 'errorCompetingInterestsDetails'),
                                ),
                                Match.exhaustive,
                                Function.apply({
                                  error: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                                }),
                                rawHtml,
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

        <button>${translate(locale, 'write-comment-flow', 'saveContinueButton')()}</button>
      </form>
    `,
    skipToLabel: 'form',
    canonical: Routes.WriteCommentCompetingInterests.href({ commentId }),
    js: form._tag === 'InvalidForm' ? ['conditional-inputs.js', 'error-summary.js'] : ['conditional-inputs.js'],
  })
