import * as F from 'fetch-fp-ts'
import { mapLeft } from 'fp-ts/lib/Either.js'
import type { Json } from 'fp-ts/lib/Json.js'
import * as J from 'fp-ts/lib/Json.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { constVoid, flow, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import * as E from 'io-ts/lib/Encoder.js'
import * as L from 'logger-fp-ts'
import type { Email } from './email.js'
import { RawHtmlC } from './html.js'
import { EmailAddressC } from './types/email-address.js'

export interface MailjetApiEnv {
  mailjetApi: {
    key: string
    secret: string
    sandbox: boolean
  }
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      mapLeft(() => D.error(s, 'JSON')),
    ),
}

const emailToMailjetEmail = (email: Email): E.TypeOf<typeof SendEmailE> => ({
  From: { Email: email.from.address, name: email.from.name },
  To: [{ Email: email.to.address, name: email.to.name }],
  Subject: email.subject,
  TextPart: email.text,
  HtmlPart: email.html,
})

const SendEmailE = E.struct({
  From: E.struct({ Email: EmailAddressC, name: E.id<string>() }),
  To: E.tuple(E.struct({ Email: EmailAddressC, name: E.id<string>() })),
  Subject: E.id<string>(),
  TextPart: E.id<string>(),
  HtmlPart: RawHtmlC,
}) satisfies E.Encoder<Json, never>

const SentEmailD = pipe(JsonD, D.compose(D.struct({ Messages: D.tuple(D.struct({ Status: D.literal('success') })) })))

export const sendEmailWithMailjet = (email: Email) =>
  RTE.asksReaderTaskEitherW(({ mailjetApi }: MailjetApiEnv) =>
    pipe(
      'https://api.mailjet.com/v3.1/send',
      F.Request('POST'),
      F.setBody(
        JSON.stringify({
          Messages: [SendEmailE.encode(emailToMailjetEmail(email))],
          SandboxMode: mailjetApi.sandbox,
        }),
        'application/json',
      ),
      F.setHeaders({ Authorization: `Basic ${btoa(`${mailjetApi.key}:${mailjetApi.secret}`)}` }),
      F.send,
      RTE.mapLeft(() => 'network-error' as const),
      RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
      RTE.chainTaskEitherKW(flow(F.decode(SentEmailD), TE.mapLeft(D.draw))),
      RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to send email through Mailjet')))),
      RTE.bimap(() => 'unavailable' as const, constVoid),
    ),
  )
