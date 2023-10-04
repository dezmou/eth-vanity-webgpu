// import { base58_to_binary } from "base58-js";
import { shader } from "./shader";

declare const Base58: any;

const NB_ITER = 1;
const NB_THREAD = 1;

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
    find += Array.from({ length: 40 - prefix.length - suffix.length }).map(() => "0").join("");
    find += suffix;
    console.log(find);

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { return false; }
    const device = await adapter.requestDevice();
    console.log(device.limits);

    // 06920aba3aad84542e98e4be00453d1f359e2eb8a41133d178ec32cc7aa5ad9d

    const privateKey = new Uint32Array([
        0x06920aba,
        0x3aad8454,
        0x2e98e4be,
        0x00453d1f,
        0x359e2eb8,
        0xa41133d1,
        0x78ec32cc,
        0x7aa5ad9d,
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
    for (let i = 0; i < 40; i++) {
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
            // for (let i = 0; i < 8; i++) {
            //     // privateKey[i] = 0xaaaaaaaa;
            //     privateKey[i] = 0x00000000;
            // }
            // // privateKey[1] = Math.floor(Math.random() * 0xffffffff);
            // privateKey[1] = i;

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
            let str = "";
            for (let chien of new Uint32Array(arrayBuffer)) {
                str += `${chien.toString(16)}`
            }
            console.log(str);

            // if (new Uint32Array(arrayBuffer)[0] !== 0 && new Uint32Array(arrayBuffer)[0] !== lastFoundIndex) {
            //     console.log("FOUND at index worker :", new Uint32Array(arrayBuffer)[0]);
            //     let str = ""
            //     for (let i = 0; i < 34; i++) {
            //         str += String.fromCharCode(new Uint32Array(arrayBuffer)[i + 1]);
            //     }
            //     const tmp2 = [...privateKey];
            //     tmp2[0] += new Uint32Array(arrayBuffer)[0] - 1000;
            //     const str2 = (uint32ArrayToHexString(Array.from(tmp2)));
            //     lastFoundIndex = new Uint32Array(arrayBuffer)[0];
            //     found({
            //         public: str,
            //         private: str2
            //     })
            //     // break;
            // }
            // stats({
            //     nbrAddressGenerated: i * NB_THREAD * NB_ITER,
            //     perSecond: Math.floor((1000 / (performance.now() - now)) * NB_THREAD * NB_ITER),
            // })
            // if (i % 5 == 0) {
            //     const nbrDone = i * NB_THREAD * NB_ITER;
            //     console.log(`Number of key generated : ${nbrDone}  |  ${Math.floor((1000 / (performance.now() - now)) * NB_THREAD * NB_ITER)} per second`);
            // }
            break;
        }
    })()
    return true;
    // await gpuPrivateKey.mapAsync(GPUMapMode.WRITE);
    // const privateKeyBuf2 = gpuPrivateKey.getMappedRange();
    // new Uint32Array(privateKeyBuf2).set(privateKey);
    // gpuPrivateKey.unmap();
}