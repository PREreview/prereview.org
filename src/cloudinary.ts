import { v2 as cloudinary } from 'cloudinary'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { URL } from 'url'
import { timeoutRequest } from './fetch'

export interface CloudinaryApiEnv {
  cloudinaryApi: {
    cloudName: string
    key: string
    secret: string
  }
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const SearchResultsD = pipe(
  JsonD,
  D.compose(
    D.struct({
      resources: D.array(
        D.struct({
          public_id: D.string,
        }),
      ),
    }),
  ),
)

const findImageOnCloudinary = (orcid: Orcid) =>
  pipe(
    RTE.asks(({ cloudinaryApi }: CloudinaryApiEnv) =>
      cloudinary.search
        .expression(`metadata.orcid_id="${orcid}"`)
        .max_results(1)
        .to_url(60 * 10, undefined, {
          api_key: cloudinaryApi.key,
          api_secret: cloudinaryApi.secret,
          cloud_name: cloudinaryApi.cloudName,
          secure: true,
        }),
    ),
    RTE.map(F.Request('GET')),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(SearchResultsD), TE.mapLeft(D.draw))),
    RTE.local(timeoutRequest(2000)),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get image from Cloudinary')))),
    RTE.mapLeft(() => 'unavailable' as const),
    RTE.chainOptionKW(() => 'not-found' as const)(get('resources.[number].public_id', 0)),
  )

export const getAvatarFromCloudinary = flow(
  findImageOnCloudinary,
  RTE.chainW(imageId =>
    RTE.asks(
      ({ cloudinaryApi }: CloudinaryApiEnv) =>
        new URL(
          cloudinary.url(imageId, {
            cloud_name: cloudinaryApi.cloudName,
            force_version: false,
            secure: true,
            transformation: {
              crop: 'thumb',
              fetch_format: 'auto',
              quality: 'auto',
              gravity: 'face',
              width: 300,
              height: 300,
              zoom: 0.666,
            },
          }),
        ),
    ),
  ),
)
