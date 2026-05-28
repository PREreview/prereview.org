import { Array, flow } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type * as Datasets from '../../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { renderDate } from '../../../time.ts'
import { Doi, ProfileId } from '../../../types/index.ts'
import { PageResponse } from '../../Response/index.ts'

export type DatasetReview = Omit<
  DatasetReviews.PublishedReview,
  'author' | 'otherAuthors' | 'dataset' | 'questions' | 'competingInterests'
> & {
  readonly author: Personas.Persona
  readonly otherAuthors: ReadonlyArray<Personas.Persona>
  readonly anonymousAuthors: number
  readonly dataset: {
    readonly id: Datasets.DatasetId
    readonly language: LanguageCode
    readonly title: Html
    readonly url: URL
  }
}

export const renderStartNowPage = ({
  locale,
  datasetReview,
}: {
  locale: SupportedLocale
  datasetReview: DatasetReview
}) => {
  const t = translate(locale, 'dataset-review-page')

  return PageResponse({
    status: StatusCodes.OK,
    title: plainText('Be listed as an author'),
    main: html`
      <h1>Be listed as an author</h1>
      <article class="preview" tabindex="0" aria-labelledby="prereview-title">
        <header>
          <h2 id="prereview-title">
            ${rawHtml(
              t('structuredReviewTitle')({
                dataset: html`<cite
                  lang="${datasetReview.dataset.language}"
                  dir="${rtlDetect.getLangDir(datasetReview.dataset.language)}"
                  >${datasetReview.dataset.title}</cite
                >`.toString(),
              }),
            )}
          </h2>

          <div class="byline">
            ${rawHtml(
              t('authoredBy')({
                author: authorList(datasetReview, locale).toString(),
                visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`.toString(),
              }),
            )}
          </div>

          <dl>
            <div>
              <dt>${t('published')()}</dt>
              <dd>${renderDate(locale)(datasetReview.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd>
                <a href="${Doi.toUrl(datasetReview.doi).href}" class="doi" translate="no">${datasetReview.doi}</a>
              </dd>
            </div>
            <div>
              <dt>${t('license')()}</dt>
              <dd>
                <a href="https://creativecommons.org/licenses/by/4.0/">
                  <dfn>
                    <abbr title="${t('licenseCcBy40')()}"><span translate="no">CC BY 4.0</span></abbr>
                  </dfn>
                </a>
              </dd>
            </div>
          </dl>
        </header>
      </article>
    `,
  })
}

const authorList = (datasetReview: DatasetReview, locale: SupportedLocale) => {
  const list = Array.map(Array.make(datasetReview.author, ...datasetReview.otherAuthors), displayAuthor)

  if (datasetReview.anonymousAuthors > 0) {
    list.push(html`${datasetReview.anonymousAuthors} other author${datasetReview.anonymousAuthors > 1 ? 's' : ''}`)
  }

  return formatList(locale)(list)
}

const displayAuthor = Personas.match({
  onPublic: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" class="orcid"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      >${persona.pseudonym}</a
    >`,
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
