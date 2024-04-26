import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import type { RecentReviewRequest } from '../home-page'
import { rawHtml } from '../html'
import type { ReviewRequestPreprintId } from '../review-request'
import type { GenerateUuidEnv } from '../types/uuid'
import type { User } from '../user'
import { constructCoarPayload } from './construct-coar-payload'
import { sendReviewActionOffer } from './send-review-action-offer'

import PlainDate = Temporal.PlainDate

const hardcodedCoarNotifyUrl = 'https://coar-notify-sandbox.prereview.org'

export const publishToPrereviewCoarNotifyInbox = (
  preprint: ReviewRequestPreprintId,
  user: User,
  persona: 'public' | 'pseudonym',
): RTE.ReaderTaskEither<F.FetchEnv & GenerateUuidEnv, 'unavailable', void> =>
  pipe(
    { coarNotifyUrl: hardcodedCoarNotifyUrl, preprint, user, persona },
    constructCoarPayload,
    RTE.rightReaderIO,
    RTE.chainW(sendReviewActionOffer),
  )

export const getRecentReviewRequestsFromPrereviewCoarNotify = (): ReadonlyArray<RecentReviewRequest> => [
  {
    published: PlainDate.from('2024-04-24'),
    preprint: {
      id: { type: 'scielo', value: '10.1590/scielopreprints.8406' as Doi<'1590'> },
      language: 'pt',
      title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
    },
  },
  {
    published: PlainDate.from('2024-04-24'),
    preprint: {
      id: { type: 'scielo', value: '10.1590/scielopreprints.8470' as Doi<'1590'> },
      language: 'pt',
      title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
    },
  },
  {
    published: PlainDate.from('2024-04-23'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/2024.04.20.590411' as Doi<'1101'> },
      language: 'en',
      title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
    },
  },
  {
    published: PlainDate.from('2024-04-23'),
    preprint: {
      id: { type: 'scielo', value: '10.1590/scielopreprints.8326' as Doi<'1590'> },
      language: 'es',
      title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
    },
  },
  {
    published: PlainDate.from('2024-04-22'),
    preprint: {
      id: { type: 'scielo', value: '10.1590/scielopreprints.7792' as Doi<'1590'> },
      language: 'pt',
      title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
    },
  },
]
