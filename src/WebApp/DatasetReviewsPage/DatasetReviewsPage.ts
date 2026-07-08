import { Array, flow, identity, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import { getClubName } from '../../Clubs/index.ts'
import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { Doi, ProfileId } from '../../types/index.ts'
import { TwoUpPageResponse } from '../Response/index.ts'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author' | 'otherAuthors' | 'dataset'> & {
  readonly author: Personas.Persona
  readonly otherAuthors: ReadonlyArray<Personas.Persona>
  readonly anonymousAuthors: number
}

export const createDatasetReviewsPage = ({
  dataset,
  datasetReviews,
  locale,
}: {
  dataset: Datasets.Dataset
  datasetReviews: ReadonlyArray<DatasetReview>
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'dataset-reviews-page')

  return TwoUpPageResponse({
    title: plainText(t('title')({ dataset: plainText`“${dataset.title.text}”` })),
    description: plainText`${t('authoredBy')({ authors: pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(locale)), visuallyHidden: identity })}
    ${
      dataset.abstract
        ? plainText`
          ${t('abstractHeading')()}

          ${dataset.abstract.text}
        `
        : ''
    }
      `,
    h1: t('title')({
      dataset: html`<cite ${languageAttributesFor(dataset.title.language)}>${dataset.title.text}</cite>`,
    }),
    aside: html`
      <article aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title" ${languageAttributesFor(dataset.title.language)}>${dataset.title.text}</h2>

          <div class="byline">
            ${t('authoredBy')({
              authors: pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(locale)),
              visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
            })}
          </div>

          <dl>
            <div>
              <dt>${t('posted')()}</dt>
              <dd>${renderDate(locale)(dataset.posted)}</dd>
            </div>
            <div>
              <dt>${t('repository')()}</dt>
              <dd>${Datasets.getRepositoryName(dataset.id)}</dd>
            </div>

            <div>
              <dt translate="no">DOI</dt>
              <dd>
                <a href="${Doi.toUrl(dataset.id.value).href}" class="doi" dir="auto" translate="no"
                  >${dataset.id.value}</a
                >
              </dd>
            </div>
          </dl>
        </header>

        ${
          dataset.abstract
            ? html`
                <h3>${t('abstractHeading')()}</h3>

                <div ${languageAttributesFor(dataset.abstract.language)}>
                  ${fixHeadingLevels(3, dataset.abstract.text)}
                </div>
              `
            : ''
        }

        <a href="${dataset.url.href}" class="button">${t('seeDataset')()}</a>
      </article>
    `,
    main: html`
      <h2>${t('prereviews')({ numberOfPrereviews: datasetReviews.length })}</h2>

      <div class="button-group" role="group">
        <a href="${Routes.ReviewThisDataset.href({ datasetId: dataset.id })}" class="button"
          >${t('writeAPrereview')()}</a
        >
      </div>

      ${Array.match(datasetReviews, {
        onEmpty: () => '',
        onNonEmpty: datasetReviews => html`
          <ol class="cards">
            ${Array.map(
              datasetReviews,
              datasetReview => html`
                <li>
                  <article aria-labelledby="prereview-${datasetReview.id}-title">
                    <header>
                      <h3 class="visually-hidden" id="prereview-${datasetReview.id}-title">
                        ${Option.match(datasetReview.clubId, {
                          onSome: clubId =>
                            t(
                              countAuthors(datasetReview) > 1
                                ? 'prereviewTitleMultipleAuthorsInClub'
                                : 'prereviewTitleInClub',
                            )({
                              author: displayAuthor(datasetReview.author),
                              club: html`<span ${languageAttributesFor(getClubName(clubId).language)}
                                >${getClubName(clubId).text}</span
                              >`,
                            }),
                          onNone: () =>
                            t(countAuthors(datasetReview) > 1 ? 'prereviewTitleMultipleAuthors' : 'prereviewTitle')({
                              author: displayAuthor(datasetReview.author),
                            }),
                        })}
                      </h3>

                      <div class="byline">
                        ${Option.match(datasetReview.clubId, {
                          onSome: clubId =>
                            t('prereviewAuthoredByInClub')({
                              author: authorList(datasetReview, locale),
                              visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
                              club: html`<span ${languageAttributesFor(getClubName(clubId).language)}
                                >${getClubName(clubId).text}</span
                              >`,
                            }),
                          onNone: () =>
                            t('prereviewAuthoredBy')({
                              author: authorList(datasetReview, locale),
                              visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
                            }),
                        })}
                      </div>
                    </header>

                    <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="more">
                      ${Option.match(datasetReview.clubId, {
                        onSome: clubId =>
                          t(
                            countAuthors(datasetReview) > 1
                              ? 'readPrereviewMultipleAuthorsInClub'
                              : 'readPrereviewInClub',
                          )({
                            author: displayAuthor(datasetReview.author),
                            visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
                            club: html`<span ${languageAttributesFor(getClubName(clubId).language)}
                              >${getClubName(clubId).text}</span
                            >`,
                          }),
                        onNone: () =>
                          t(countAuthors(datasetReview) > 1 ? 'readPrereviewMultipleAuthors' : 'readPrereview')({
                            author: displayAuthor(datasetReview.author),
                            visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
                          }),
                      })}
                    </a>
                  </article>
                </li>
              `,
            )}
          </ol>
        `,
      })}
    `,
    canonical: Routes.DatasetReviews.href({ datasetId: dataset.id }),
    type: 'dataset',
  })
}

const authorList = (datasetReview: DatasetReview, locale: SupportedLocale) => {
  const list = Array.map(Array.make(datasetReview.author, ...datasetReview.otherAuthors), displayAuthor)

  if (datasetReview.anonymousAuthors > 0) {
    list.push(translate(locale, 'dataset-reviews-page', 'otherAuthors')({ number: datasetReview.anonymousAuthors }))
  }

  return formatList(locale)(list)
}

const displayAuthor = Personas.match({
  onPublic: ({ name }) => html`<bdi>${name}</bdi>`,
  onPseudonym: ({ pseudonym }) => html`<bdi>${pseudonym}</bdi>`,
})

function displayDatasetAuthor({ name, orcid }: Datasets.Dataset['authors'][number]) {
  if (orcid) {
    return html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}"
      class="orcid"
      dir="auto"
      >${name}</a
    >`
  }

  return html`<bdi>${name}</bdi>`
}

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

const countAuthors = (datasetReview: DatasetReview) =>
  1 + datasetReview.otherAuthors.length + datasetReview.anonymousAuthors
