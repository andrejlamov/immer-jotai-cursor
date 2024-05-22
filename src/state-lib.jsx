import {selectAtom, atomWithDefault, useAtomCallback} from "jotai/utils"
import {atom, createStore, useAtomValue, useSetAtom} from "jotai"
import {useMemo, useEffect} from "react"
import {produce} from "immer"
import _ from "lodash"
import {useLocation, useNavigate} from "react-router-dom"

export const store = createStore()

const atomId2watchers = {}

export const initAtom = (state) => {
  const a = atom(state)
  store.set(a, data=>data)
  return a
}

export const addWatcher = (state, {name, predicate, fn, initialRun}) => {
  _.set(atomId2watchers, [`${state}`, name], {predicate, fn})
  if(initialRun) {
    update(state, (draft) => {
      fn(draft)
    })
  }
}

export const update = (state, fn, opts) => {
  store.set(state, data => {
    const before = store.get(state)

    const after = produce(data, draft => {
      fn(draft)
    })

    const watchers = _.values(atomId2watchers?.[`${state}`] ?? {})
    const res = produce(after, draft => {
      watchers.forEach(({predicate, fn}) => {
        if(_.isNil(predicate) || predicate(before, after)) {
          console.log("*** applying", fn)
          fn(draft)
        }
      })
    })

    return res
  })


}

export const useCursor = (state, getFn, refresh=[]) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cur = useAtomValue(useMemo(() => selectAtom(state, getFn),refresh))
  return cur
}

export const read = (state, getFn) => {
  const data = store.get(state)
  if(getFn) return getFn(data)
  else return data
}

export const once = (() => {
  let initialized = false
  let value
  return (initFn) => {
    if (!initialized) {
      value = initFn()
      initialized = true
    }
    return value
  }
})()



const extractUrl = (location) => {
  return {
    path: location?.pathname?.split("/")?.filter(d => d !== "") || [],
    params: Object.fromEntries(new URLSearchParams(location?.search || "").entries()) || {}
  }
}

export const useUrlStateSync = (state, {cursorFn, updateFn}) => {

  const location = useLocation()
  const navigate = useNavigate()

  const url = useCursor(state, cursorFn)

  // url -> state
  useEffect(() => {
    const urlBefore = read(state, cursorFn)
    const urlAfter = extractUrl(location)

    if(!_.isEqual(urlAfter, urlBefore)) {
      updateFn()
    }
  }, [location])

  // state -> url
  useEffect(() => {
    const urlBefore = extractUrl(location)
    const urlAfter = read(state, cursorFn)

    if(!_.isEqual(urlAfter, urlBefore)) {
      const pathname = urlAfter?.path?.join("/")
      const search = new URLSearchParams(urlAfter?.params)
      const dest = `${pathname ?? ""}${search ?? ""}`

      navigate(dest)
    }
  }, [url])

  return
}
