import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { LanguageCode } from 'iso-639-1'
import { type Html, rawHtml } from '../html'
import type { ReviewRequestPreprintId } from '../review-request'

import PlainDate = Temporal.PlainDate

export interface RecentReviewRequest {
  readonly published: PlainDate
  readonly preprint: {
    readonly id: ReviewRequestPreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}

export const hardcodedRecentReviewRequests = [
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
] satisfies ReadonlyArray<RecentReviewRequest>
