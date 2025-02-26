import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type { SupportedLocale } from '../locales/index.js'
import { handleDecision } from './handle-decision.js'
import { makeDecision } from './make-decision.js'

export const requestAPrereview = ({
  body,
  locale,
  method,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
}) =>
  pipe(
    makeDecision({ body, method }),
    RT.map(decision => handleDecision(decision, locale)),
  )
