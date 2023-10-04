import { useEffect, useRef } from 'react'
import './App.css'
import { gpu } from './gpu'
import { Button, TextField } from '@mui/material'

function App() {
  const gp = useRef<any>(null)

  useEffect(() => {
    ; (async () => {
      gp.current = await gpu({
        onFound: (e: any) => {
          console.log(e);
        }
        ,
        oninit: () => {
          console.log("READY");
        },
        onStats: (e: any) => {
          console.log(e);
        }
      })
      // gp.current.run("aaaaaa", "bbb")
      // setTimeout(async () => {
      //   await gp.current.stop()
      //   gp.current.run("aa", "bbb")
      // }, 5000)
    })()
  }, [])


  return (
    <>
      <div style={{
        display: 'grid',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        width: '100vw',
        height: '100vh',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <TextField label="Prefix" variant="outlined" />
          <TextField label="Suffix" variant="outlined" />
          <Button variant="contained" color="primary" onClick={() => { }}>
            Start
          </Button>
          <Button disabled={true} variant="contained" color="secondary" onClick={() => { }}>
            Stop
          </Button>
        </div>
      </div>
    </>
  )
}

export default App
