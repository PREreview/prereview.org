import { Temporal } from '@js-temporal/polyfill'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as T from 'fp-ts/Task'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import * as assets from './manifest.json'
import { addCanonicalLinkHeader } from './middleware'
import { templatePage } from './page'
import type { PreprintId } from './preprint-id'
import { aboutUsMatch, homeMatch, reviewAPreprintMatch, reviewMatch } from './routes'
import { renderDate } from './time'
import type { User } from './user'
import { maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

export type RecentPrereview = {
  readonly id: number
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

export const home = (message?: 'logged-out') =>
  pipe(
    fromReaderTask(getRecentPrereviews()),
    RM.bindTo('recentPrereviews'),
    RM.apSW('user', maybeGetUser),
    chainReaderKW(({ recentPrereviews, user }) => createPage(recentPrereviews, user, message)),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainFirstW(() => addCanonicalLinkHeader(homeMatch.formatter, {})),
    RM.ichainMiddlewareK(sendHtml),
  )

function createPage(recentPrereviews: ReadonlyArray<RecentPrereview>, user?: User, message?: 'logged-out') {
  return templatePage({
    title: plainText`PREreview`,
    content: html`
      <main id="main-content">
        ${match(message)
          .with(
            'logged-out',
            () => html`
              <notification-banner aria-labelledby="notification-banner-title" role="alert">
                <h2 id="notification-banner-title">Success</h2>

                <p>You have been logged out.</p>
              </notification-banner>
            `,
          )
          .with(undefined, () => '')
          .exhaustive()}

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

        <section aria-labelledby="statistics-title">
          <h2 id="statistics-title">Statistics</h2>

          <ul class="statistics">
            <li>
              <data value="717">717</data>
              PREreviews
            </li>
            <li>
              <data value="19">19</data>
              preprint servers
            </li>
            <li>
              <data value="2161">2,161</data>
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
              </section>
            `,
          ),
        )}

        <section aria-labelledby="partners-title">
          <h2 id="partners-title">Partners</h2>

          <ol class="logos">
            <li>
              <a href="https://www.orfg.org/">
                <img
                  src="${assets['ofrg.svg']}"
                  width="268"
                  height="201"
                  loading="lazy"
                  alt="Open Research Funders Group"
                />
              </a>
            </li>
            <li>
              <a href="https://www.healthra.org/">
                <img
                  src="${assets['healthra.svg']}"
                  width="564"
                  height="224"
                  loading="lazy"
                  alt="Health Research Alliance"
                />
              </a>
            </li>
            <li>
              <a href="https://www.ohsu.edu/">
                <img
                  src="${assets['ohsu.svg']}"
                  width="174"
                  height="298"
                  loading="lazy"
                  alt="Oregon Health &amp; Science University"
                />
              </a>
            </li>
            <li>
              <a href="https://www.jmir.org/announcements/296">
                <img
                  src="${assets['jmir.svg']}"
                  width="275"
                  height="43"
                  loading="lazy"
                  alt="JMIR Publications"
                  class="wide"
                />
              </a>
            </li>
          </ol>
        </section>

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

// https://github.com/DenisFrezzato/hyper-ts/pull/87
function fromReaderTask<R, I = StatusOpen, A = never>(fa: RT.ReaderTask<R, A>): RM.ReaderMiddleware<R, I, I, never, A> {
  return r => M.fromTask(fa(r))
}
