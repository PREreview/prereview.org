import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as b from 'fp-ts/boolean'
import { constVoid, flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import { type Orcid, toUrl } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import { timeoutRequest } from './fetch'
import type { SlackUser } from './slack-user'
import type { SlackUserId } from './slack-user-id'
import { NonEmptyStringC } from './string'

export interface SlackApiEnv {
  slackApiToken: string
}

export interface SlackApiUpdateEnv {
  slackApiUpdate: boolean
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

const SlackErrorD = pipe(
  JsonD,
  D.compose(
    D.struct({
      ok: D.literal(false),
      error: NonEmptyStringC,
    }),
  ),
)

const SlackSuccessD = pipe(
  JsonD,
  D.compose(
    D.struct({
      ok: D.literal(true),
    }),
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
  pipe(
    `https://slack.com/api/users.profile.get?user=${slackId}`,
    F.Request('GET'),
    RTE.fromReaderK(addSlackApiHeaders),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(pipe(D.union(SlackProfileD, SlackErrorD))), TE.mapLeft(D.draw))),
    RTE.local(timeoutRequest(2000)),
    RTE.chainEitherKW(response =>
      match(response).with({ ok: true }, E.right).with({ ok: false, error: P.select() }, E.left).exhaustive(),
    ),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get profile from Slack')))),
    RTE.bimap(
      () => 'unavailable' as const,
      ({ profile }) =>
        ({
          name: profile.real_name,
          image: profile.image_48,
          profile: new URL(`https://prereviewcommunity.slack.com/team/${slackId}`),
        }) satisfies SlackUser,
    ),
  )

export const addOrcidToSlackProfile = (userId: SlackUserId, orcid: Orcid) =>
  pipe(
    shouldUpdate,
    R.chainW(
      b.match(
        () => RTE.of(undefined),
        () =>
          pipe(
            'https://slack.com/api/users.profile.set',
            F.Request('POST'),
            F.setBody(
              JSON.stringify({ profile: { fields: { Xf060GTQCKMG: { value: toUrl(orcid).href, alt: orcid } } } }),
              'application/json',
            ),
            F.setHeader('Authorization', `Bearer ${userId.accessToken}`),
            F.send,
            RTE.mapLeft(() => 'network-error' as const),
            RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
            RTE.chainTaskEitherKW(flow(F.decode(pipe(D.union(SlackSuccessD, SlackErrorD))), TE.mapLeft(D.draw))),
            RTE.chainEitherKW(response =>
              match(response).with({ ok: true }, E.right).with({ ok: false, error: P.select() }, E.left).exhaustive(),
            ),
            RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to update Slack profile')))),
            RTE.bimap(() => 'unavailable' as const, constVoid),
            RTE.chain(() =>
              sendUserAMessage(
                userId,
                'Thanks for connecting your PREreview profile to your Community Slack Account. I’ve added your ORCID iD to your Slack profile.',
              ),
            ),
          ),
      ),
    ),
  )

export const removeOrcidFromSlackProfile = (userId: SlackUserId) =>
  pipe(
    shouldUpdate,
    R.chainW(
      b.match(
        () => RTE.of(undefined),
        () =>
          pipe(
            'https://slack.com/api/users.profile.set',
            F.Request('POST'),
            F.setBody(
              JSON.stringify({ profile: { fields: { Xf060GTQCKMG: { value: '', alt: '' } } } }),
              'application/json',
            ),
            F.setHeader('Authorization', `Bearer ${userId.accessToken}`),
            F.send,
            RTE.mapLeft(() => 'network-error' as const),
            RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
            RTE.chainTaskEitherKW(flow(F.decode(pipe(D.union(SlackSuccessD, SlackErrorD))), TE.mapLeft(D.draw))),
            RTE.chainEitherKW(response =>
              match(response).with({ ok: true }, E.right).with({ ok: false, error: P.select() }, E.left).exhaustive(),
            ),
            RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to update Slack profile')))),
            RTE.bimap(() => 'unavailable' as const, constVoid),
            RTE.chain(() =>
              sendUserAMessage(
                userId,
                'As you’ve disconnected your PREreview profile from your Community Slack account, I’ve removed your ORCID iD from your Slack profile.',
              ),
            ),
          ),
      ),
    ),
  )

const sendUserAMessage = (userId: SlackUserId, text: string) =>
  pipe(
    'https://slack.com/api/chat.postMessage',
    F.Request('POST'),
    F.setBody(JSON.stringify({ channel: userId.userId, text }), 'application/json'),
    RTE.fromReaderK(addSlackApiHeaders),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(pipe(D.union(SlackSuccessD, SlackErrorD))), TE.mapLeft(D.draw))),
    RTE.chainEitherKW(response =>
      match(response).with({ ok: true }, E.right).with({ ok: false, error: P.select() }, E.left).exhaustive(),
    ),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to send Slack message')))),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )

function addSlackApiHeaders(request: F.Request) {
  return R.asks(({ slackApiToken }: SlackApiEnv) =>
    pipe(request, F.setHeader('Authorization', `Bearer ${slackApiToken}`)),
  )
}

const shouldUpdate = R.asks(({ slackApiUpdate }: SlackApiUpdateEnv) => slackApiUpdate)
