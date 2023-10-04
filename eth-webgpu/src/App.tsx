import { useEffect } from 'react'
import './App.css'
import { gpu } from './gpu'

function App() {

  useEffect(() => {
    gpu("aa", "bbb", (e: any) => {
      console.log(e);
    }, (e:any) => {
      console.log("STAT", e);
    })
  }, [])

  return (
    <>

    </>
  )
}

export default App
