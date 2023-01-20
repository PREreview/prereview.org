import { Doi, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { InvalidE, getInput, invalidE } from './form'
import { html, plainText, rawHtml, sendHtml } from './html'
import * as assets from './manifest.json'
import { getMethod, seeOther } from './middleware'
import { page } from './page'
import { isPreprintDoi } from './preprint-id'
import { homeMatch, preprintMatch } from './routes'

export const home = pipe(
  RM.fromMiddleware(getMethod),
  RM.ichain(method =>
    match(method)
      .with('POST', () => lookupDoi)
      .otherwise(() => showHomePage),
  ),
)

const showHomePage = pipe(
  RM.rightReader(createPage(E.right(undefined))),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showHomeErrorPage = flow(
  fromReaderK(createPage),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parse(s))),
  D.refine(isPreprintDoi, 'DOI'),
)

const LookupDoiD = pipe(
  D.struct({
    doi: DoiD,
  }),
  D.map(get('doi')),
)

const lookupDoi = pipe(
  RM.decodeBody(LookupDoiD.decode),
  RM.ichainMiddlewareK(doi => seeOther(format(preprintMatch.formatter, { doi }))),
  RM.orElse(
    flow(
      getInput('doi'),
      O.getOrElse(() => ''),
      invalidE,
      E.left,
      showHomeErrorPage,
    ),
  ),
)

type LookupDoi = E.Either<InvalidE, Doi | undefined>

function createPage(lookupDoi: LookupDoi) {
  const error = E.isLeft(lookupDoi)

  return page({
    title: plainText`${error ? 'Error: ' : ''}PREreview`,
    content: html`
      <main id="main-content">
        <header>
          <h1><img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" class="home-logo" /></h1>
        </header>

        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  ${E.isLeft(lookupDoi)
                    ? html`
                        <li>
                          <a href="#doi">
                            ${match(lookupDoi.left)
                              .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI')
                              .exhaustive()}
                          </a>
                        </li>
                      `
                    : ''}
                </ul>
              </error-summary>
            `
          : ''}

        <h2 id="find-title">Find and publish PREreviews</h2>

        <form method="post" action="${format(homeMatch.formatter, {})}" novalidate aria-labelledby="find-title">
          <div ${rawHtml(E.isLeft(lookupDoi) ? 'class="error"' : '')}>
            <label for="doi">Preprint DOI</label>

            ${error
              ? html`
                  <div class="error-message" id="doi-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(lookupDoi.left)
                      .with({ _tag: 'InvalidE' }, () => 'Enter a preprint DOI')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="doi"
              name="doi"
              type="text"
              size="40"
              spellcheck="false"
              aria-describedby="doi-tip"
              ${match(lookupDoi)
                .with(E.right(P.select(P.string)), value => html`value="${value}"`)
                .with(E.left({ actual: P.select() }), value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(lookupDoi) ? 'aria-invalid="true" aria-errormessage="doi-error"' : '')}
            />

            <div id="doi-tip" role="note">
              We support AfricArXiv, arXiv, bioRxiv, EarthArXiv, EdArXiv, engrXiv, medRxiv, OSF, PsyArXiv,
              Research&nbsp;Square, SciELO and SocArXiv preprints.
            </div>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    skipLinks: [[html`Skip to main content`, '#main-content']],
    type: 'no-header',
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
