import { format } from 'fp-ts-routing'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import { html, sendHtml } from './html'
import * as assets from './manifest.json'
import { lookupDoiMatch } from './routes'

export const home = pipe(M.status(Status.OK), M.ichain(flow(createPage, sendHtml)))

function createPage() {
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <link href="${assets['style.css']}" rel="stylesheet" />

      <title>PREreview</title>

      <main>
        <header>
          <h1><img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" class="home-logo" /></h1>
        </header>

        <h2>Find reviews for a preprint</h2>

        <form method="post" action="${format(lookupDoiMatch.formatter, {})}" novalidate>
          <label>
            <span>Preprint DOI</span>
            <input name="doi" type="text" spellcheck="false" value="10.1101/2022.01.13.476201" />
          </label>

          <button>Find reviews</button>
        </form>
      </main>
    </html>
  `
}
