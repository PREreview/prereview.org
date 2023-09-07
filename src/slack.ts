import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { NonEmptyStringC } from './string'

export interface SlackApiEnv {
  slackApiToken: string
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const UrlD = pipe(
  D.string,
  D.parse(s =>
    E.tryCatch(
      () => new URL(s),
      () => D.error(s, 'URL'),
    ),
  ),
)

const SlackProfileD = pipe(
  JsonD,
  D.compose(
    D.struct({
      ok: D.literal(true),
      profile: D.struct({
        real_name: NonEmptyStringC,
        image_48: UrlD,
      }),
    }),
  ),
)

export const getUserFromSlack = (slackId: string) =>
  match(slackId)
    .with('U05BUCDTN2X', () =>
      pipe(
        'https://slack.com/api/users.profile.get?user=U05BUCDTN2X',
        F.Request('GET'),
        RTE.fromReaderK(addSlackApiHeaders),
        RTE.chainW(F.send),
        RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
        RTE.chainTaskEitherKW(F.decode(SlackProfileD)),
        RTE.bimap(
          () => 'unavailable' as const,
          ({ profile }) => ({ name: profile.real_name, image: profile.image_48 }),
        ),
      ),
    )
    .otherwise(() => RTE.left('not-found' as const))

function addSlackApiHeaders(request: F.Request) {
  return R.asks(({ slackApiToken }: SlackApiEnv) =>
    pipe(request, F.setHeader('Authorization', `Bearer ${slackApiToken}`)),
  )
}
