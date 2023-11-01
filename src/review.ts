import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from './club-details'
import { type Html, fixHeadingLevels, html, plainText, rawHtml, sendHtml } from './html'
import { addCanonicalLinkHeader, notFound } from './middleware'
import { page } from './page'
import { clubProfileMatch, preprintReviewsMatch, profileMatch, reviewMatch } from './routes'
import { renderDate } from './time'
import type { ClubId } from './types/club-id'
import type { PreprintId } from './types/preprint-id'
import { isPseudonym } from './types/pseudonym'
import { type User, maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

export interface Prereview {
  addendum?: Html
  authors: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid?: Orcid }>
  club?: ClubId
  doi: Doi
  language?: LanguageCode
  license: 'CC-BY-4.0'
  published: PlainDate
  preprint: {
    id: PreprintId
    language: LanguageCode
    title: Html
    url: URL
  }
  structured: boolean
  text: Html
}

export interface GetPrereviewEnv {
  getPrereview: (id: number) => TE.TaskEither<'unavailable' | 'not-found' | 'removed', Prereview>
}

const getPrereview = (id: number) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getPrereview }: GetPrereviewEnv) => getPrereview(id)))

const sendPage = (id: number) =>
  flow(
    RM.fromReaderK(createPage),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => addCanonicalLinkHeader(reviewMatch.formatter, { id })),
    RM.ichainMiddlewareK(sendHtml),
  )

export const review = (id: number) =>
  pipe(
    RM.fromReaderTaskEither(getPrereview(id)),
    RM.bindTo('prereview'),
    RM.apSW('user', maybeGetUser),
    RM.ichainW(({ prereview, user }) => sendPage(id)(prereview, user)),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('removed', () => pipe(maybeGetUser, RM.ichainW(showRemovedMessage)))
        .with('unavailable', () => pipe(maybeGetUser, RM.ichainW(showFailureMessage)))
        .exhaustive(),
    ),
  )

const showFailureMessage = flow(
  RM.fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

const showRemovedMessage = flow(
  RM.fromReaderK(removedMessage),
  RM.ichainFirst(() => RM.status(Status.Gone)),
  RM.ichainMiddlewareK(sendHtml),
)

function failureMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show the PREreview now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function removedMessage(user?: User) {
  return page({
    title: plainText`PREreview removed`,
    content: html`
      <main id="main-content">
        <h1>PREreview removed</h1>

        <p>We’ve removed this PREreview.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createPage(review: Prereview, user?: User) {
  return page({
    title: plainText`${review.structured ? 'Structured ' : ''}PREreview of “${review.preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(preprintReviewsMatch.formatter, { id: review.preprint.id })}" class="back"
          >See other reviews</a
        >
        <a href="${review.preprint.url.href}" class="forward">Read the preprint</a>
      </nav>

      <main id="prereview">
        <header>
          <h1>
            ${review.structured ? 'Structured ' : ''}PREreview of
            <cite lang="${review.preprint.language}" dir="${getLangDir(review.preprint.language)}"
              >${review.preprint.title}</cite
            >
          </h1>

          <div class="byline">
            <span class="visually-hidden">Authored</span> by
            ${pipe(review.authors, RNEA.map(displayAuthor), formatList('en'))}
            ${review.club
              ? html`of the
                  <a href="${format(clubProfileMatch.formatter, { id: review.club })}">${getClubName(review.club)}</a>`
              : ''}
          </div>

          <dl>
            <div>
              <dt>Published</dt>
              <dd>${renderDate(review.published)}</dd>
            </div>
            <div>
              <dt>DOI</dt>
              <dd class="doi" translate="no">${review.doi}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>
                ${match(review.license)
                  .with(
                    'CC-BY-4.0',
                    () => html`
                      <a href="https://creativecommons.org/licenses/by/4.0/">
                        <dfn>
                          <abbr title="Attribution 4.0 International"><span translate="no">CC BY 4.0</span></abbr>
                        </dfn>
                      </a>
                    `,
                  )
                  .exhaustive()}
              </dd>
            </div>
          </dl>
        </header>

        <div ${review.language ? html`lang="${review.language}" dir="${getLangDir(review.language)}"` : ''}>
          ${fixHeadingLevels(1, review.text)}
        </div>

        ${review.addendum
          ? html`
              <h2>Addendum</h2>

              ${fixHeadingLevels(2, review.addendum)}
            `
          : ''}
      </main>
    `,
    skipLinks: [[html`Skip to PREreview`, '#prereview']],
    user,
  })
}

function displayAuthor({ name, orcid }: { name: string; orcid?: Orcid }) {
  if (orcid) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'orcid', value: orcid } })}" class="orcid"
      >${name}</a
    >`
  }

  if (isPseudonym(name)) {
    return html`<a href="${format(profileMatch.formatter, { profile: { type: 'pseudonym', value: name } })}"
      >${name}</a
    >`
  }

  return name
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`${item}`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}
