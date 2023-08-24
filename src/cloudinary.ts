import { v2 as cloudinary } from 'cloudinary'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { URL } from 'url'

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
      cloudinary.search.expression(`metadata.orcid_id="${orcid}"`).max_results(1).to_url(undefined, undefined, {
        api_key: cloudinaryApi.key,
        api_secret: cloudinaryApi.secret,
        cloud_name: cloudinaryApi.cloudName,
        secure: true,
      }),
    ),
    RTE.map(F.Request('GET')),
    RTE.chainW(F.send),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(SearchResultsD)),
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
