import { useEffect } from 'react'
import './App.css'
import { gpu } from './gpu'

function App() {

  useEffect(() => {
    gpu("aa", "", (e: any) => {
      console.log(e);
    }, () => {

    })
  }, [])

  return (
    <>

    </>
  )
}

export default App
