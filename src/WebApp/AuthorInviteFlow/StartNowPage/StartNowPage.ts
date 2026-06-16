import { Array, flow } from 'effect'
import { format } from 'fp-ts-routing'
import type { LanguageCode } from 'iso-639-1'
import type * as DatasetReviews from '../../../DatasetReviews/index.ts'
import type * as Datasets from '../../../Datasets/index.ts'
import { html, plainText, rawHtml, type Html } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Personas from '../../../Personas/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { renderDate } from '../../../time.ts'
import { Doi, ProfileId } from '../../../types/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { PageResponse } from '../../Response/index.ts'

export type ViewModel = Omit<
  DatasetReviews.PublishedReview,
  'author' | 'otherAuthors' | 'dataset' | 'questions' | 'competingInterests'
> & {
  readonly invitationId: Uuid
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
  isLoggedIn,
  viewModel,
}: {
  locale: SupportedLocale
  isLoggedIn: boolean
  viewModel: ViewModel
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
            ${t('structuredReviewTitle')({
              dataset: html`<cite ${languageAttributesFor(viewModel.dataset.language)}
                >${viewModel.dataset.title}</cite
              >`,
            })}
          </h2>

          <div class="byline">
            ${t('authoredBy')({
              author: authorList(viewModel, locale),
              visuallyHidden: text => html`<span class="visually-hidden">${text}</span>`,
            })}
          </div>

          <dl>
            <div>
              <dt>${t('published')()}</dt>
              <dd>${renderDate(locale)(viewModel.published)}</dd>
            </div>
            <div>
              <dt translate="no">DOI</dt>
              <dd>
                <a href="${Doi.toUrl(viewModel.doi).href}" class="doi" dir="auto" translate="no">${viewModel.doi}</a>
              </dd>
            </div>
            <div>
              <dt>${t('license')()}</dt>
              <dd>
                <a href="https://creativecommons.org/licenses/by/4.0/">
                  <dfn>
                    <abbr title="${t('licenseCcBy40')()}"><bdi translate="no">CC BY 4.0</bdi></abbr>
                  </dfn>
                </a>
              </dd>
            </div>
          </dl>
        </header>
      </article>

      <p>You’ve been invited to appear as an author on this PREreview.</p>

      ${!isLoggedIn
        ? html`
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
          `
        : ''}

      <a
        href="${Routes.AuthorInviteAcceptInvite.href({ invitationId: viewModel.invitationId })}"
        role="button"
        draggable="false"
        >Start now</a
      >
    `,
    canonical: Routes.AuthorInviteStartNow.href({ invitationId: viewModel.invitationId }),
    allowRobots: false,
  })
}

const authorList = (datasetReview: ViewModel, locale: SupportedLocale) => {
  const list = Array.map(Array.make(datasetReview.author, ...datasetReview.otherAuthors), displayAuthor)

  if (datasetReview.anonymousAuthors > 0) {
    list.push(html`${datasetReview.anonymousAuthors} other author${datasetReview.anonymousAuthors > 1 ? 's' : ''}`)
  }

  return formatList(locale)(list)
}

const displayAuthor = Personas.match({
  onPublic: persona =>
    html`<a
      href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}"
      class="orcid"
      dir="auto"
      >${persona.name}</a
    >`,
  onPseudonym: persona =>
    html`<a href="${format(Routes.profileMatch.formatter, { profile: ProfileId.forPersona(persona) })}" dir="auto"
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
