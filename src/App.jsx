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
  useSearchParams,
  BrowserRouter
} from "react-router-dom"

const extractUrl = () => {
  return {
    path: location.pathname?.split("/").filter(d => d !== ""),
    params: Object.fromEntries(new URLSearchParams(location.search).entries())
  }
}

const state = st.once(() => st.initAtom({
  tabs: [
    {listId: "id1", active: true},
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
  // one underscore: caluclated from watchers or url change
  _url: null,
  _statistics: null,
  // two underscores: dom/react ephemeral states like hovered, disabled etc
  __ephemeral: {}
}))

st.addWatcher(state, {
  name: "list statistics",
  predicate: (before, after) => before.id2list !== after.id2list,
  fn: (data) => {
    const nrOfItems = _.chain(data.id2list)
      .values()
      .map(d => _.values(d.id2item)?.length)
      .flattenDeep()
      .sum()
      .value()
    _.set(data, ["_statistics", "nrOfItems"], nrOfItems)
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
      })
    }}>new list</button>
    <button onClick={() => {
      st.update(state, draft => {
        const listId = draft.tabs.find(d => d.active)?.listId
        if(listId) {
          const id = uuidv4()
          draft.id2list[listId].id2item[id] = {
            id: id,
            order: _.chain(draft.id2list[listId].id2item).map(d => d?.order).max().value() + 1
          }
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
        onClick={() => st.update(state, data => {
          data?.tabs?.forEach((t,j) => {
            t.active = i === j
          })
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

const Root = memo(() => {
  return <div>
    <Tabs/>
    <Controls/>
    <div className={css.mainPane}>
      <List/>
      <StateJson/>
    </div>
    <Stats/>
  </div>
})

export const App = memo(() => {
  useEffect(() => {console.log("*** render <App/>")})
  const location = useLocation
  useEffect(() => {
    st.update(state, (draft) => {
      draft._url = extractUrl()
    })
  }, [location])

  return <Provider store={st.store}>
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<Root/>} />
      </Routes>
    </BrowserRouter>
  </Provider>
})
