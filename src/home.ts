import { format } from 'fp-ts-routing'
import { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RA from 'fp-ts/ReadonlyArray'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as T from 'fp-ts/Task'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import * as assets from './manifest.json'
import { page } from './page'
import { findAPreprintMatch, reviewMatch } from './routes'

export type RecentPrereview = {
  readonly id: number
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly preprint: {
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

export const home = pipe(
  fromReaderTask(getRecentPrereviews()),
  chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

function createPage(recentPrereviews: ReadonlyArray<RecentPrereview>) {
  return page({
    title: plainText`PREreview`,
    content: html`
      <main id="main-content">
        <div class="hero">
          <h1>Open preprint reviews.<br />For&nbsp;<em>all</em> researchers.</h1>
          <p>Provide and receive constructive feedback on preprints from an international community of your peers.</p>

          <a href="${format(findAPreprintMatch.formatter, {})}" class="button">Review a preprint</a>
        </div>

        ${pipe(
          recentPrereviews,
          RA.matchW(
            () => '',
            prereviews => html`
              <section aria-labelledby="recent-prereviews-title">
                <h2 id="recent-prereviews-title">Recent PREreviews</h2>

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
                        </article>
                      </li>
                    `,
                  )}
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
                      <img
                        src="${assets['wellcome.svg']}"
                        width="181"
                        height="181"
                        loading="lazy"
                        alt="Wellcome Trust"
                      />
                    </a>
                  </li>
                  <li>
                    <a href="https://foundation.mozilla.org/">
                      <img
                        src="${assets['mozilla.svg']}"
                        width="280"
                        height="80"
                        loading="lazy"
                        alt="Mozilla Foundation"
                      />
                    </a>
                  </li>
                </ol>
              </section>
            `,
          ),
        )}
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
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

// https://github.com/DenisFrezzato/hyper-ts/pull/87
function fromReaderTask<R, I = StatusOpen, A = never>(fa: RT.ReaderTask<R, A>): RM.ReaderMiddleware<R, I, I, never, A> {
  return r => M.fromTask(fa(r))
}
