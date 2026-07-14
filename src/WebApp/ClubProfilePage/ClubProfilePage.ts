import { Array, flow, Match, pipe, String, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import type { Club, ClubId } from '../../Clubs/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import assets from '../../manifest.json' with { type: 'json' }
import * as Preprints from '../../Preprints/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import type * as Prereviews from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { profileMatch, reviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { ProfileId } from '../../types/index.ts'
import type { Name } from '../../types/Name.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'

export type ClubDetails = Omit<Club, 'leads'> & {
  readonly leads: Array.NonEmptyReadonlyArray<{ readonly name: Name; readonly orcid: OrcidId }>
}

export function createPage({
  club,
  id,
  prereviews,
  locale,
}: {
  club: ClubDetails
  id: ClubId
  prereviews: ReadonlyArray<Prereviews.RecentPreprintPrereview | Prereviews.RecentDatasetPrereview>
  locale: SupportedLocale
}) {
  return PageResponse({
    title: plainText`${club.name.text}`,
    main: html`
      <h1 ${languageAttributesFor(club.name.language)}>${club.name.text}</h1>

      ${pipe(
        Match.value(club.slug),
        Match.when(
          String.startsWith('asapbio-'),
          () => html`
            <img
              src="${assets['asapbio.svg'].path}"
              width="${assets['asapbio.svg'].width}"
              height="${assets['asapbio.svg'].height}"
              alt="ASAPbio"
              class="club-logo"
            />
          `,
        ),
        Match.when(
          'jmir-publications',
          () => html`
            <a href="https://jmirpublications.com/"
              ><img
                src="${assets['jmir.svg'].path}"
                width="${assets['jmir.svg'].width}"
                height="${assets['jmir.svg'].height}"
                alt="JMIR Publications"
                class="club-logo"
            /></a>
          `,
        ),
        Match.when(
          'kone-consult',
          () =>
            html`<img
              src="${assets['kone-consult.svg'].path}"
              width="${assets['kone-consult.svg'].width}"
              height="${assets['kone-consult.svg'].height}"
              alt=""
              class="club-logo"
            />`,
        ),
        Match.when(
          'translate-science',
          () =>
            html`<img
              src="${assets['translate-science.png'].path}"
              width="${assets['translate-science.png'].width}"
              height="${assets['translate-science.png'].height}"
              alt=""
              class="club-logo"
            />`,
        ),
        Match.orElse(() => ''),
      )}

      <div ${languageAttributesFor(club.description.language)}>${club.description.text}</div>

      <dl>
        <dt>${translate(locale, 'club-profile-page', 'clubLeads')()}</dt>
        <dd>
          ${pipe(
            club.leads,
            Array.map(
              lead =>
                html`<a
                  href="${format(profileMatch.formatter, { profile: ProfileId.forOrcid(lead.orcid) })}"
                  class="orcid"
                  dir="auto"
                  >${lead.name}</a
                >`,
            ),
            formatList(locale),
          )}
        </dd>
      </dl>

      ${
        club.contact
          ? html`<a href="mailto:${club.contact}" class="button"
              >${translate(locale, 'club-profile-page', 'contactClub')()}</a
            >`
          : ''
      }
      ${
        club.joinLink
          ? html`<a href="${club.joinLink.href}" class="button"
              >${translate(locale, 'club-profile-page', 'joinClub')()}</a
            > `
          : ''
      }

      <h2>${translate(locale, 'club-profile-page', 'prereviews')()}</h2>

      ${Array.match(prereviews, {
        onEmpty: () => html`
          <div class="inset">
            <p>
              ${translate(locale, 'club-profile-page', 'noResults')({ name: html`<span ${languageAttributesFor(club.name.language)}>${club.name.text}</span>` })}
            </p>

            <p>${translate(locale, 'club-profile-page', 'appearHere')()}</p>
          </div>
        `,
        onNonEmpty: prereviews => html`
          <ol class="cards">
            ${prereviews.map(
              Match.valueTags({
                RecentPreprintPrereview: prereview => html`
                  <li>
                    <article>
                      <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                        ${translate(
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
                            Array.map(name => html`<b dir="auto">${name}</b>`),
                            formatList(locale),
                          ),
                          preprint: html`<cite ${languageAttributesFor(prereview.preprint.language)}
                            >${prereview.preprint.title}</cite
                          >`,
                        })}
                      </a>

                      ${
                        prereview.subfields.length > 0
                          ? html`
                              <ul class="categories">
                                ${prereview.subfields.map(
                                  subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`,
                                )}
                              </ul>
                            `
                          : ''
                      }

                      <dl>
                        <dt>${translate(locale, 'reviews-list', 'reviewPublished')()}</dt>
                        <dd>${renderDate(locale)(prereview.published)}</dd>
                        <dt>${translate(locale, 'reviews-list', 'reviewServer')()}</dt>
                        <dd>${Preprints.getServerName(prereview.preprint.id)}</dd>
                      </dl>
                    </article>
                  </li>
                `,
                RecentDatasetPrereview: prereview => html`
                  <li>
                    <article>
                      <a href="${Routes.DatasetReview.href({ datasetReviewId: prereview.id })}">
                        ${translate(
                          locale,
                          'dataset-reviews-list',
                          'reviewText',
                        )({
                          numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                          reviewer: authorList(prereview, locale),
                          dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                            >${prereview.dataset.title}</cite
                          >`,
                        })}
                      </a>

                      <dl>
                        <dt>${translate(locale, 'dataset-reviews-list', 'reviewPublished')()}</dt>
                        <dd>${renderDate(locale)(prereview.published)}</dd>
                        <dt>${translate(locale, 'dataset-reviews-list', 'repository')()}</dt>
                        <dd>${Datasets.getRepositoryName(prereview.dataset.id)}</dd>
                      </dl>
                    </article>
                  </li>
                `,
              }),
            )}
          </ol>
        `,
      })}
    `,
    canonical: Routes.ClubProfile.href({ id }),
  })
}

const authorList = (datasetReview: Prereviews.RecentDatasetPrereview, locale: SupportedLocale) => {
  const list: Array.NonEmptyArray<Html | NonEmptyString> = Array.map(
    Array.make(datasetReview.author, ...datasetReview.otherAuthors),
    displayPersona,
  )

  if (datasetReview.anonymousAuthors > 0) {
    list.push(translate(locale, 'dataset-reviews-list', 'otherAuthors')({ number: datasetReview.anonymousAuthors }))
  }

  return formatList(locale)(Array.map(list, name => html`<b dir="auto">${name}</b>`))
}

const displayPersona = Prereviewers.matchPersona({
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
