// node  --experimental-modules bench01.js

const { GSfc4q_Morton, GSfc4q_Hilbert } = require('./GSfc4q.js');

var mrt, hlb;
for (let l=0.5; l<3;  l=l+0.5) {
	mrt = new GSfc4q_Morton(l,"4h")
	hlb = new GSfc4q_Hilbert(l,"4h")
	console.log(`\n--- LEVEL ${l} ----`)
	showBase4hValues(mrt.nKeys)
}

function showBase4hValues(imax){
  console.log("key\t|Morton\t   \t|Hilbert")
  for (let i=0; i<imax; i++) {
    let mrt_ij = mrt.key_decode(i)
    let MRT = mrt_ij[1]? `${mrt_ij[1][0]},${mrt_ij[1][1]}`: '   ';
    let hlb_ij = hlb.key_decode(i)
    let HLB = hlb_ij[1]? `${hlb_ij[1][0]},${hlb_ij[1][1]}`: '   ';
    console.log(`${i}\t|${mrt_ij[0][0]},${mrt_ij[0][1]}\t${MRT}\t|${hlb_ij[0][0]},${hlb_ij[0][1]}\t${HLB}`)
  } // \for
} // \func

