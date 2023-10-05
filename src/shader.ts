export const shader = (nbr_thread: number) => {
    return /*WGSL*/`
      struct CTX {
          naf : array<u32,33>,
          x1: array<u32,8>,
          y1: array<u32,8>,
          z1: array<u32,8>,
          ecdsa: array<u32,64>,
          multiplier : u32,
          odd : u32,
          x_pos : u32,
          y_pos : u32,
          pos : i32,
          workerId : u32,
          loop_start : u32
      };
      
      @group(0) @binding(0) var<storage, read_write> result : array<atomic<u32>>;
      @group(0) @binding(1) var<storage, read> privateKey : array<u32>;
      @group(0) @binding(2) var<storage, read_write> glob : array<CTX>;
      @group(0) @binding(3) var<storage, read> find : array<u32>;
  
      
      const BASE_POINTS = array<u32, 96> ( 0x16f81798u, 0x59f2815bu, 0x2dce28d9u, 0x029bfcdbu, 0xce870b07u, 0x55a06295u, 0xf9dcbbacu, 0x79be667eu, 0xfb10d4b8u, 0x9c47d08fu, 0xa6855419u, 0xfd17b448u, 0x0e1108a8u, 0x5da4fbfcu, 0x26a3c465u, 0x483ada77u, 0x04ef2777u, 0x63b82f6fu, 0x597aabe6u, 0x02e84bb7u, 0xf1eef757u, 0xa25b0403u, 0xd95c3b9au, 0xb7c52588u, 0xbce036f9u, 0x8601f113u, 0x836f99b0u, 0xb531c845u, 0xf89d5229u, 0x49344f85u, 0x9258c310u, 0xf9308a01u, 0x84b8e672u, 0x6cb9fd75u, 0x34c2231bu, 0x6500a999u, 0x2a37f356u, 0x0fe337e6u, 0x632de814u, 0x388f7b0fu, 0x7b4715bdu, 0x93460289u, 0xcb3ddce4u, 0x9aff5666u, 0xd5c80ca9u, 0xf01cc819u, 0x9cd217ebu, 0xc77084f0u, 0xb240efe4u, 0xcba8d569u, 0xdc619ab7u, 0xe88b84bdu, 0x0a5c5128u, 0x55b4a725u, 0x1a072093u, 0x2f8bde4du, 0xa6ac62d6u, 0xdca87d3au, 0xab0d6840u, 0xf788271bu, 0xa6c9c426u, 0xd4dba9ddu, 0x36e5e3d6u, 0xd8ac2226u, 0x59539959u, 0x235782c4u, 0x54f297bfu, 0x0877d8e4u, 0x59363bd9u, 0x2b245622u, 0xc91a1c29u, 0x2753ddd9u, 0xcac4f9bcu, 0xe92bddedu, 0x0330e39cu, 0x3d419b7eu, 0xf2ea7a0eu, 0xa398f365u, 0x6e5db4eau, 0x5cbdf064u, 0x087264dau, 0xa5082628u, 0x13fde7b5u, 0xa813d0b8u, 0x861a54dbu, 0xa3178d6du, 0xba255960u, 0x6aebca40u, 0xf78d9755u, 0x5af7d9d6u, 0xec02184au, 0x57ec2f47u, 0x79e5ab24u, 0x5ce87292u, 0x45daa69fu, 0x951435bfu);
  
      const RC = array<array<u32, 2>, 24> (
        array<u32, 2>(0x00000001u, 0x00000000u), array<u32, 2>(0x00000000u, 0x00000089u), array<u32, 2>(0x00000000u, 0x8000008Bu),
        array<u32, 2>(0x00000000u, 0x80008080u), array<u32, 2>(0x00000001u, 0x0000008Bu), array<u32, 2>(0x00000001u, 0x00008000u),
        array<u32, 2>(0x00000001u, 0x80008088u), array<u32, 2>(0x00000001u, 0x80000082u), array<u32, 2>(0x00000000u, 0x0000000Bu),
        array<u32, 2>(0x00000000u, 0x0000000Au), array<u32, 2>(0x00000001u, 0x00008082u), array<u32, 2>(0x00000000u, 0x00008003u),
        array<u32, 2>(0x00000001u, 0x0000808Bu), array<u32, 2>(0x00000001u, 0x8000000Bu), array<u32, 2>(0x00000001u, 0x8000008Au),
        array<u32, 2>(0x00000001u, 0x80000081u), array<u32, 2>(0x00000000u, 0x80000081u), array<u32, 2>(0x00000000u, 0x80000008u),
        array<u32, 2>(0x00000000u, 0x00000083u), array<u32, 2>(0x00000000u, 0x80008003u), array<u32, 2>(0x00000001u, 0x80008088u),
        array<u32, 2>(0x00000000u, 0x80000088u), array<u32, 2>(0x00000001u, 0x00008000u), array<u32, 2>(0x00000000u, 0x80008082u),
      );
  
    const base16 = array<u32, 16> (48u,49u,50u,51u,52u,53u,54u,55u,56u,57u,97u,98u,99u,100u,101u,102u);

    //   fn ROTLEFT(a : u32, b : u32) -> u32{return (((a) << (b)) | ((a) >> (32-(b))));}
    //   fn ROTRIGHT(a : u32, b : u32) -> u32{return (((a) >> (b)) | ((a) << (32-(b))));}
    
    //   fn CH(x : u32, y : u32, z : u32) -> u32{return (((x) & (y)) ^ (~(x) & (z)));}
    //   fn MAJ(x : u32, y : u32, z : u32) -> u32{return (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)));}
    //   fn EP0(x : u32) -> u32{return (ROTRIGHT(x,2) ^ ROTRIGHT(x,13) ^ ROTRIGHT(x,22));}
    //   fn EP1(x : u32) -> u32{return (ROTRIGHT(x,6) ^ ROTRIGHT(x,11) ^ ROTRIGHT(x,25));}
    //   fn SIG0(x : u32) -> u32{return (ROTRIGHT(x,7) ^ ROTRIGHT(x,18) ^ ((x) >> 3));}
    //   fn SIG1(x : u32) -> u32{return (ROTRIGHT(x,17) ^ ROTRIGHT(x,19) ^ ((x) >> 10));}
  
  fn inv_mod(a : ptr<function, array<u32, 8>>)
  {
    var r_tmp : array<u32, 8>;
  
    var  t0 : array<u32, 8>;
  
    t0[0] = (*a)[0];
    t0[1] = (*a)[1];
    t0[2] = (*a)[2];
    t0[3] = (*a)[3];
    t0[4] = (*a)[4];
    t0[5] = (*a)[5];
    t0[6] = (*a)[6];
    t0[7] = (*a)[7];
  
    var  p : array<u32, 8>;
  
    p[0] = 0xfffffc2fu;
    p[1] = 0xfffffffeu;
    p[2] = 0xffffffffu;
    p[3] = 0xffffffffu;
    p[4] = 0xffffffffu;
    p[5] = 0xffffffffu;
    p[6] = 0xffffffffu;
    p[7] = 0xffffffffu;
  
    var  t1 : array<u32, 8>;
  
    t1[0] = 0xfffffc2fu;
    t1[1] = 0xfffffffeu;
    t1[2] = 0xffffffffu;
    t1[3] = 0xffffffffu;
    t1[4] = 0xffffffffu;
    t1[5] = 0xffffffffu;
    t1[6] = 0xffffffffu;
    t1[7] = 0xffffffffu;
  
    var t2 : array<u32, 8>;
  
    t2[0] = 0x00000001u;
  
    var t3 : array<u32, 8>;
  
    var  b : bool = (t0[0] != t1[0])
          | (t0[1] != t1[1])
          | (t0[2] != t1[2])
          | (t0[3] != t1[3])
          | (t0[4] != t1[4])
          | (t0[5] != t1[5])
          | (t0[6] != t1[6])
          | (t0[7] != t1[7]);
  
    while (b)
    {
      if ((t0[0] & 1u) == 0u) // even
      {
        t0[0] = (t0[0] >> 1u) | (t0[1] << 31u);
        t0[1] = (t0[1] >> 1u) | (t0[2] << 31u);
        t0[2] = (t0[2] >> 1u) | (t0[3] << 31u);
        t0[3] = (t0[3] >> 1u) | (t0[4] << 31u);
        t0[4] = (t0[4] >> 1u) | (t0[5] << 31u);
        t0[5] = (t0[5] >> 1u) | (t0[6] << 31u);
        t0[6] = (t0[6] >> 1u) | (t0[7] << 31u);
        t0[7] = t0[7] >> 1u;
  
        var  c : u32 = 0u;
  
        if ((t2[0] & 1u) != 0u) {
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t2[i];}
          c = add(&t2, &r_tmp, &p);
        }
  
        t2[0] = (t2[0] >> 1u) | (t2[1] << 31u);
        t2[1] = (t2[1] >> 1u) | (t2[2] << 31u);
        t2[2] = (t2[2] >> 1u) | (t2[3] << 31u);
        t2[3] = (t2[3] >> 1u) | (t2[4] << 31u);
        t2[4] = (t2[4] >> 1u) | (t2[5] << 31u);
        t2[5] = (t2[5] >> 1u) | (t2[6] << 31u);
        t2[6] = (t2[6] >> 1u) | (t2[7] << 31u);
        t2[7] = (t2[7] >> 1u) | (c     << 31u);
      }
      else if ((t1[0] & 1u) == 0u)
      {
        t1[0] = (t1[0] >> 1u) | (t1[1] << 31u);
        t1[1] = (t1[1] >> 1u) | (t1[2] << 31u);
        t1[2] = (t1[2] >> 1u) | (t1[3] << 31u);
        t1[3] = (t1[3] >> 1u) | (t1[4] << 31u);
        t1[4] = (t1[4] >> 1u) | (t1[5] << 31u);
        t1[5] = (t1[5] >> 1u) | (t1[6] << 31u);
        t1[6] = (t1[6] >> 1u) | (t1[7] << 31u);
        t1[7] = t1[7] >> 1u;
  
        var  c : u32 = 0u;
  
        if ((t3[0] & 1u) != 0u){
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t3[i];}
          c = add(&t3, &r_tmp, &p);
        } 
  
        t3[0] = (t3[0] >> 1u) | (t3[1] << 31u);
        t3[1] = (t3[1] >> 1u) | (t3[2] << 31u);
        t3[2] = (t3[2] >> 1u) | (t3[3] << 31u);
        t3[3] = (t3[3] >> 1u) | (t3[4] << 31u);
        t3[4] = (t3[4] >> 1u) | (t3[5] << 31u);
        t3[5] = (t3[5] >> 1u) | (t3[6] << 31u);
        t3[6] = (t3[6] >> 1u) | (t3[7] << 31u);
        t3[7] = (t3[7] >> 1u) | (c     << 31u);
      }
      else
      {
        var  gt : u32 = 0u;
  
        for (var i : i32 = 7; i >= 0; i--)
        {
          if (t0[i] > t1[i])
          {
            gt = 1u;
  
            break;
          }
  
          if (t0[i] < t1[i]){ break;}
        }
  
        if (gt != 0u)
        {
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t0[i];}
          sub(&t0, &r_tmp, &t1);
  
          t0[0] = (t0[0] >> 1u) | (t0[1] << 31u);
          t0[1] = (t0[1] >> 1u) | (t0[2] << 31u);
          t0[2] = (t0[2] >> 1u) | (t0[3] << 31u);
          t0[3] = (t0[3] >> 1u) | (t0[4] << 31u);
          t0[4] = (t0[4] >> 1u) | (t0[5] << 31u);
          t0[5] = (t0[5] >> 1u) | (t0[6] << 31u);
          t0[6] = (t0[6] >> 1u) | (t0[7] << 31u);
          t0[7] = t0[7] >> 1u;
  
          var  lt : u32 = 0u;
  
          for (var i : i32 = 7; i >= 0; i--)
          {
            if (t2[i] < t3[i])
            {
              lt = 1u;
  
              break;
            }
  
            if (t2[i] > t3[i]) {break;}
          }
  
          if (lt != 0u) {
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t2[i];}
          add(&t2, &r_tmp, &p);
          }
  
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t2[i];}
          sub(&t2, &r_tmp, &t3);
  
          var  c : u32 = 0u;
  
          if ((t2[0] & 1u) != 0u){
              for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t2[i];}
              c =  add(&t2, &r_tmp, &p);
          }
  
          t2[0] = (t2[0] >> 1u) | (t2[1] << 31u);
          t2[1] = (t2[1] >> 1u) | (t2[2] << 31u);
          t2[2] = (t2[2] >> 1u) | (t2[3] << 31u);
          t2[3] = (t2[3] >> 1u) | (t2[4] << 31u);
          t2[4] = (t2[4] >> 1u) | (t2[5] << 31u);
          t2[5] = (t2[5] >> 1u) | (t2[6] << 31u);
          t2[6] = (t2[6] >> 1u) | (t2[7] << 31u);
          t2[7] = (t2[7] >> 1u) | (c     << 31u);
        }
        else
        {
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t1[i];}
          sub(&t1, &r_tmp, &t0);
  
          t1[0] = (t1[0] >> 1u) | (t1[1] << 31u);
          t1[1] = (t1[1] >> 1u) | (t1[2] << 31u);
          t1[2] = (t1[2] >> 1u) | (t1[3] << 31u);
          t1[3] = (t1[3] >> 1u) | (t1[4] << 31u);
          t1[4] = (t1[4] >> 1u) | (t1[5] << 31u);
          t1[5] = (t1[5] >> 1u) | (t1[6] << 31u);
          t1[6] = (t1[6] >> 1u) | (t1[7] << 31u);
          t1[7] = t1[7] >> 1u;
  
          var  lt : u32 = 0u;
  
          for (var i : i32 = 7; i >= 0; i--)
          {
            if (t3[i] < t2[i])
            {
              lt = 1u;
  
              break;
            }
  
            if (t3[i] > t2[i]) {break;}
          }
  
          if (lt != 0u) {
              for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t3[i];}
              add(&t3, &r_tmp, &p);
          }
  
          for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t3[i];}
          sub(&t3, &r_tmp, &t2);
  
          var  c : u32 = 0u;
  
          if ((t3[0] & 1u) != 0u) {
              for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = t3[i];}
              c = add(&t3, &r_tmp, &p);
          }
  
          t3[0] = (t3[0] >> 1u) | (t3[1] << 31u);
          t3[1] = (t3[1] >> 1u) | (t3[2] << 31u);
          t3[2] = (t3[2] >> 1u) | (t3[3] << 31u);
          t3[3] = (t3[3] >> 1u) | (t3[4] << 31u);
          t3[4] = (t3[4] >> 1u) | (t3[5] << 31u);
          t3[5] = (t3[5] >> 1u) | (t3[6] << 31u);
          t3[6] = (t3[6] >> 1u) | (t3[7] << 31u);
          t3[7] = (t3[7] >> 1u) | (c     << 31u);
        }
      }
  
      // update b:
  
      b = (t0[0] != t1[0])
        | (t0[1] != t1[1])
        | (t0[2] != t1[2])
        | (t0[3] != t1[3])
        | (t0[4] != t1[4])
        | (t0[5] != t1[5])
        | (t0[6] != t1[6])
        | (t0[7] != t1[7]);
    }
  
    // set result:
  
    (*a)[0] = t2[0];
    (*a)[1] = t2[1];
    (*a)[2] = t2[2];
    (*a)[3] = t2[3];
    (*a)[4] = t2[4];
    (*a)[5] = t2[5];
    (*a)[6] = t2[6];
    (*a)[7] = t2[7];
  }
      
      fn addSlice_16_16_16( 
          r : ptr<function, array<u32, 16>>,  
          a : ptr<function, array<u32, 16>>,  
          b : ptr<function, array<u32, 16>>,
          rSlice : u32,
          aSlice : u32,
          bSlice : u32
          ) -> u32
      {
      
        var c:u32 = 0u; // carry/borrow
      
        for (var i:u32 = 0u; i < 8u; i++)
        {
          var t:u32 = (*a)[aSlice + i] + (*b)[bSlice + i] + c;
      
          if (t != (*a)[aSlice + i]){
              if ((t < (*a)[aSlice + i])){
                  c = 1u;
              }else {
                  c = 0u;
              }
          } 
      
          (*r)[rSlice + i] = t;
        }
      
        return c;
      }
      
      fn add_8_8_16( r : ptr<function, array<u32, 8>>,  a : ptr<function, array<u32, 8>>,  b : ptr<function, array<u32, 16>>) -> u32
      {
      
        var c:u32 = 0u; // carry/borrow
      
        for (var i:u32 = 0u; i < 8u; i++)
        {
          var t:u32 = (*a)[i] + (*b)[i] + c;
      
          if (t != (*a)[i]){
              if ((t < (*a)[i])){
                  c = 1u;
              }else {
                  c = 0u;
              }
          } 
      
          (*r)[i] = t;
        }
      
        return c;
      }
      
      
      fn add_8_16_16( r : ptr<function, array<u32, 8>>,  a : ptr<function, array<u32, 16>>,  b : ptr<function, array<u32, 16>>) -> u32
      {
      
        var c:u32 = 0u; // carry/borrow
      
        for (var i:u32 = 0u; i < 8u; i++)
        {
          var t:u32 = (*a)[i] + (*b)[i] + c;
      
          if (t != (*a)[i]){
              if ((t < (*a)[i])){
                  c = 1u;
              }else {
                  c = 0u;
              }
          } 
      
          (*r)[i] = t;
        }
      
        return c;
      }
      
      fn sub_8_8_16(r : ptr<function, array<u32, 8>>,  a : ptr<function, array<u32, 8>>,  b : ptr<function, array<u32, 16>>) -> u32 
      {
        var c : u32 = 0u; // carry/borrow
      
        for (var i : u32 = 0u; i < 8u; i++)
        {
          var diff : u32 = (*a)[i] - (*b)[i] - c;
      
          if (diff != (*a)[i]){
              if ((diff > (*a)[i])){
                  c = 1u;
              } else {
                  c = 0u;
              }
          } 
      
          (*r)[i] = diff;
        }
      
        return c;
      }
      
      fn add( r : ptr<function, array<u32, 8>>,  a : ptr<function, array<u32, 8>>,  b : ptr<function, array<u32, 8>>) -> u32
      {
      
        var c:u32 = 0u; // carry/borrow
      
        for (var i:u32 = 0u; i < 8u; i++)
        {
          var t:u32 = (*a)[i] + (*b)[i] + c;
      
          if (t != (*a)[i]){
              if ((t < (*a)[i])){
                  c = 1u;
              }else {
                  c = 0u;
              }
          } 
      
          (*r)[i] = t;
        }
      
        return c;
      }
      
      fn sub_mod ( r : ptr<function, array<u32, 8>>,a :ptr<function, array<u32, 8>>, b :  ptr<function, array<u32, 8>>)
      {
      
          var  c :u32 = sub(r, a, b); // carry
      
        if (c != 0u)
        {
          var t : array<u32,8>;
      
          t[0] = 0xfffffc2fu;
          t[1] = 0xfffffffeu;
          t[2] = 0xffffffffu;
          t[3] = 0xffffffffu;
          t[4] = 0xffffffffu;
          t[5] = 0xffffffffu;
          t[6] = 0xffffffffu;
          t[7] = 0xffffffffu;
      
          var r_tmp : array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = (*r)[i];}
          add(r, &r_tmp, &t);
        }
      }
      
      fn sub( r : ptr<function, array<u32, 8>>,a :ptr<function, array<u32, 8>>, b :  ptr<function, array<u32, 8>>) -> u32
      {
      
        var c: u32 = 0u; // carry/borrow
      
        for (var i: u32 = 0u; i < 8u; i++)
        {
          var diff: u32 = (*a)[i] - (*b)[i] - c;
      
          if (diff != (*a)[i]){
              if ((diff > (*a)[i])) {
                  c = 1u;
              } else {
                  c = 0u;
              }
          }
      
          (*r)[i] = diff;
        }
      
        return c;
      }
      
      fn add_mod( r : ptr<function, array<u32, 8>>,a :ptr<function, array<u32, 8>>, b :  ptr<function, array<u32, 8>>)
      {
      
        var c : u32  = add(r, a, b); // carry
        var t: array<u32, 8>;
      
        t[0] = 0xfffffc2fu;
        t[1] = 0xfffffffeu;
        t[2] = 0xffffffffu;
        t[3] = 0xffffffffu;
        t[4] = 0xffffffffu;
        t[5] = 0xffffffffu;
        t[6] = 0xffffffffu;
        t[7] = 0xffffffffu;
      
        var modd:u32 = 1u;
      
        if (c == 0u)
        {
          for (var i:u32 = 7u; i >= 0u; i--)
          {
            if ((*r)[i] < t[i])
            {
              modd = 0u;
      
              break; 
            }
      
            if ((*r)[i] > t[i]) {break;};
          }
        }
      
        if (modd == 1u)
        {
          var r_tmp : array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {r_tmp[i] = (*r)[i];}
          sub(r, &r_tmp, &t);
        }
      }
      
      fn mul_mod( r : ptr<function, array<u32, 8>>,a :ptr<function, array<u32, 8>>, b :  ptr<function, array<u32, 8>>,  debug : u32) {
          var t : array<u32, 16>;
      
           var t0 : u32 = 0u;
           var t1 : u32 = 0u;
           var c : u32  = 0u;
        
      
      
           for (var  i : u32 = 0u; i < 8u; i++)
           {
               for (var j : u32 = 0u; j <= i; j++)
               {
                   var a_j : u32 = (*a)[j];
                   var b_ij : u32 = (*b)[i - j];
         
                   // Multiply (*a)[j] and (*b)[i - j]
                   var low_part : u32 = (a_j & 0xFFFFu) * (b_ij & 0xFFFFu);
                   var high_part : u32 = (a_j >> 16u) * (b_ij >> 16u);
         
                   // Middle part contributions
                   var middle1 : u32 = (a_j & 0xFFFFu) * (b_ij >> 16u);
                   var middle2 : u32 = (a_j >> 16u) * (b_ij & 0xFFFFu);
         
                   // Combine all contributions
                   var sum_low : u32 = t0 + low_part;
                   var carry_in : u32; if (sum_low < t0){carry_in = 1u;}else{carry_in = 0u;} 
                   var sum_high : u32 = t1 + high_part + carry_in;
                   var carry_out : u32; if ((sum_high < t1)){carry_out = 1u;}else{carry_out = 0u;};
         
                   // Add middle contributions, taking care of carry
                   var sum_middle : u32 = sum_low + (middle1 << 16u);
                  if (sum_middle < sum_low){carry_in = 1u;}else{carry_in = 0u;}
                   sum_low = sum_middle;
                   sum_middle = sum_high + (middle1 >> 16u) + carry_in;
                   if ((sum_middle < sum_high)){carry_out += 1u;}
                   sum_high = sum_middle;
         
                   sum_middle = sum_low + (middle2 << 16u);
                   if ((sum_middle < sum_low)){carry_in = 1u;}else{carry_in = 0u;}
                   sum_low = sum_middle;
                   sum_middle = sum_high + (middle2 >> 16u) + carry_in;
                   if ((sum_middle < sum_high)){carry_out += 1u;}
                   sum_high = sum_middle;
         
                   // Set t0, t1 and carry
                   t0 = sum_low;
                   t1 = sum_high;
                   c += carry_out;
               }
         
               t[i] = t0;
         
               t0 = t1;
               t1 = c;
         
               c = 0u;
           }
      
      
      
           for (var i : u32 = 8u; i < 15u; i++)
           {
               for (var j : u32 = i - 7u; j < 8u; j++)
               {
                   var a_j: u32 = (*a)[j];
                   var b_ij: u32 = (*b)[i - j];
         
                   // Multiply (*a)[j] and (*b)[i - j]
                   var low_part: u32 = (a_j & 0xFFFFu) * (b_ij & 0xFFFFu);
                   var high_part: u32 = (a_j >> 16u) * (b_ij >> 16u);
         
                   // Middle part contributions
                   var middle1: u32 = (a_j & 0xFFFFu) * (b_ij >> 16u);
                   var middle2: u32 = (a_j >> 16u) * (b_ij & 0xFFFFu);
         
                   // Combine all contributions
                   var sum_low: u32 = t0 + low_part;
                   var carry_in: u32 ;
                   if ((sum_low < t0)){
                      carry_in = 1u;
                   }else {
                      carry_in = 0u;
                   }
                   var sum_high: u32 = t1 + high_part + carry_in;
                   var carry_out: u32;
                   if ((sum_high < t1)){
                      carry_out = 1u;
                   }else {
                      carry_out = 0u;
                   }
         
                   // Add middle contributions, taking care of carry
                   var sum_middle: u32 = sum_low + (middle1 << 16u);
                   if ((sum_middle < sum_low)) {
                      carry_in = 1u;
                   }else {
                      carry_in = 0u;
                   }
                   sum_low = sum_middle;
                   sum_middle = sum_high + (middle1 >> 16u) + carry_in;
                   if ((sum_middle < sum_high)) {carry_out += 1u;}
                   sum_high = sum_middle;
         
                   sum_middle = sum_low + (middle2 << 16u);
                   if ((sum_middle < sum_low)) {
                      carry_in = 1u;
                   }else {
                      carry_in = 0u;
                   }
                   sum_low = sum_middle;
                   sum_middle = sum_high + (middle2 >> 16u) + carry_in;
                   if ((sum_middle < sum_high)) {carry_out += 1u;};
                   sum_high = sum_middle;
         
                   // Set t0, t1 and carry
                   t0 = sum_low;
                   t1 = sum_high;
                   c += carry_out;
               }
         
               t[i] = t0;
         
               t0 = t1;
               t1 = c;
         
               c = 0u;
           }
         
      
      
           t[15] = t0;
      
      
      // modulo
      
          var tmp : array<u32, 16>;
      
          var constant :u32  = 0x03d1u;
      
          for (var i: u32 = 0u; i < 8u; i++)
          {
              var j: u32 = 8u + i;
              var t_j: u32 = t[j];
      
              // Multiply constant and t[j]
              var low_part: u32 = (constant & 0xFFFFu) * (t_j & 0xFFFFu);
              var high_part: u32 = (constant >> 16u) * (t_j >> 16u);
      
              // Middle part contributions
              var middle1: u32 = (constant & 0xFFFFu) * (t_j >> 16u);
              var middle2: u32 = (constant >> 16u) * (t_j & 0xFFFFu);
      
              // Combine all contributions
              var sum_low: u32 = low_part + c;
              var carry_in: u32;
              if ((sum_low < low_part)){
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              var sum_high: u32 = high_part + carry_in;
              var carry_out: u32;
              if ((sum_high < high_part)) {
                  carry_out = 1u;
              }else {
                  carry_out = 0u;
              }
      
              // Add middle contributions, taking care of carry
              var sum_middle: u32 = sum_low + (middle1 << 16u);
              if ((sum_middle < sum_low)){
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              sum_low = sum_middle;
              sum_middle = sum_high + (middle1 >> 16u) + carry_in;
              if ((sum_middle < sum_high)){
                  carry_out += 1u;
              }
              sum_high = sum_middle;
      
              sum_middle = sum_low + (middle2 << 16u);
              if ((sum_middle < sum_low)){
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              sum_low = sum_middle;
              sum_middle = sum_high + (middle2 >> 16u) + carry_in;
              if ((sum_middle < sum_high)){
                  carry_out += 1u;
              }
              sum_high = sum_middle;
      
              // Set tmp[i] and carry
              tmp[i] = sum_low;
              c = sum_high + carry_out;
          }
      
      
      
          tmp[8] = c;
          
          var tmp2 : array<u32, 16>;for (var i = 0u; i < 16u; i = i + 1u) {tmp2[i] = tmp[i];}
          
          c = addSlice_16_16_16(&tmp, &tmp2, &t, 1u, 1u, 8u); // modifies tmp[1]...tmp[8]
          tmp[9] = c;
      
          c = add_8_16_16(r, &t, &tmp);
      // 
          var c2 : u32  = 0u;
      
          // memset (t, 0, sizeof (t));
        
          var constant2 : u32  = 0x3d1u;
        
          for (var i : u32  = 0u; i < 8u; i++)
          {
              var j: u32 = 8u + i;
              
              var tmp_j : u32  = tmp[j];
        
              // Multiply constant2 and tmp[j]
              var low_part : u32  = (constant2 & 0xFFFFu) * (tmp_j & 0xFFFFu);
              var high_part : u32  = (constant2 >> 16u) * (tmp_j >> 16u);
        
              // Middle part contributions
              var middle1 : u32  = (constant2 & 0xFFFFu) * (tmp_j >> 16u);
              var middle2 : u32  = (constant2 >> 16u) * (tmp_j & 0xFFFFu);
        
              // Combine all contributions
              var sum_low : u32  = low_part + c2;
              var carry_in : u32;
              if ((sum_low < low_part)) {
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              var sum_high : u32  = high_part + carry_in;
              var carry_out : u32;
              if (sum_high < high_part){
                  carry_out = 1u;
              } else {
                  carry_out = 0u;
              }
        
              // Add middle contributions, taking care of carry
              var sum_middle : u32  = sum_low + (middle1 << 16u);
              if (sum_middle < sum_low) {
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              sum_low = sum_middle;
              sum_middle = sum_high + (middle1 >> 16u) + carry_in;
              if ((sum_middle < sum_high)){
                  carry_out += 1u;
              } 
              sum_high = sum_middle;
        
              sum_middle = sum_low + (middle2 << 16u);
              if ((sum_middle < sum_low)){
                  carry_in = 1u;
              }else {
                  carry_in = 0u;
              }
              sum_low = sum_middle;
              sum_middle = sum_high + (middle2 >> 16u) + carry_in;
              if ((sum_middle < sum_high)){
                  carry_out += 1u;
              }
              sum_high = sum_middle;
        
              // Set t[i] and carry
              t[i] = sum_low;
              c2 = sum_high + carry_out;
          }
          t[8] = c2;
          
          var t2_ : array<u32, 16>;for (var i = 0u; i < 16u; i = i + 1u) {t2_[i] = t[i];}
          c2 = addSlice_16_16_16(&t, &t2_, &tmp,1u, 1u, 8u);
          
      
          t[9] = c2;
      
          var rr_2 : array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {rr_2[i] = (*r)[i];}
          c2 = add_8_8_16(r, &rr_2, &t);
      
          c += c2;
      
          t[0] = 0xfffffc2fu;
          t[1] = 0xfffffffeu;
          t[2] = 0xffffffffu;
          t[3] = 0xffffffffu;
          t[4] = 0xffffffffu;
          t[5] = 0xffffffffu;
          t[6] = 0xffffffffu;
          t[7] = 0xffffffffu;
        
          for (var i:u32 = c; i > 0u; i--)
          {
              var r__ : array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {r__[i] = (*r)[i];}
              sub_8_8_16(r, &r__, &t);
          }
        
          for (var i: i32 = 7; i >= 0; i--)
          {
            if ((*r)[i] < t[i]){ break;}
        
            if ((*r)[i] > t[i])
            {
              var r__2 : array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {r__2[i] = (*r)[i];}
              sub_8_8_16(r, &r__2, &t);
              break;
            }
          }
      }
      
      fn point_add( 
          x1 : ptr<function, array<u32, 8>>,
          y1 : ptr<function, array<u32, 8>>,
          z1 : ptr<function, array<u32, 8>>,
          x2 : ptr<function, array<u32, 8>>,
          y2 : ptr<function, array<u32, 8>>,
          )
      {
        
        var t1 : array<u32, 8>;
      
        t1[0] = (*x1)[0];
        t1[1] = (*x1)[1];
        t1[2] = (*x1)[2];
        t1[3] = (*x1)[3];
        t1[4] = (*x1)[4];
        t1[5] = (*x1)[5];
        t1[6] = (*x1)[6];
        t1[7] = (*x1)[7];
      
        var t2 : array<u32, 8>;
      
        t2[0] = (*y1)[0];
        t2[1] = (*y1)[1];
        t2[2] = (*y1)[2];
        t2[3] = (*y1)[3];
        t2[4] = (*y1)[4];
        t2[5] = (*y1)[5];
        t2[6] = (*y1)[6];
        t2[7] = (*y1)[7];
      
        var t3 : array<u32, 8>;
      
        t3[0] = (*z1)[0];
        t3[1] = (*z1)[1];
        t3[2] = (*z1)[2];
        t3[3] = (*z1)[3];
        t3[4] = (*z1)[4];
        t3[5] = (*z1)[5];
        t3[6] = (*z1)[6];
        t3[7] = (*z1)[7];
      
        // x2/y2:
      
        var t4 : array<u32, 8>;
      
        t4[0] = (*x2)[0];
        t4[1] = (*x2)[1];
        t4[2] = (*x2)[2];
        t4[3] = (*x2)[3];
        t4[4] = (*x2)[4];
        t4[5] = (*x2)[5];
        t4[6] = (*x2)[6];
        t4[7] = (*x2)[7];
      
        var t5 : array<u32, 8>;
      
        t5[0] = (*y2)[0];
        t5[1] = (*y2)[1];
        t5[2] = (*y2)[2];
        t5[3] = (*y2)[3];
        t5[4] = (*y2)[4];
        t5[5] = (*y2)[5];
        t5[6] = (*y2)[6];
        t5[7] = (*y2)[7];
      
        var t6 : array<u32, 8>;
        var t7 : array<u32, 8>;
        var t8 : array<u32, 8>;
        var t9 : array<u32, 8>;
      
        mul_mod(&t6, &t3, &t3,0u); // t6 = t3^2
        mul_mod(&t7, &t6, &t3,0u); // t7 = t6*t3
      
        var usr_tmp : array<u32, 8>;
      
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t6[i];}
        mul_mod(&t6, &usr_tmp, &t4,0u); // t6 = t6*t4
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t7[i];}
        mul_mod(&t7, &usr_tmp, &t5,0u); // t7 = t7*t5
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t6[i];}
        sub_mod(&t6, &usr_tmp, &t1); // t6 = t6-t1
        
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t7[i];}
        sub_mod(&t7, &usr_tmp, &t2); // t7 = t7-t2
      
        mul_mod(&t8, &t3, &t6,0u); // t8 = t3*t6
        mul_mod(&t4, &t6, &t6,0u); // t4 = t6^2
        mul_mod(&t9, &t4, &t6,0u); // t9 = t4*t6
        
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t4[i];}
        mul_mod(&t4, &usr_tmp, &t1,0u); // t4 = t4*t1
      
        // left shift (t4 * 2):
      
        t6[7] = (t4[7] << 1u) | (t4[6] >> 31u);
        t6[6] = (t4[6] << 1u) | (t4[5] >> 31u);
        t6[5] = (t4[5] << 1u) | (t4[4] >> 31u);
        t6[4] = (t4[4] << 1u) | (t4[3] >> 31u);
        t6[3] = (t4[3] << 1u) | (t4[2] >> 31u);
        t6[2] = (t4[2] << 1u) | (t4[1] >> 31u);
        t6[1] = (t4[1] << 1u) | (t4[0] >> 31u);
        t6[0] = t4[0] << 1u;
      
        // don't discard the most significant bit, it's important too!
      
        if ((t4[7] & 0x80000000u) != 0u)
        {
          // use most significant bit and perform mod P, since we have: t4 * 2 % P
      
          var a : array<u32, 8>;
      
          a[1] = 1u;
          a[0] = 0x000003d1u; // omega (see: mul_mod ())
      
          for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t6[i];}
          add(&t6, &usr_tmp, &a);
        }
      
        mul_mod(&t5, &t7, &t7,0u); // t5 = t7*t7
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t5[i];}
        sub_mod(&t5, &usr_tmp, &t6); // t5 = t5-t6
        
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t5[i];}
        sub_mod(&t5, &usr_tmp, &t9); // t5 = t5-t9
        
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t4[i];}
        sub_mod(&t4, &usr_tmp, &t5); // t4 = t4-t5
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t4[i];}
        mul_mod(&t4, &usr_tmp, &t7,0u); // t4 = t4*t7
        
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t9[i];}
        mul_mod(&t9, &usr_tmp, &t2,0u); // t9 = t9*t2
      
        for (var i = 0u; i < 8u; i = i + 1u) {usr_tmp[i] = t9[i];}
        sub_mod(&t9, &t4, &usr_tmp); // t9 = t4-t9
      
        (*x1)[0] = t5[0];
        (*x1)[1] = t5[1];
        (*x1)[2] = t5[2];
        (*x1)[3] = t5[3];
        (*x1)[4] = t5[4];
        (*x1)[5] = t5[5];
        (*x1)[6] = t5[6];
        (*x1)[7] = t5[7];
      
        (*y1)[0] = t9[0];
        (*y1)[1] = t9[1];
        (*y1)[2] = t9[2];
        (*y1)[3] = t9[3];
        (*y1)[4] = t9[4];
        (*y1)[5] = t9[5];
        (*y1)[6] = t9[6];
        (*y1)[7] = t9[7];
      
        (*z1)[0] = t8[0];
        (*z1)[1] = t8[1];
        (*z1)[2] = t8[2];
        (*z1)[3] = t8[3];
        (*z1)[4] = t8[4];
        (*z1)[5] = t8[5];
        (*z1)[6] = t8[6];
        (*z1)[7] = t8[7];
      }
      
      
      fn point_double( x : ptr<function, array<u32, 8>>, y : ptr<function, array<u32, 8>>, z : ptr<function, array<u32, 8>>){
          var t1 : array<u32, 8>;
      
          t1[0] = (*x)[0];
          t1[1] = (*x)[1];
          t1[2] = (*x)[2];
          t1[3] = (*x)[3];
          t1[4] = (*x)[4];
          t1[5] = (*x)[5];
          t1[6] = (*x)[6];
          t1[7] = (*x)[7];
        
          var t2 : array<u32, 8>;
        
          t2[0] = (*y)[0];
          t2[1] = (*y)[1];
          t2[2] = (*y)[2];
          t2[3] = (*y)[3];
          t2[4] = (*y)[4];
          t2[5] = (*y)[5];
          t2[6] = (*y)[6];
          t2[7] = (*y)[7];
        
          var t3 : array<u32, 8>;
        
          t3[0] = (*z)[0];
          t3[1] = (*z)[1];
          t3[2] = (*z)[2];
          t3[3] = (*z)[3];
          t3[4] = (*z)[4];
          t3[5] = (*z)[5];
          t3[6] = (*z)[6];
          t3[7] = (*z)[7];
        
          var t4 : array<u32, 8>;
      
          var t5 : array<u32, 8>;
          var t6 : array<u32, 8>;
      
          mul_mod(&t4, &t1, &t1,0u); // t4 = x^2
      
          mul_mod(&t5, &t2, &t2,0u); // t5 = y^2
      
          var tmp_usr : array<u32, 8>;
      
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t1[i];}
          mul_mod(&t1, &tmp_usr, &t5,0u); // t1 = x*y^2
        
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t5[i];}
          mul_mod(&t5, &tmp_usr, &tmp_usr,0u); // t5 = t5^2 = y^4
        
          // here the z^2 and z^4 is not needed for a = 0
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t3[i];}
          mul_mod(&t3, &t2, &tmp_usr,0u); // t3 = x * z
      
          add_mod(&t2, &t4, &t4); // t2 = 2 * t4 = 2 * x^2
      
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t4[i];}
          add_mod(&t4, &tmp_usr, &t2); // t4 = 3 * t4 = 3 * x^2
      
          var c:u32 = 0u;
      
          if ((t4[0] & 1u) != 0u)
          {
            var t:array<u32, 8> ;
        
            t[0] = 0xfffffc2fu;
            t[1] = 0xfffffffeu;
            t[2] = 0xffffffffu;
            t[3] = 0xffffffffu;
            t[4] = 0xffffffffu;
            t[5] = 0xffffffffu;
            t[6] = 0xffffffffu;
            t[7] = 0xffffffffu;
        
            var t4_tmp: array<u32, 8>;for (var i = 0u; i < 8u; i = i + 1u) {t4_tmp[i] = t4[i];}
            c = add(&t4, &t4_tmp, &t); // t4 + SECP256K1_P
          }
        
          // right shift (t4 / 2):
        
          t4[0] = (t4[0] >> 1u) | (t4[1] << 31u);
          t4[1] = (t4[1] >> 1u) | (t4[2] << 31u);
          t4[2] = (t4[2] >> 1u) | (t4[3] << 31u);
          t4[3] = (t4[3] >> 1u) | (t4[4] << 31u);
          t4[4] = (t4[4] >> 1u) | (t4[5] << 31u);
          t4[5] = (t4[5] >> 1u) | (t4[6] << 31u);
          t4[6] = (t4[6] >> 1u) | (t4[7] << 31u);
          t4[7] = (t4[7] >> 1u) | (c     << 31u);
      
      
      
          mul_mod(&t6, &t4, &t4,0u); // t6 = t4^2 = (3/2 * x^2)^2
      
          add_mod(&t2, &t1, &t1); // t2 = 2 * t1
        
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t6[i];}
          sub_mod(&t6, &tmp_usr, &t2); // t6 = t6 - t2
          
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t1[i];}
          sub_mod(&t1, &tmp_usr, &t6); // t1 = t1 - t6
        
          for (var i = 0u; i < 8u; i = i + 1u) {tmp_usr[i] = t4[i];}
          mul_mod(&t4, &tmp_usr, &t1,0u); // t4 = t4 * t1
        
          sub_mod(&t1, &t4, &t5); // t1 = t4 - t5
      
          (*x)[0] = t6[0];
          (*x)[1] = t6[1];
          (*x)[2] = t6[2];
          (*x)[3] = t6[3];
          (*x)[4] = t6[4];
          (*x)[5] = t6[5];
          (*x)[6] = t6[6];
          (*x)[7] = t6[7];
        
          (*y)[0] = t1[0];
          (*y)[1] = t1[1];
          (*y)[2] = t1[2];
          (*y)[3] = t1[3];
          (*y)[4] = t1[4];
          (*y)[5] = t1[5];
          (*y)[6] = t1[6];
          (*y)[7] = t1[7];
        
          (*z)[0] = t3[0];
          (*z)[1] = t3[1];
          (*z)[2] = t3[2];
          (*z)[3] = t3[3];
          (*z)[4] = t3[4];
          (*z)[5] = t3[5];
          (*z)[6] = t3[6];
          (*z)[7] = t3[7];
      }
      
      
      fn convert_to_window_naf( naf : ptr<function, array<u32, 33>>,global_invocation_id : u32) -> u32
      {
        var loop_start:  u32  = 0u;
      
        var n : array<u32, 9> ;
      
        n[0] =    0; 
        n[1] = privateKey[7];
        n[2] = privateKey[6];
        n[3] = privateKey[5];
        n[4] = privateKey[4];
        n[5] = privateKey[3];
        n[6] = privateKey[2];
        n[7] = privateKey[1];
        n[8] = privateKey[0] + global_invocation_id;
        // n[8] = privateKey[0];
      
        for (var i:u32 = 0u; i <= 256u; i++)
        {
          if ((n[8] & 1u) != 0u)
          {
            var diff : i32 = i32( n[8] & 0x0f); // n % 2^w == n & (2^w - 1)
      
            var val : i32 = diff;
      
            if (diff >= 0x08)
            {
              diff -= 0x10;
      
              val = 0x11 - val;
            }
      
            (*naf)[i >> 3] = (*naf)[i >> 3] | u32(val << ((i & 7) << 2));
      
            var  t:u32 = n[8]; // t is the (temporary) old/unmodified value
      
            n[8] -= u32(diff);
      
            // we need to take care of the carry/borrow:
      
            var k: u32  = 8u;
      
            if (diff > 0)
            {
              while (n[k] > t) // overflow propagation
              {
                if (k == 0){break;} ; // needed ?
      
                k--;
      
                t = n[k];
      
                n[k]--;
              }
            }
            else // if (diff < 0)
            {
              while (t > n[k]) // overflow propagation
              {
                if (k == 0) {break;};
      
                k--;
      
                t = n[k];
      
                n[k]++;
              }
            }
      
            // update start:
      
            loop_start = i;
          }
      
          n[8] = (n[8] >> 1) | (n[7] << 31);
          n[7] = (n[7] >> 1) | (n[6] << 31);
          n[6] = (n[6] >> 1) | (n[5] << 31);
          n[5] = (n[5] >> 1) | (n[4] << 31);
          n[4] = (n[4] >> 1) | (n[3] << 31);
          n[3] = (n[3] >> 1) | (n[2] << 31);
          n[2] = (n[2] >> 1) | (n[1] << 31);
          n[1] = (n[1] >> 1) | (n[0] << 31);
          n[0] = n[0] >> 1;
        }
        return loop_start;
      }
      
      fn ROT(r : ptr<function, array<u32, 2>>,a : ptr<function, array<u32, 2>>,d : u32) { 
          if (d == 0){
              (*r)[0] = (*a)[0];
              (*r)[1] = (*a)[1];
              return;
          }
          if (d == 1){
              (*r)[0] = (((*a)[1] << 1) ^ ((*a)[1] >> 31)) >> 0;
              (*r)[1] = (*a)[0] >> 0;
              return;
          } 
          var even : u32;
          var odd : u32;
      
          if (d % 2 == 0) {
            even = ((((*a)[0] << (d / 2))) ^ ((((*a)[0] >> (32 - (d / 2)))) >> 0));
            odd = ((((*a)[1] << (d / 2))) ^ ((((*a)[1] >> (32 - (d / 2)))) >> 0));
          } else {
            even = (((*a)[1] << ((d + 1) / 2)) ^ ((*a)[1] >> (32 - (d + 1) / 2))) >> 0;
            odd = (((*a)[0] << ((d - 1) / 2)) ^ ((*a)[0] >> (32 - (d - 1) / 2))) >> 0;
          }
          (*r)[0] = even;
          (*r)[1] = odd;
      }
    
  
      fn keccak_f_1600(a : ptr<function, array<array<array<u32,2>,5>, 5>>){
        var nRounds : u32 = 24u; 
        
        for (var r : u32 = 0u; r < nRounds; r++) {
          
          var C : array<array<u32, 2>,5> ;
          var D : array<array<u32, 2>,5> ;
          
          for (var x : u32 = 0u; x < 5; x++) {
              for (var y : u32 = 0u; y < 5; y++) {
                  C[x][0] = (C[x][0] ^ (*a)[x][y][0]) >> 0;
                  C[x][1] = (C[x][1] ^ (*a)[x][y][1]) >> 0;
              }
          }
          for (var x : u32 = 0u; x < 5; x++) {
              var tmp : array<u32,2>;
              var tmp2 : array<u32,2>;
              tmp2[0] = C[(x + 1) % 5][0];
              tmp2[1] = C[(x + 1) % 5][1];
              ROT(&tmp,&tmp2, 1);
              D[x][0] = (C[(x + 4) % 5][0] ^ tmp[0]) >> 0;
              D[x][1] = (C[(x + 4) % 5][1] ^ tmp[1]) >> 0;
          }
          for (var x : u32 = 0u; x < 5; x++) {
              for (var y : u32 = 0u; y < 5; y++) {
                  (*a)[x][y][0] = ((*a)[x][y][0] ^ D[x][0]) >> 0;
                  (*a)[x][y][1] = ((*a)[x][y][1] ^ D[x][1]) >> 0;
              }
          }
          var x : u32 = 1u;
          var y : u32 = 0u;
          var current : array<u32,2>; 
          current[0] = (*a)[x][y][0];
          current[1] = (*a)[x][y][1];
          for (var t : u32 = 0u; t < 24; t++) {
              var X : u32 = y;
              var Y : u32 = (2 * x + 3 * y) % 5;
              var tmp : array<u32,2>;
              tmp[0] = (*a)[X][Y][0];
              tmp[1] = (*a)[X][Y][1];
              var tmp2 : array<u32,2>;
              tmp2[0] = (*a)[X][Y][0];
              tmp2[1] = (*a)[X][Y][1];
              ROT(&tmp2, &current, ((t + 1) * (t + 2) / 2) % 64);
              (*a)[X][Y][0] = tmp2[0];
              (*a)[X][Y][1] = tmp2[1];
              current[0] = tmp[0];
              current[1] = tmp[1];
              x = X;
              y = Y;
          }
          for (var y : u32 = 0u; y < 5; y++) {
              var C : array<array<u32, 2>,5>;  // take a copy of the plane
              for (var x : u32 = 0u; x < 5; x++) {
                  C[x][0] = ((*a)[x][y][0] ^ ((~(*a)[(x + 1) % 5][y][0]) & (*a)[(x + 2) % 5][y][0])) >> 0;
                  C[x][1] = ((*a)[x][y][1] ^ ((~(*a)[(x + 1) % 5][y][1]) & (*a)[(x + 2) % 5][y][1])) >> 0;
              }
              for (var x : u32 = 0u; x < 5; x++) {
                  (*a)[x][y][0] = C[x][0];
                  (*a)[x][y][1] = C[x][1];
              }
          }
          (*a)[0][0][0] = ((*a)[0][0][0] ^ RC[r][0]) >> 0;
          (*a)[0][0][1] = ((*a)[0][0][1] ^ RC[r][1]) >> 0;
        }
      }
  
      @compute @workgroup_size(${nbr_thread}, 1)
      fn init(
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
      ) {
        let workgroup_index =  
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y;
        let global_invocation_index =
        workgroup_index * ${nbr_thread} +
        local_invocation_index;  

        var x1 : array<u32, 8>;
          var y1 : array<u32, 8>;
          var naf : array<u32, 33>;for (var i = 0u; i < 33; i = i + 1u) {naf[i] = 0;}
          var loop_start : u32 = convert_to_window_naf(&naf, global_invocation_index);
            // first set:
          var multiplier :  u32 = (naf[loop_start >> 3] >> ((loop_start & 7) << 2)) & 0x0f;
          var odd :  u32 = multiplier & 1;
          var x_pos :  u32 = ((multiplier - 1 + odd) >> 1) * 24u;
          var y_pos :  u32;
          if (odd != 0){
              y_pos = (x_pos + 8);
          } else {
              y_pos = (x_pos + 16);
          }
          x1[0] = BASE_POINTS[x_pos + 0];
          x1[1] = BASE_POINTS[x_pos + 1];
          x1[2] = BASE_POINTS[x_pos + 2];
          x1[3] = BASE_POINTS[x_pos + 3];
          x1[4] = BASE_POINTS[x_pos + 4];
          x1[5] = BASE_POINTS[x_pos + 5];
          x1[6] = BASE_POINTS[x_pos + 6];
          x1[7] = BASE_POINTS[x_pos + 7];
      
          y1[0] = BASE_POINTS[y_pos + 0];
          y1[1] = BASE_POINTS[y_pos + 1];
          y1[2] = BASE_POINTS[y_pos + 2];
          y1[3] = BASE_POINTS[y_pos + 3];
          y1[4] = BASE_POINTS[y_pos + 4];
          y1[5] = BASE_POINTS[y_pos + 5];
          y1[6] = BASE_POINTS[y_pos + 6];
          y1[7] = BASE_POINTS[y_pos + 7];
      
          var z1 : array<u32, 8>;
          z1[0] = 1;
  
          // naf : array<u32,33>,
          for (var i = 0u; i < 33; i = i + 1u) {glob[global_invocation_index].naf[i] = naf[i];}
          // x1: array<u32,8>,
          for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].x1[i] = x1[i];}
          // y1: array<u32,8>,
          for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].y1[i] = y1[i];}
          // z1: array<u32,8>,
          for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].z1[i] = z1[i];}
          // multiplier : u32,
          glob[global_invocation_index].multiplier = multiplier;
          // odd : u32,
          glob[global_invocation_index].odd = odd;
          // x_pos : u32,
          glob[global_invocation_index].x_pos = x_pos;
          // y_pos : u32
          glob[global_invocation_index].y_pos = y_pos;
          glob[global_invocation_index].pos = i32(loop_start) - 1;
          glob[global_invocation_index].workerId = global_invocation_index;
          glob[global_invocation_index].loop_start = loop_start;
      }
      
  
    @compute @workgroup_size(${nbr_thread}, 1)
    fn step4(
      @builtin(workgroup_id) workgroup_id : vec3<u32>,
      @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
      @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
      @builtin(local_invocation_index) local_invocation_index: u32,
      @builtin(num_workgroups) num_workgroups: vec3<u32>
    ) {
        let workgroup_index =  
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y;
        let global_invocation_index =
        workgroup_index * ${nbr_thread} +
        local_invocation_index;
  
      
        var in : array<u32,136>;
        for (var i = 0u; i < 64; i = i + 1u) {
          in[i] = glob[global_invocation_index].ecdsa[i];
        }
        for (var i = 0u; i < 72; i = i + 1u) {
          in[64 + i] = 0;
        }
        in[64] = 0x01;
        in[135] = 0x80;
  
        // for (var i:u32=0; i< 64+72;i++){
        //   result[i] = in[i];
        // }
  
      var w : u32 = 64u; // for keccak-f[1600]
      var blocksize : u32 = 1088u / w * 8u; // block size in bytes (≡ utf-8 characters)
  
      var state : array<array<array<u32,2>,5>, 5>; // should it be init ?
  
      for (var i : u32 = 0u; i < (64 + 72); i += blocksize) {
          for (var j : u32 = 0u; j < 1088 / w; j++) {
              var lo : u32 = (in[i + j * 8 + 0] << 0) + (in[i + j * 8 + 1] << 8)
                  + (in[i + j * 8 + 2] << 16) + (in[i + j * 8 + 3] << 24);
              var hi : u32 = (in[i + j * 8 + 4] << 0) + (in[i + j * 8 + 5] << 8)
                  + (in[i + j * 8 + 6] << 16) + (in[i + j * 8 + 7] << 24);
              var x : u32 = j % 5;
              var y : u32 = j / 5;
              var w : array<u32,2> ;
              
              // toInterleaved(w, lo, hi);
              var even: u32 = 0u;
              var odd: u32 = 0u;
              for (var i: u32 = 0u; i < 64; i++) {
                  var bit: u32 ;
                  if (i < 32) {
                    bit = (lo >> i) & 1;
                  } else {
                    bit = (hi >> (i - 32)) & 1;
                  }
                  if (i % 2 == 0) {
                    even |= bit << (i / 2);
                  }
                  if (i % 2 == 1) {
                    odd |= bit << ((i - 1) / 2);
                  }
              }
              w[0] = even;
              w[1] = odd;
  
  
              state[x][y][0] = (state[x][y][0] ^ w[0]) >> 0; // TODO: >>0?
              state[x][y][1] = (state[x][y][1] ^ w[1]) >> 0;
          }
          keccak_f_1600(&state);
      }
      for (var z:u32 = 0u; z< 5; z++) {
        for (var y:u32 = 0u; y< 5; y++) {
  
            var high:u32 = 0u;
            var low:u32 = 0u;
            for (var i:u32 = 0u; i < 64; i++) {
                var bit:u32;
                if ((i % 2 == 0)){
                  bit = (state[z][y][0] >> (i / 2)) & 1;
                }else {
                  bit = (state[z][y][1] >> ((i - 1) / 2)) & 1;
                }
                if (i < 32){
                    low = (low | (bit << i)) >> 0; // TODO: >>0 needed?
                } 
                if (i >= 32){
                    high = (high | (bit << (i - 32))) >> 0;
                } 
            }
  
            state[z][y][0] = low >> 0;
            state[z][y][1] = high >> 0;
        }
      }
  
      var i : u32 =0u ;
      var res : array<u32, 32>;
      for (var z : u32  = 0u; z < 4; z++) {
          for (var x : u32  = 0u; x < 2; x++) {
              var tmp : u32  = ((state[z][0][x] & 0xFF) << 24) |
                  ((state[z][0][x] & 0xFF00) << 8) |
                  ((state[z][0][x] & 0xFF0000) >> 8) |
                  ((state[z][0][x] & 0xFF000000u) >> 24);
              for (var j : u32  = 0u; j < 4; j++) {
                  res[i * 4 + j] = (tmp >> (24 - j * 8)) & 0xFF;
              }
              i+= 1;
          }
      }

      var res16 : array<u32, 40>;
      for (var i : u32 = 0u; i < 20; i++) {
          res16[i * 2] = base16[(res[i+12] >> 4) & 0xF];
          res16[i * 2 + 1] = base16[res[i+12] & 0xF];
      }
      
      var valid : bool = true;
      for (var i:u32 = 0u; i < find[0];i++){
        if (res16[i] == find[i + 2]){

        } else {
            valid = false;
        }
      }
      
      if (valid){
        for (var i:u32 = 0u; i<find[1];i++){
          if (res16[39 - i] == find[39 - i + 2]){
            continue;
          }
          valid = false;
        }
      }

    if (valid){
        atomicStore(&result[0], glob[global_invocation_index].workerId + 1000);
        for (var i:u32 = 0u; i< 40;i++){
            atomicStore(&result[i+1], res16[i]);
        }
      }
    }
  
  
      @compute @workgroup_size(${nbr_thread}, 1)
      fn step3(
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
      ) {
        let workgroup_index =  
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y;
        let global_invocation_index =
        workgroup_index * ${nbr_thread} +
        local_invocation_index;
  
        var x1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {x1[i] = glob[global_invocation_index].x1[i];}
  
          var y1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {y1[i] = glob[global_invocation_index].y1[i];}
  
          var z1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {z1[i] = glob[global_invocation_index].z1[i];}
          
          inv_mod(&z1);
  
          var z2: array<u32, 8>;
          var tmp_usr: array<u32, 8>;
  
  
          mul_mod(&z2, &z1, &z1,0); // z1^2
  
          for (var i = 0u; i < 8; i = i + 1u) {tmp_usr[i] = x1[i];}
          mul_mod(&x1, &tmp_usr, &z2,0); // x1_affine
        
          for (var i = 0u; i < 8; i = i + 1u) {tmp_usr[i] = z1[i];}
          mul_mod(&z1, &z2, &tmp_usr,0); // z1^3
  
          for (var i = 0u; i < 8; i = i + 1u) {tmp_usr[i] = y1[i];}
          mul_mod(&y1, &tmp_usr, &z1,0); // y1_affine
  
          
          for (var i : u32 = 0u; i < 8; i++) {
            for (var j : u32 = 0u; j < 4; j++) {
              glob[global_invocation_index].ecdsa[(7 - i) * 4 + j] = (x1[i] >> ((3 - j) * 8)) & 0xFF;
            }
          }
          for (var i : u32 = 0u; i < 8; i++) {
            for (var j : u32 = 0u; j < 4; j++) {
                glob[global_invocation_index].ecdsa[32 + (7 - i) * 4 + j] = (y1[i] >> ((3 - j) * 8)) & 0xFF;
            }
          }
      }
  
  
      @compute @workgroup_size(${nbr_thread}, 1)
      fn step2(
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
      ) {
        let workgroup_index =  
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y;
        let global_invocation_index =
        workgroup_index * ${nbr_thread} +
        local_invocation_index;
  
        if (glob[global_invocation_index].pos >= 0){
  
          var x1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {x1[i] = glob[global_invocation_index].x1[i];}
  
          var y1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {y1[i] = glob[global_invocation_index].y1[i];}
  
          var z1 : array<u32, 8>;
          for (var i = 0u; i < 8; i = i + 1u) {z1[i] = glob[global_invocation_index].z1[i];}
  
          var multiplier = glob[global_invocation_index].multiplier;
  
          if (multiplier != 0)
            {
        
               var  odd : u32 = multiplier & 1;
        
               var  x_pos : u32 = ((multiplier - 1 + odd) >> 1) * 24u;
               var  y_pos : u32;
               if (odd != 0){
                  y_pos = (x_pos + 8);
               } else {
                  y_pos = (x_pos + 16);
               }
        
              var  x2 : array<u32,8>;
        
              x2[0] = BASE_POINTS[x_pos + 0];
              x2[1] = BASE_POINTS[x_pos + 1];
              x2[2] = BASE_POINTS[x_pos + 2];
              x2[3] = BASE_POINTS[x_pos + 3];
              x2[4] = BASE_POINTS[x_pos + 4];
              x2[5] = BASE_POINTS[x_pos + 5];
              x2[6] = BASE_POINTS[x_pos + 6];
              x2[7] = BASE_POINTS[x_pos + 7];
        
              var  y2 : array<u32,8>;
        
              y2[0] = BASE_POINTS[y_pos + 0];
              y2[1] = BASE_POINTS[y_pos + 1];
              y2[2] = BASE_POINTS[y_pos + 2];
              y2[3] = BASE_POINTS[y_pos + 3];
              y2[4] = BASE_POINTS[y_pos + 4];
              y2[5] = BASE_POINTS[y_pos + 5];
              y2[6] = BASE_POINTS[y_pos + 6];
              y2[7] = BASE_POINTS[y_pos + 7];
        
      
              point_add(&x1, &y1, &z1, &x2, &y2);
  
  
              for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].x1[i] = x1[i];}
              for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].y1[i] = y1[i];}
              for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].z1[i] = z1[i];}
          } 
          glob[global_invocation_index].pos -= 1;
        }
      }
  
      
      @compute @workgroup_size(${nbr_thread}, 1)
      fn step1(
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
      ) {
        let workgroup_index =  
        workgroup_id.x +
        workgroup_id.y * num_workgroups.x +
        workgroup_id.z * num_workgroups.x * num_workgroups.y;
        let global_invocation_index =
        workgroup_index * ${nbr_thread} +
        local_invocation_index;  
        if (glob[global_invocation_index].pos >= 0){
            var pos : u32 = u32( glob[global_invocation_index].pos);
          
            var x1 : array<u32, 8>;
            for (var i = 0u; i < 8; i = i + 1u) {x1[i] = glob[global_invocation_index].x1[i];}
    
            var y1 : array<u32, 8>;
            for (var i = 0u; i < 8; i = i + 1u) {y1[i] = glob[global_invocation_index].y1[i];}
    
            var z1 : array<u32, 8>;
            for (var i = 0u; i < 8; i = i + 1u) {z1[i] = glob[global_invocation_index].z1[i];}
    
            point_double(&x1, &y1, &z1);
    
            for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].x1[i] = x1[i];}
            for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].y1[i] = y1[i];}
            for (var i = 0u; i < 8; i = i + 1u) {glob[global_invocation_index].z1[i] = z1[i];}
    
            glob[global_invocation_index].multiplier = (glob[global_invocation_index].naf[pos >> 3] >> ((pos & 7) << 2)) & 0x0f;
          }
      }
      
      `

}