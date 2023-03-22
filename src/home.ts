import { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as TO from 'fp-ts/TaskOption'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { InvalidE, getInput, invalidE } from './form'
import { Html, html, plainText, rawHtml, sendHtml } from './html'
import { getMethod, seeOther } from './middleware'
import { page } from './page'
import { fromUrl, parsePreprintDoi } from './preprint-id'
import { homeMatch, preprintMatch } from './routes'

type Prereview = {
  readonly id: number
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly preprint: {
    readonly language: LanguageCode
    readonly title: Html
  }
}

const hardcodedPrereview: Prereview = {
  id: 7747129,
  reviewers: ['CJ San Felipe'],
  preprint: {
    title: html`A conserved local structural motif controls the kinetics of PTP1B catalysis`,
    language: 'en',
  },
}

export const home = pipe(
  RM.fromMiddleware(getMethod),
  RM.ichain(method =>
    match(method)
      .with('POST', () => lookupPreprint)
      .otherwise(() => showHomePage),
  ),
)

type GetRecentPrereviewEnv = {
  getRecentPrereview: () => TO.TaskOption<Prereview>
}

const getRecentPrereview = () =>
  pipe(
    RT.ask<GetRecentPrereviewEnv>(),
    RT.chainTaskK(({ getRecentPrereview }) => getRecentPrereview()),
  )

// https://github.com/DenisFrezzato/hyper-ts/pull/85
const chainReaderKW: <R2, A, B>(
  f: (a: A) => Reader<R2, B>,
) => <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> = f =>
  RM.chainW(fromReaderK(f))

const showHomePage = pipe(
  fromReaderTask(getRecentPrereview()),
  chainReaderKW(recentPrereview => createPage(E.right(undefined), recentPrereview)),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showHomeErrorPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s.trim()),
      () => D.error(s, 'URL'),
    ),
  ),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parsePreprintDoi(s))),
)

const PreprintUrlD = pipe(
  UrlD,
  D.parse(url => E.fromOption(() => D.error(url, 'PreprintUrl'))(fromUrl(url))),
)

const LookupPreprintD = pipe(
  D.struct({
    preprint: D.union(DoiD, PreprintUrlD),
  }),
  D.map(get('preprint')),
)

const lookupPreprint = pipe(
  RM.decodeBody(LookupPreprintD.decode),
  RM.ichainMiddlewareK(doi => seeOther(format(preprintMatch.formatter, { doi }))),
  RM.orElse(
    flow(
      getInput('preprint'),
      O.getOrElse(() => ''),
      invalidE,
      E.left,
      lookupPreprint => showHomeErrorPage(lookupPreprint, O.some(hardcodedPrereview)),
    ),
  ),
)

type LookupPreprint = E.Either<InvalidE, Doi | undefined>

function createPage(lookupPreprint: LookupPreprint, recentPrereview: O.Option<Prereview>) {
  const error = E.isLeft(lookupPreprint)

  return page({
    title: plainText`${error ? 'Error: ' : ''}PREreview`,
    content: html`
      <main id="main-content">
        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(lookupPreprint)
                    ? html`
                        <li>
                          <a href="#preprint">
                            ${match(lookupPreprint.left)
                              .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <form method="post" action="${format(homeMatch.formatter, {})}" novalidate aria-labelledby="find-title">
          <div ${rawHtml(E.isLeft(lookupPreprint) ? 'class="error"' : '')}>
            <h1 id="find-title">Find and publish PREreviews</h1>

            <label for="preprint">Preprint DOI or URL</label>

            ${error
              ? html`
                  <div class="error-message" id="preprint-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(lookupPreprint.left)
                      .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI or URL')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="preprint"
              name="preprint"
              type="text"
              size="40"
              spellcheck="false"
              aria-describedby="preprint-tip"
              ${match(lookupPreprint)
                .with({ right: P.select(P.string) }, value => html`value="${value}"`)
                .with({ left: { actual: P.select() } }, value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(lookupPreprint) ? 'aria-invalid="true" aria-errormessage="preprint-error"' : '')}
            />

            <div id="preprint-tip" role="note">
              We support AfricArXiv, arXiv, bioRxiv, ChemRxiv, EarthArXiv, EcoEvoRxiv, EdArXiv, engrXiv, medRxiv,
              MetaArXiv, OSF, PsyArXiv, Research&nbsp;Square, SciELO, ScienceOpen and SocArXiv preprints.
            </div>
          </div>

          <button>Continue</button>
        </form>

        ${pipe(
          recentPrereview,
          O.matchW(
            () => '',
            prereview => html`
              <section>
                <h2>Recent PREreviews</h2>
                <ul>
                  <li>
                    <a href="https://beta.prereview.org/reviews/${prereview.id}">
                      ${formatList('en')(prereview.reviewers)} reviewed “<span
                        dir="${getLangDir(prereview.preprint.language)}"
                        lang="${prereview.preprint.language}"
                        >${prereview.preprint.title}</span
                      >”
                    </a>
                  </li>
                </ul>
              </section>
            `,
          ),
        )}
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
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

// https://github.com/DenisFrezzato/hyper-ts/pull/87
function fromReaderTask<R, I = StatusOpen, A = never>(fa: RT.ReaderTask<R, A>): RM.ReaderMiddleware<R, I, I, never, A> {
  return r => M.fromTask(fa(r))
}
