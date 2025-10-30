import { Array, flow, Match, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import { html, plainText, rawHtml, type Html } from '../html.ts'
import { translate, type SupportedLocale } from '../locales/index.ts'
import * as Personas from '../Personas/index.ts'
import * as PreprintServers from '../PreprintServers/index.ts'
import { PageResponse } from '../Response/index.ts'
import * as Routes from '../routes.ts'
import { myPrereviewsMatch, profileMatch, reviewMatch } from '../routes.ts'
import { renderDate } from '../time.ts'
import { ProfileId } from '../types/index.ts'
import { getSubfieldName } from '../types/subfield.ts'
import type { User } from '../user.ts'
import type { Prereview } from './prereviews.ts'

export type { Prereview } from './prereviews.ts'

export interface ListOfPrereviews {
  readonly _tag: 'ListOfPrereviews'
  readonly prereviews: Array.NonEmptyReadonlyArray<Prereview>
  readonly user: User
}

export const ListOfPrereviews = (args: Omit<ListOfPrereviews, '_tag'>): ListOfPrereviews => ({
  _tag: 'ListOfPrereviews',
  ...args,
})

export const toResponse = ({ prereviews, user }: ListOfPrereviews, locale: SupportedLocale) =>
  PageResponse({
    title: plainText(translate(locale, 'my-prereviews-page', 'myPrereviews')()),
    main: html`
      <h1>${translate(locale, 'my-prereviews-page', 'myPrereviews')()}</h1>

      <div class="inset">
        <p>${translate(locale, 'my-prereviews-page', 'onlyYouCanSee')()}</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(user.orcid) })}" class="forward"
            ><span>${translate(locale, 'my-prereviews-page', 'viewPublicProfile')()}</span></a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPseudonym(user.pseudonym) })}"
            class="forward"
            ><span>${translate(locale, 'my-prereviews-page', 'viewPseudonymProfile')()}</span></a
          >
        </div>
      </div>

      <ol class="cards">
        ${prereviews.map(
          Match.valueTags({
            RecentPreprintPrereview: prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${rawHtml(
                      translate(
                        locale,
                        'reviews-list',
                        'reviewText',
                      )({
                        numberOfReviewers: prereview.reviewers.named.length + prereview.reviewers.anonymous,
                        reviewers: pipe(
                          prereview.reviewers.named,
                          Array.appendAll(
                            prereview.reviewers.anonymous > 0
                              ? [
                                  translate(
                                    locale,
                                    'reviews-list',
                                    'otherAuthors',
                                  )({ number: prereview.reviewers.anonymous }),
                                ]
                              : [],
                          ),
                          Array.map(name => html`<b>${name}</b>`),
                          formatList(locale),
                        ).toString(),
                        preprint: html`<cite
                          dir="${rtlDetect.getLangDir(prereview.preprint.language)}"
                          lang="${prereview.preprint.language}"
                          >${prereview.preprint.title}</cite
                        >`.toString(),
                      }),
                    )}
                  </a>

                  ${prereview.subfields.length > 0
                    ? html`
                        <ul class="categories">
                          ${prereview.subfields.map(
                            subfield => html`<li><span>${getSubfieldName(subfield, locale)}</span></li>`,
                          )}
                        </ul>
                      `
                    : ''}

                  <dl>
                    <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                    <dd>${PreprintServers.getName(prereview.preprint.id)}</dd>
                  </dl>
                </article>
              </li>
            `,
            RecentDatasetPrereview: prereview => html`
              <li>
                <article>
                  <a href="${Routes.DatasetReview.href({ datasetReviewId: prereview.id })}">
                    <b>${displayPersona(prereview.author)}</b> reviewed
                    <cite dir="${rtlDetect.getLangDir(prereview.dataset.language)}" lang="${prereview.dataset.language}"
                      >${prereview.dataset.title}</cite
                    >
                  </a>

                  <dl>
                    <dt>Review published</dt>
                    <dd>${renderDate(locale)(prereview.published)}</dd>
                    <dt>Repository</dt>
                    <dd>Dryad</dd>
                  </dl>
                </article>
              </li>
            `,
          }),
        )}
      </ol>
    `,
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
  })

const displayPersona = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: Array.NonEmptyReadonlyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    Array.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
