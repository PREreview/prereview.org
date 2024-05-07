import { format } from 'fp-ts-routing'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from '../club-details'
import { type Html, html, plainText, rawHtml } from '../html'
import { PageResponse } from '../response'
import { reviewMatch, reviewsMatch } from '../routes'
import { renderDate } from '../time'
import type { RecentPrereviews } from './recent-prereviews'

export const createPage = ({ currentPage, totalPages, recentPrereviews }: RecentPrereviews) =>
  PageResponse({
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
                            .with('psycharchives', () => 'PsychArchives')
                            .with('research-square', () => 'Research Square')
                            .with('scielo', () => 'SciELO Preprints')
                            .with('science-open', () => 'ScienceOpen Preprints')
                            .with('socarxiv', () => 'SocArXiv')
                            .with('techrxiv', () => 'TechRxiv')
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