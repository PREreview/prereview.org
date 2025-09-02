import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { SystemClock } from 'clock-ts'
import { Record, Struct } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import Keyv from 'keyv'
import { ContactEmailAddressC } from '../src/contact-email-address.js'
import * as _ from '../src/keyv.js'
import { OrcidTokenC } from '../src/orcid-token.js'
import { SlackUserIdC } from '../src/slack-user-id.js'
import { NonEmptyStringC, isNonEmptyString } from '../src/types/NonEmptyString.js'
import { UserOnboardingC } from '../src/user-onboarding.js'
import * as fc from './fc.js'

describe('getAuthorInvite', () => {
  test.prop([fc.uuid(), fc.authorInvite()])('when the key contains an author invite', async (uuid, authorInvite) => {
    const store = new Keyv()
    await store.set(uuid, authorInvite)

    const actual = await _.getAuthorInvite(uuid)({
      authorInviteStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(authorInvite))
  })

  test.prop([fc.uuid(), fc.anything()])(
    'when the key contains something other than author invite',
    async (uuid, value) => {
      const store = new Keyv()
      await store.set(uuid, value)

      const actual = await _.getAuthorInvite(uuid)({
        authorInviteStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.uuid()])('when the key is not found', async uuid => {
    const store = new Keyv()

    const actual = await _.getAuthorInvite(uuid)({
      authorInviteStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.uuid(), fc.anything()])('when the key cannot be accessed', async (uuid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getAuthorInvite(uuid)({
      authorInviteStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveAuthorInvite', () => {
  test.prop([fc.uuid(), fc.authorInvite()])('when the key contains an author invite', async (uuid, authorInvite) => {
    const store = new Keyv()
    await store.set(uuid, authorInvite)

    const actual = await _.saveAuthorInvite(
      uuid,
      authorInvite,
    )({
      authorInviteStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(uuid)).toStrictEqual(authorInvite)
  })

  test.prop([fc.uuid(), fc.anything(), fc.authorInvite()])(
    'when the key already contains something other than an author invite',
    async (uuid, value, authorInvite) => {
      const store = new Keyv()
      await store.set(uuid, value)

      const actual = await _.saveAuthorInvite(
        uuid,
        authorInvite,
      )({
        authorInviteStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(uuid)).toStrictEqual(authorInvite)
    },
  )

  test.prop([fc.uuid(), fc.authorInvite()])('when the key is not set', async (uuid, authorInvite) => {
    const store = new Keyv()

    const actual = await _.saveAuthorInvite(
      uuid,
      authorInvite,
    )({
      authorInviteStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(uuid)).toStrictEqual(authorInvite)
  })

  test.prop([fc.uuid(), fc.authorInvite(), fc.anything()])(
    'when the key cannot be accessed',
    async (uuid, authorInvite, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveAuthorInvite(
        uuid,
        authorInvite,
      )({
        authorInviteStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.deleteCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than career stage',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteCareerStage(orcid)({
        careerStageStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.getCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(careerStage))
  })

  test.prop([fc.orcid(), fc.careerStage().map(Struct.get('value'))])(
    'when the key contains a career stage as a string',
    async (orcid, careerStage) => {
      const store = new Keyv()
      await store.set(orcid, careerStage)

      const actual = await _.getCareerStage(orcid)({
        careerStageStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right({ value: careerStage, visibility: 'restricted' }))
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than career stage',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getCareerStage(orcid)({
        careerStageStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getCareerStage(orcid)({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getAllCareerStages', () => {
  test.prop([fc.array(fc.tuple(fc.orcid(), fc.careerStage()))])('when there are career stages', async careerStages => {
    const store = new Keyv()
    await Promise.all(careerStages.map(([orcid, careerStage]) => store.set(orcid, careerStage)))

    const actual = await _.getAllCareerStages({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(Object.fromEntries(careerStages)))
  })

  test.prop([fc.anything()])('when the store cannot be accessed', async error => {
    const store = new Keyv()
    store.iterator = async function* iterator() {
      yield await Promise.reject(error)
    }

    const actual = await _.getAllCareerStages({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.saveCareerStage(
      orcid,
      careerStage,
    )({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(careerStage)
  })

  test.prop([fc.orcid(), fc.anything(), fc.careerStage()])(
    'when the key already contains something other than career stage',
    async (orcid, value, careerStage) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveCareerStage(
        orcid,
        careerStage,
      )({
        careerStageStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(careerStage)
    },
  )

  test.prop([fc.orcid(), fc.careerStage()])('when the key is not set', async (orcid, careerStage) => {
    const store = new Keyv()

    const actual = await _.saveCareerStage(
      orcid,
      careerStage,
    )({
      careerStageStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(careerStage)
  })

  test.prop([fc.orcid(), fc.careerStage(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, careerStage, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveCareerStage(
        orcid,
        careerStage,
      )({
        careerStageStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('isOpenForRequests', () => {
  test.prop([fc.orcid(), fc.isOpenForRequests()])(
    'when the key contains open for requests',
    async (orcid, isOpenForRequests) => {
      const store = new Keyv()
      await store.set(orcid, isOpenForRequests)

      const actual = await _.isOpenForRequests(orcid)({
        isOpenForRequestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(isOpenForRequests))
    },
  )

  test.prop([fc.orcid(), fc.oneof(fc.constant(''), fc.anything())])(
    'when the key contains something other than open for requests',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.isOpenForRequests(orcid)({
        isOpenForRequestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.isOpenForRequests(orcid)({
      isOpenForRequestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.isOpenForRequests(orcid)({
      isOpenForRequestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveOpenForRequests', () => {
  test.prop([fc.orcid(), fc.isOpenForRequests()])(
    'when the key contains open for requests',
    async (orcid, isOpenForRequests) => {
      const store = new Keyv()
      await store.set(orcid, isOpenForRequests)

      const actual = await _.saveOpenForRequests(
        orcid,
        isOpenForRequests,
      )({
        isOpenForRequestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.isOpenForRequests()])(
    'when the key already contains something other than open for requests',
    async (orcid, value, isOpenForRequests) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveOpenForRequests(
        orcid,
        isOpenForRequests,
      )({
        isOpenForRequestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
    },
  )

  test.prop([fc.orcid(), fc.isOpenForRequests()])('when the key is not set', async (orcid, isOpenForRequests) => {
    const store = new Keyv()

    const actual = await _.saveOpenForRequests(
      orcid,
      isOpenForRequests,
    )({
      isOpenForRequestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
  })

  test.prop([fc.orcid(), fc.isOpenForRequests(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, isOpenForRequests, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveOpenForRequests(
        orcid,
        isOpenForRequests,
      )({
        isOpenForRequestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteResearchInterests', () => {
  test.prop([fc.orcid(), fc.researchInterests()])(
    'when the key contains research interests',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.deleteResearchInterests(orcid)({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than research interests',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteResearchInterests(orcid)({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteResearchInterests(orcid)({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteResearchInterests(orcid)({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getResearchInterests', () => {
  test.prop([fc.orcid(), fc.researchInterests()])(
    'when the key contains research interests',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.getResearchInterests(orcid)({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(researchInterests))
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])(
    'when the key contains research interests without a visibility level',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, { value: researchInterests })

      const actual = await _.getResearchInterests(orcid)({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right({ value: researchInterests, visibility: 'restricted' }))
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])(
    'when the key contains research interests as a string',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.getResearchInterests(orcid)({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right({ value: researchInterests, visibility: 'restricted' }))
    },
  )

  test.prop([
    fc.orcid(),
    fc.oneof(
      fc.constant(''),
      fc.anything().filter(value => typeof value !== 'string'),
    ),
  ])('when the key contains something other than research interests', async (orcid, value) => {
    const store = new Keyv()
    await store.set(orcid, value)

    const actual = await _.getResearchInterests(orcid)({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getResearchInterests(orcid)({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getResearchInterests(orcid)({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveResearchInterests', () => {
  test.prop([fc.orcid(), fc.researchInterests()])(
    'when the key contains research interests',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.saveResearchInterests(
        orcid,
        researchInterests,
      )({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(researchInterests)
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.researchInterests()])(
    'when the key already contains something other than research interests',
    async (orcid, value, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveResearchInterests(
        orcid,
        researchInterests,
      )({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(researchInterests)
    },
  )

  test.prop([fc.orcid(), fc.researchInterests()])('when the key is not set', async (orcid, researchInterests) => {
    const store = new Keyv()

    const actual = await _.saveResearchInterests(
      orcid,
      researchInterests,
    )({
      researchInterestsStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(researchInterests)
  })

  test.prop([fc.orcid(), fc.researchInterests(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, researchInterests, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveResearchInterests(
        orcid,
        researchInterests,
      )({
        researchInterestsStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteOrcidToken', () => {
  test.prop([fc.orcid(), fc.orcidToken()])('when the key contains an ORCID token', async (orcid, orcidToken) => {
    const store = new Keyv()
    await store.set(orcid, OrcidTokenC.encode(orcidToken))

    const actual = await _.deleteOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than an ORCID token',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteOrcidToken(orcid)({
        orcidTokenStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getOrcidToken', () => {
  test.prop([fc.orcid(), fc.orcidToken()])('when the key contains an ORCID token', async (orcid, getOrcidToken) => {
    const store = new Keyv()
    await store.set(orcid, OrcidTokenC.encode(getOrcidToken))

    const actual = await _.getOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(getOrcidToken))
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than an ORCID token',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getOrcidToken(orcid)({
        orcidTokenStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getOrcidToken(orcid)({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveOrcidToken', () => {
  test.prop([fc.orcid(), fc.orcidToken()])('when the key contains an ORCID token', async (orcid, orcidToken) => {
    const store = new Keyv()
    await store.set(orcid, OrcidTokenC.encode(orcidToken))

    const actual = await _.saveOrcidToken(
      orcid,
      orcidToken,
    )({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(OrcidTokenC.encode(orcidToken))
  })

  test.prop([fc.orcid(), fc.anything(), fc.orcidToken()])(
    'when the key already contains something other than an ORCID token',
    async (orcid, value, orcidToken) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveOrcidToken(
        orcid,
        orcidToken,
      )({
        orcidTokenStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(OrcidTokenC.encode(orcidToken))
    },
  )

  test.prop([fc.orcid(), fc.orcidToken()])('when the key is not set', async (orcid, orcidToken) => {
    const store = new Keyv()

    const actual = await _.saveOrcidToken(
      orcid,
      orcidToken,
    )({
      orcidTokenStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(OrcidTokenC.encode(orcidToken))
  })

  test.prop([fc.orcid(), fc.orcidToken(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, orcidToken, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveOrcidToken(
        orcid,
        orcidToken,
      )({
        orcidTokenStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteSlackUserId', () => {
  test.prop([fc.orcid(), fc.slackUserId()])('when the key contains a Slack user ID', async (orcid, slackUserId) => {
    const store = new Keyv()
    await store.set(orcid, SlackUserIdC.encode(slackUserId))

    const actual = await _.deleteSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than a Slack user ID',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteSlackUserId(orcid)({
        slackUserIdStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getSlackUserId', () => {
  test.prop([fc.orcid(), fc.slackUserId()])('when the key contains a Slack user ID', async (orcid, getSlackUserId) => {
    const store = new Keyv()
    await store.set(orcid, SlackUserIdC.encode(getSlackUserId))

    const actual = await _.getSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(SlackUserIdC.decode(SlackUserIdC.encode(getSlackUserId)))
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than a Slack user ID',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getSlackUserId(orcid)({
        slackUserIdStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getSlackUserId(orcid)({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveSlackUserId', () => {
  test.prop([fc.orcid(), fc.slackUserId()])('when the key contains a Slack user ID', async (orcid, slackUserId) => {
    const store = new Keyv()
    await store.set(orcid, SlackUserIdC.encode(slackUserId))

    const actual = await _.saveSlackUserId(
      orcid,
      slackUserId,
    )({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(SlackUserIdC.encode(slackUserId))
  })

  test.prop([fc.orcid(), fc.anything(), fc.slackUserId()])(
    'when the key already contains something other than a Slack user ID',
    async (orcid, value, slackUserId) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveSlackUserId(
        orcid,
        slackUserId,
      )({
        slackUserIdStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(SlackUserIdC.encode(slackUserId))
    },
  )

  test.prop([fc.orcid(), fc.slackUserId()])('when the key is not set', async (orcid, slackUserId) => {
    const store = new Keyv()

    const actual = await _.saveSlackUserId(
      orcid,
      slackUserId,
    )({
      slackUserIdStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(SlackUserIdC.encode(slackUserId))
  })

  test.prop([fc.orcid(), fc.slackUserId(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, slackUserId, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveSlackUserId(
        orcid,
        slackUserId,
      )({
        slackUserIdStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.deleteLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than a location',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteLocation(orcid)({
        locationStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.getLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(location))
  })

  test.prop([
    fc.orcid(),
    fc.oneof(
      fc.constant(''),
      fc.anything().filter(value => typeof value !== 'string'),
    ),
  ])('when the key contains something other than a location', async (orcid, value) => {
    const store = new Keyv()
    await store.set(orcid, value)

    const actual = await _.getLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getLocation(orcid)({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getAllLocations', () => {
  test.prop([fc.array(fc.tuple(fc.orcid(), fc.location()))])('when there are locations', async locations => {
    const store = new Keyv()
    await Promise.all(locations.map(([orcid, location]) => store.set(orcid, location)))

    const actual = await _.getAllLocations({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(Object.fromEntries(locations)))
  })

  test.prop([fc.anything()])('when the store cannot be accessed', async error => {
    const store = new Keyv()
    store.iterator = async function* iterator() {
      yield await Promise.reject(error)
    }

    const actual = await _.getAllLocations({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.saveLocation(
      orcid,
      location,
    )({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(location)
  })

  test.prop([fc.orcid(), fc.anything(), fc.location()])(
    'when the key already contains something other than a location',
    async (orcid, value, location) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveLocation(
        orcid,
        location,
      )({
        locationStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(location)
    },
  )

  test.prop([fc.orcid(), fc.location()])('when the key is not set', async (orcid, location) => {
    const store = new Keyv()

    const actual = await _.saveLocation(
      orcid,
      location,
    )({
      locationStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(location)
  })

  test.prop([fc.orcid(), fc.location(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, location, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveLocation(
        orcid,
        location,
      )({
        locationStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteLanguages', () => {
  test.prop([fc.orcid(), fc.languages()])('when the key contains languages', async (orcid, languages) => {
    const store = new Keyv()
    await store.set(orcid, languages)

    const actual = await _.deleteLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than languages',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteLanguages(orcid)({
        languagesStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getLanguages', () => {
  test.prop([fc.orcid(), fc.languages()])('when the key contains languages', async (orcid, languages) => {
    const store = new Keyv()
    await store.set(orcid, languages)

    const actual = await _.getLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(languages))
  })

  test.prop([
    fc.orcid(),
    fc.oneof(
      fc.constant(''),
      fc.anything().filter(value => typeof value !== 'string'),
    ),
  ])('when the key contains something other than languages', async (orcid, value) => {
    const store = new Keyv()
    await store.set(orcid, value)

    const actual = await _.getLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getLanguages(orcid)({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveLanguages', () => {
  test.prop([fc.orcid(), fc.languages()])('when the key contains languages', async (orcid, languages) => {
    const store = new Keyv()
    await store.set(orcid, languages)

    const actual = await _.saveLanguages(
      orcid,
      languages,
    )({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(languages)
  })

  test.prop([fc.orcid(), fc.anything(), fc.languages()])(
    'when the key already contains something other than languages',
    async (orcid, value, languages) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveLanguages(
        orcid,
        languages,
      )({
        languagesStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(languages)
    },
  )

  test.prop([fc.orcid(), fc.languages()])('when the key is not set', async (orcid, languages) => {
    const store = new Keyv()

    const actual = await _.saveLanguages(
      orcid,
      languages,
    )({
      languagesStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(languages)
  })

  test.prop([fc.orcid(), fc.languages(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, languages, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveLanguages(
        orcid,
        languages,
      )({
        languagesStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getContactEmailAddress', () => {
  test.prop([fc.orcid(), fc.contactEmailAddress()])(
    'when the key contains an email address',
    async (orcid, emailAddress) => {
      const store = new Keyv()
      await store.set(orcid, ContactEmailAddressC.encode(emailAddress))

      const actual = await _.getContactEmailAddress(orcid)({
        contactEmailAddressStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(emailAddress))
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than an email address',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getContactEmailAddress(orcid)({
        contactEmailAddressStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getContactEmailAddress(orcid)({
      contactEmailAddressStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getContactEmailAddress(orcid)({
      contactEmailAddressStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveContactEmailAddress', () => {
  test.prop([fc.orcid(), fc.contactEmailAddress()])(
    'when the key contains an email address',
    async (orcid, emailAddress) => {
      const store = new Keyv()
      await store.set(orcid, ContactEmailAddressC.encode(emailAddress))

      const actual = await _.saveContactEmailAddress(
        orcid,
        emailAddress,
      )({
        contactEmailAddressStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.contactEmailAddress()])(
    'when the key already contains something other than an email address',
    async (orcid, value, emailAddress) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveContactEmailAddress(
        orcid,
        emailAddress,
      )({
        contactEmailAddressStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
    },
  )

  test.prop([fc.orcid(), fc.contactEmailAddress()])('when the key is not set', async (orcid, emailAddress) => {
    const store = new Keyv()

    const actual = await _.saveContactEmailAddress(
      orcid,
      emailAddress,
    )({
      contactEmailAddressStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(ContactEmailAddressC.encode(emailAddress))
  })

  test.prop([fc.orcid(), fc.contactEmailAddress(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, emailAddress, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveContactEmailAddress(
        orcid,
        emailAddress,
      )({
        contactEmailAddressStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getUserOnboarding', () => {
  test.prop([fc.orcid(), fc.userOnboarding()])(
    'when the key contains user onboarding details',
    async (orcid, userOnboarding) => {
      const store = new Keyv()
      await store.set(orcid, UserOnboardingC.encode(userOnboarding))

      const actual = await _.getUserOnboarding(orcid)({
        userOnboardingStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(userOnboarding))
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than user onboarding details',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getUserOnboarding(orcid)({
        userOnboardingStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right({ seenMyDetailsPage: false }))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getUserOnboarding(orcid)({
      userOnboardingStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right({ seenMyDetailsPage: false }))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getUserOnboarding(orcid)({
      userOnboardingStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveUserOnboarding', () => {
  test.prop([fc.orcid(), fc.userOnboarding()])(
    'when the key contains user onboarding details',
    async (orcid, userOnboarding) => {
      const store = new Keyv()
      await store.set(orcid, UserOnboardingC.encode(userOnboarding))

      const actual = await _.saveUserOnboarding(
        orcid,
        userOnboarding,
      )({
        userOnboardingStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(UserOnboardingC.encode(userOnboarding))
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.userOnboarding()])(
    'when the key already contains something other than user onboarding details',
    async (orcid, value, userOnboarding) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveUserOnboarding(
        orcid,
        userOnboarding,
      )({
        userOnboardingStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(UserOnboardingC.encode(userOnboarding))
    },
  )

  test.prop([fc.orcid(), fc.userOnboarding()])('when the key is not set', async (orcid, userOnboarding) => {
    const store = new Keyv()

    const actual = await _.saveUserOnboarding(
      orcid,
      userOnboarding,
    )({
      userOnboardingStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(UserOnboardingC.encode(userOnboarding))
  })

  test.prop([fc.orcid(), fc.userOnboarding(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, userOnboarding, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveUserOnboarding(
        orcid,
        userOnboarding,
      )({
        userOnboardingStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getAvatar', () => {
  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key contains an avatar', async (orcid, avatar) => {
    const store = new Keyv()
    await store.set(orcid, avatar)

    const actual = await _.getAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(avatar))
  })

  test.prop([fc.orcid(), fc.anything().filter(value => typeof value !== 'string' || !isNonEmptyString(value))])(
    'when the key contains something other than an avatar',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getAvatar(orcid)({
        avatarStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveAvatar', () => {
  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key contains an avatar', async (orcid, avatar) => {
    const store = new Keyv()
    await store.set(orcid, NonEmptyStringC.encode(avatar))

    const actual = await _.saveAvatar(
      orcid,
      avatar,
    )({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(NonEmptyStringC.encode(avatar))
  })

  test.prop([fc.orcid(), fc.anything(), fc.nonEmptyString()])(
    'when the key already contains something other than an avatar',
    async (orcid, value, avatar) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveAvatar(
        orcid,
        avatar,
      )({
        avatarStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(NonEmptyStringC.encode(avatar))
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key is not set', async (orcid, avatar) => {
    const store = new Keyv()

    const actual = await _.saveAvatar(
      orcid,
      avatar,
    )({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(NonEmptyStringC.encode(avatar))
  })

  test.prop([fc.orcid(), fc.nonEmptyString(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, avatar, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveAvatar(
        orcid,
        avatar,
      )({ avatarStore: store, clock: SystemClock, logger: () => IO.of(undefined) })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteAvatar', () => {
  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key contains a avatar', async (orcid, avatar) => {
    const store = new Keyv()
    await store.set(orcid, avatar)

    const actual = await _.deleteAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key contains something other than avatar', async (orcid, value) => {
    const store = new Keyv()
    await store.set(orcid, value)

    const actual = await _.deleteAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteAvatar(orcid)({
      avatarStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getReviewRequest', () => {
  test.prop([fc.orcid(), fc.preprintId(), fc.reviewRequest()])(
    'when the key contains a review request',
    async (orcid, preprint, reviewRequest) => {
      const store = new Keyv()
      await store.set(`${orcid}_${preprint._tag}-${preprint.value}`, reviewRequest)

      const actual = await _.getReviewRequest([orcid, preprint])({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(reviewRequest))
    },
  )

  test.prop([fc.orcid(), fc.preprintId(), fc.anything()])(
    'when the key contains something other than a review request',
    async (orcid, preprint, value) => {
      const store = new Keyv()
      await store.set(`${orcid}_${preprint._tag}-${preprint.value}`, value)

      const actual = await _.getReviewRequest([orcid, preprint])({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid(), fc.preprintId()])('when the key is not found', async (orcid, preprint) => {
    const store = new Keyv()

    const actual = await _.getReviewRequest([orcid, preprint])({
      reviewRequestStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.preprintId(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, preprint, error) => {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = await _.getReviewRequest([orcid, preprint])({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('saveReviewRequest', () => {
  test.prop([fc.orcid(), fc.preprintId(), fc.reviewRequest()])(
    'when the key contains a review request',
    async (orcid, preprint, reviewRequest) => {
      const store = new Keyv()
      await store.set(`${orcid}_${preprint._tag}-${preprint.value}`, reviewRequest)

      const actual = await _.saveReviewRequest(
        [orcid, preprint],
        reviewRequest,
      )({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(`${orcid}_${preprint._tag}-${preprint.value}`)).toStrictEqual(reviewRequest)
    },
  )

  test.prop([fc.orcid(), fc.preprintId(), fc.anything(), fc.reviewRequest()])(
    'when the key already contains something other than a review request',
    async (orcid, preprint, value, reviewRequest) => {
      const store = new Keyv()
      await store.set(`${orcid}_${preprint._tag}-${preprint.value}`, value)

      const actual = await _.saveReviewRequest(
        [orcid, preprint],
        reviewRequest,
      )({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(`${orcid}_${preprint._tag}-${preprint.value}`)).toStrictEqual(reviewRequest)
    },
  )

  test.prop([fc.orcid(), fc.preprintId(), fc.reviewRequest()])(
    'when the key is not set',
    async (orcid, preprint, reviewRequest) => {
      const store = new Keyv()

      const actual = await _.saveReviewRequest(
        [orcid, preprint],
        reviewRequest,
      )({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(`${orcid}_${preprint._tag}-${preprint.value}`)).toStrictEqual(reviewRequest)
    },
  )

  test.prop([fc.orcid(), fc.preprintId(), fc.reviewRequest(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, preprint, reviewRequest, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveReviewRequest(
        [orcid, preprint],
        reviewRequest,
      )({
        reviewRequestStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('addToSession', () => {
  test.prop([fc.string(), fc.dictionary(fc.lorem(), fc.string()), fc.lorem(), fc.string()])(
    'when there is a session',
    async (sessionId, session, key, value) => {
      const store = new Keyv()
      await store.set(sessionId, session)

      const actual = await _.addToSession(
        sessionId,
        key,
        value,
      )({
        sessionStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(sessionId)).toStrictEqual({ ...session, [key]: value })
    },
  )

  test.prop([fc.string(), fc.lorem(), fc.string()])('when the session is not set', async (sessionId, key, value) => {
    const store = new Keyv()

    const actual = await _.addToSession(
      sessionId,
      key,
      value,
    )({
      sessionStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(await store.has(sessionId)).toBeFalsy()
  })

  test.prop([fc.string(), fc.json(), fc.string(), fc.json(), fc.anything()])(
    'when the session cannot be accessed',
    async (sessionId, session, key, value, error) => {
      const store = new Keyv()
      await store.set(sessionId, session)
      store.set = () => Promise.reject(error)

      const actual = await _.addToSession(
        sessionId,
        key,
        value,
      )({
        sessionStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('popFromSession', () => {
  test.prop([
    fc.string(),
    fc.tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem()).filter(([session, key]) => !Record.has(session, key)),
    fc.string(),
  ])('when the session contains the key', async (sessionId, [session, key], value) => {
    const store = new Keyv()
    await store.set(sessionId, { ...session, [key]: value })

    const actual = await _.popFromSession(
      sessionId,
      key,
    )({
      sessionStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.right(value))
    expect(await store.get(sessionId)).toStrictEqual(session)
  })

  test.prop([
    fc.string(),
    fc.tuple(fc.dictionary(fc.lorem(), fc.string()), fc.lorem()).filter(([session, key]) => !Record.has(session, key)),
  ])('when the key is not found in the session', async (sessionId, [session, key]) => {
    const store = new Keyv()
    await store.set(sessionId, session)

    const actual = await _.popFromSession(
      sessionId,
      key,
    )({
      sessionStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(await store.get(sessionId)).toStrictEqual(session)
  })

  test.prop([fc.string(), fc.lorem()])('when the session is not found', async (sessionId, key) => {
    const store = new Keyv()

    const actual = await _.popFromSession(
      sessionId,
      key,
    )({
      sessionStore: store,
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })

  test.prop([fc.string(), fc.lorem(), fc.anything()])(
    'when the session cannot be accessed',
    async (sessionId, key, error) => {
      const store = new Keyv()
      store.get = (): Promise<never> => Promise.reject(error)

      const actual = await _.popFromSession(
        sessionId,
        key,
      )({
        sessionStore: store,
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})
