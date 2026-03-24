import { Array, flow, Option, pipe, Struct } from 'effect'
import rtlDetect from 'rtl-detect'
import * as Datasets from '../../../Datasets/index.ts'
import { fixHeadingLevels, html, plainText, rawHtml, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import { renderDate } from '../../../time.ts'
import type { User } from '../../../user.ts'
import { PageResponse } from '../../Response/index.ts'

export const ReviewThisDatasetPage = ({
  dataset,
  locale,
  user,
}: {
  dataset: Datasets.Dataset
  locale: SupportedLocale
  user: Option.Option<User>
}) => {
  const t = translate(locale, 'review-a-dataset-flow')

  return PageResponse({
    title: plainText(t('reviewADataset')()),
    nav: html`
      <a href="${Routes.DatasetReviews.href({ datasetId: dataset.id })}" class="back"
        ><span>${t('backToDataset')()}</span></a
      >
    `,
    main: html`
      <h1>${t('reviewADataset')()}</h1>

      <article class="preview" tabindex="0" aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title" lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}">
            ${dataset.title.text}
          </h2>

          <div class="byline">
            ${rawHtml(
              t('authoredBy')({
                authors: pipe(dataset.authors, Array.map(Struct.get('name')), formatList(locale)).toString(),
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
              <dd class="doi" translate="no">${dataset.id.value}</dd>
            </div>
          </dl>
        </header>

        ${dataset.abstract
          ? html`
              <div lang="${dataset.abstract.language}" dir="${rtlDetect.getLangDir(dataset.abstract.language)}">
                ${fixHeadingLevels(2, dataset.abstract.text)}
              </div>
            `
          : ''}
      </article>

      <p>
        ${rawHtml(
          t('youCanWriteAPrereview')({
            dataset: html`<cite lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}"
              >${dataset.title.text}</cite
            >`.toString(),
          }),
        )}
      </p>

      ${Option.match(user, {
        onSome: () => '',
        onNone: () => html`
          <h2>${t('beforeStart')()}</h2>

          <p>${t('orcidIdLogIn')()}</p>

          <details>
            <summary><span>${t('whatIsOrcidIdHeading')()}</span></summary>

            <div>
              <p>
                ${rawHtml(
                  t('whatIsOrcidId')({
                    link: text => html`<a href="https://orcid.org/"><dfn>${text}</dfn></a>`.toString(),
                  }),
                )}
              </p>
            </div>
          </details>
        `,
      })}

      <a href="${Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id })}" role="button" draggable="false"
        >${translate(locale, 'forms', 'startButton')()}</a
      >
    `,
    canonical: Routes.ReviewThisDataset.href({ datasetId: dataset.id }),
  })
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
