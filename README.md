# VANITY-ETH

## GPU accelerated Ethereum vanity address generator using WebGPU compute shader

### [Demo here](https://vanity-eth.modez.pro/)

![demo](public/demo.png "Demo")

Choose a brief prefix and/or suffix, then click start. Your browser will generate multiple random addresses until one matches your criteria.

Vanity address generator has been there for a long time, this version unlock up to 20 time the speed of the CPU version like vanity-eth.tk by using WebGPU


## Benchmark

| Hardware              | WebGPU | vanity-eth.tk -CPU |
| :---------------- | :------: | ----: |
| Mac M1        |   135 000 / s   | 16 000 / s |
| Mac M1 Pro Max        |   350 000 / s   | 17 000 / s |
| Intel i9-12900K - RTX 4070         |   400 000 / s   | 30 000 / s |