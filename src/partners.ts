import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { html, plainText, sendHtml } from './html'
import * as assets from './manifest.json'
import { serviceUnavailable } from './middleware'
import { page } from './page'
import type { User } from './user'
import { maybeGetUser } from './user'

export const partners = pipe(
  maybeGetUser,
  chainReaderKW(createPage),
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
              <img src="${assets['africarxiv.svg']}" width="518" height="551" loading="lazy" alt="AfricArXiv" />
            </a>
          </li>
          <li>
            <a href="https://asapbio.org/">
              <img src="${assets['asapbio.svg']}" width="1851" height="308" loading="lazy" alt="ASAPbio" />
            </a>
          </li>
          <li>
            <a href="https://www.coar-repositories.org/">
              <img src="${assets['coar.svg']}" width="440" height="343" loading="lazy" alt="COAR" />
            </a>
          </li>
          <li>
            <a href="https://www.cshl.edu/">
              <img
                src="${assets['cshl.svg']}"
                width="280"
                height="134"
                loading="lazy"
                alt="Cold Spring Harbor Laboratory"
              />
            </a>
          </li>
          <li>
            <a href="https://eiderafricaltd.org/">
              <img src="${assets['eider-africa.svg']}" width="895" height="927" loading="lazy" alt="Eider Africa" />
            </a>
          </li>
          <li>
            <a href="https://elifesciences.org/">
              <img src="${assets['elife.svg']}" width="129" height="44" loading="lazy" alt="eLife" />
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
            <a href="https://www.orfg.org/">
              <img
                src="${assets['ofrg.svg']}"
                width="1327"
                height="311"
                loading="lazy"
                alt="Open Research Funders Group"
                class="wide"
              />
            </a>
          </li>
          <li>
            <a href="https://www.peerref.com/">
              <img src="${assets['peerref.svg']}" width="2019" height="326" loading="lazy" alt="PeerRef" />
            </a>
          </li>
          <li>
            <a href="https://scielo.org/">
              <img src="${assets['scielo.svg']}" width="538" height="562" loading="lazy" alt="SciELO" />
            </a>
          </li>
          <li>
            <a href="https://sciety.org/">
              <img src="${assets['sciety.svg']}" width="119" height="36" loading="lazy" alt="Sciety" />
            </a>
          </li>
        </ol>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
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
