import { format } from 'fp-ts-routing'
import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { html, plainText, sendHtml } from './html'
import * as assets from './manifest.json'
import { page } from './page'
import { lookupDoiMatch } from './routes'

export const home = pipe(
  RM.rightReader(createPage()),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
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

        <form method="post" action="${format(lookupDoiMatch.formatter, {})}" novalidate>
          <label>
            <span>Preprint DOI</span>
            <input name="doi" type="text" spellcheck="false" aria-describedby="doi-tip" />
          </label>

          <div id="doi-tip" role="note">We support bioRxiv, medRxiv and SciELO preprints.</div>

          <button>Continue</button>
        </form>
      </main>
    `,
    type: 'no-header',
  })
}
