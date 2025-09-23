import { Array, flow, Option, pipe, Struct } from 'effect'
import rtlDetect from 'rtl-detect'
import type * as Datasets from '../../Datasets/index.js'
import { fixHeadingLevels, type Html, html, plainText, rawHtml } from '../../html.js'
import { DefaultLocale } from '../../locales/index.js'
import { PageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import { renderDate } from '../../time.js'
import type { User } from '../../user.js'

export const ReviewThisDatasetPage = ({ dataset, user }: { dataset: Datasets.Dataset; user: Option.Option<User> }) => {
  return PageResponse({
    title: plainText`Review a dataset`,
    nav: html`
      <a href="${Routes.DatasetReviews.href({ datasetId: dataset.id })}" class="back"><span>Back to dataset</span></a>
    `,
    main: html`
      <h1>Review a dataset</h1>

      <article class="preview" tabindex="0" aria-labelledby="dataset-title">
        <header>
          <h2 id="dataset-title" lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}">
            ${dataset.title.text}
          </h2>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(dataset.authors, Array.map(Struct.get('name')), formatList(DefaultLocale))}
          </div>

          <dl>
            <div>
              <dt>Posted</dt>
              <dd>${renderDate(DefaultLocale)(dataset.posted)}</dd>
            </div>
            <div>
              <dt>Repository</dt>
              <dd>Dryad</dd>
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
        You can write a PREreview of
        <cite lang="${dataset.title.language}" dir="${rtlDetect.getLangDir(dataset.title.language)}"
          >${dataset.title.text}</cite
        >. We’ll ask questions about the dataset to create a structured review.
      </p>

      ${Option.match(user, {
        onSome: () => '',
        onNone: () => html`
          <h2>Before you start</h2>

          <p>We will ask you to log in with your ORCID&nbsp;iD. If you don’t have an iD, you can create one.</p>

          <details>
            <summary><span>What is an ORCID&nbsp;iD?</span></summary>

            <div>
              <p>
                An <a href="https://orcid.org/"><dfn>ORCID&nbsp;iD</dfn></a> is a unique identifier that distinguishes
                you from everyone with the same or similar name.
              </p>
            </div>
          </details>
        `,
      })}

      <a href="${Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id })}" role="button" draggable="false"
        >Start now</a
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
