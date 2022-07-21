import { format } from 'fp-ts-routing'
import * as R from 'fp-ts/Reader'
import { Html, PlainText, html, rawHtml } from './html'
import * as assets from './manifest.json'
import { homeMatch } from './routes'

export interface PhaseEnv {
  readonly phase?: {
    readonly tag: string
    readonly text: Html
  }
}

type Page = {
  readonly title: PlainText
  readonly type?: 'no-header' | 'two-up'
  readonly content: Html
  readonly js?: ReadonlyArray<Assets<'.js'>>
}

export function page({ title, type, content, js = [] }: Page): R.Reader<PhaseEnv, Html> {
  return R.asks(
    ({ phase }) => html`
      <!DOCTYPE html>
      <html lang="en">
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link href="${assets['style.css']}" rel="stylesheet" />
        ${js.map(file => html` <script src="${assets[file]}" type="module"></script>`)}

        <title>${title}</title>

        <body ${rawHtml(type ? `class="${type}"` : '')}>
          ${phase || type !== 'no-header'
            ? html`
                <header>
                  ${phase
                    ? html`
                        <div class="phase-banner">
                          <strong class="tag">${phase.tag}</strong>
                          <span>${phase.text}</span>
                        </div>
                      `
                    : ''}
                  ${type !== 'no-header'
                    ? html`
                        <div class="header">
                          <div class="logo">
                            <a href="${format(homeMatch.formatter, {})}">
                              <img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" />
                            </a>
                          </div>
                        </div>
                      `
                    : ''}
                </header>
              `
            : ''}
          ${content}
        </body>
      </html>
    `,
  )
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
