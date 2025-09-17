import { Effect, pipe } from 'effect'
import { Ghost } from '../ExternalApis/index.js'
import { rawHtml, sanitizeHtml } from '../html.js'

export const getPage = (id: string) =>
  pipe(
    Ghost.getPage(id),
    Effect.andThen(page =>
      rawHtml(
        sanitizeHtml(page.html.toString(), true)
          .toString()
          .replaceAll(/href="https?:\/\/prereview\.org\/?(.*?)"/g, 'href="/$1"'),
      ),
    ),
  )
