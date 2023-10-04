import { useEffect } from 'react'
import './App.css'
import { gpu } from './gpu'

function App() {

  useEffect(() => {
    gpu("aa", "aa", () => {

    }, () => {

    })
  }, [])

  return (
    <>

    </>
  )
}

export default App
