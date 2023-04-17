import { Eq } from 'fp-ts/Eq'
import * as R from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Html, PlainText, html, rawHtml } from './html'
import * as assets from './manifest.json'

export interface FathomEnv {
  readonly fathomId?: string
}

export interface PhaseEnv {
  readonly phase?: {
    readonly tag: string
    readonly text: Html
  }
}

type Page = {
  readonly title: PlainText
  readonly type?: 'two-up'
  readonly content: Html
  readonly skipLinks?: ReadonlyArray<[Html, string]>
  readonly js?: ReadonlyArray<Exclude<Assets<'.js'>, 'skip-link.js'>>
}

export function page({ title, type, content, skipLinks = [], js = [] }: Page): R.Reader<FathomEnv & PhaseEnv, Html> {
  return R.asks(
    ({ fathomId, phase }) => html`
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link href="${assets['style.css']}" rel="stylesheet" />
        ${pipe(
          js,
          RA.uniq(stringEq()),
          RA.concatW(skipLinks.length > 0 ? ['skip-link.js' as const] : []),
          RA.chain(file =>
            pipe(
              assets[file].preload as ReadonlyArray<string>,
              RA.map(preload => html` <link href="${preload}" rel="preload" fetchpriority="low" as="script" />`),
              RA.prepend(html` <script src="${assets[file].path}" type="module"></script>`),
            ),
          ),
        )}
        ${fathomId
          ? html`<script src="https://cdn.usefathom.com/script.js" data-site="${fathomId}" defer></script>`
          : ''}

        <link rel="icon" href="${assets['favicon.ico']}" sizes="any" />
        <link rel="icon" href="${assets['favicon.svg']}" type="image/svg+xml" />

        <title>${title}</title>

        <body ${rawHtml(type ? `class="${type}"` : '')}>
          ${skipLinks.length > 0
            ? html` <skip-link>${skipLinks.map(([text, link]) => html`<a href="${link}">${text}</a>`)}</skip-link>`
            : ''}

          <div class="contents">
            <header>
              <div class="navigation">
                ${phase
                  ? html`
                      <div class="phase-banner">
                        <strong class="tag">${phase.tag}</strong>
                        <span>${phase.text}</span>
                      </div>
                    `
                  : ''}

                <nav>
                  <ul>
                    <li><a href="https://content.prereview.org/">Blog</a></li>
                    <li><a href="https://content.prereview.org/mission/">About</a></li>
                  </ul>
                </nav>
              </div>

              <div class="header">
                <div class="logo">
                  <a href="https://prereview.org/">
                    <img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" />
                  </a>
                </div>
              </div>
            </header>

            ${content}
          </div>

          <footer>
            <div>
              <ul aria-label="Support links">
                <li><a href="https://content.prereview.org/coc/">Code of Conduct</a></li>
                <li><a href="https://content.prereview.org/privacypolicy/">Privacy</a></li>
                <li><a href="mailto:contact@prereview.org">Contact</a></li>
                <li><a href="https://donorbox.org/prereview">Donate</a></li>
              </ul>

              <small>
                All content is available under a Creative&nbsp;Commons
                <a href="https://creativecommons.org/licenses/by/4.0/" rel="license"
                  >Attribution&nbsp;4.0 International license</a
                >, except where otherwise stated.
              </small>
            </div>

            <img src="${assets['prereview-footer.svg']}" width="107" height="97" alt="PREreview" />
          </footer>
        </body>
      </html>
    `,
  )
}

function stringEq<A>(): Eq<A> {
  return s.Eq as Eq<A>
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
