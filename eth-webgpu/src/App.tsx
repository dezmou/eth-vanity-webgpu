import { useEffect, useRef, useState } from 'react'
import './App.css'
import { gpu } from './gpu'
import { Button, TextField } from '@mui/material'

function App() {
  const gp = useRef<any>(null)
  const [prefix, setPrefix] = useState<string>("")
  const [suffix, setSuffix] = useState<string>("")

  const filterText = (text: string) => {
    text = text.toLowerCase();
    let final = ""
    const allowed = "0123456789abcdef".split("")
    for (let char of text.split("")) {
      if (allowed.includes(char)) {
        final += char
      }
    }
    return final;
  }

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
          <TextField type='text' onInput={(e) => setPrefix(filterText((e.target as any).value))} value={prefix} label="Prefix" variant="outlined" />
          <TextField type="text" onInput={(e) => setSuffix(filterText((e.target as any).value))} value={suffix} label="Suffix" variant="outlined" />
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
