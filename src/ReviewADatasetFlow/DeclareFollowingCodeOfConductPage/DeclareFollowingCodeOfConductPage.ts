import { Either, Match } from 'effect'
import { html, plainText, rawHtml } from '../../html.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { Uuid } from '../../types/index.ts'
import type * as DeclareFollowingCodeOfConductForm from './DeclareFollowingCodeOfConductForm.ts'

export const DeclareFollowingCodeOfConductPage = ({
  datasetReviewId,
  form,
}: {
  datasetReviewId: Uuid.Uuid
  form: DeclareFollowingCodeOfConductForm.DeclareFollowingCodeOfConductForm
}) => {
  return StreamlinePageResponse({
    status: form._tag === 'InvalidForm' ? StatusCodes.BadRequest : StatusCodes.OK,
    title: plainText`${form._tag === 'InvalidForm' ? 'Error: ' : ''}Code of Conduct`,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId })}"
        novalidate
      >
        ${form._tag === 'InvalidForm'
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${Either.isLeft(form.followingCodeOfConduct)
                    ? html`
                        <li>
                          <a href="#following-code-of-conduct-yes">
                            ${Match.valueTags(form.followingCodeOfConduct.left, {
                              Missing: () => html`Confirm that you are following the Code&nbsp;of&nbsp;Conduct`,
                            })}
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
            aria-describedby="following-code-of-conduct-tip"
            ${rawHtml(
              form._tag === 'InvalidForm' && Either.isLeft(form.followingCodeOfConduct)
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

            ${form._tag === 'InvalidForm' && Either.isLeft(form.followingCodeOfConduct)
              ? html`
                  <div class="error-message" id="following-code-of-conduct-error">
                    <span class="visually-hidden">Error:</span>
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

        <button>Save and continue</button>
      </form>
    `,
    canonical: Routes.ReviewADatasetDeclareFollowingCodeOfConduct.href({ datasetReviewId }),
    js: form._tag === 'InvalidForm' ? ['error-summary.js'] : [],
    skipToLabel: 'form',
  })
}
