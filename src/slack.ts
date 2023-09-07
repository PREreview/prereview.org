import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
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
        RTE.mapLeft(() => 'network-error' as const),
        RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
        RTE.chainTaskEitherKW(flow(F.decode(SlackProfileD), TE.mapLeft(D.draw))),
        RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get profile from Slack')))),
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
