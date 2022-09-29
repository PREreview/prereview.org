import { hasRegistrant, parse } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { html, plainText, sendHtml } from './html'
import * as assets from './manifest.json'
import { seeOther } from './middleware'
import { page } from './page'
import { homeMatch, preprintMatch } from './routes'

export const home = pipe(
  RM.decodeMethod(E.right),
  RM.ichain(method =>
    match(method)
      .with('POST', () => RM.fromMiddleware(lookupDoi))
      .otherwise(() => showHomePage),
  ),
)

const showHomePage = pipe(
  RM.rightReader(createPage()),
  RM.ichainFirst(() => RM.status(Status.OK)),
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
  M.decodeBody(LookupDoiD.decode),
  M.ichain(doi => seeOther(format(preprintMatch.formatter, { doi }))),
  M.orElse(() => seeOther(format(homeMatch.formatter, {}))),
)

function createPage() {
  return page({
    title: plainText`PREreview`,
    content: html`
      <main>
        <header>
          <h1><img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" class="home-logo" /></h1>
        </header>

        <h2>Find and post PREreviews</h2>

        <form method="post" action="${format(homeMatch.formatter, {})}" novalidate>
          <label for="doi">Preprint DOI</label>

          <input id="doi" name="doi" type="text" size="40" spellcheck="false" aria-describedby="doi-tip" />

          <div id="doi-tip" role="note">We support AfricArXiv, bioRxiv, medRxiv and SciELO preprints.</div>

          <button>Continue</button>
        </form>
      </main>
    `,
    type: 'no-header',
  })
}
