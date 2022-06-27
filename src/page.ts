import { format } from 'fp-ts-routing'
import { Html, html, rawHtml } from './html'
import * as assets from './manifest.json'
import { homeMatch } from './routes'

type Page = {
  readonly title: string
  readonly type?: 'two-up'
  readonly content: Html
  readonly js?: ReadonlyArray<Assets<'.js'>>
}

export function page({ title, type, content, js = [] }: Page): Html {
  return html`
    <!DOCTYPE html>
    <html lang="en">
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      <link href="${assets['style.css']}" rel="stylesheet" />
      ${js.map(file => html`<script src="${assets[file]}" type="module"></script>`)}

      <title>${title}</title>

      <body ${rawHtml(type ? `class="${type}"` : '')}>
        <header>
          <div class="logo">
            <a href="${format(homeMatch.formatter, {})}">
              <img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" />
            </a>
          </div>
        </header>

        ${content}
      </body>
    </html>
  `
}

type Assets<A extends string> = EndsWith<keyof typeof assets, A>

// https://github.com/gcanti/fp-ts/issues/1680
type EndsWith<Full extends string, End extends string> = string extends Full
  ? string extends End
    ? string
    : Extract<`${string}${End}`, string>
  : Extract<Full, `${string}${End}`>
