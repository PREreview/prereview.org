import { Array } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import { type Html, html, plainText } from '../../html.ts'
import { DefaultLocale } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import type { Temporal } from '../../types/index.ts'
import { getSubfieldName, type SubfieldId } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'

export interface ReviewRequest {
  readonly published: Temporal.PlainDate
  readonly subfields: ReadonlyArray<SubfieldId>
  readonly preprint: {
    readonly id: Preprints.PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export const ListOfReviewRequestsPage = ({
  reviewRequests,
}: {
  reviewRequests: Array.NonEmptyReadonlyArray<ReviewRequest>
}) => {
  return PageResponse({
    title: plainText`My review requests`,
    main: html`
      <h1>My review requests</h1>

      <div class="inset">
        <p>Only you can see this page.</p>
      </div>

      <ol class="cards">
        ${Array.map(
          reviewRequests,
          (request, index) => html`
            <li>
              <article aria-labelledby="request-${index}-title">
                <h2 id="request-${index}-title" class="visually-hidden">
                  Review request for
                  <cite dir="${rtlDetect.getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  >
                </h2>

                <span>
                  A review was requested for
                  <cite dir="${rtlDetect.getLangDir(request.preprint.language)}" lang="${request.preprint.language}"
                    >${request.preprint.title}</cite
                  ></span
                >

                ${Array.match(request.subfields, {
                  onNonEmpty: subfields => html`
                    <ul class="categories">
                      ${Array.map(
                        subfields,
                        subfield => html`<li><span>${getSubfieldName(subfield, DefaultLocale)}</span></li>`,
                      )}
                    </ul>
                  `,
                  onEmpty: () => '',
                })}

                <dl>
                  <dt>Request published</dt>
                  <dd>${renderDate(DefaultLocale)(request.published)}</dd>
                  <dt>Preprint server</dt>
                  <dd>${Preprints.getServerName(request.preprint.id)}</dd>
                </dl>
              </article>
            </li>
          `,
        )}
      </ol>
    `,
    canonical: Routes.MyReviewRequests,
  })
}
