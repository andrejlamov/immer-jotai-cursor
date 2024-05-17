import {selectAtom, atomWithDefault, useAtomCallback} from "jotai/utils"
import {atom, createStore, useAtomValue, useSetAtom} from "jotai"
import {useMemo} from "react"
import {produce} from "immer"
import _ from "lodash"
 
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
