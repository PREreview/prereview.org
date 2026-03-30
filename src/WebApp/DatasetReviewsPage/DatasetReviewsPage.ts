import { Array, flow, identity, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../html.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Routes from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { Doi, ProfileId } from '../../types/index.ts'
import { TwoUpPageResponse } from '../Response/index.ts'

export type DatasetReview = Omit<DatasetReviews.PublishedReview, 'author' | 'dataset'> & {
  readonly author: Personas.Persona
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
    title: plainText(t('title')({ dataset: plainText`“${dataset.title.text}”`.toString() })),
    description: plainText`${t('authoredBy')({ authors: pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(locale)).toString(), visuallyHidden: identity })}
    ${
      dataset.abstract
        ? plainText`
          ${t('abstractHeading')()}

          ${dataset.abstract.text}
        `
        : ''
    }
      `,
    h1: rawHtml(
      t('title')({
        dataset: html`<cite lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}"
          >${dataset.title.text}</cite
        >`.toString(),
      }),
    ),
    aside: html`
      <article aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title" lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}">
            ${dataset.title.text}
          </h2>

          <div class="byline">
            ${rawHtml(
              t('authoredBy')({
                authors: pipe(dataset.authors, Array.map(displayDatasetAuthor), formatList(locale)).toString(),
                visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString(),
              }),
            )}
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
              <dt>DOI</dt>
              <dd><a href="${Doi.toUrl(dataset.id.value).href}" class="doi" translate="no">${dataset.id.value}</a></dd>
            </div>
          </dl>
        </header>

        ${dataset.abstract
          ? html`
              <h3>${t('abstractHeading')()}</h3>

              <div lang="${dataset.abstract.language}" dir="${rtlDetect.getLangDir(dataset.abstract.language)}">
                ${fixHeadingLevels(3, dataset.abstract.text)}
              </div>
            `
          : ''}

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
                        ${t('prereviewTitle')({ author: displayAuthor(datasetReview.author) })}
                      </h3>

                      <div class="byline">
                        ${rawHtml(
                          t('prereviewAuthoredBy')({
                            author: displayAuthor(datasetReview.author),
                            visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                          }),
                        )}
                      </div>
                    </header>

                    <a href="${Routes.DatasetReview.href({ datasetReviewId: datasetReview.id })}" class="more">
                      ${rawHtml(
                        t('readPrereview')({
                          author: displayAuthor(datasetReview.author),
                          visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString(),
                        }),
                      )}
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

const displayAuthor = Personas.match({
  onPublic: Struct.get('name'),
  onPseudonym: Struct.get('pseudonym'),
})

function displayDatasetAuthor({ name, orcid }: Datasets.Dataset['authors'][number]) {
  if (orcid) {
    return html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forOrcid(orcid) })}" class="orcid"
      >${name}</a
    >`
  }

  return name
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
