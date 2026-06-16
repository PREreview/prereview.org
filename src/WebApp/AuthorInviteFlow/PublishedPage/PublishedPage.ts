import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import type { Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderPublishedPage = ({ reviewId, locale }: { reviewId: Uuid.Uuid; locale: SupportedLocale }) => {
  const t = translate(locale, 'author-invite-flow')

  return StreamlinePageResponse({
    title: plainText(t('nameAdded')()),
    main: html`
      <div class="panel">
        <h1>${t('nameAdded')()}</h1>
      </div>

      <h2>${t('whatHappensNext')()}</h2>

      <p>${t('ableToSeePrereviewShortly')()}</p>

      <p>
        ${t('closeWindowOrSeePrereview')({
          link: text => html`<a href="${Routes.DatasetReview.href({ datasetReviewId: reviewId })}">${text}</a>`,
        })}
      </p>
    `,
    canonical: Routes.AuthorInvitePublished.href({ reviewId }),
  })
}
