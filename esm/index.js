const DEBUG = false

const time = () => new Date().getTime()

const log = (() => {
    let lastMsg

    return (...msg) => {
        if(!DEBUG) return

        const now = time()

        if(!lastMsg) lastMsg = now

        const timeDiff = now - lastMsg

        console.log.apply(null, [`(+${timeDiff})`, ...msg])
    }
})()

export const PaginationDiff = (configA, configB, compare) => {
    const aInfo = {
        name: 'A', // used for debugging
        state: 'ready',
        records: [],
        bufferSize: configA.bufferSize,
        getNextPage: configA.getNextPage,
        fetchingP: null,
    }

    const bInfo = {
        name: 'B', // used for debugging
        state: 'ready',
        records: [],
        bufferSize: configB.bufferSize,
        getNextPage: configB.getNextPage,
        fetchingP: null,
    }

    // Need to keep track of the exception like this because we make a second fetchBothData call in the iterator that isn't await'ed. If it throws an exception, will get an "unhandled exception" error. So, tracking it here and throwing "manually".
    let exceptionFound = null

    const isCompletelyDone = sourceInfo => sourceInfo.state === 'empty' && sourceInfo.records.length === 0

    const hasRecords = sourceInfo => sourceInfo.records.length !== 0

    const fetchData = sourceInfo => {
        // already fetching
        if(sourceInfo.fetchingP) {
            return sourceInfo.fetchingP
        }
        // if we already have enough records, we don't need to fetch data
        else if(sourceInfo.records.length > sourceInfo.buffer) {
            log('already have data /', sourceInfo.name, '/', sourceInfo.records)
            return Promise.resolve(sourceInfo.records)
        }
        else if(sourceInfo.state === 'ready') {
            log('fetching /', sourceInfo.name)
            sourceInfo.state = 'fetching'

            sourceInfo.fetchingP = sourceInfo.getNextPage()
                .then(data => {
                    log('fetched /', sourceInfo.name, '/', data)

                    sourceInfo.fetchingP = null

                    if(data === null) {
                        sourceInfo.state = 'empty'
                    }
                    else {
                        sourceInfo.records = sourceInfo.records.concat(data)
                        sourceInfo.state = 'ready'
                    }

                    return sourceInfo.records
                })
                .catch(err => {
                    exceptionFound = err
                })

            return sourceInfo.fetchingP
        }
        // only way to get here is if the source is empty
        else {
            return Promise.resolve(sourceInfo.records)
        }
    }

    const fetchBothData = () => {
        return Promise.all([
            fetchData(aInfo),
            fetchData(bInfo),
        ])
    }

    return async function * () {
        while(!isCompletelyDone(aInfo) || !isCompletelyDone(bInfo)) {
            // if we got an exception during the last iteration
            if(exceptionFound) {
                throw exceptionFound
            }

            log('fetching both /', aInfo.state, '--', aInfo.records, '/', bInfo.state, '--', bInfo.records)
            await fetchBothData()

            // if fetchBothData resulted in an exception
            if(exceptionFound) {
                throw exceptionFound
            }

            // start up a second fetch while we do the comparison so we may already
            // more data on next iteration. we won't fetch more than needed because
            // of protections in fetchData
            fetchBothData()

            log('done fetching both /', aInfo.records, '/', bInfo.records)

            // if A is done, then everything left in B needs to be added
            if(isCompletelyDone(aInfo)) {
                log('result / A empty / all B added')
                yield {
                    add: bInfo.records,
                    remove: [],
                }

                bInfo.records = []
            }
            // if B is done, then everything left in A needs to be removed
            else if(isCompletelyDone(bInfo)) {
                log('result / B empty / all A removed')
                yield {
                    add: [],
                    remove: aInfo.records,
                }

                aInfo.records = []
            }
            else {
                let recordA = null
                let recordB = null

                const result = {
                    add: [],
                    remove: [],
                }

                while(hasRecords(aInfo) && hasRecords(bInfo)) {
                    recordA = aInfo.records.shift()
                    recordB = bInfo.records.shift()

                    log('comparing /', recordA, '/', recordB)

                    const comparison = compare(recordA, recordB)

                    // if they're equal, then we don't need to do anything and can continue to the next record from both sets
                    if(comparison === 0) {
                        log('compared / A === B / do nothing')
                        recordA = null
                        recordB = null
                    }
                    // if A < B, then A is not in B's set and needs to be removed
                    else if(comparison === -1) {
                        log('compared / A < B / remove A /', recordA)
                        result.remove.push(recordA)
                        recordA = null
                    }
                    // if A > B, then B is not in A's set and needs to be added
                    else {
                        log('compared / A > B / add B /', recordB)
                        result.add.push(recordB)
                        recordB = null
                    }

                    // put the used record back on so it can be consumed on the next iteration (this is simpler than having to check the records array and the used record to see if we need to continue looping)
                    if(recordA !== null) {
                        aInfo.records.unshift(recordA)
                    }
                    if(recordB !== null) {
                        bInfo.records.unshift(recordB)
                    }
                }

                log('finished compare while loop /', result)

                yield result
            }
        }

        // we might have caught an exception on the last iteration through the loop
        if(exceptionFound) {
            throw exceptionFound
        }
    }
}

export const collectResults = async (paginationDiff) => {
    const resultCollected = {
        add: [],
        remove: [],
    }

    for await (const result of paginationDiff()) {
        resultCollected.add = resultCollected.add.concat(result.add)
        resultCollected.remove = resultCollected.remove.concat(result.remove)
    }

    return resultCollected
}

const isString = x => (typeof x === 'string' || x instanceof String)

export const compareInt = (a, b) => {
    a = isString(a) ? parseInt(a) : a
    b = isString(b) ? parseInt(b) : b

    if(a === b) return 0
    else if(a < b) return -1
    else return 1
}

export const compareString = (a, b) => {
    const result = a.localeCompare(b)

    if(result === 0) return 0
    else if(result < 0) return -1
    else return 1
}
