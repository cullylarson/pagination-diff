import {PaginationDiff, collectResults, compareInt} from '../esm/'

const randInt = (min, max) => {
    return Math.random() * (max - min) + min
}

const testTwoSources = async (packetsA, packetsB, expectAdd, expectRemove) => {
    const paginationDiff = PaginationDiff(
        {getNextPage: GetNextPage(packetsA), bufferSize: 6},
        {getNextPage: GetNextPage(packetsB), bufferSize: 6},
        compareInt,
    )

    const result = await collectResults(paginationDiff)

    expect(result.add).toEqual(expectAdd)
    expect(result.remove).toEqual(expectRemove)
}

const GetNextPage = (packets) => {
    let i = 0

    return () => {
        return new Promise(resolve => {
            setTimeout(() => {
                if(i === packets.length) return resolve(null)
                else return resolve(packets[i++])
            }, randInt(20, 120))
        })
    }
}

test('Diffs sources with multiple pages.', async () => {
    return testTwoSources(
        [[1, 20], [29, 30], [34, 38, 40, 42]],
        [[1, 19], [32, 34], [35, 36, 38]],
        [19, 32, 35, 36],
        [20, 29, 30, 40, 42],
    )
})

test('Diffs sources with one page each.', async () => {
    return testTwoSources(
        [[2, 20, 25, 30]],
        [[1, 30, 40]],
        [1, 40],
        [2, 20, 25],
    )
})

test('Throws an exception if one of the sources fails.', async () => {
    const expectedError = Error('blah')

    const GetNextPageFail = (packets) => {
        let i = 0

        return async () => {
            if(i === packets.length) throw expectedError
            else return packets[i++]
        }
    }

    const paginationDiff = PaginationDiff(
        {getNextPage: GetNextPage([[2, 20, 25, 30]]), bufferSize: 6},
        {getNextPage: GetNextPageFail([[1, 19], [32, 34], [35, 36, 38]]), bufferSize: 6},
        compareInt,
    )

    await expect((async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const result of paginationDiff()) {
        }
    })()).rejects.toThrow(expectedError)
})

test('Throws an exception if one of the sources fails (2).', async () => {
    const expectedError = Error('blah')

    const getNextPageFail = async () => {
        throw expectedError
    }

    const paginationDiff = PaginationDiff(
        {getNextPage: GetNextPage([[2, 20, 25, 30]]), bufferSize: 6},
        {getNextPage: getNextPageFail, bufferSize: 6},
        compareInt,
    )

    await expect((async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const result of paginationDiff()) {
        }
    })()).rejects.toThrow(expectedError)
})

test('Throws an exception if one of the sources fails (3).', async () => {
    const expectedError = Error('blah')

    const GetNextPageFail = (packets) => {
        let i = 0

        return () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    if(i === packets.length) return reject(expectedError)
                    else return resolve(packets[i++])
                }, randInt(20, 120))
            })
        }
    }

    const paginationDiff = PaginationDiff(
        {getNextPage: GetNextPage([[2, 20, 25, 30]]), bufferSize: 6},
        {getNextPage: GetNextPageFail([[1, 19], [32, 34], [35, 36, 38]]), bufferSize: 6},
        compareInt,
    )

    await expect((async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const result of paginationDiff()) {
        }
    })()).rejects.toThrow(expectedError)
})

test('Throws an exception if one of the sources fails (4).', async () => {
    const expectedError = Error('blah')

    const getNextPageFail = () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(expectedError)
            }, randInt(50, 500))
        })
    }

    const paginationDiff = PaginationDiff(
        {getNextPage: GetNextPage([[2, 20, 25, 30]]), bufferSize: 6},
        {getNextPage: getNextPageFail, bufferSize: 6},
        compareInt,
    )

    await expect((async () => {
        // eslint-disable-next-line no-unused-vars
        for await (const result of paginationDiff()) {
        }
    })()).rejects.toThrow(expectedError)
})
