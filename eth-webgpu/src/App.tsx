import { useEffect } from 'react'
import './App.css'
import { gpu } from './gpu'

function App() {

  useEffect(() => {
    ; (async () => {
      const gp = await gpu({
        onFound: () => { }
        ,
        oninit: () => {
          console.log("READY");
        },
        onStats: (e:any) => {
          console.log(e);
        }
      })
      gp.run("aaaaaa", "bbb")
      setTimeout(async () => {
        await gp.stop()
        gp.run("aa", "bbb")
      }, 5000)
    })()
  }, [])

  return (
    <>

    </>
  )
}

export default App
