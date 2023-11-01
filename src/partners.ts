import { pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/ReaderMiddleware'
import { html, plainText, sendHtml } from './html'
import * as assets from './manifest.json'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import { type User, maybeGetUser } from './user'

export const partners = pipe(
  maybeGetUser,
  RM.chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(() => serviceUnavailable),
)

function createPage(user?: User) {
  return page({
    title: plainText`Partners`,
    content: html`
      <main id="main-content">
        <h1>Partners</h1>

        <ol class="logos">
          <li>
            <a href="https://info.africarxiv.org/">
              <img src="${assets['africarxiv.svg']}" width="518" height="551" alt="AfricArXiv" />
            </a>
          </li>
          <li>
            <a href="https://asapbio.org/">
              <img src="${assets['asapbio.svg']}" width="1851" height="308" alt="ASAPbio" />
            </a>
          </li>
          <li>
            <a href="https://www.coar-repositories.org/">
              <img src="${assets['coar.svg']}" width="440" height="343" alt="COAR" />
            </a>
          </li>
          <li>
            <a href="https://www.cshl.edu/">
              <img src="${assets['cshl.svg']}" width="280" height="134" alt="Cold Spring Harbor Laboratory" />
            </a>
          </li>
          <li>
            <a href="https://eiderafricaltd.org/">
              <img src="${assets['eider-africa.svg']}" width="895" height="927" alt="Eider Africa" />
            </a>
          </li>
          <li>
            <a href="https://elifesciences.org/">
              <img src="${assets['elife.svg']}" width="129" height="44" alt="eLife" />
            </a>
          </li>
          <li>
            <a href="https://www.healthra.org/">
              <img src="${assets['healthra.svg']}" width="564" height="224" alt="Health Research Alliance" />
            </a>
          </li>
          <li>
            <a href="https://www.orfg.org/">
              <img src="${assets['ofrg.svg']}" width="268" height="201" alt="Open Research Funders Group" />
            </a>
          </li>
          <li>
            <a href="https://scielo.org/">
              <img src="${assets['scielo.svg']}" width="538" height="562" alt="SciELO" />
            </a>
          </li>
          <li>
            <a href="https://sciety.org/">
              <img src="${assets['sciety.svg']}" width="119" height="36" alt="Sciety" />
            </a>
          </li>
        </ol>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    current: 'partners',
    user,
  })
}
