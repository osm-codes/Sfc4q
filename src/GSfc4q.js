/**
 * GSfc4q module.
 * Source-code:  https://github.com/ppkrauss
 * License: Apache2, http://www.apache.org/licenses/LICENSE-2.0
 */


/**
 * Generalized (G) Space-filling Curve (SFC) associated to a grid obtained by recursive 4-partitions of quadrilaterals.
 * The generalization consist in the inclusion of half levels.
 *
 * Concepts:
 *
 * level: the curve's hierarchical level. "public level", that can be half (0.5, 1, 1.5, 2, 2.5 etc.)
 *
 * blevel: "blind structure" integer level, concrete level adopted on internal calculations.
 *    when isHalf blevel>level else blevel==level.
 *
 * key: the index of a position in the SFC of level (abstract grid), sometimes sayd "distance from origin".
 *
 * bkey: "blind structure" key. Same as key, changing only when isHalf (blevel!=level).
 *
 * bkey2: the second bkey, used only when isHalf, in the
 *   "union of cells for building abstract structure from blind structure". See key_encode().
 *
 * (i,j) coordinates, or "integer XY" or "leaf-cell coordinates": see grid of the "blind structure".
 *   “i” and “j” are integers in the range [0,2^blevel-1]. IJ=(0,0) in the left-buttom corner.
 *   “i” scan columns from left to right, “j” scan lines from bottom to up.
 *
 */
class GSfc4q {

  /**
   * @constructor
   * @param {float} level - hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   */
  constructor(level) {
    this.refresh(level)
    // spececialized properties, to be overridden:
    this.needSwap = false  // about cell rotation (swapping i and j), default value, need overhide
    this.halfIsOptimized = false  // for adaptated Morton and others, default value, need overhide
  }

  /**
   * Refresh inicializations, mutating all propertis if necessary. Used by constructor.
   * @param {float} level - null (no mutation) or hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   */
  refresh(level) {
    this.level  = level || this.level || 1
    // PROPRIETIES:
    this.blevel = Math.round(this.level)       // use this level for internal calculus
    this.isHalf = (this.blevel != this.level)  // or !(this.level % 0.5)
    this.level  =  this.blevel - (this.isHalf? 0.5: 0) // redo for exact "0.5 or 0"

    this.nKeys  =  this.nBKeys   = 4n**BigInt(this.blevel)       // number of cells in the grid
    this.keyBits = this.bkeyBits = (this.nKeys - 1n).toString(2).length
    if (this.isHalf) {
      this.nKeys = this.nBKeys/2n  // number of cells at half level
      this.keyBits--
    }
    this.nRefRows = 2n**BigInt(this.blevel) // sqrt(nBKeys), reference for number of B-Rows (or cells per column in an uniform reference grid).
  }

  /**
   * Translates key to (i,j) coordinates.
   * @param {integer} key - distance from origin in the curve at level.
   * @return {array} - the coordinates IJ in [IJ0,IJ1] with IJ1=null when not isHalf.
   */
  key_decode(key) {
      if (typeof key != 'bigint') key = BigInt(key)
      if (this.isHalf) {
	let bkey = 2n*key  // blevel
        let ij0 = this.bkey_decode(bkey)
	return [ ij0, this.bkey_decode(bkey+1n) ]
      } else
        return [ this.bkey_decode(key), null ]
  }


  /**
   * Translates to bkey the (i,j) coordinates of blevel in the "blind grid".
   * Remember that blevel=level, changing only when isHalf (level+0.5).
   * When isHalf the bkey2 is not null.
   * @param {integer} i - the roundX coordinate.
   * @param {integer} j - the roundY coordinate.
   * @return {array} - of BigInts, bkey1 and null or bkey1 and bkey2.
   */
  key_encode(i,j) {
    if (this.isHalf) {
      let bkey1  = this.bkey_encode(i,j); // bkey at blevel
      let key   = bkey1>>1n; //  level
      bkey1 = key<<1n;  // normalized bkey1
      let bkey2 = bkey1+1n
      return [bkey1, bkey2]
    } else
      return [this.bkey_encode(i,j),null];
  }


  // // // // to be overhide  // // //


  /**
   * Concrete method. Same as key_decode() method, but for integer levels only.
   * @param {integer} bkey - distance from origin in the curve.
   * @return {array} - the IJ coordinates of the key.
   */
  bkey_decode(bkey) { return [null,null] } // to overhide by curve.

  /**
   * Concrete method. Translates to key the (i,j) coordinates.
   * @param {integer} i - the row coordinate.
   * @param {integer} j - the column coordinate.
   * @return integer. and mutate bkeys
   */
  bkey_encode(i,j) { return null }   // to overhide by curve.

  // used only on (needSwap) rotated geometries of rectangular cells
  key_swapSides(key,xref,yref) { return [xref,yref] } // to get cell sizes by ID
  ij_swapSides(i,j,xref,yref) { return [xref,yref] } // to get cell sizes by (i,j)
  ij_nSwaps(i,j) { return [0n,0n] } // to get XY grid position, number of X-rotations and Y-rotations.

} // \GSfc4qLbl



/**
 * Labeled GSfc4q. Uses a SizeBigInt to express GSfc4q keys as human-readable hierarchical codes.
 * Also extends internal representation to unically identify keys of multiple grids, concatenating the ID0 of the grid.
 * Provides method chaining for set ID.
 */
class GSfc4qLbl extends GSfc4q {

  /**
   * @constructor
   * @param {float} level - hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   * @param {string} base - the abbreviation of name of standard base (2, 4js, 4h, 16h, 32ghs, etc.)
   * @param {string} id0 - grid ID used as prefix in the cell ID.
   * @param {string} id0_maxBits - maximum number of bits in an ID0.
   */
  constructor(level,base,id0,id0_maxBits) {
    super(level)
    this.base = null
    this.sbiID = new SizedBigInt()
    this.lblRefresh(base,id0,id0_maxBits)
  }

  lblRefresh(base,id0,id0_maxBits) {
    base = base  || this.base  || '4h'
    id0_maxBits = id0_maxBits || this.id0_maxBits || null
    if (id0!==undefined && id0!==null && BigInt(id0)!=this.id0) {
        let id0_tmp = SizedBigInt(id0,null,null,id0_maxBits)
        this.id0 = id0_tmp.val  // a BigInt
        this.id0_maxBits = id0_maxBits? id0_maxBits: id0_tmp.bits
        this.sbiID.fromNull()  // remove old value
    }
    if (this.id0_maxBits == undefined) this.id0_maxBits = null
    if (base && base!=this.base) {
        this.base = base
        SizedBigInt.kx_trConfig(this.base) // for exotic bases
    }
  }

  /**
   * Set ID by ID.
   * @param {bigint} id - the cell ID. Int or BigInt.
   */
  setId(id) {
     let IDbits = this.keyBits + (this.id0_maxBits?this.id0_maxBits:0)
     this.sbiID.fromInt(id,IDbits)
     return this
  }

  /**
   * Set by key.
   * @param {bigint} key.
   */
  setKey(key) {
     this.sbiID.fromInt(key,this.keyBits)
     return this
  }

  /**
   * Set by bkey.
   * @param {bigint} bkey.
   */
  setBkey(bkey) {
     this.sbiID.fromInt(bkey,this.bkeyBits)
     return this
  }

  /**
   * Set ID0. Must be used before setId().
   * @param {int} id0 - grid ID used as prefix in the cell ID.
   * @param {int} id0_maxBits - optional, maximum number of bits in an ID0.
   */
  setId0(id0,id0_maxBits) {
     this.lblRefresh(null,id0,id0_maxBits)
     return this
  }

  /**
   * Set ID by key.
   * @param {bigint} key - Int or BigInt.
   */
  setID_byKey(key) {
     if (this.id0_maxBits) {
       // ! key = concatenate key and this.id0
     }
     return this.setId(key)
  }

  /**
   * Set ID by (i,j) or array IJ. Numbers, not BigInt's.
   * @param {int} i - array or Integer X coordinate (scan columns from left to right).
   * @param {int} j - Integer Y coordinate (scan lines from bottom to up).
   */
  setBkey_byIJ(i,j) {
    if (typeof i == 'object') [i,j]=i;
    let max = Number(this.nRefRows)-1
    if (i>max || j>max) return this; // reliable but hidding bugs
    let bkey = this.key_encode(i,j)[0];
    return this.setKey( this.isHalf? bkey/2n: bkey )
  }

  /**
   * Labelling. Assignment of human-readle and hierarchical label for a cell of the grid.
CHECK BUG: not returning correct number of bits  (start-padding zeros)
   * Provides a standard base-encoded (String) representation of the (BigInt) cell identifier (ID).
   * The ID is obtained by setID chaining methods.
   * @param {string} otherbase - none (standard) or other base.
   * @return {string} - the human-readable ID.
   */
  id_toString(otherbase=null) {
     return this.sbiID.toString(otherbase||this.base)
  }

  key_toString(otherbase=null) {
     //return this.sbiID.toString(otherbase||this.base)
     return null; // under construction
  }

}


// // // // // //  Concrete curve implementations as specializations:  // // // // //


/**
 * Morton curve for 32 bits, waiting better for 64bits.
 * 64 bits REFERENCES:
 *  https://github.com/yinqiwen/geohash-int/blob/master/geohash.c
 *  https://github.com/mmcloughlin/geohash/blob/master/geohash.go
 *  https://discourse.julialang.org/t/interleaving-bits-z-order-curve-morton-code-transpose-binary-matrix/18458/5
 * 32 bits and other REFERENCES:
 *  https://github.com/vasturiano/d3-hilbert
 *  http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
 *  http://bl.ocks.org/jaredwinick/5073432
 *  http://stackoverflow.com/questions/4909263/how-to-efficiently-de-interleave-bits-inverse-morton
 */
class GSfc4q_Morton extends GSfc4qLbl {

  constructor(level,base,id0,id0_maxBits) {
    super(level,base,id0,id0_maxBits)
    this.curveName='Morton'
    //default this.needSwap = false
    //default this.halfIsOptimized = false // can be true!
  }

  bkey_encode(x, y) { // for 32 bits positive integers
    if (typeof x == 'number') {x=BigInt(x); y=BigInt(y);}
    var B = [BigInt(0x55555555), BigInt(0x33333333), BigInt(0x0F0F0F0F), BigInt(0x00FF00FF)];
    var S = [1n, 2n, 4n, 8n];
    x = (x | (x << S[3])) & B[3];
    x = (x | (x << S[2])) & B[2];
    x = (x | (x << S[1])) & B[1];
    x = (x | (x << S[0])) & B[0];
    y = (y | (y << S[3])) & B[3];
    y = (y | (y << S[2])) & B[2];
    y = (y | (y << S[1])) & B[1];
    y = (y | (y << S[0])) & B[0];
    return x | (y << 1n);
  }

  bkey_decode(d) {
    if (typeof d !='bigint') d = BigInt(d)
    return [
      Number(GSfc4q_Morton.deinterleave(d)),
      Number(GSfc4q_Morton.deinterleave(d >> 1n))
    ];
  } // \key_decode

  static deinterleave(x) {
    x = x & BigInt(0x55555555);
    x = (x | (x >> 1n)) & BigInt(0x33333333);
    x = (x | (x >> 2n)) & BigInt(0x0F0F0F0F);
    x = (x | (x >> 4n)) & BigInt(0x00FF00FF);
    x = (x | (x >> 8n)) & BigInt(0x0000FFFF);
    return x;
  }

} // \GSfc4q_Morton


/**
 * Hilbert Curve implementation.
 */
class GSfc4q_Hilbert extends GSfc4qLbl { // Hilbert Curve.

  constructor(level,base,id0,id0_maxBits) {
    super(level,base,id0,id0_maxBits)
    this.curveName='Hilbert'
    this.needSwap = true // need to implement ij_swapSides(), etc.
    this.halfIsOptimized = false
    if (conf_alertLevel>1) console.log("warning: Hilbert needSwap not implemented.")
  }

  bkey_decode(bkey) {
    return GSfc4q_Hilbert._bkey_decode(bkey, this.nRefRows)
  }

  bkey_encode(i,j) {
    if (typeof i == 'number') {i=BigInt(i); j=BigInt(j);}
    return GSfc4q_Hilbert._bkey_encode(i, j, this.nRefRows)
  }

  // Private methods:

  static _rot(n, ij, rx, ry) {
    // rotate/flip a quadrant appropriately, mutating ij.
    if (ry == 0n) {
      if (rx == 1n) {
          ij[0] = (n - 1n - ij[0]);
          ij[1] = (n - 1n - ij[1]);
      }
    ij.push(ij.shift()); //Swap i and j
    }
  }
  static _bkey_decode(key, nRefRows) {  // max 64 bits key, to return 32 bits pair.
    if (typeof key !='bigint') key = BigInt(key)
    let rx, ry, t = key,
        ij = [0n, 0n];
    for (let s = 1n; s < nRefRows; s *= 2n) {
        rx = 1n & (t / 2n);
        ry = 1n & (t ^ rx);
        GSfc4q_Hilbert._rot(s, ij, rx, ry);
        ij[0] += (s * rx);
        ij[1] += (s * ry);
        t /= 4n;
    }
    return [Number(ij[0]),Number(ij[1])]; // 32 bits integers
  }
  static _bkey_encode(i, j, nRefRows) { // input and return BigInt
    let rx, ry, key = 0n,
        ij = [i, j];
    for (let s = nRefRows / 2n; s >= 1n; s /= 2n) {
        rx = (ij[0] & s) > 0n ? 1n: 0n;
        ry = (ij[1] & s) > 0n ? 1n: 0n;
        key = key + s*s * ((3n * rx) ^ ry);
        GSfc4q_Hilbert._rot(s, ij, rx, ry);
    }
    return key;
  }

} //  \GSfc4q_Hilbert


///////////////////

/**
 * Sized BigInt's (SizedBigInt) are arbitrary-precision integers with defined number of bits.
 * Each instance is a pair (size,number). Input and output accepts many optional representations.
 *
 * @see original source at https://github.com/ppKrauss/SizedBigInt
 *  and foundations at http://osm.codes/_foundations/art1.pdf
 */
class SizedBigInt {

  /**  @constructor */
  constructor(val,radix,bits,maxBits=null) {
    SizedBigInt.kx_RefreshDefaults(); // global cache once.
    let t = typeof val;
    if (val && t=='object') { // not-null object
       if (val instanceof SizedBigInt)
        [val,radix,bits,maxBits]=[val.val,null,val.bits,null]; // clone()
       else if (val instanceof Array)
        [val,radix,bits,maxBits]=val;
       else ({val,radix,bits,maxBits} = val);
       t = typeof val
    }
    // set to default values when 0, null or undefined:
    if (t=='string') {
      if (!radix) radix = 4;
      if (bits) throw new Error("Invalid input bits for string");
      this.fromString(val, radix, maxBits)
    } else // bigint, number or null
      this.fromInt(val, bits, maxBits)
  }


  // // //
  // Input methods:

  fromNull() { this.val=null; this.bits=0; return this; }

  fromBitString(strval, maxBits=null) {
    if (!strval) return this.fromNull();
    this.bits = strval.length
    if (maxBits && this.bits>maxBits)
      throw new Error(`bit-length ${this.bits} exceeded the limit ${maxBits}`);
    this.val = BigInt("0b"+strval)
    return this
  }

  /**
   * Input from string.
   * @param {string} strval -  with valid representation for radix.
   * @param {integer} radix - the representation adopted in strval, a label of SizedBigInt.kx_baseLabel.
   * @param maxBits - null or maximal number of bits.
   * @return - new or redefined SizedBigInt.
   */
  fromString(strval, radix=4, maxBits=null) {
    if (typeof strval!='string') throw new Error("Invalid input type, must be String");
    let r = SizedBigInt.baseLabel(radix,false)
    if (!strval) return this.fromNull()
    if (r.base==2)
      return this.fromBitString(strval,maxBits);
    // else if (r.label='16js') _fromHexString(), to optimize.
    let trLabel = r.label+'-to-2'
    if (!SizedBigInt.kx_tr[trLabel]) SizedBigInt.kx_trConfig(r.label);
    let tr = SizedBigInt.kx_tr[trLabel]
    let strbin = ''
    for (let i=0; i<strval.length; i++)
      strbin += tr[ strval.charAt(i) ]
    return this.fromBitString(strbin,maxBits)
  }

  /**
   * Input from BigInt or integer part of a Number.
   * @param val - Number or BigInt.
   * @param {integer} bits - optional, the bit-length of val, to padding zeros.
   * @param {integer} maxBits - null or maximal number of bits, truncating.
   * @return - new or redefined SizedBigInt.
   */
  fromInt(val, bits=0, maxBits=null) {
    let t = typeof val
    let isNum = (t=='number')
    if (t == 'bigint' || isNum) {
      if (isNum && !maxBits)  this.val = BigInt( val>>>0 ); // ~ BigInt.asUintN(32,val)
      else this.val = maxBits? BigInt.asUintN( maxBits, val ) : val;
      let l = this.val.toString(2).length  // as https://stackoverflow.com/q/54758130/287948
      this.bits = bits? bits: l;
      if (l>this.bits)
        throw new Error("invalid input value, bigger than input bit-length");
      if (maxBits && this.bits>maxBits)
        throw new Error(`bit-length ${this.bits} exceeded the limit ${maxBits}`);
      return this
    } else // null, undefined, string, etc.
      return this.fromNull()
  }

  _fromHexString(strval, maxBits=null) {
    // not in use, for check performance optimizations
    if (!strval) return this.fromNull()
    this.bits = strval.length*4
    this.val = BigInt("0x"+strval) // works with asUintN(maxBits)?
    return this
  }

  // // //
  // Getters and output methods:

  get value() { return [this.bits,this.val] }

  toBitString(){
    return (this.val===null)
      ? ''
      : this.val.toString(2).padStart(this.bits,'0');
  }

  /**
   * Overrides the default toString() method and implements radix convertions.
   * @param {integer} radix - optional, the base-label (see keys of SizedBigInt.kx_baseLabel)
   * @return {string} the solicitated representation.
   */
  toString(radix) {
    if (radix===undefined)
      return `[${this.bits},${this.val}]`; // Overrides Javascript toString()
    let rTo = SizedBigInt.baseLabel(radix,false)
    if (this.val===null)// || (!rTo.isHierar && this.bits % rTo.bitsPerDigit != 0))
      return ''
    let b = this.toBitString()
    if (rTo.base==2)  // || rTo.base=='2h'
      return b
    let trLabel = '2-to-'+rTo.label
    if (!SizedBigInt.kx_tr[trLabel]) SizedBigInt.kx_trConfig(rTo.label);
    let tr = SizedBigInt.kx_tr[trLabel]
    let r = ''
    for (let i=0; i<b.length; i+=rTo.bitsPerDigit)
      r += tr[ b.slice(i,i+rTo.bitsPerDigit) ]
    return r;
  }

  // // //
  // Other methods:

  /**
   * Get the "last numeric SizedBigInt" using same number of bits.
   * @return {BitInt} -  the maximum value.
   */
  fixbits_last() {
     return 2n**BigInt(this.bits)-1n
  }
  /**
   * Get the "next numeric SizedBigInt" using same number of bits.
   * @param cycle boolean flag to use Sized Integers as cyclic group (no error on maximum value)
   * @return null or BitInt of the "same-bit-length successor" of the current state.
   */
  fixbits_next(cycle=false) {
     return (this.val!==this.fixbits_last())
        ? this.val+1n
        : (cycle? 0n: null);
  }

  /**
   * Swap-object utility.
   * @param {object} obj.
   * @return {object} - with swapped key-values.
   */
  static objSwap(obj) {
    return Object.entries(obj).reduce(
      (obj, [key,value])  =>  ({ ...obj, [value]: key }),  {}
    )
  }

  /**
   * Calculates the integer log2() of a BigInt... So, its number of bits.
   * @param {BigInt} n - a positive integer.
   * @return {integer} - the ilog2(n)=ceil(log2(n))
   */
  static ilog2(n) {
    return n.toString(2).length - (
      (n<0n)
      ? 2 //discard bit of minus
      : 1
    );
  }

  /**
   * Check and normalize the base label. Access the global kx_baseLabel.
   * @param {string} label
   * @param {boolean} retLabel - to return string instead pointer.
   * @return - object pointer (to the correct kx_baseLabel), or a string with normalized label.
   */
  static baseLabel(label,retLabel=false) {
    let t = typeof label;
    if (t=='number') label = String(label);
    else if (t=='boolean' || !label) label='2';
    label = label.toLowerCase();
    if (label.slice(0,3)=='base') label = label.slice(3);
    var r = SizedBigInt.kx_baseLabel[label]
    if (!r) throw new Error(`label "${label}" not exists, must be registered`);
    if (r.isAlias) r = SizedBigInt.kx_baseLabel[r.isAlias];
    return retLabel? r.label: r;
  }

  /**
   * Division N/D. Returns integer part and "normalized fractional part"
   * @param {BigInt} N - positive numerator.
   * @param {BigInt} D - positive non-zero denominator.
   * @param {BigInt} P - power to be used in 2**P, with P>0.
   * @return {Array} - values [integer_part,fractional_part] = [IP,FP] where F=FP*2^P.
   */
  static bigint_div(N,D,P=BigInt(64)) {
    let I = N/D  // ideal a function that returns R and Q.
    let R = N-I*D // compare with performance of R=N%D
    let F=((BigInt(2)**P)*R)/D
    return [I,F]
  }


  // // //
  // Iternal use, cache-manager methods:

  /**
   * Internal class-level cache-builder for Base4h and Base16ph complete translations.
   * and generates all other kx_baseLabel global defaults. Singleton Design Pattern.
   */
  static kx_RefreshDefaults() {
   // each standard alphabet as key in the translator.
   if (!SizedBigInt.kx_tr) {
     SizedBigInt.kx_tr={};
     SizedBigInt.kx_baseLabel = {
       "2":   { base:2, alphabet:"01", ref:"ECMA-262" } // never used here, check if necessary to implement
       ,"2h":  {  // BitString representation
         base:2, alphabet:"01",
         isDefault:true,
         isHierar:true, // use leading zeros (0!=00).
         ref:"SizedNaturals"
       }
       ,"4h": {
         base:4,
         isHierar:true, // use hDigit and leading zeros.
         alphabet:"0123GH", case:"upper",
         regex:'^([0123]*)([GH])?$',
         ref:"SizedNaturals"
         }
       ,"8h": {
         base:8,
         isHierar:true,
         alphabet:"01234567GHJKLM",  // 2*8-2=14 characters
         regex:'^([0-7]*)([GHJ-M])?$',
         ref:"SizedNaturals"
       }
       ,"16h": {
         base:16,
         isHierar:true,
         alphabet:"0123456789abcdefGHJKLMNPQRSTVZ", //2*16-2=30 characters
         regex:'^([0-9a-f]*)([GHJ-NP-TVZ])?$',
         ref:"SizedNaturals"
       }
       ,"4js":   { alphabet:"0123", isDefault:true, ref:"ECMA-262" }
       ,"8js":   { alphabet:"01234567", isDefault:true, ref:"ECMA-262" }
       ,"16js":  { alphabet:"0123456789abcdef", isDefault:true, ref:"ECMA-262" } // RFC 4648 sec 8 is upper
       ,"32hex": { alphabet:"0123456789abcdefghijklmnopqrstuv", isDefault:true, ref:"RFC 4648 sec. 7" }
       ,"32nvu": { alphabet:"0123456789BCDFGHJKLMNPQRSTUVWXYZ", ref:"No-Vowels except U (near non-syllabic)" }
       ,"32rfc": { alphabet:"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", ref:"RFC 4648 sec. 6" }
       ,"32ghs": { alphabet:"0123456789bcdefghjkmnpqrstuvwxyz", ref:"Geohash, classical of 2008" }
       ,"64url": {
         alphabet:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
         isDefault:true, ref:"RFC 4648 sec. 5"
       }
     };
     SizedBigInt.kx_baseLabel_setRules();
     // to prepare cache, for example Bae16h, run here SizedBigInt.kx_trConfig('16h')
   } // \if
  }

  /**
   * Apply correction rules to SizedBigInt.kx_baseLabel.
   */
  static kx_baseLabel_setRules(label=null) {
    let scan = label? [label]: Object.keys(SizedBigInt.kx_baseLabel)
    const rAlpha = {falsetrue:"upper", falsefalse:true, truefalse:"lower", truetrue:false};
    for (let i of scan) {
      const r = SizedBigInt.kx_baseLabel[i]
      if (!r.base)         r.base = r.alphabet.length;
      if (!r.bitsPerDigit) r.bitsPerDigit = Math.log2(r.base);
      if (!r.alphabet) throw new Error(`err2, invalid null alphabet`);
      if (!r.isHierar) r.isHierar = false;
      else if (r.alphabet.length<(r.base*2-2))
        throw new Error(`err3, invalid hierarchical alphabet in "${baseLabel}": ${r.alphabet}`);
      let alphaRgx = r.alphabet.replace('-','\\-');
      if (!r.regex)  r.regex =  '^(['+ alphaRgx +']+)$';
      if (!r.case)
        r.case = rAlpha[String(r.alphabet==r.alphabet.toLowerCase()) + (r.alphabet==r.alphabet.toUpperCase())]
      let aux = (r.case===false)? 'i': '';
      if (typeof r.regex =='string')  r.regex = new RegExp(r.regex,aux);
      if (r.isDefault===undefined)    r.isDefault=false;
      if (r.isDefault && i!=r.base) SizedBigInt.kx_baseLabel[String(r.base)] = {isAlias: i};
      aux = String(r.bitsPerDigit) +','+ r.bitsPerDigit;
      if (i!='2')
        r.regex_b2 = new RegExp('^((?:[01]{'+ aux +'})'+(r.isHierar?'*)([01]*)':'+)')+'$');
      r.label = i
    } // \for
  }

  /**
   * Internal cache-builder for input radix methods. Generates the non-default objects.
   * Changes the state of SizedBigInt.kx_tr.
   */
  static kx_trConfig(baseLabel) {
    const r = SizedBigInt.kx_baseLabel[baseLabel];
    if (!r || r.isAlias) throw new Error(`label "${baseLabel}" not exists or is alias`);
    if (r.base==2) return;
    if (r.base>64) throw new Error(`Base-${r.base} is invalid`);
    let label = r.label + '-to-2'
    if (!SizedBigInt.kx_tr[label]) SizedBigInt.kx_tr[label] = {};
    for (let i=0; i<r.base; i++) { // scans alphabet
        let c = r.alphabet.charAt(i)
        SizedBigInt.kx_tr[label][c] = i.toString(2).padStart(r.bitsPerDigit,'0')
    }
    if (r.isHierar) {
      let alphaPos = r.base;
      for(var bits=1; bits<r.bitsPerDigit; bits++)
        for (let i=0; i<2**bits; i++) {
          let c = r.alphabet.charAt(alphaPos)
          SizedBigInt.kx_tr[label][c] = i.toString(2).padStart(bits,'0')
          alphaPos++
        } // \for i, \for bits
    }
    SizedBigInt.kx_tr['2-to-'+r.label] = SizedBigInt.objSwap(SizedBigInt.kx_tr[label]);
  }

} // \SizedBigInt


// // // // // //

//module.exports = { GSfc4q_Morton, GSfc4q_Hilbert }



 /* - - - - - - - - - - - - - - - - - - - - - - - -

 Copyright 2019 by Peter Krauss (github.com/ppkrauss) and collaborators.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

- - - - - - - - - - - - - - - - - - - - - - - - - */
