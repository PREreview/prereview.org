import { format } from 'fp-ts-routing'
import * as assets from './manifest.json'
import { homeMatch } from './routes'

type Page = {
  readonly title: string
  readonly content: string
}

export function page(page: Page): string {
  return `<!DOCTYPE html>
<html lang="en">
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <link href="${assets['style.css']}" rel="stylesheet" />
  <script src="${assets['main.js']}" type="module"></script>

  <title>${page.title}</title>

  <header>
    <a href="${format(homeMatch.formatter, {})}">
      <img src="${assets['prereview.svg']}" width="262" height="63" alt="PREreview" />
    </a>
  </header>

  ${page.content}
</html>
`
}
