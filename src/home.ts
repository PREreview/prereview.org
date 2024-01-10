import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/ReaderTask'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as T from 'fp-ts/Task'
import { flow, pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { getClubName } from './club-details'
import { type Html, html, plainText, rawHtml } from './html'
import * as assets from './manifest.json'
import { PageResponse } from './response'
import { aboutUsMatch, homeMatch, reviewAPreprintMatch, reviewMatch, reviewsMatch } from './routes'
import { renderDate } from './time'
import type { ClubId } from './types/club-id'
import type { PreprintId } from './types/preprint-id'

import PlainDate = Temporal.PlainDate

export interface RecentPrereview {
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

interface GetRecentPrereviewsEnv {
  getRecentPrereviews: () => T.Task<ReadonlyArray<RecentPrereview>>
}

const getRecentPrereviews = () =>
  pipe(
    RT.ask<GetRecentPrereviewsEnv>(),
    RT.chainTaskK(({ getRecentPrereviews }) => getRecentPrereviews()),
  )

export const home: RT.ReaderTask<GetRecentPrereviewsEnv, PageResponse> = pipe(getRecentPrereviews(), RT.map(createPage))

function createPage(recentPrereviews: ReadonlyArray<RecentPrereview>) {
  return PageResponse({
    title: plainText`PREreview: Open preprint reviews. For all researchers.`,
    main: html`
      <div class="hero">
        <h1>Open preprint reviews.<br />For&nbsp;<em>all</em> researchers.</h1>
        <p>Provide and receive constructive feedback on preprints from an international community of your peers.</p>

        <a href="${format(reviewAPreprintMatch.formatter, {})}" class="button">Review a preprint</a>

        <img src="${assets['stool.svg']}" width="794" height="663" alt="" />
      </div>

      <div class="overview">
        <section aria-labelledby="for-underserved-researchers-title">
          <h2 id="for-underserved-researchers-title">For underserved researchers</h2>

          <p>
            We support and empower diverse and historically excluded communities of researchers (particularly those at
            early stages of their career) to find a voice, train, and engage in peer review.
          </p>
        </section>

        <div></div>

        <section aria-labelledby="a-better-way-title">
          <h2 id="a-better-way-title">A better way</h2>

          <p>Making science and scholarship more equitable, transparent, and collaborative.</p>

          <a href="${format(aboutUsMatch.formatter, {})}" class="forward">Our mission</a>
        </section>
      </div>

      <section class="tops" aria-labelledby="tops-title">
        <h2 id="tops-title" class="visually-hidden">Year of Open Science</h2>

        <img src="${assets['tops.png']}" width="400" height="564" loading="lazy" alt="" />

        <div>
          <p>
            PREreview joined the US White House, 10 federal agencies, a coalition of more than 85 universities, and
            other organizations in a commitment to advancing 4
            <a href="https://nasa.github.io/Transform-to-Open-Science-Book/Year_of_Open_Science_Guide/readme.html"
              >Year of Open Science</a
            >
            goals to:
          </p>

          <ol>
            <li>Develop a strategic plan for open science.</li>
            <li>Improve the transparency, integrity, and equity of reviews.</li>
            <li>Account for open science activities in evaluations.</li>
            <li>Engage underrepresented communities in the advancement of open science.</li>
          </ol>

          <a
            href="https://nasa.github.io/Transform-to-Open-Science-Book/Year_of_Open_Science_Guide/participants/PREreview.html"
            class="forward"
            >How PREreview is fulfilling this commitment</a
          >
        </div>
      </section>

      <section aria-labelledby="statistics-title">
        <h2 id="statistics-title">Statistics</h2>

        <ul class="statistics">
          <li>
            <data value="822">822</data>
            PREreviews
          </li>
          <li>
            <data value="20">20</data>
            preprint servers
          </li>
          <li>
            <data value="2577">2,577</data>
            PREreviewers
          </li>
        </ul>
      </section>

      ${pipe(
        recentPrereviews,
        RA.matchW(
          () => '',
          prereviews => html`
            <section aria-labelledby="recent-prereviews-title">
              <h2 id="recent-prereviews-title">Recent PREreviews</h2>

              <ol class="cards" aria-labelledby="recent-prereviews-title" tabindex="0">
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

              <nav>
                <a href="${format(reviewsMatch.formatter, { page: 1 })}" class="forward">See all reviews</a>
              </nav>
            </section>
          `,
        ),
      )}

      <section aria-labelledby="funders-title">
        <h2 id="funders-title">Funders</h2>

        <ol class="logos">
          <li>
            <a href="https://sloan.org/grant-detail/8729">
              <img
                src="${assets['sloan.svg']}"
                width="350"
                height="190"
                loading="lazy"
                alt="Alfred P. Sloan Foundation"
              />
            </a>
          </li>
          <li>
            <a href="https://chanzuckerberg.com/">
              <img
                src="${assets['czi.svg']}"
                width="192"
                height="192"
                loading="lazy"
                alt="Chan Zuckerberg Initiative"
              />
            </a>
          </li>
          <li>
            <a href="https://elifesciences.org/">
              <img src="${assets['elife.svg']}" width="129" height="44" loading="lazy" alt="eLife" />
            </a>
          </li>
          <li>
            <a href="https://wellcome.org/grant-funding/schemes/open-research-fund">
              <img src="${assets['wellcome.svg']}" width="181" height="181" loading="lazy" alt="Wellcome Trust" />
            </a>
          </li>
          <li>
            <a href="https://foundation.mozilla.org/">
              <img src="${assets['mozilla.svg']}" width="280" height="80" loading="lazy" alt="Mozilla Foundation" />
            </a>
          </li>
        </ol>
      </section>
    `,
    canonical: format(homeMatch.formatter, {}),
    current: 'home',
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
