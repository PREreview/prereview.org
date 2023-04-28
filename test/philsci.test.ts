import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import { rawHtml } from '../src/html'
import * as _ from '../src/philsci'
import * as fc from './fc'

describe('getPreprintFromPhilsci', () => {
  test.prop([fc.philsciPreprintId()])('when the preprint can be loaded', async id => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        `https://philsci-archive.pitt.edu/cgi/export/eprint/${id.value}/JSON/pittphilsci-eprint-${id.value}.json`,
        {
          body: {
            subjects: [
              'science-and-society',
              'science-policy',
              'social-epistemology-of-science',
              'technology',
              'values-in-science',
            ],
            eprintid: id.value,
            date: 2023,
            userid: 3191,
            documents: [
              {
                language: 'en',
                placement: 1,
                eprintid: 21986,
                files: [
                  {
                    hash_type: 'MD5',
                    mtime: '2023-04-13 17:06:52',
                    datasetid: 'document',
                    fileid: 192239,
                    objectid: 73485,
                    uri: 'http://philsci-archive.pitt.edu/id/file/192239',
                    mime_type: 'application/pdf',
                    hash: '66961ced18ed164c6d4a3e332cf51570',
                    filesize: 802851,
                    filename: 'preprint_OS_2023.pdf',
                  },
                ],
                rev_number: 1,
                uri: 'http://philsci-archive.pitt.edu/id/document/73485',
                main: 'preprint_OS_2023.pdf',
                mime_type: 'application/pdf',
                docid: 73485,
                format: 'text',
                security: 'public',
                pos: 1,
              },
            ],
            rev_number: 11,
            creators: [
              {
                orcid: '0000-0002-7815-6609',
                name: {
                  lineage: null,
                  given: 'Sabina',
                  honourific: null,
                  family: 'Leonelli',
                },
                id: 's.leonelli@exeter.ac.uk',
              },
            ],
            dir: 'disk0/00/02/19/86',
            keywords: 'social epistemology; scientific method; technology; research system; digitalization',
            lastmod: '2023-04-13 17:14:34',
            metadata_visibility: 'show',
            eprint_status: 'archive',
            status_changed: '2023-04-13 17:14:34',
            datestamp: '2023-04-13 17:14:34',
            uri: 'http://philsci-archive.pitt.edu/id/eprint/21986',
            full_text_status: 'public',
            abstract:
              'In response to broad transformations brought about by the digitalization, globalization, and commodification of research processes, the Open Science [OS] movement aims to foster the wide dissemination, scrutiny and re-use of research components for the good of science and society. This Element examines the role played by OS principles and practices within contemporary research and how this relates to the epistemology of science. After reviewing some of the concerns that have prompted calls for more openness, I highlight how the interpretation of openness as the sharing of resources, so often encountered in OS initiatives and policies, may have the unwanted effect of constraining epistemic diversity and worsening epistemic injustice, resulting in unreliable and unethical scientific knowledge. By contrast, I propose to frame openness as the effort to establish judicious connections among systems of practice, predicated on a process-oriented view of research as a tool for effective and responsible agency.',
            type: 'pittpreprint',
            title: 'Philosophy of Open Science',
          },
        },
      )

    const actual = await _.getPreprintFromPhilsci(id)({ fetch })()

    expect(actual).toStrictEqual(
      E.right({
        abstract: {
          language: 'en',
          text: expect.stringContaining('In response to broad transformations'),
        },
        authors: [
          {
            name: 'Sabina Leonelli',
            orcid: '0000-0002-7815-6609',
          },
        ],
        id,
        posted: 2023,
        title: {
          language: 'en',
          text: rawHtml('Philosophy of Open Science'),
        },
        url: new URL('https://philsci-archive.pitt.edu/id/eprint/21986'),
      }),
    )
  })

  test.prop([fc.philsciPreprintId()])('when the response is stale', async id => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://philsci-archive.pitt.edu/cgi/export/eprint/${id.value}/JSON/pittphilsci-eprint-${id.value}.json` &&
          cache === 'force-cache',
        {
          body: {
            subjects: [
              'science-and-society',
              'science-policy',
              'social-epistemology-of-science',
              'technology',
              'values-in-science',
            ],
            eprintid: id.value,
            date: 2023,
            userid: 3191,
            documents: [
              {
                language: 'en',
                placement: 1,
                eprintid: 21986,
                files: [
                  {
                    hash_type: 'MD5',
                    mtime: '2023-04-13 17:06:52',
                    datasetid: 'document',
                    fileid: 192239,
                    objectid: 73485,
                    uri: 'http://philsci-archive.pitt.edu/id/file/192239',
                    mime_type: 'application/pdf',
                    hash: '66961ced18ed164c6d4a3e332cf51570',
                    filesize: 802851,
                    filename: 'preprint_OS_2023.pdf',
                  },
                ],
                rev_number: 1,
                uri: 'http://philsci-archive.pitt.edu/id/document/73485',
                main: 'preprint_OS_2023.pdf',
                mime_type: 'application/pdf',
                docid: 73485,
                format: 'text',
                security: 'public',
                pos: 1,
              },
            ],
            rev_number: 11,
            creators: [
              {
                orcid: '0000-0002-7815-6609',
                name: {
                  lineage: null,
                  given: 'Sabina',
                  honourific: null,
                  family: 'Leonelli',
                },
                id: 's.leonelli@exeter.ac.uk',
              },
            ],
            dir: 'disk0/00/02/19/86',
            keywords: 'social epistemology; scientific method; technology; research system; digitalization',
            lastmod: '2023-04-13 17:14:34',
            metadata_visibility: 'show',
            eprint_status: 'archive',
            status_changed: '2023-04-13 17:14:34',
            datestamp: '2023-04-13 17:14:34',
            uri: 'http://philsci-archive.pitt.edu/id/eprint/21986',
            full_text_status: 'public',
            abstract:
              'In response to broad transformations brought about by the digitalization, globalization, and commodification of research processes, the Open Science [OS] movement aims to foster the wide dissemination, scrutiny and re-use of research components for the good of science and society. This Element examines the role played by OS principles and practices within contemporary research and how this relates to the epistemology of science. After reviewing some of the concerns that have prompted calls for more openness, I highlight how the interpretation of openness as the sharing of resources, so often encountered in OS initiatives and policies, may have the unwanted effect of constraining epistemic diversity and worsening epistemic injustice, resulting in unreliable and unethical scientific knowledge. By contrast, I propose to frame openness as the effort to establish judicious connections among systems of practice, predicated on a process-oriented view of research as a tool for effective and responsible agency.',
            type: 'pittpreprint',
            title: 'Philosophy of Open Science',
          },
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://philsci-archive.pitt.edu/cgi/export/eprint/${id.value}/JSON/pittphilsci-eprint-${id.value}.json` &&
          cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getPreprintFromPhilsci(id)({ fetch })()

    expect(actual).toStrictEqual(
      E.right(
        expect.objectContaining({
          title: {
            language: 'en',
            text: rawHtml('Philosophy of Open Science'),
          },
        }),
      ),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.philsciPreprintId(), fc.record({ status: fc.constantFrom(Status.NotFound, Status.Unauthorized) })])(
    'when the preprint is not found',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          `https://philsci-archive.pitt.edu/cgi/export/eprint/${id.value}/JSON/pittphilsci-eprint-${id.value}.json`,
          response,
        )

      const actual = await _.getPreprintFromPhilsci(id)({ fetch })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.philsciPreprintId(), fc.record({ status: fc.integer(), body: fc.string() })])(
    'when the preprint cannot be loaded',
    async (id, response) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          `https://philsci-archive.pitt.edu/cgi/export/eprint/${id.value}/JSON/pittphilsci-eprint-${id.value}.json`,
          response,
        )

      const actual = await _.getPreprintFromPhilsci(id)({ fetch })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})
