import { hasRegistrant, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { html, plainText, rawHtml, sendHtml } from './html'
import * as assets from './manifest.json'
import { seeOther } from './middleware'
import { page } from './page'
import { homeMatch, preprintMatch } from './routes'

export const home = pipe(
  RM.decodeMethod(E.right),
  RM.ichain(method =>
    match(method)
      .with('POST', () => lookupDoi)
      .otherwise(() => showHomePage),
  ),
)

const showHomePage = pipe(
  RM.rightReader(createPage()),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showHomeErrorPage = pipe(
  RM.rightReader(createPage(true)),
  RM.ichainFirst(() => RM.status(Status.BadRequest)),
  RM.ichainMiddlewareK(sendHtml),
)

const DoiD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'DOI'))(parse(s))),
  D.refine(hasRegistrant('1101', '1590', '31730'), 'DOI'),
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
  RM.orElse(() => showHomeErrorPage),
)

function createPage(error = false) {
  return page({
    title: plainText`${error ? 'Error: ' : ''}PREreview`,
    content: html`
      <main>
        <header>
          <h1><img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" class="home-logo" /></h1>
        </header>

        ${error
          ? html`
              <error-summary aria-labelledby="error-summary-title" role="alert">
                <h2 id="error-summary-title">There is a problem</h2>
                <ul>
                  <li>
                    <a href="#doi">Enter a preprint DOI</a>
                  </li>
                </ul>
              </error-summary>
            `
          : ''}

        <h2>Find and post PREreviews</h2>

        <form method="post" action="${format(homeMatch.formatter, {})}" novalidate>
          <div ${rawHtml(error ? 'class="error"' : '')}>
            <label for="doi">Preprint DOI</label>

            ${error
              ? html`
                  <div class="error-message" id="doi-error">
                    <span class="visually-hidden">Error:</span> Enter a preprint DOI
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
              ${rawHtml(error ? 'aria-invalid="true" aria-errormessage="doi-error"' : '')}
            />

            <div id="doi-tip" role="note">We support AfricArXiv, bioRxiv, medRxiv and SciELO preprints.</div>
          </div>

          <button>Continue</button>
        </form>
      </main>
    `,
    js: error ? ['error-summary.js'] : [],
    type: 'no-header',
  })
}
