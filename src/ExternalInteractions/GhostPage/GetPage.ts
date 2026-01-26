import { Effect, pipe } from 'effect'
import { Ghost } from '../../ExternalApis/index.ts'
import { rawHtml, sanitizeHtml } from '../../html.ts'

export const getPage = (id: string) =>
  pipe(
    Ghost.getPage(id),
    Effect.andThen(page =>
      rawHtml(
        sanitizeHtml(page.html.toString(), { trusted: true })
          .toString()
          .replaceAll(/href="https?:\/\/prereview\.org\/?(.*?)"/g, 'href="/$1"'),
      ),
    ),
  )
