import { Array, flow, Match, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import { getClubName } from '../../Clubs/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { type Html, html, rawHtml } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { type SupportedLocale, translate } from '../../locales/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import type { RecentDatasetPrereview } from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { reviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import type { Name } from '../../types/Name.ts'
import type { NonEmptyString } from '../../types/NonEmptyString.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import type { Prereviews } from './prereviews.ts'

export function renderListOfPrereviews(prereviews: Prereviews, name: Name | undefined, locale: SupportedLocale) {
  return Array.match(prereviews, {
    onEmpty: () => html`
      <div class="inset">
        <p>
          ${
            name
              ? translate(locale, 'profile-page', 'noResults')({ name })
              : translate(locale, 'profile-page', 'noResultsAnonymous')()
          }
        </p>

        <p>${translate(locale, 'profile-page', 'appearHere')()}</p>
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
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'reviews-list',
                            'clubReviewText',
                          )({
                            club: html`<b ${languageAttributesFor(getClubName(prereview.club).language)}
                              >${getClubName(prereview.club).text}</b
                            >`,
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
                          })
                        : translate(
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
                          })
                    }
                  </a>

                  ${
                    prereview.subfields.length > 0
                      ? html`
                          <ul class="categories">
                            ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
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
                    ${
                      prereview.club
                        ? translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewTextInClub',
                          )({
                            club: html`<b ${languageAttributesFor(getClubName(prereview.club).language)}
                              >${getClubName(prereview.club).text}</b
                            >`,
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                        : translate(
                            locale,
                            'dataset-reviews-list',
                            'reviewText',
                          )({
                            numberOfReviewers: 1 + prereview.otherAuthors.length + prereview.anonymousAuthors,
                            reviewer: authorList(prereview, locale),
                            dataset: html`<cite ${languageAttributesFor(prereview.dataset.language)}
                              >${prereview.dataset.title}</cite
                            >`,
                          })
                    }
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
  })
}

const authorList = (datasetReview: RecentDatasetPrereview, locale: SupportedLocale) => {
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
