import * as O from 'fp-ts/Option'
import type * as R from 'fp-ts/Reader'
import type { Reader } from 'fp-ts/Reader'
import * as RE from 'fp-ts/ReaderEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags'
import * as PreprintId from '../types/preprint-id'
import type { User } from '../user'
import * as Decision from './decision'
import * as Form from './form'

export type Env = EnvFor<ReturnType<typeof makeDecision>>

export const makeDecision = ({
  body,
  method,
  user,
}: {
  body: unknown
  method: string
  user?: User
}): R.Reader<CanRequestReviewsEnv, Decision.Decision> =>
  pipe(
    RE.Do,
    RE.apS(
      'user',
      RE.liftNullable(
        () => user,
        () => Decision.RequireLogIn,
      )(),
    ),
    RE.chainFirstW(
      flow(
        RE.fromReaderK(({ user }) => canRequestReviews(user)),
        RE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => Decision.DenyAccess,
        ),
      ),
    ),
    RE.let('method', () => method),
    RE.let('body', () => body),
    RE.matchW(
      identity,
      flow(Form.fromRequest, form => match(form).with({ _tag: 'ValidForm' }, handleForm).otherwise(Decision.ShowForm)),
    ),
  )

const handleForm = (form: Form.ValidForm) =>
  match(form.value)
    .with(
      P.string,
      flow(
        PreprintId.parsePreprintDoi,
        O.matchW(
          () => Decision.ShowUnsupportedDoi,
          () => Decision.ShowError,
        ),
      ),
    )
    .with(
      P.instanceOf(URL),
      flow(
        PreprintId.fromUrl,
        O.matchW(
          () => Decision.ShowUnsupportedUrl,
          () => Decision.ShowError,
        ),
      ),
    )
    .exhaustive()

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
