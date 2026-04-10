import { rawHtml } from '../../src/html.ts'
import * as Preprints from '../../src/Preprints/index.ts'
import type * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import { Doi, Temporal } from '../../src/types/index.ts'
import * as _ from '../../src/WebApp/MyReviewRequestsPage/ListOfReviewRequestsPage.ts'
import { expect, test } from '../base.ts'

test('content looks right with one request', async ({ showPage }) => {
  const response = _.ListOfReviewRequestsPage({ reviewRequests: [reviewRequest1] })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with multiple requests', async ({ showPage }) => {
  const response = _.ListOfReviewRequestsPage({
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewRequest1 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  subfields: ['3304'],
  preprint: {
    id: new Preprints.ScieloPreprintId({ value: Doi.Doi('10.1590/scielopreprints.8406') }),
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies ReviewRequests.ReviewRequestForPrereviewer

const reviewRequest2 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  subfields: [],
  preprint: {
    id: new Preprints.ScieloPreprintId({ value: Doi.Doi('10.1590/scielopreprints.8470') }),
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies ReviewRequests.ReviewRequestForPrereviewer

const reviewRequest3 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  subfields: ['2303', '1312'],
  preprint: {
    id: new Preprints.BiorxivPreprintId({ value: Doi.Doi('10.1101/2024.04.20.590411') }),
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies ReviewRequests.ReviewRequestForPrereviewer

const reviewRequest4 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  subfields: ['2307', '3600', '3308'],
  preprint: {
    id: new Preprints.ScieloPreprintId({ value: Doi.Doi('10.1590/scielopreprints.8326') }),
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies ReviewRequests.ReviewRequestForPrereviewer

const reviewRequest5 = {
  published: Temporal.PlainDate.from('2024-04-22'),
  subfields: ['3204'],
  preprint: {
    id: new Preprints.ScieloPreprintId({ value: Doi.Doi('10.1590/scielopreprints.7792') }),
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies ReviewRequests.ReviewRequestForPrereviewer
