import { useEffect, useRef, useState } from 'react'
import './App.css'
import { gpu } from './gpu'
import { Button, TextField } from '@mui/material'

function Item(p: { private: string, public: string }) {
  const [show, setShow] = useState<boolean>(false)

  return <>
    <div style={{
      display: "flex",
      width: "100%",
      justifyContent: "space-evenly",
      height: "2.5rem",
    }}>
      <div style={{
        width: "25rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        0x{p.public}
      </div>
      <div style={{
        width: "40rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        {show && <>
          {p.private}
        </>}
        {!show && <><div style={{
          display: "flex",
          justifyContent: "center",
        }}>
          <Button style={{ width: "25rem" }} variant="contained" color="warning" onClick={() => {
            setShow(true)
          }}>
            Click to Reveal private key
          </Button>
        </div>
        </>}

      </div>
    </div>

  </>
}

function App() {
  const gp = useRef<any>(null)
  const [prefix, setPrefix] = useState<string>("aaa")
  const [suffix, setSuffix] = useState<string>("")
  const [state, setState] = useState<"new" | "compiling" | "running" | "stopped">("new")
  const [total, setTotal] = useState<number>(0)
  const [perSecond, setPersecond] = useState<number>(0)
  const [found, setFound] = useState<any[]>([]);
  const [notCompatible, setNotCompatible] = useState<boolean>(false)

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

      // const isChromium = (window as any).chrome;
      // const winNav = window.navigator;
      // const vendorName = winNav.vendor;
      // const isOpera = typeof (window as any).opr !== "undefined";
      // const isIEedge = winNav.userAgent.indexOf("Edg") > -1;
      // const isIOSChrome = winNav.userAgent.match("CriOS");
      // if (isIOSChrome) {
      //   // is Google Chrome on IOS
      // } else if (
      //   isChromium !== null &&
      //   typeof isChromium !== "undefined" &&
      //   vendorName === "Google Inc." &&
      //   isOpera === false &&
      //   isIEedge === false
      // ) {
      //   try {
      //     const adapter = (await navigator.gpu.requestAdapter())!;
      //     await adapter.requestDevice();
      //   } catch (e) {
      //     setNotCompatible(true)
      //     return;
      //   }
      // } else {
      //   setNotCompatible(true)
      //   return;
      // }

      gp.current = await gpu({
        onFound: (e: any) => {
          setFound(a => [...a, e])
          console.log("FOUNDAGE", e);
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
    })()
  }, [])


  return (
    <>
      <div style={{
        textAlign: "center",
      }}>

        <div style={{
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          marginTop: "2rem",
        }}>
          <div style={{
            border: "1px solid black",
            width: "20rem",
          }}>
            <h1>VANITY-ETH</h1>
          </div>

        </div>
        <div style={{
          marginTop: "3rem",
        }}>
          <h2>GPU accelerated Ethereum vanity address generator</h2>
        </div>

        <div style={{
          marginTop: "2rem",
        }}>
          <h3>
            <a href="https://github.com/dezmou/eth-vanity-webgpu">Source code on Github</a>
          </h3>
        </div>

        <div style={{
          marginTop: "2rem",
          display: "flex",
          justifyContent: "center",
          width: "100vw",
          textAlign: "left",
        }}>
          <div style={{
            width: "40rem",
          }}>
            <div>
              Choose a brief prefix and/or suffix, then click start. Your browser will generate multiple random addresses until one matches your criteria.
            </div>
            <br />
            <div>
              Vanity address generator has been there for a long time, this version unlocks up to 20 time the speed of the CPU version like <a href="https://vanity-eth.tk">vanity-eth.tk</a> by using <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API">WebGPU</a>
            </div>
          </div>
        </div>
        {notCompatible && <>
          <div style={{
            marginTop: "2rem",
            fontWeight: "bold",
            color: "#de163d",
          }}>
            It look like your browser is not compatible with WebGPU. <br />This website work only on Chrome Desktop for the moment.
          </div>
        </>}
      </div>
      <div style={{
        display: 'grid',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        width: '100vw',
        opacity: notCompatible ? "0.3" : "1",
        pointerEvents: notCompatible ? "none" : "initial",
      }}>
        <div style={{
          height: "5vh",
        }}>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: "300px",
          padding: "3rem",
          background: "#f4f4f4",

        }}>
          <TextField type='text' style={{ background: "white" }} onInput={(e) => setPrefix(filterText((e.target as any).value))} value={prefix} label="Prefix" variant="outlined" />
          <TextField type="text" style={{ background: "white" }} onInput={(e) => setSuffix(filterText((e.target as any).value))} value={suffix} label="Suffix" variant="outlined" />
          <Button disabled={state === "running" || state === "compiling"} variant="contained" color="primary" onClick={() => {
            if (state === "new") {
              setState("compiling")
            }
            setTimeout(() => {
              gp.current.run(prefix, suffix)
            }, 500)
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
                  {total.toLocaleString("us")} addresses
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

      <div style={{
        display: "flex",
        width: "100vw",
        justifyContent: "center",
      }}>
        <div style={{
          width: "95vw",
          maxWidth: "70rem",
          border: "1px solid #ccc",
        }}>
          {found.map((e, i) => <div style={{
            fontSize: "0.9rem",
            width: "100%",
            paddingTop: "0.1rem",
            paddingBottom: "0.1rem",
            background: i % 2 === 0 ? "#eee" : "#fff",
          }} key={i}>
            <Item private={e.private} public={e.public} />
          </div>)}
        </div>
      </div>

    </>
  )
}

export default App
