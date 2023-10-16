import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as NEA from 'fp-ts/NonEmptyArray'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { constVoid, flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { type Orcid, isOrcid } from 'orcid-id-ts'
import safeStableStringify from 'safe-stable-stringify'
import { URL } from 'url'

import Codec = C.Codec
import DecodeError = D.DecodeError
import FetchEnv = F.FetchEnv
import NonEmptyArray = NEA.NonEmptyArray
import ReaderTaskEither = RTE.ReaderTaskEither
import Response = F.Response

export interface Record {
  conceptdoi: Doi
  conceptrecid: number
  files: NonEmptyArray<{
    filename: string
    links: {
      self: URL
    }
    filesize: number
  }>
  id: number
  links: {
    latest: URL
    latest_html: URL
  }
  metadata: {
    communities?: NonEmptyArray<{
      identifier: string
    }>
    contributors?: NonEmptyArray<{
      name: string
      orcid?: Orcid
      type: string
    }>
    creators: NonEmptyArray<{
      name: string
      orcid?: Orcid
    }>
    description: string
    doi: Doi
    language?: string
    license: string
    keywords?: NonEmptyArray<string>
    notes?: string
    publication_date: Date
    related_identifiers?: NonEmptyArray<{
      scheme: string
      identifier: string
      relation: string
      resource_type?: string
    }>
    title: string
  } & (
    | {
        upload_type:
          | 'dataset'
          | 'figure'
          | 'lesson'
          | 'other'
          | 'physicalobject'
          | 'poster'
          | 'presentation'
          | 'software'
          | 'video'
      }
    | {
        upload_type: 'image'
        image_type: 'diagram' | 'drawing' | 'figure' | 'other' | 'photo' | 'plot'
      }
    | {
        upload_type: 'publication'
        publication_type:
          | 'annotationcollection'
          | 'article'
          | 'book'
          | 'conferencepaper'
          | 'datamanagementplan'
          | 'deliverable'
          | 'milestone'
          | 'other'
          | 'patent'
          | 'peerreview'
          | 'preprint'
          | 'proposal'
          | 'report'
          | 'section'
          | 'softwaredocumentation'
          | 'taxonomictreatment'
          | 'technicalnote'
          | 'thesis'
          | 'workingpaper'
      }
  )
}

export type DepositMetadata = {
  communities?: NonEmptyArray<{
    identifier: string
  }>
  contributors?: NonEmptyArray<{
    name: string
    orcid?: Orcid
    type: string
  }>
  creators: NonEmptyArray<{
    name: string
    orcid?: Orcid
  }>
  description: string
  keywords?: NonEmptyArray<string>
  related_identifiers?: NonEmptyArray<{
    scheme: string
    identifier: string
    relation: string
    resource_type?: string
  }>
  title: string
} & (
  | {
      upload_type:
        | 'dataset'
        | 'figure'
        | 'lesson'
        | 'other'
        | 'physicalobject'
        | 'poster'
        | 'presentation'
        | 'software'
        | 'video'
    }
  | {
      upload_type: 'image'
      image_type: 'diagram' | 'drawing' | 'figure' | 'other' | 'photo' | 'plot'
    }
  | {
      upload_type: 'publication'
      publication_type:
        | 'annotationcollection'
        | 'article'
        | 'book'
        | 'conferencepaper'
        | 'datamanagementplan'
        | 'deliverable'
        | 'milestone'
        | 'other'
        | 'patent'
        | 'peerreview'
        | 'preprint'
        | 'proposal'
        | 'report'
        | 'section'
        | 'softwaredocumentation'
        | 'taxonomictreatment'
        | 'technicalnote'
        | 'thesis'
        | 'workingpaper'
    }
)

export interface EmptyDeposition {
  id: number
  links: {
    bucket: URL
    self: URL
  }
  metadata: {
    prereserve_doi: {
      doi: Doi
    }
  }
  state: 'unsubmitted'
  submitted: false
}

export interface SubmittedDeposition {
  id: number
  metadata: DepositMetadata & {
    doi: Doi
  }
  state: 'done'
  submitted: true
}

export interface UnsubmittedDeposition {
  id: number
  links: {
    bucket: URL
    publish: URL
    self: URL
  }
  metadata: DepositMetadata & {
    prereserve_doi: {
      doi: Doi
    }
  }
  state: 'unsubmitted'
  submitted: false
}

export interface ZenodoEnv extends FetchEnv {
  zenodoApiKey?: string
  zenodoUrl?: URL
}

export interface ZenodoAuthenticatedEnv extends ZenodoEnv {
  zenodoApiKey: string
}

export interface Records {
  hits: {
    hits: Array<Record>
    total: number
  }
}

export const getRecord: (id: number) => ReaderTaskEither<ZenodoEnv, Error | DecodeError | Response, Record> = id =>
  pipe(
    RTE.rightReader(zenodoUrl(`records/${id.toString()}`)),
    RTE.chainReaderKW(flow(F.Request('GET'), F.setHeader('Accept', 'application/json'), addAuthorizationHeader)),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(RecordC)),
  )

export const getCommunityRecords: (
  community: string,
) => (query: URLSearchParams) => ReaderTaskEither<ZenodoEnv, Error | DecodeError | Response, Records> =
  community => query =>
    pipe(
      RTE.rightReader(zenodoUrl(`communities/${community}/records?${query.toString()}`)),
      RTE.chainReaderKW(flow(F.Request('GET'), F.setHeader('Accept', 'application/json'), addAuthorizationHeader)),
      RTE.chainW(F.send),
      RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
      RTE.chainTaskEitherKW(F.decode(RecordsC)),
    )

export const createEmptyDeposition = (): ReaderTaskEither<
  ZenodoAuthenticatedEnv,
  Error | DecodeError | Response,
  EmptyDeposition
> =>
  pipe(
    RTE.rightReader(zenodoUrl('deposit/depositions')),
    RTE.chainReaderK(
      flow(
        F.Request('POST'),
        F.setHeader('Accept', 'application/json'),
        F.setBody(JSON.stringify({}), 'application/json'),
        addAuthorizationHeader,
      ),
    ),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.chainTaskEitherKW(F.decode(EmptyDepositionC)),
  )

export const updateDeposition: <T extends EmptyDeposition | UnsubmittedDeposition>(
  metadata: DepositMetadata,
  deposition: T,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, Error | DecodeError | Response, UnsubmittedDeposition> = (
  metadata,
  deposition,
) =>
  pipe(
    F.Request('PUT')(deposition.links.self),
    F.setHeader('Accept', 'application/json'),
    F.setBody(JSON.stringify({ metadata: DepositMetadataC.encode(metadata) }), 'application/json'),
    RTE.fromReaderK(addAuthorizationHeader),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(UnsubmittedDepositionC)),
  )

export const uploadFile: (upload: {
  readonly name: string
  readonly content: string
}) => <T extends EmptyDeposition | UnsubmittedDeposition>(
  deposition: T,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, Error | Response, void> = upload =>
  flow(
    deposition => `${deposition.links.bucket.toString()}/${upload.name}`,
    F.Request('PUT'),
    F.setBody(upload.content, 'application/octet-stream'),
    RTE.fromReaderK(addAuthorizationHeader),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.Created, Status.OK), identity),
    RTE.map(constVoid),
  )

export const publishDeposition: (
  deposition: UnsubmittedDeposition,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, Error | DecodeError | Response, SubmittedDeposition> = deposition =>
  pipe(
    F.Request('POST')(deposition.links.publish),
    F.setHeader('Accept', 'application/json'),
    RTE.fromReaderK(addAuthorizationHeader),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.Accepted), identity),
    RTE.chainTaskEitherKW(F.decode(SubmittedDepositionC)),
  )

const DoiC = C.fromDecoder(D.fromRefinement(isDoi, 'DOI'))

const OrcidC = C.fromDecoder(D.fromRefinement(isOrcid, 'ORCID'))

const UrlC = C.make(
  pipe(
    D.string,
    D.parse(s =>
      E.tryCatch(
        () => new URL(s),
        () => D.error(s, 'URL'),
      ),
    ),
  ),
  { encode: String },
)

const JsonC = C.make(
  {
    decode: (s: string) =>
      pipe(
        J.parse(s),
        E.mapLeft(() => D.error(s, 'JSON')),
      ),
  },
  { encode: json => safeStableStringify(json) },
)

const NonEmptyArrayC = <O, A>(codec: Codec<unknown, O, A>) =>
  C.make(pipe(D.array(codec), D.refine(A.isNonEmpty, 'NonEmptyArray')), C.array(codec))

const NumberFromStringC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const n = +s
      return isNaN(n) || s.trim() === '' ? D.failure(s, 'Not a number') : D.success(n)
    }),
  ),
  { encode: String },
)

const PlainDateC = C.make(
  pipe(
    D.string,
    D.parse(
      E.fromPredicate(
        s => /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(s),
        s => D.error(s, 'Plain Date'),
      ),
    ),
    D.parse(s =>
      pipe(
        O.tryCatch(() => new Date(s)),
        O.filter(d => !isNaN(d.getTime())),
        E.fromOption(() => D.error(s, 'Plain Date')),
      ),
    ),
  ),
  { encode: date => date.toISOString().split('T')[0] ?? '' },
)

const UploadTypeC = C.sum('upload_type')({
  dataset: C.struct({
    upload_type: C.literal('dataset'),
  }),
  figure: C.struct({
    upload_type: C.literal('figure'),
  }),
  image: C.struct({
    image_type: C.literal('figure', 'plot', 'drawing', 'diagram', 'photo', 'other'),
    upload_type: C.literal('image'),
  }),
  lesson: C.struct({
    upload_type: C.literal('lesson'),
  }),
  other: C.struct({
    upload_type: C.literal('other'),
  }),
  poster: C.struct({
    upload_type: C.literal('poster'),
  }),
  physicalobject: C.struct({
    upload_type: C.literal('physicalobject'),
  }),
  presentation: C.struct({
    upload_type: C.literal('presentation'),
  }),
  publication: C.struct({
    publication_type: C.literal(
      'annotationcollection',
      'book',
      'section',
      'conferencepaper',
      'datamanagementplan',
      'article',
      'patent',
      'peerreview',
      'preprint',
      'deliverable',
      'milestone',
      'proposal',
      'report',
      'softwaredocumentation',
      'taxonomictreatment',
      'technicalnote',
      'thesis',
      'workingpaper',
      'other',
    ),
    upload_type: C.literal('publication'),
  }),
  software: C.struct({
    upload_type: C.literal('software'),
  }),
  video: C.struct({
    upload_type: C.literal('video'),
  }),
})

const BaseRecordC = C.struct({
  conceptdoi: DoiC,
  conceptrecid: NumberFromStringC,
  id: C.number,
  files: NonEmptyArrayC(
    pipe(
      C.struct({
        filename: C.string,
        links: C.struct({
          self: UrlC,
        }),
        filesize: C.number,
      }),
      C.imap(
        file => ({ ...file, links: { ...file.links, self: new URL(`${file.filename}/content`, file.links.self) } }),
        identity,
      ),
    ),
  ),
  links: C.struct({
    latest: UrlC,
    latest_html: UrlC,
  }),
  metadata: pipe(
    C.struct({
      creators: NonEmptyArrayC(
        pipe(
          C.struct({
            name: C.string,
          }),
          C.intersect(
            C.partial({
              orcid: OrcidC,
            }),
          ),
        ),
      ),
      description: C.string,
      doi: DoiC,
      license: C.string,
      publication_date: PlainDateC,
      title: C.string,
    }),
    C.intersect(UploadTypeC),
    C.intersect(
      C.partial({
        communities: pipe(
          C.array(C.struct({ identifier: C.string })),
          C.imap(
            A.match(() => undefined, identity),
            communities => (communities ?? []) as never,
          ),
        ),
        contributors: pipe(
          C.array(
            pipe(
              C.struct({
                name: C.string,
                type: C.string,
              }),
              C.intersect(
                C.partial({
                  orcid: OrcidC,
                }),
              ),
            ),
          ),
          C.imap(
            A.match(() => undefined, identity),
            contributors => (contributors ?? []) as never,
          ),
        ),
        keywords: NonEmptyArrayC(C.string),
        language: C.string,
        notes: C.string,
        related_identifiers: NonEmptyArrayC(
          pipe(
            C.struct({ identifier: C.string, scheme: C.string, relation: C.string }),
            C.intersect(C.partial({ resource_type: C.string })),
          ),
        ),
      }),
    ),
  ),
})

const DepositMetadataC = pipe(
  C.struct({
    creators: NonEmptyArrayC(
      pipe(
        C.struct({
          name: C.string,
        }),
        C.intersect(
          C.partial({
            orcid: OrcidC,
          }),
        ),
      ),
    ),
    description: C.string,
    title: C.string,
  }),
  C.intersect(
    C.partial({
      communities: NonEmptyArrayC(C.struct({ identifier: C.string })),
      contributors: NonEmptyArrayC(
        pipe(
          C.struct({
            name: C.string,
            type: C.string,
          }),
          C.intersect(
            C.partial({
              orcid: OrcidC,
            }),
          ),
        ),
      ),
      keywords: NonEmptyArrayC(C.string),
      related_identifiers: NonEmptyArrayC(
        pipe(
          C.struct({ identifier: C.string, scheme: C.string, relation: C.string }),
          C.intersect(C.partial({ resource_type: C.string })),
        ),
      ),
    }),
  ),
  C.intersect(UploadTypeC),
)

export const RecordC: Codec<string, string, Record> = pipe(JsonC, C.compose(BaseRecordC))

export const RecordsC: Codec<string, string, Records> = pipe(
  JsonC,
  C.compose(
    C.make(
      D.union(
        D.struct({
          hits: D.struct({
            hits: D.array(BaseRecordC),
            total: D.number,
          }),
        }),
        pipe(
          D.array(BaseRecordC),
          D.map(hits => ({ hits: { hits, total: 10000 } })),
        ),
      ),
      C.struct({
        hits: C.struct({
          hits: C.array(BaseRecordC),
          total: C.number,
        }),
      }),
    ),
  ),
)

export const EmptyDepositionC: Codec<string, string, EmptyDeposition> = pipe(
  JsonC,
  C.compose(
    C.struct({
      id: C.number,
      links: C.struct({
        bucket: UrlC,
        self: UrlC,
      }),
      metadata: C.struct({
        prereserve_doi: C.struct({
          doi: DoiC,
        }),
      }),
      state: C.literal('unsubmitted'),
      submitted: C.literal(false),
    }),
  ),
)

export const SubmittedDepositionC: Codec<string, string, SubmittedDeposition> = pipe(
  JsonC,
  C.compose(
    C.struct({
      id: C.number,
      metadata: pipe(
        DepositMetadataC,
        C.intersect(
          C.struct({
            doi: DoiC,
          }),
        ),
      ),
      state: C.literal('done'),
      submitted: C.literal(true),
    }),
  ),
)

export const UnsubmittedDepositionC: Codec<string, string, UnsubmittedDeposition> = pipe(
  JsonC,
  C.compose(
    C.struct({
      id: C.number,
      links: C.struct({
        bucket: UrlC,
        publish: UrlC,
        self: UrlC,
      }),
      metadata: pipe(
        DepositMetadataC,
        C.intersect(
          C.struct({
            prereserve_doi: C.struct({
              doi: DoiC,
            }),
          }),
        ),
      ),
      state: C.literal('unsubmitted'),
      submitted: C.literal(false),
    }),
  ),
)

const zenodoUrl = (path: string) =>
  R.asks(({ zenodoUrl }: ZenodoEnv) => new URL(`/api/${path}`, zenodoUrl ?? 'https://zenodo.org/'))

const addAuthorizationHeader = (request: F.Request) =>
  R.asks(({ zenodoApiKey }: ZenodoEnv) =>
    pipe(request, typeof zenodoApiKey === 'string' ? F.setHeader('Authorization', `Bearer ${zenodoApiKey}`) : identity),
  )