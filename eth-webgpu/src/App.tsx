import { useEffect, useRef, useState } from 'react'
import './App.css'
import { gpu } from './gpu'
import { Button, TextField } from '@mui/material'

function App() {
  const gp = useRef<any>(null)
  const [prefix, setPrefix] = useState<string>("aaaaaa")
  const [suffix, setSuffix] = useState<string>("")
  const [state, setState] = useState<"new" | "compiling" | "running" | "stopped">("new")
  const [total, setTotal] = useState<number>(0)
  const [perSecond, setPersecond] = useState<number>(0)

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
        },
        onStats: (e: any) => {
          setState("running")
          setTotal(e.nbrAddressGenerated)
          setPersecond(e.perSecond)
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
          <Button disabled={state === "running" || state === "compiling"} variant="contained" color="primary" onClick={() => {
            if (state === "new") {
              setState("compiling")
            }
            gp.current.run(prefix, suffix)
          }}>
            Start
          </Button>
          <Button disabled={state === "compiling" || state === "stopped" || state === "new"} variant="contained" color="secondary" onClick={() => {
            gp.current.stop()
            setState("stopped")
          }}>
            Stop
          </Button>
        </div>
        <div style={{
          width: "300px",
        }}>
        </div>

        <div style={{
          opacity: (state === "new" || state === "stopped") ? 0 : 1,
          display: "flex",
          width: "300px",
        }}>
          <div style={{
            width: "80px",
            height: "100px",
            backgroundImage: "url(./loading.gif)",
            backgroundPosition: "center",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat"
          }}>
          </div>
          <div style={{
            width: "220px",
            height: "100px",
          }}>
            {state === "running" && <>
              <div style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                textAlign: "center",
                height: "100px",
              }}>
                <div>
                  {total.toLocaleString("us")} address
                </div>
                <div>
                  {perSecond.toLocaleString("us")} per second
                </div>
              </div>
            </>}
            {state === "compiling" && <>
              <div style={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                textAlign: "center",
                height: "100px",
              }}>
                <div>
                  Compiling shader...
                </div>
              </div>
            </>}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
