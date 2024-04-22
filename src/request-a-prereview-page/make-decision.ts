import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags'
import * as Preprint from '../preprint'
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
}): RT.ReaderTask<CanRequestReviewsEnv & Preprint.ResolvePreprintIdEnv, Decision.Decision> =>
  pipe(
    RTE.Do,
    RTE.apS(
      'user',
      RTE.liftNullable(
        () => user,
        () => Decision.RequireLogIn,
      )(),
    ),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(({ user }) => canRequestReviews(user)),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => Decision.DenyAccess,
        ),
      ),
    ),
    RTE.let('method', () => method),
    RTE.let('body', () => body),
    RTE.matchEW(
      RT.of,
      flow(Form.fromRequest, form =>
        match(form)
          .with({ _tag: 'ValidForm' }, handleForm)
          .otherwise(form => RT.of(Decision.ShowForm(form))),
      ),
    ),
  )

const handleForm = flow(
  RTE.fromEitherK((form: Form.ValidForm) =>
    match(form.value)
      .returnType<E.Either<Decision.Decision, PreprintId.IndeterminatePreprintId>>()
      .with(P.string, E.fromOptionK(() => Decision.ShowUnsupportedDoi)(PreprintId.parsePreprintDoi))
      .with(P.instanceOf(URL), E.fromOptionK(() => Decision.ShowUnsupportedUrl)(PreprintId.fromUrl))
      .exhaustive(),
  ),
  RTE.chainW(
    flow(
      Preprint.resolvePreprintId,
      RTE.mapLeft(error =>
        match(error)
          .with('not-a-preprint', () => Decision.ShowNotAPreprint)
          .with('not-found', () => Decision.ShowError)
          .with('unavailable', () => Decision.ShowError)
          .exhaustive(),
      ),
    ),
  ),
  RTE.map(() => Decision.ShowError),
  RTE.toUnion,
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
