import {memo, useMemo, useRef, useEffect} from "react"
import _ from "lodash"
import * as st from "@src/state-lib"
import css from "@src/App.module.scss"
import '@picocss/pico'
import '../node_modules/@ibm/plex/scss/ibm-plex.scss'
import classNames from 'classnames'
import { Provider } from "jotai"
import { v4 as uuidv4 } from 'uuid'
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  BrowserRouter
} from "react-router-dom"

const extractUrl = (location) => {
  return {
    path: location?.pathname?.split("/")?.filter(d => d !== "") || [],
    params: Object.fromEntries(new URLSearchParams(location?.search || "").entries()) || {}
  }
}

const state = st.once(() => st.initAtom({
  tabs: [
    {listId: "id1"},
    {listId: "id4"}
  ],
  id2list: {
    "id4": {
      id: "id4",
      title: "another example",
      id2item: {
        "id5": {
          id: "id5",
          order:0,
          title: "do something",
          description: "..."
        }
      }
    },
    "id1": {
      id: "id1",
      title: "example list",
      id2item: {
        "id2": {
          id: "id2",
          order:1,
          title: "make a react app",
          description: "use immer and jotai and something more"
        },
        "id3": {
          id: "id3",
          order:0,
          title: "find pitfalls in these patterns",
          description: "..."
        }
      },
    }
  },
  url: null,
  _statistics: null,
  // two underscores: dom/react ephemeral states like hovered, disabled etc
  __ephemeral: {}
}))



st.addWatcher(state, {
  name: "act on url change",
  predicate: (before, after) => before.url != after.url,
  fn: (draft) => {
    const [p0,p1] = draft?.url?.path ?? []
    if(p0 === "list" && p1) {
      draft.tabs.forEach(t => {
        t.active = t.listId === p1
      })
    } else {
      draft.tabs.forEach(t => {
        t.active = false
      })
    }
  },
  initialRun: true
})

const Controls = memo(() => {
  useEffect(() => console.log("*** render <Controls/>"))
  return <div className={css.controls}>
    <button onClick={() => {
      st.update(state, draft => {
        const id = uuidv4()
        draft.id2list[id] = {
          id: id,
          title: "new list",
        }
        draft.tabs.forEach(d => {d.active = false})
        draft.tabs.push(
          {listId: id, active: true}
        )
        draft.url = {
          path: ["list", id], params: {}
        }
      })
    }}>new list</button>
    <button onClick={() => {
      st.update(state, draft => {
        const listId = draft.tabs.find(d => d.active)?.listId
        if(listId) {
          const id = uuidv4()
          _.set(draft.id2list[listId], ["id2item", id], {
            id: id,
            order: (_.chain(draft.id2list[listId].id2item).map(d => d?.order).max().value() ?? 0) + 1
          })
        }
      })
    }}>new item</button>
  </div>
})

const List = memo(() => {
  useEffect(() => {
    console.log("*** render <List/> ")
  })

  const activeList = st.useCursor(state, data => {
    const listId = data?.tabs?.find(d => d.active)?.listId
    return data?.id2list?.[listId]
  })
  const items = _.chain(activeList?.id2item || {})
    .values()
    .sortBy('order')
    .reverse()
    .value()

  return <div className={css.list}>
    {items.map((d,i) => {
      return <ListItem key={`list-item-${d.id}`} listId={activeList?.id} data={d}/>
    })}
  </div>
})

const ListItem = memo(({listId, data}) => {
  const {id, title, description} = data
  useEffect(() => {
    console.log(`*** render <ListItem/> id=${id} listId=${listId}`)
  })

  const hovered =  st.useCursor(state, data => data.__ephemeral?.["ListItem"]?.[id]?.hovered)

  return <div
    className={css.listItem}
    onMouseEnter={() => st.update(state, draft => {
      _.set(draft.__ephemeral, ["ListItem", data.id, "hovered"], true)
    })}
    onMouseLeave={() => st.update(state, draft => {
      _.unset(draft.__ephemeral, ["ListItem", data.id, "hovered"])
    })}>

    {hovered && <button className={classNames(css.delete)}
      onClick={() => st.update(state, draft => {
        _.unset(draft.id2list?.[listId]?.id2item, [id])
      })}>delete</button>}
    <input className={css.titleInput}
      value={title}
      onChange={(e) => {
        st.update(state, draft => {
          _.set(draft, ["id2list", listId, "id2item",data.id,"title"], e.target.value)
        })
      }}/>
    <textarea onChange={(e) => st.update(state, draft => {
      _.set(draft, ["id2list", listId, "id2item",data.id,"description"], e.target.value)
    })}
    value={description}/>
  </div>
})

const Tabs = memo(() => {
  const tabs = st.useCursor(state, data => data?.tabs)
  const id2list = st.useCursor(state, data => data?.id2list)
  useEffect(() => {
    console.log("*** render <Tabs/> ")
  })

  return <div className={css.tabs}>
    {tabs?.map((d,i) => {
      return <div key={`tab-${i}`}
        className={classNames(css.tab, d.active ?  css.active : css.inactive)}
        onClick={() => st.update(state, draft => {
          draft?.tabs?.forEach((t,j) => {
            t.active = i === j
          })
          draft.url = {params: {}, path: ["list", draft?.tabs?.[i]?.listId]}
        })}
      >{id2list?.[d?.listId]?.title}</div>
    })}
  </div>
})


const Stats = memo(() => {
  useEffect(() => console.log("*** render <Stast/>"))
  const _statistics = st.useCursor(state, data => data?._statistics)
  return <div>
    <div>Total number of list items: {_statistics?.nrOfItems}</div>
    <div></div>
  </div>
})

const StateJson = memo(() => {
  useEffect(() => console.log("*** render <StateJson/>"))
  const data = st.useCursor(state, data => data)
  return <div className={css.jsonState}>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </div>
})


const useUrlStateSync = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const url = st.useCursor(state, data => data.url)
  // url -> state
  useEffect(() => {

    const urlBefore = st.read(state, data=> data.url)
    const urlAfter = extractUrl(location)

    if(!_.isEqual(urlAfter, urlBefore)) {
      st.update(state, (draft) => {
        draft.url = urlAfter
      })
    }

  }, [location])

  // state -> url
  useEffect(() => {
    const urlBefore = extractUrl(location)
    const urlAfter = st.read(state, data=> data.url)
    if(!_.isEqual(urlAfter, urlBefore)) {
      const pathname = urlAfter?.path?.join("/")
      const search = new URLSearchParams(urlAfter?.params)
      const dest = `${pathname ?? ""}${search ?? ""}`
      navigate(dest)
    }
  }, [url])

  return
}


const Root = memo(() => {
  useEffect(() => {console.log("*** render <Root/>")})

  useUrlStateSync()

  return <Routes>
           <Route path="*" element={
             <div>
               <Tabs/>
               <Controls/>
               <div className={css.mainPane}>
                 <List/>
                 <StateJson/>
               </div>
               <Stats/>
             </div>
           } />
         </Routes>



})

export const App = memo(() => {
  return <Provider store={st.store}>
    <BrowserRouter>
      <Root/>
    </BrowserRouter>
  </Provider>
})
