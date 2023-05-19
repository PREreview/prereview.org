import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { notFound, serviceUnavailable } from './middleware'
import { page } from './page'
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
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

function createPage({ currentPage, totalPages, recentPrereviews }: RecentPrereviews, user?: User) {
  return page({
    title: plainText`Recent PREreviews`,
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
                          ${formatList('en')(prereview.reviewers)} reviewed “<span
                            dir="${getLangDir(prereview.preprint.language)}"
                            lang="${prereview.preprint.language}"
                            >${prereview.preprint.title}</span
                          >”
                        </a>

                        ${renderDate(prereview.published)}
                      </article>
                    </li>
                  `,
                )}
              </ol>

              <nav class="pager">
                ${
                  currentPage > 1
                    ? html`
                        <a href="${format(reviewsMatch.formatter, { page: currentPage - 1 })}" class="back">Newer</a>
                      `
                    : ''
                }
                ${
                  currentPage < totalPages
                    ? html`
                        <a href="${format(reviewsMatch.formatter, { page: currentPage + 1 })}" class="forward">Older</a>
                      `
                    : ''
                }
              </nav>
              </section>
            `,
          ),
        )}
      </main>
    `,
    current: 'home',
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
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
