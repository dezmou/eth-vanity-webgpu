// import { base58_to_binary } from "base58-js";
import { basepoint } from "./constant";
import { shader } from "./ecdsa_shader";

declare const Base58 : any;

const NB_ITER = 1024;
const NB_THREAD = 128;
// 0xeee7b20243c07d208581a4c257ade774579fedb36922b730a3ee591de4dffe1d

// const privateKey = new Uint32Array([
//     0xf01aa848,
//     0xbdab1314,
//     0xead76ae8,
//     0xa90c5acb,
//     0xdaa874d0,
//     0xed82095f,
//     0xbd6e5dcd,
//     0xf0f7d773,
// ].reverse())


// const to58 = (input : ArrayBuffer) => {
//     const chien = [];
//     for (let i = 0; i < 21; i++) {
//         chien.push(new Uint32Array(arrayBuffer)[i])
//         console.log(chien[i]);
//     }
//     for (let i = 21; i < 25; i++) {
//         chien.push(0);
//     }
//     console.log(chien);

//     const res = binary_to_base58(chien);
//     console.log(res);
//     return res;
// }


function uint32ArrayToHexString(arr: number[]) {
    let hexStr = '';
    for (let i = arr.length - 1; i >= 0; i--) {
        hexStr += arr[i].toString(16).padStart(8, '0');
    }
    return hexStr;
}


export const gpu = async (
    /**
     * The prefix that the address must match
     * All address start with T
     * An address can also be invalid depending of the second character
     */
    prefix: string,
    /**
     * The suffix 
     */
    suffix: string,
    /**
     * Event called when an address is found
     */
    found: Function,
    /**
     * Event called to tell stats
     */
    stats: Function
) => {
    let find = prefix;
    find += Array.from({ length: 34 - prefix.length - suffix.length }).map(() => "X").join("");
    find += suffix;
    console.log(find);

    
    const bn = Base58.decode(find)
    if (bn[0] !== 65){
        alert("invalid prefix")
        return false;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { return false; }
    const device = await adapter.requestDevice();
    console.log(device.limits);

    const gpuBufBasePoints = device.createBuffer({
        mappedAtCreation: true,
        size: basepoint.byteLength,
        usage: GPUBufferUsage.STORAGE,
    });
    const basePointsBuf = gpuBufBasePoints.getMappedRange();
    new Uint32Array(basePointsBuf).set(basepoint);
    gpuBufBasePoints.unmap();

    const privateKey = new Uint32Array([
        0Xd6b29f86,
        0Xd4b4857c,
        0Xc1831b9c,
        0Xab592428,
        0Xa44abf23,
        0X1bbb154c,
        0X2e0668f8,
        0X93c0535e,
    ].reverse())

    const gpuPrivateKey = device.createBuffer({
        size: privateKey.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    // const privateKeyBuf = gpuPrivateKey.getMappedRange();

    // new Uint32Array(privateKeyBuf).set(privateKey);

    // gpuPrivateKey.unmap();

    const buf32 = new Uint32Array({ length: 36 });
    buf32[0] = prefix.length;
    buf32[1] = suffix.length;
    for (let i = 0; i < 34; i++) {
        buf32[i + 2] = find.charCodeAt(i);
    }

    const gpuFind = device.createBuffer({
        mappedAtCreation: true,
        size: buf32.byteLength,
        usage: GPUBufferUsage.STORAGE,
    });
    const gpuFindBuf = gpuFind.getMappedRange();
    new Uint32Array(gpuFindBuf).set(buf32);
    gpuFind.unmap();

    const resultxBufferSize = Uint32Array.BYTES_PER_ELEMENT * 256;
    const resultxBuffer = device.createBuffer({
        size: resultxBufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const tmpBufSize = (Uint32Array.BYTES_PER_ELEMENT * (
        33 +// naf : array<u32,33>,
        8 +// x1: array<u32,8>,
        8 + // y1: array<u32,8>,
        8 + // z1: array<u32,8>,
        64 +// ecdsa: array<u32,64>,
        1 +// multiplier : u32,
        1 +// odd : u32,
        1 + // x_pos : u32,
        1 +// y_pos : u32,
        1 +// pos : u32,
        1 +//workerId : u32
        1 //loop_start : u32

    )) * NB_ITER * NB_THREAD;
    const tmpBuf = device.createBuffer({
        size: tmpBufSize,
        usage: GPUBufferUsage.STORAGE
    });

    const bindGroupLayout = (device).createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "read-only-storage"
                }
            },
        ]
    });


    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: gpuBufBasePoints
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: resultxBuffer
                }
            },
            {
                binding: 2,
                resource: {
                    buffer: gpuPrivateKey
                }
            },
            {
                binding: 3,
                resource: {
                    buffer: tmpBuf
                }
            },
            {
                binding: 4,
                resource: {
                    buffer: gpuFind
                }
            },
        ]
    });

    const shaderModule = device.createShaderModule({
        code: shader(NB_THREAD),
    });


    const layout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout]
    });


    let lastFoundIndex = 0;

    (async () => {
        for (let i = 0; i < 10000000; i++) {
            const now = performance.now();
            for (let i = 0; i < 8; i++) {
                // privateKey[i] = 0xaaaaaaaa;
                privateKey[i] = 0x00000000;
            }
            // privateKey[1] = Math.floor(Math.random() * 0xffffffff);
            privateKey[1] = i;
    
            device.queue.writeBuffer(gpuPrivateKey, 0, privateKey, 0, 8);
    
            const commands = ["init", "step1", "step2", "step3", "step4"].map(e => {
                const computeInitPip = device.createComputePipeline({
                    layout,
                    compute: {
                        module: shaderModule,
                        entryPoint: e
                    }
                });
                const commandEncoder = device.createCommandEncoder();
                const passEncoder = commandEncoder.beginComputePass();
                passEncoder.setPipeline(computeInitPip);
                passEncoder.setBindGroup(0, bindGroup);
                passEncoder.dispatchWorkgroups(NB_ITER, 1);
                passEncoder.end();
                return commandEncoder.finish();
            })
    
            const init = commands[0];
            const step1 = commands[1];
            const step2 = commands[2];
            const step3 = commands[3];
            const step4 = commands[4];
            const stepResCommand = device.createCommandEncoder();
            const gpuReadBuffer = device.createBuffer({
                size: resultxBufferSize,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            stepResCommand.copyBufferToBuffer(
                resultxBuffer,
                0,
                gpuReadBuffer,
                0,
                resultxBufferSize
            );
            const stepRes = stepResCommand.finish();
            const queu = []
    
            queu.push(init)
            for (let i = 0; i < 256; i++) { // caution loop_start
                queu.push(step1)
                queu.push(step2)
            }
            queu.push(step3)
            queu.push(step4)
            queu.push(stepRes)
    
    
            device.queue.submit(queu);
    
            await gpuReadBuffer.mapAsync(GPUMapMode.READ);
            const arrayBuffer = gpuReadBuffer.getMappedRange();
    
            if (new Uint32Array(arrayBuffer)[0] !== 0 && new Uint32Array(arrayBuffer)[0] !== lastFoundIndex) {
                console.log("FOUND at index worker :", new Uint32Array(arrayBuffer)[0]);
                let str = ""
                for (let i = 0; i < 34; i++) {
                    str += String.fromCharCode(new Uint32Array(arrayBuffer)[i + 1]);
                }
                const tmp2 = [...privateKey];
                tmp2[0] += new Uint32Array(arrayBuffer)[0] - 1000;
                const str2 = (uint32ArrayToHexString(Array.from(tmp2)));
                lastFoundIndex = new Uint32Array(arrayBuffer)[0];
                found({
                    public: str,
                    private: str2
                })
                // break;
            }
            stats({
                nbrAddressGenerated: i * NB_THREAD * NB_ITER,
                perSecond: Math.floor((1000 / (performance.now() - now)) * NB_THREAD * NB_ITER),
            })
            // if (i % 5 == 0) {
            //     const nbrDone = i * NB_THREAD * NB_ITER;
            //     console.log(`Number of key generated : ${nbrDone}  |  ${Math.floor((1000 / (performance.now() - now)) * NB_THREAD * NB_ITER)} per second`);
            // }
        }
    })()
    return true;
    // await gpuPrivateKey.mapAsync(GPUMapMode.WRITE);
    // const privateKeyBuf2 = gpuPrivateKey.getMappedRange();
    // new Uint32Array(privateKeyBuf2).set(privateKey);
    // gpuPrivateKey.unmap();
}