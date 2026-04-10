import { Array } from 'effect'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type * as ReviewRequests from '../../ReviewRequests/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'

export const ListOfReviewRequestsPage = ({
  locale,
  reviewRequests,
}: {
  locale: SupportedLocale
  reviewRequests: Array.NonEmptyReadonlyArray<ReviewRequests.ReviewRequestForPrereviewer>
}) => {
  const t = translate(locale, 'my-review-requests-page')

  return PageResponse({
    title: plainText(t('myReviewRequests')()),
    main: html`
      <h1>${t('myReviewRequests')()}</h1>

      <div class="inset">
        <p>${t('onlyYouCanSee')()}</p>
      </div>

      <ol class="cards">
        ${Array.map(
          reviewRequests,
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  ${rawHtml(
                    t(
                      'requests-list',
                      'requestTitle',
                    )({
                      preprint: html`<cite
                        dir="${rtlDetect.getLangDir(request.preprint.language)}"
                        lang="${request.preprint.language}"
                        >${request.preprint.title}</cite
                      >`.toString(),
                    }),
                  )}
                </h2>

                <span>
                  ${rawHtml(
                    t(
                      'requests-list',
                      'requestText',
                    )({
                      preprint: html`<cite
                        dir="${rtlDetect.getLangDir(request.preprint.language)}"
                        lang="${request.preprint.language}"
                        >${request.preprint.title}</cite
                      >`.toString(),
                    }),
                  )}</span
                >

                ${Array.match(request.subfields, {
                  onNonEmpty: subfields => html`
                    <ul class="categories">
                      ${Array.map(
                        subfields,
                        subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                      )}
                    </ul>
                  `,
                  onEmpty: () => '',
                })}

                <dl>
                  <dt>${t('requests-list', 'requestPublished')()}</dt>
                  <dd>${renderDate(locale)(request.published)}</dd>
                  <dt>${t('requests-list', 'requestServer')()}</dt>
                  <dd>${Preprints.getServerName(request.preprint.id)}</dd>
                </dl>
              </article>
            </li>
          `,
        )}
      </ol>
    `,
    canonical: Routes.MyReviewRequests,
    current: 'my-review-requests',
  })
}
