import { Array } from 'effect'
import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import type { EmailAddress } from '../../../types/EmailAddress.ts'
import type { Uuid } from '../../../types/index.ts'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const CheckInvitationsToAppearPage = ({
  datasetReviewId,
  authors,
  locale,
}: {
  datasetReviewId: Uuid.Uuid
  authors: Array.NonEmptyReadonlyArray<{ name: NonEmptyString; emailAddress: EmailAddress; invitationId: Uuid.Uuid }>
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return StreamlinePageResponse({
    status: StatusCodes.OK,
    title: plainText`You have added ${authors.length} other author${authors.length > 1 ? 's' : ''}`,
    main: html`
      <form
        method="post"
        action="${Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId })}"
        novalidate
      >
        <h1>You have added ${authors.length} other author${authors.length > 1 ? 's' : ''}</h1>

        ${Array.map(
          authors,
          (author, index) => html`
            <div class="summary-card">
              <div>
                <h2>Author ${index + 1}</h2>

                <ul>
                  <li>
                    <a
                      href="${Routes.ReviewADatasetRemoveInvitationToAppear.href({
                        datasetReviewId,
                        invitationId: author.invitationId,
                      })}"
                      >Remove <span class="visually-hidden">${author.name}</span></a
                    >
                  </li>
                </ul>
              </div>

              <dl class="summary-list">
                <div>
                  <dt><span>Name</span></dt>
                  <dd>${author.name}</dd>
                </div>
                <div>
                  <dt><span>Email address</span></dt>
                  <dd>${author.emailAddress}</dd>
                </div>
              </dl>
            </div>
          `,
        )}

        <div class="button-group" role="group">
          <button>${t('forms', 'continueButton')()}</button>
          <a href="${Routes.ReviewADatasetAddInvitationToAppear.href({ datasetReviewId })}">Add another author</a>
        </div>
      </form>
    `,
    canonical: Routes.ReviewADatasetCheckInvitationsToAppear.href({ datasetReviewId }),
    skipToLabel: 'main',
  })
}
