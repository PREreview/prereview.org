import { Array, flow, Match, pipe, Struct } from 'effect'
import { format } from 'fp-ts-routing'
import * as Datasets from '../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../html.ts'
import { languageAttributesFor } from '../../Locales.ts'
import { translate, type SupportedLocale } from '../../locales/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { RecentDatasetPrereview } from '../../Prereviews/index.ts'
import * as Routes from '../../routes.ts'
import { myPrereviewsMatch, profileMatch, reviewMatch } from '../../routes.ts'
import { renderDate } from '../../time.ts'
import { ProfileId } from '../../types/index.ts'
import { NonEmptyString } from '../../types/NonEmptyString.ts'
import { getSubfieldName } from '../../types/subfield.ts'
import { PageResponse } from '../Response/index.ts'
import type { Prereview } from './prereviews.ts'

export type { Prereview } from './prereviews.ts'

export interface ListOfPrereviews {
  readonly _tag: 'ListOfPrereviews'
  readonly prereviews: Array.NonEmptyReadonlyArray<Prereview>
  readonly publicPersona: Personas.PublicPersona
  readonly pseudonymPersona: Personas.PseudonymPersona
}

export const ListOfPrereviews = (args: Omit<ListOfPrereviews, '_tag'>): ListOfPrereviews => ({
  _tag: 'ListOfPrereviews',
  ...args,
})

export const toResponse = (
  { prereviews, publicPersona, pseudonymPersona }: ListOfPrereviews,
  locale: SupportedLocale,
) =>
  PageResponse({
    title: plainText(translate(locale, 'my-prereviews-page', 'myPrereviews')()),
    main: html`
      <h1>${translate(locale, 'my-prereviews-page', 'myPrereviews')()}</h1>

      <div class="inset">
        <p>${translate(locale, 'my-prereviews-page', 'onlyYouCanSee')()}</p>

        <div class="forward-group">
          <a href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(publicPersona) })}" class="forward"
            >${translate(locale, 'my-prereviews-page', 'viewPublicProfile')()}</a
          >

          <a
            href="${format(profileMatch.formatter, { profile: ProfileId.forPersona(pseudonymPersona) })}"
            class="forward"
            >${translate(locale, 'my-prereviews-page', 'viewPseudonymProfile')()}</a
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

                  ${prereview.subfields.length > 0
                    ? html`
                        <ul class="categories">
                          ${prereview.subfields.map(subfield => html`<li>${getSubfieldName(subfield, locale)}</li>`)}
                        </ul>
                      `
                    : ''}

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
                    ${prereview.otherAuthors.length + prereview.anonymousAuthors > 0
                      ? html`${authorList(prereview, locale)} reviewed
                          <cite ${languageAttributesFor(prereview.dataset.language)}>${prereview.dataset.title}</cite>`
                      : translate(
                          locale,
                          'dataset-reviews-list',
                          'reviewText',
                        )({
                          reviewer: html`<b dir="auto">${displayPersona(prereview.author)}</b>`,
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
    canonical: format(myPrereviewsMatch.formatter, {}),
    current: 'my-prereviews',
  })

const authorList = (datasetReview: RecentDatasetPrereview, locale: SupportedLocale) => {
  const list = Array.map(Array.make(datasetReview.author, ...datasetReview.otherAuthors), displayPersona)

  if (datasetReview.anonymousAuthors > 0) {
    list.push(
      NonEmptyString(`${datasetReview.anonymousAuthors} other author${datasetReview.anonymousAuthors > 1 ? 's' : ''}`),
    )
  }

  return formatList(locale)(Array.map(list, name => html`<b dir="auto">${name}</b>`))
}

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
