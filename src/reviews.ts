import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { type HeadersOpen, Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { notFound } from './middleware'
import { page } from './page'
import type { PreprintId } from './preprint-id'
import { type PublicUrlEnv, toUrl } from './public-url'
import { reviewMatch, reviewsMatch } from './routes'
import { renderDate } from './time'
import type { User } from './user'
import { maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

type RecentPrereviews = {
  readonly currentPage: number
  readonly totalPages: number
  readonly recentPrereviews: RNEA.ReadonlyNonEmptyArray<{
    readonly id: number
    readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
    readonly published: PlainDate
    readonly preprint: {
      readonly id: PreprintId
      readonly language: LanguageCode
      readonly title: Html
    }
  }>
}

export interface GetRecentPrereviewsEnv {
  getRecentPrereviews: (page: number) => TE.TaskEither<'not-found' | 'unavailable', RecentPrereviews>
}

const getRecentPrereviews = (page: number) =>
  pipe(
    RTE.ask<GetRecentPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getRecentPrereviews }) => getRecentPrereviews(page)),
  )

export const reviews = (currentPage: number) =>
  pipe(
    RM.fromReaderTaskEither(getRecentPrereviews(currentPage)),
    RM.bindTo('recentPrereviews'),
    RM.apSW('user', maybeGetUser),
    chainReaderKW(({ recentPrereviews, user }) => createPage(recentPrereviews, user)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() =>
      pipe(
        RM.rightReader<PublicUrlEnv, HeadersOpen, never, URL>(toUrl(reviewsMatch.formatter, { page: currentPage })),
        RM.chain(canonical => RM.header('Link', `<${canonical.href}>; rel="canonical"`)),
      ),
    ),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => pipe(maybeGetUser, RM.ichainW(showFailureMessage)))
        .exhaustive(),
    ),
  )

const showFailureMessage = flow(
  fromReaderK(failureMessage),
  RM.ichainFirst(() => RM.status(Status.ServiceUnavailable)),
  RM.ichainMiddlewareK(sendHtml),
)

function failureMessage(user?: User) {
  return page({
    title: plainText`Sorry, we’re having problems`,
    content: html`
      <main id="main-content">
        <h1>Sorry, we’re having problems</h1>

        <p>We’re unable to show this page of recent PREreviews now.</p>

        <p>Please try again later.</p>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function createPage({ currentPage, totalPages, recentPrereviews }: RecentPrereviews, user?: User) {
  return page({
    title: plainText`Recent PREreviews (page ${currentPage})`,
    content: html`
      <main id="main-content">
        <h1>Recent PREreviews</h1>

        ${pipe(
          recentPrereviews,
          RA.matchW(
            () => '',
            prereviews => html`
              <ol class="cards">
                ${prereviews.map(
                  prereview => html`
                    <li>
                      <article>
                        <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                          ${formatList('en')(prereview.reviewers)} reviewed
                          <cite dir="${getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</cite
                          >
                        </a>

                        <dl>
                          <dt>Review published</dt>
                          <dd>${renderDate(prereview.published)}</dd>
                          <dt>Preprint server</dt>
                          <dd>
                            ${match(prereview.preprint.id.type)
                              .with('africarxiv', () => 'AfricArXiv Preprints')
                              .with('arxiv', () => 'arXiv')
                              .with('biorxiv', () => 'bioRxiv')
                              .with('chemrxiv', () => 'ChemRxiv')
                              .with('eartharxiv', () => 'EarthArXiv')
                              .with('ecoevorxiv', () => 'EcoEvoRxiv')
                              .with('edarxiv', () => 'EdArXiv')
                              .with('engrxiv', () => 'engrXiv')
                              .with('medrxiv', () => 'medRxiv')
                              .with('metaarxiv', () => 'MetaArXiv')
                              .with('osf', () => 'OSF Preprints')
                              .with('philsci', () => 'PhilSci-Archive')
                              .with('preprints.org', () => 'Preprints.org')
                              .with('psyarxiv', () => 'PsyArXiv')
                              .with('research-square', () => 'Research Square')
                              .with('scielo', () => 'SciELO Preprints')
                              .with('science-open', () => 'ScienceOpen Preprints')
                              .with('socarxiv', () => 'SocArXiv')
                              .with('zenodo', () => 'Zenodo')
                              .exhaustive()}
                          </dd>
                        </dl>
                      </article>
                    </li>
                  `,
                )}
              </ol>

              <nav class="pager">
                ${currentPage > 1
                  ? html`<a href="${format(reviewsMatch.formatter, { page: currentPage - 1 })}" rel="prev">Newer</a>`
                  : ''}
                ${currentPage < totalPages
                  ? html`<a href="${format(reviewsMatch.formatter, { page: currentPage + 1 })}" rel="next">Older</a>`
                  : ''}
              </nav>
            `,
          ),
        )}
      </main>
    `,
    current: 'reviews',
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`<b>${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
