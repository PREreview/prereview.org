import { pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type { SupportedLocale } from '../locales/index.js'
import type { User } from '../user.js'
import { handleDecision } from './handle-decision.js'
import { makeDecision } from './make-decision.js'

export const requestAPrereview = ({
  body,
  locale,
  method,
  user,
}: {
  body: unknown
  locale: SupportedLocale
  method: string
  user?: User
}) =>
  pipe(
    makeDecision({ body, method, user }),
    RT.map(decision => handleDecision(decision, locale)),
  )
