import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from './club-details'
import { type Html, html, plainText, rawHtml } from './html'
import { pageNotFound } from './http-error'
import { PageResponse } from './response'
import { reviewMatch, reviewsMatch } from './routes'
import { renderDate } from './time'
import type { ClubId } from './types/club-id'
import type { PreprintId } from './types/preprint-id'

import PlainDate = Temporal.PlainDate

interface RecentPrereviews {
  readonly currentPage: number
  readonly totalPages: number
  readonly recentPrereviews: RNEA.ReadonlyNonEmptyArray<{
    readonly club?: ClubId
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

export const reviewsPage: (currentPage: number) => RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> = flow(
  getRecentPrereviews,
  RTE.matchW(
    error =>
      match(error)
        .with('not-found', () => pageNotFound)
        .with('unavailable', () => failureMessage)
        .exhaustive(),
    createPage,
  ),
)

const failureMessage = PageResponse({
  status: Status.ServiceUnavailable,
  title: plainText`Sorry, we’re having problems`,
  main: html`
    <h1>Sorry, we’re having problems</h1>

    <p>We’re unable to show this page of recent PREreviews now.</p>

    <p>Please try again later.</p>
  `,
})

function createPage({ currentPage, totalPages, recentPrereviews }: RecentPrereviews) {
  return PageResponse({
    title: plainText`Recent PREreviews (page ${currentPage})`,
    main: html`
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
                        ${formatList('en')(prereview.reviewers)}
                        ${prereview.club ? html`of the <b>${getClubName(prereview.club)}</b>` : ''} reviewed
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
                            .with('authorea', () => 'Authorea')
                            .with('biorxiv', () => 'bioRxiv')
                            .with('chemrxiv', () => 'ChemRxiv')
                            .with('eartharxiv', () => 'EarthArXiv')
                            .with('ecoevorxiv', () => 'EcoEvoRxiv')
                            .with('edarxiv', () => 'EdArXiv')
                            .with('engrxiv', () => 'engrXiv')
                            .with('medrxiv', () => 'medRxiv')
                            .with('metaarxiv', () => 'MetaArXiv')
                            .with('osf', () => 'OSF')
                            .with('osf-preprints', () => 'OSF Preprints')
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
    `,
    canonical: format(reviewsMatch.formatter, { page: currentPage }),
    current: 'reviews',
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
