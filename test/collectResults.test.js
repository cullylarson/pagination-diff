// Already tested in index.test.js just by using it. Maybe add more tests here someday.

import {collectResults} from '../esm/'

test('First less than second.', async () => {
    const iterator = async function * () {
        yield {
            add: [1, 2],
            remove: [3, 7],
        }

        yield {
            add: [8, 13],
            remove: [12],
        }
    }

    const result = await collectResults(iterator)

    expect(result).toEqual({
        add: [1, 2, 8, 13],
        remove: [3, 7, 12],
    })
})
