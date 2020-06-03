# pagination-diff

> Finds the difference between two pagination sources.

Work similar to the linux `diff` command. Compares two sources, A and B (e.g. a local database and an external API). Yields results that summarize the changes that need to happen to the items in source A to make it match the items in source B.

Assumes both sources are sorted and that the compare function matches the sorting (i.e. comparing one item in a list to the next item in the list will always show the next item as greater than; comparing an item to itself will show them as equal; etc).

This library only reports items that need to be added or removed, it does not report items that need to be updated.

## Example

In this example, we want to sync data from a local database to an external API. To do that, we find the differences (i.e. items in the database that need to be added to the API, or items in the API that need to be removed), then apply those changes.

```js
const {PaginationDiff} = require('pagination-diff')
const repo = require('path/to/local/repo') // a repository for fetching from a local database
const api = require('/path/to/external/api') // a repository for fetching from an external API

const messagesApiUrl = 'https://example.com/api/v1/messages'

const getNextPageFromRepo = repo => {
    let currentPage = 1 // keep track of the current page

    return async () => {
        const results = await repo.getPage(currentPage)

        currentPage++ // get ready to fetch next page when called again

        return results.length
            ? results
            : null // null signals the source is completed
    }
}

const getNextPageFromApi = (apiUrl, api) => {
    let currentPage = 1 // keep track of the current page

    return async () => {
        const results = await api.getPage(apiUrl, currentPage)

        currentPage++ // get ready to fetch next page when called again

        return results.length
            ? results
            : null // null signals the source is completed
    }
}

const compare = (apiItem, repoItem) => {
    if(repoItem.id === apiItem.id) return 0
    else if(repoItem.id < apiItem.id) return -1
    else return 1
}

const paginationDiff = PaginationDiff(
    {getNextPage: getNextPageFromApi(apiUrl, api), bufferSize: 1000},
    {getNextPage: getNextPageFromRepo(repo), bufferSize: 1000},
    compare,
)

(async () => {
    const resultCollected = {
        add: [],
        remove: [],
    }

    for await (const result of paginationDiff()) {
        resultCollected.add = resultCollected.add.concat(result.add)
        resultCollected.remove = resultCollected.remove.concat(result.remove)
    }

    // code here that applies the changes collected in `resultCollected`
 })()
```

In this example, results are applied at the end. However, they could be applied as they are received (i.e. in the `for` loop). One reason you may want to wait until the end to apply the changes is if the changes you push will affect the data you're fetching from the source (i.e. if you add new data and it ends up in your next page fetch).

## API

### PaginationDiff(configA, configB, compare)

Takes two sources and compares them. Returns an async iterator that yields objects that summarize the changes that need to happen to the items in stream A to make it match the items in stream B. Note that this is an iterator, so each yielded result is only part of the "summary". You would have to apply the changes as they come in, or collect them and apply after the iterator is exhausted.

- **configA** and **configB** *(required, object)* — Each config object has these properties:
    - **getNextPage** *(required, function returning a Promise)* — When called, will fetch the next page of data from the source. Should resolve to an array of data. When the source is empty, should resolve to `null`.
    - **bufferSize** *(required, integer)* — Try to keep at least this many records from the source at a time. A good value for this `1.5 * <the number of records fetched per page>`. When the library fetches a page of data a source, if it hasn't yet reached this buffer size, it will try to fetch more data while it is processing the previous page of data. This is an optimization the allows for processing and fetching at the same time, rather than waiting to finish processing before fetching another page of data. The reason `1.5 * <the number of records fetched per page>` is a good value is that it will generally mean that at least once fetch is happening while data is being processed. Though, you can increase it if it further improves efficiency.
- **compare** *(function)* — Takes two parameters (an item from source A and an item from source B) and returns: 0 if they are equal, -1 if A < B, and 1 if A > B.

**Returns** `async iterator`. On each iteration, will yield an object with these properties:

- **add** *(array)* — A list of items from source B that need to be added to source A.
- **remove** *(array)* — A list of items from source A that need to be removed.

If either source's `getNextPage` call fails (i.e. encounters an exception), the iterator will throw that exception.

### collectResults(paginationDiff)

Pass it a `PaginationDiff` instance and it will return a Promise resolving to the collected results from iterating over it (i.e. all the results put into a single result). It's a convenience method.

**Returns** `Promise resolving to an object`. The resolved object has these properties:

- **add** *(array)* — All the items from source B that need to be added to source A.
- **remove** *(array)* — All the items from source A that need to be removed.

### compareInt

A comparator function that compares items A and B as integers. If A and B are strings, will parseInt them.

### compareString

A comparator function that lexicographically compares items A and B as strings. Uses `String.localeCompare` to perform the comparison.

Note that whatever is sorting your source results (i.e. your database, your API, etc.) may not use this same method to sort. If so, this may produce difference results and will not reliably honor the same ordering as your source.
