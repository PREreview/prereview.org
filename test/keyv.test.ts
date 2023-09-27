import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import Keyv from 'keyv'
import { get } from 'spectacles-ts'
import * as _ from '../src/keyv'
import * as fc from './fc'

describe('deleteCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.deleteCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than career stage',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteCareerStage(orcid)({ careerStageStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.right(careerStage))
  })

  test.prop([fc.orcid(), fc.careerStage().map(get('value'))])(
    'when the key contains a career stage as a string',
    async (orcid, careerStage) => {
      const store = new Keyv()
      await store.set(orcid, careerStage)

      const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

      expect(actual).toStrictEqual(E.right({ value: careerStage, visibility: 'restricted' }))
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than career stage',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveCareerStage', () => {
  test.prop([fc.orcid(), fc.careerStage()])('when the key contains a career stage', async (orcid, careerStage) => {
    const store = new Keyv()
    await store.set(orcid, careerStage)

    const actual = await _.saveCareerStage(orcid, careerStage)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(careerStage)
  })

  test.prop([fc.orcid(), fc.anything(), fc.careerStage()])(
    'when the key already contains something other than career stage',
    async (orcid, value, careerStage) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveCareerStage(orcid, careerStage)({ careerStageStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(careerStage)
    },
  )

  test.prop([fc.orcid(), fc.careerStage()])('when the key is not set', async (orcid, careerStage) => {
    const store = new Keyv()

    const actual = await _.saveCareerStage(orcid, careerStage)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(careerStage)
  })

  test.prop([fc.orcid(), fc.careerStage(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, careerStage, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveCareerStage(orcid, careerStage)({ careerStageStore: store })()

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

      const actual = await _.isOpenForRequests(orcid)({ isOpenForRequestsStore: store })()

      expect(actual).toStrictEqual(E.right(isOpenForRequests))
    },
  )

  test.prop([fc.orcid(), fc.oneof(fc.constant(''), fc.anything())])(
    'when the key contains something other than open for requests',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.isOpenForRequests(orcid)({ isOpenForRequestsStore: store })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.isOpenForRequests(orcid)({ isOpenForRequestsStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.isOpenForRequests(orcid)({ isOpenForRequestsStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveOpenForRequests', () => {
  test.prop([fc.orcid(), fc.isOpenForRequests()])(
    'when the key contains open for requests',
    async (orcid, isOpenForRequests) => {
      const store = new Keyv()
      await store.set(orcid, isOpenForRequests)

      const actual = await _.saveOpenForRequests(orcid, isOpenForRequests)({ isOpenForRequestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.isOpenForRequests()])(
    'when the key already contains something other than open for requests',
    async (orcid, value, isOpenForRequests) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveOpenForRequests(orcid, isOpenForRequests)({ isOpenForRequestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
    },
  )

  test.prop([fc.orcid(), fc.isOpenForRequests()])('when the key is not set', async (orcid, isOpenForRequests) => {
    const store = new Keyv()

    const actual = await _.saveOpenForRequests(orcid, isOpenForRequests)({ isOpenForRequestsStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(isOpenForRequests)
  })

  test.prop([fc.orcid(), fc.isOpenForRequests(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, isOpenForRequests, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveOpenForRequests(orcid, isOpenForRequests)({ isOpenForRequestsStore: store })()

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

      const actual = await _.deleteResearchInterests(orcid)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than research interests',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteResearchInterests(orcid)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteResearchInterests(orcid)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteResearchInterests(orcid)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getResearchInterests', () => {
  test.prop([fc.orcid(), fc.researchInterests()])(
    'when the key contains research interests',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right(researchInterests))
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])(
    'when the key contains research interests without a visibility level',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, { value: researchInterests })

      const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right({ value: researchInterests, visibility: 'restricted' }))
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])(
    'when the key contains research interests as a string',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

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

    const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getResearchInterests(orcid)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveResearchInterests', () => {
  test.prop([fc.orcid(), fc.researchInterests()])(
    'when the key contains research interests',
    async (orcid, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, researchInterests)

      const actual = await _.saveResearchInterests(orcid, researchInterests)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(researchInterests)
    },
  )

  test.prop([fc.orcid(), fc.anything(), fc.researchInterests()])(
    'when the key already contains something other than research interests',
    async (orcid, value, researchInterests) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveResearchInterests(orcid, researchInterests)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(researchInterests)
    },
  )

  test.prop([fc.orcid(), fc.researchInterests()])('when the key is not set', async (orcid, researchInterests) => {
    const store = new Keyv()

    const actual = await _.saveResearchInterests(orcid, researchInterests)({ researchInterestsStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(researchInterests)
  })

  test.prop([fc.orcid(), fc.researchInterests(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, researchInterests, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveResearchInterests(orcid, researchInterests)({ researchInterestsStore: store })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('getSlackUserId', () => {
  test.prop([fc.orcid(), fc.nonEmptyString()])(
    'when the key contains a Slack user ID',
    async (orcid, getSlackUserId) => {
      const store = new Keyv()
      await store.set(orcid, getSlackUserId)

      const actual = await _.getSlackUserId(orcid)({ slackUserIdStore: store })()

      expect(actual).toStrictEqual(E.right(getSlackUserId))
    },
  )

  test.prop([
    fc.orcid(),
    fc.oneof(
      fc.constant(''),
      fc.anything().filter(value => typeof value !== 'string'),
    ),
  ])('when the key contains something other than a Slack user ID', async (orcid, value) => {
    const store = new Keyv()
    await store.set(orcid, value)

    const actual = await _.getSlackUserId(orcid)({ slackUserIdStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getSlackUserId(orcid)({ slackUserIdStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getSlackUserId(orcid)({ slackUserIdStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveSlackUserId', () => {
  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key contains a Slack user ID', async (orcid, slackUserId) => {
    const store = new Keyv()
    await store.set(orcid, slackUserId)

    const actual = await _.saveSlackUserId(orcid, slackUserId)({ slackUserIdStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(slackUserId)
  })

  test.prop([fc.orcid(), fc.anything(), fc.nonEmptyString()])(
    'when the key already contains something other than a Slack user ID',
    async (orcid, value, slackUserId) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveSlackUserId(orcid, slackUserId)({ slackUserIdStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(slackUserId)
    },
  )

  test.prop([fc.orcid(), fc.nonEmptyString()])('when the key is not set', async (orcid, slackUserId) => {
    const store = new Keyv()

    const actual = await _.saveSlackUserId(orcid, slackUserId)({ slackUserIdStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(slackUserId)
  })

  test.prop([fc.orcid(), fc.nonEmptyString(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, slackUserId, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveSlackUserId(orcid, slackUserId)({ slackUserIdStore: store })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('deleteLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.deleteLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])(
    'when the key contains something other than a location',
    async (orcid, value) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.deleteLocation(orcid)({ locationStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.has(orcid)).toBeFalsy()
    },
  )

  test.prop([fc.orcid()])('when the key is not set', async orcid => {
    const store = new Keyv()

    const actual = await _.deleteLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.has(orcid)).toBeFalsy()
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.delete = () => Promise.reject(error)

    const actual = await _.deleteLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('getLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.getLocation(orcid)({ locationStore: store })()

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

    const actual = await _.getLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid()])('when the key is not found', async orcid => {
    const store = new Keyv()

    const actual = await _.getLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = (): Promise<never> => Promise.reject(error)

    const actual = await _.getLocation(orcid)({ locationStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('saveLocation', () => {
  test.prop([fc.orcid(), fc.location()])('when the key contains a location', async (orcid, location) => {
    const store = new Keyv()
    await store.set(orcid, location)

    const actual = await _.saveLocation(orcid, location)({ locationStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(location)
  })

  test.prop([fc.orcid(), fc.anything(), fc.location()])(
    'when the key already contains something other than a location',
    async (orcid, value, location) => {
      const store = new Keyv()
      await store.set(orcid, value)

      const actual = await _.saveLocation(orcid, location)({ locationStore: store })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(await store.get(orcid)).toStrictEqual(location)
    },
  )

  test.prop([fc.orcid(), fc.location()])('when the key is not set', async (orcid, location) => {
    const store = new Keyv()

    const actual = await _.saveLocation(orcid, location)({ locationStore: store })()

    expect(actual).toStrictEqual(E.right(undefined))
    expect(await store.get(orcid)).toStrictEqual(location)
  })

  test.prop([fc.orcid(), fc.location(), fc.anything()])(
    'when the key cannot be accessed',
    async (orcid, location, error) => {
      const store = new Keyv()
      store.set = () => Promise.reject(error)

      const actual = await _.saveLocation(orcid, location)({ locationStore: store })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})
