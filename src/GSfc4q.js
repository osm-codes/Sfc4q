/**
 * GSfc4q module.
 * Source-code:  https://github.com/ppkrauss/Sfc4q
 * License: Apache2, http://www.apache.org/licenses/LICENSE-2.0
 */


/**
 * Generalized (G) [Space-filling Curve](https://en.wikipedia.org/wiki/Space-filling_curve) (SFC) associated to a grid obtained by recursive 4-partitions of quadrilaterals.
 * The generalization consist in the inclusion of "half levels",  introduced by [this article](http://osm.codes/_foundations/art3.pdf).
 *
 * Concepts:
 *
 * **level**: the curve's hierarchical level of the public (abstract) structure. Also named "public level", that can be half (0.5, 1, 1.5, 2, 2.5 etc.).
 *
 * **blevel**: "blind structure" integer level, the concrete level adopted on internal calculations.
 * The basic relation is *blevel=ceil(level)*, with a flag *isHalf* when *blevel* is not equal to *level*.
 *
 * **key**: the index of a position in the SFC of public level (abstract grid), sometimes sayd "distance from origin". The geometric representation of key is a cell in the regular grid. When *isHalf* the cell of *level* is the union of two cells of *blevel*. Sometimes, when *isHalf* (see Hilbert curve case), the abstract grid obtained by this union of adjacent cells is a non-regular "degenerated grid".
 *
 * **bkey**: "blind structure" key. Same as key, changing only when *isHalf*, them *key​ = floor (​bkey / 2)*.
 *
 * **bkey2**: the second bkey, used only when isHalf, in the
 *   "union of cells for building abstract structure from blind structure". See key_encode().
 *
 * **grid** of the **unit square**: the mathematical entity used as total area filled by the SFC, is the unit square. It can be transformed into any other quadrilateral, it is a reference canvas geometry. Partitions over unit square produces the grid of *blevel*. The SFC forms a path conecting centers of the cells of the grid.  The set of all *blevel* grids can be named "hierarchical grid", but sometimes is simply designed as "grid". Grids of *isHalf* levels are named "degenerated grids". The unit square with no partition is the primordial cell, a grid of level zero.
 *
 * **(i,j)** coordinates, or "integer [XY grid](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Positions#The_grid)": see grid of the "blind structure". ![](../assets/svg_coordinates.png)
 *   <br/>“i” and “j” are integers in the range [0,2^blevel-1]. IJ=(0,0) in the top-left corner.
 *   <br/>“i” scan columns from left to right, “j” scan lines from top to bottom.
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
  debugStates() {
    return {
       level:this.level, blevel:this.blevel, isHalf:this.isHalf, nKeys:this.nKeys, nBKeys:this.nBKeys
     , keyBits:this.keyBits, nRefRows:this.nRefRows, needSwap:this.needSwap, halfIsOptimized:this.halfIsOptimized
    }
  }

  /**
   * Refresh inicializations, changing all properties if necessary. Used by constructor.
   * @param {float} level - null (no mutation) or hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   */
  refresh(level) {
    this.level  = level || this.level || 1
    // PROPRIETIES:
    this.blevel = Math.ceil(this.level)       // use this level for internal calculus
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
   * Translates to *key* the (i,j) coordinates of "blind grid", Use *level* as reference,
   * and supposing union of cells when *isHalf*, returning 2 cells instead one.
   * @param {integer} i - the rounded X coordinate, left to right.
   * @param {integer} j - the rounded Y coordinate, top to bottom.
   * @return {array} - of BigInts, bkey1 and null or, when *isHalf*, bkey1 and bkey2.
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


  // // // // methods to be overhided:  // // //

  /**
   * Concrete method. Same as key_decode() method, but for integer levels only.
   * @param {integer} bkey - distance from origin in the curve.
   * @return {array} - the IJ coordinates of the key.
   */
  bkey_decode(bkey) { return [null,null] } // to overhide by curve.

  /**
   * Concrete method. Translates to *bkey* the (i,j) coordinates. Use *blevel* as reference.
   * @param {integer} i - the rounded X coordinate, left to right.
   * @param {integer} j - the rounded Y coordinate, top to bottom.
   * @return integer. and mutate bkeys
   */
  bkey_encode(i,j) { return null }   // to overhide by curve.

  // used only on (needSwap) rotated geometries of rectangular cells
  key_swapSides(key,xref,yref) { return [xref,yref] } // to get cell sizes by ID
  ij_swapSides(i,j,xref,yref) { return [xref,yref] } // to get cell sizes by (i,j)
  ij_nSwaps(i,j) { return [0n,0n] } // to get XY grid position, number of X-rotations and Y-rotations.

} // \GSfc4qLbl

GSfc4q.conf_alertLevel=0 // static global variable for config

// // // // // //


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
    this.sbiID = new SizedBigInt()  //  val,radix,maxBits,onErr_cutLSD
    this.lblRefresh(base,id0,id0_maxBits)
  }

  debugStates2(use1=true) {
    return Object.assign(
      {base:this.base, sbiID:this.sbiID, id0:this.id0, id0_maxBits:this.id0_maxBits},
      use1? this.debugStates(): null
    )
  }

  /**
   * Suposing id0 a BigInt and id0_maxBits standard maxBits parameter.
   */
  lblRefresh(base,id0,id0_maxBits) {
    if (this.id0_maxBits === undefined) this.id0_maxBits = null;
    if (!id0_maxBits) id0_maxBits=this.id0_maxBits;
    if (base || !this.base) {
    	base = base  || '4h'
        base = SizedBigInt.baseLabel(base,true)
        if (base!=this.base) {
          this.base = base
          SizedBigInt.kx_trConfig(this.base) // for exotic bases
        }
    }
    let id0_tmp = new SizedBigInt(id0,this.base,id0_maxBits,true)
    if (id0!==undefined && id0!==null && id0!=this.id0) {
        this.id0 = id0_tmp.val  // a BigInt
        this.id0_maxBits = id0_tmp.bits
        this.sbiID.fromNull()   // remove old value
    }
  }

  /**
   * Set ID by ID.
   * @param {any} id - the cell ID.
UNDER CONSTRUCTION
   */
  setId(id,onErr_cutLSD=false) {
     let IDbits = this.keyBits + (this.id0_maxBits?this.id0_maxBits:0)
     //need to separate key and id0 after SizedBigInt convertion.
     this.sbiID.fromAny(id, this.base, IDbits, onErr_cutLSD)
     return this
  }

  /**
   * Set by key.
   * @param {any} key.
   */
  setKey(key,onErr_cutLSD=true) {
     this.sbiID.fromAny(key, this.base, this.keyBits, onErr_cutLSD)
     return this
  }

  /**
   * Set by bkey.
   * @param {any} bkey.
   */
  setBkey(bkey,onErr_cutLSD=true) {
     this.sbiID.fromAny(bkey,this.base,this.bkeyBits,onErr_cutLSD)
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
   * Set ID by key using this.id0.
   * @param {any} key - any value to be set by setId() method.
UNDEr CONSTRUCTiON
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
  setBkey_byIJ(i,j=null) {
    if (typeof i == 'object') [i,j]=i;
    let max = Number(this.nRefRows)-1
    if (i>max || j>max) return this; // reliable but hidding bugs
    let bkey = this.key_encode(i,j)[0];
    return this.setKey( this.isHalf? bkey/2n: bkey )
  }

  /**
   * Labelling. Assignment of human-readle and hierarchical label for a cell of the grid.
  ... CHECK BUG: not returning correct number of bits  (start-padding zeros)
   * Provides a standard base-encoded (String) representation of the (BigInt) cell identifier (ID).
   * The ID is obtained by setID chaining methods.
   * @param {string} otherbase - none (standard) or other base.
   * @return {string} - the human-readable ID.
   */
  id_toString(otherbase=null) {
     return this.sbiID.toString(otherbase||this.base)
  }

  /**
   * Returns string representation of a key. STUB method.
   * @param {int} otherbase - null or base label (e.g. "16h").
   */
  key_toString(otherbase=null) {
     //return this.sbiID.toString(otherbase||this.base)
     return null; // under construction
  }

}


// // // // // //  Concrete curve implementations as specializations:  // // // // //


/**
 * Morton curve for 32 bits inputs and 64 bits return.
 * Concrete implementation on the GSfc4qLbl interface.
 *
 * 64 bits REFERENCES:
 *  https://mmcloughlin.com/posts/geohash-assembly
 *  https://github.com/yinqiwen/geohash-int/blob/master/geohash.c
 *  https://mmcloughlin.com/posts/geohash-assembly
 *
 * 32 bits and other REFERENCES:
 *  https://github.com/vasturiano/d3-hilbert
 *  http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
 *  http://bl.ocks.org/jaredwinick/5073432
 *  http://stackoverflow.com/questions/4909263
 */
class GSfc4qLbl_Morton extends GSfc4qLbl {

  constructor(level,base,id0,id0_maxBits) {
    super(level,base,id0,id0_maxBits)
    this.curveName='Morton'
    //default this.needSwap = false
    //default this.halfIsOptimized = false // can be true!
  }

  bkey_encode(x, y) { // inputs 32 bits positive integers, returns 64 bits.
    if (typeof x == 'number') {x=BigInt(x); y=BigInt(y)}
    x = GSfc4qLbl_Morton._bkey_interleave(x)
    y = GSfc4qLbl_Morton._bkey_interleave(y)
    return x | (y << 1n)
  }

  bkey_decode(d) {
    if (typeof d !='bigint') d = BigInt(d)
    return [
      Number(GSfc4qLbl_Morton.deinterleave(d)),
      Number(GSfc4qLbl_Morton.deinterleave(d >> 1n))
    ];
  }

  static _bkey_interleave(x) { // x must be a 32 bits positive BigInt
    x = (x | (x << 16n)) & BigInt('0x0000ffff0000ffff')
    x = (x | (x << 8n) ) & BigInt('0x00ff00ff00ff00ff')
    x = (x | (x << 4n) ) & BigInt('0x0f0f0f0f0f0f0f0f')
    x = (x | (x << 2n) ) & BigInt('0x3333333333333333')
    return (x | (x << 1n) ) & BigInt('0x5555555555555555')
  }

  static deinterleave(x) {
    x = x & BigInt('0x5555555555555555');
    x = (x | (x >> 1n) ) & BigInt('0x3333333333333333');
    x = (x | (x >> 2n) ) & BigInt('0x0f0f0f0f0f0f0f0f');
    x = (x | (x >> 4n) ) & BigInt('0x00ff00ff00ff00ff');
    x = (x | (x >> 8n) ) & BigInt('0x0000ffff0000ffff');
    x = (x | (x >> 16n)) & BigInt('0x00000000ffffffff');
    return x;
  }

} // \GSfc4qLbl_Morton


/**
 * Hilbert Curve concrete implementation on the GSfc4qLbl interface. Valid for any BigInt.
 * Bug on BigInt (more than 31 bits).
 */
class GSfc4qLbl_Hilbert extends GSfc4qLbl { // Hilbert Curve.

  constructor(level,base,id0,id0_maxBits) {
    super(level,base,id0,id0_maxBits)
    this.curveName='Hilbert'
    this.needSwap = true // need to implement ij_swapSides(), etc.
    this.halfIsOptimized = false
    if (GSfc4q.conf_alertLevel>1) console.log("warning: Hilbert needSwap not implemented.")
  }

  bkey_decode(bkey) {
    return GSfc4qLbl_Hilbert._bkey_decode(bkey, this.nRefRows)
  }

  bkey_encode(i,j) {
    if (typeof i == 'number') {i=BigInt(i); j=BigInt(j);}
    return GSfc4qLbl_Hilbert._bkey_encode(i, j, this.nRefRows)
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
        GSfc4qLbl_Hilbert._rot(s, ij, rx, ry);
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
        GSfc4qLbl_Hilbert._rot(s, ij, rx, ry);
    }
    return key;
  }

} //  \GSfc4qLbl_Hilbert


///////////////////

/**
 * Sized BigInt's (SizedBigInt) are arbitrary-precision integers with defined number of bits.
 * Each instance is a pair (size,number). Input and output accepts many optional representations.
 *
 * Adapted from original source at [github/SizedBigInt](https://github.com/ppKrauss/SizedBigInt)
 *  and foundations at [this PDF](http://osm.codes/_foundations/art1.pdf).
 */
class SizedBigInt {

  /**  @constructor */
  constructor(val,radix,maxBits=null,onErr_cutLSD=true) {
    SizedBigInt.kx_RefreshDefaults(); // global cache once.
    this.fromAny(val,radix,maxBits,onErr_cutLSD)
  }


  // // //
  // Input methods:

  fromNull() { this.val=null; this.bits=0; return this; }

  setBits_byMax(maxBits,inputLen,onErr_cutLSD=true) {
    // mutate this.bits and return action about cut by MaxBits.
    let cutByMax = false // action
    this.bits = inputLen
    if (maxBits) {
       let forceBits = (maxBits<0)? 0: 1
       maxBits =Math.ceil( Math.abs(maxBits) )  // for example fractionary number of bits on decimal base
       if (forceBits) forceBits=maxBits;
       if (inputLen>maxBits) {
          if (onErr_cutLSD) cutByMax = true;
          else throw new Error(`ERR4. Bit-length ${inputLen} exceeded the limit ${maxBits}`);
          this.bits = maxBits;
       } else if (inputLen<forceBits)
          this.bits = forceBits; // will pad zeros on back toString().
    } else maxBits = 0
    return [cutByMax,maxBits]
  }

  /**
   * Input from any data type (string, array, SizedBigInt object, number, or bigint.
   * @param {any} val -  any valid consistent value.
   * @param {integer} radix - the representation adopted in strval, a label of SizedBigInt.kx_baseLabel.
   * @param {integer} maxBits - positive to enforce length; 0 to preserve input length; negative to express only maximum length.
   * @param onErr_cutLSD {Boolean} - flag to not throw error, only truncates LSD of binary representation.
   * @return - new or redefined SizedBigInt.
   */
  fromAny(val,radix=null,maxBits=null,onErr_cutLSD=true) {
    let t = typeof val
    if (val && t=='object') { // not-null object
       if (val instanceof SizedBigInt)
         [val,radix,maxBits]=[val.val,null,val.bits]; // clone()
       else if (val instanceof Array)
         [val,radix,maxBits]=val;
       else
         ({val,radix,maxBits} = val);
       t = typeof val
    }
    if (t=='string') {
      if (!radix) radix = 4;// 16h as better default
      this.fromString(val, radix, maxBits, onErr_cutLSD)
    } else // bigint, number or null
      this.fromInt(val, maxBits, onErr_cutLSD);
    return this
  }

  /**
   * Input from string of '0's and '1's, and number of bits can be controled.
   * @param {string} strval -  with valid /^[01]+$/ regex.
   * @param {integer} maxBits - positive to enforce length; 0 to preserve input length; negative to express only maximum length.
   * @param onErr_cutLSD {Boolean} - flag to not throw error, only truncates LSD of binary representation.
   * @return - new or redefined SizedBigInt.
   */
  fromBitString(strval, maxBits=null, onErr_cutLSD=true) {
    if (!strval)
        return this.fromNull();
    let cutBits = this.setBits_byMax(maxBits, strval.length, onErr_cutLSD)
    if (cutBits[0]) strval = strval.slice(0,cutBits[1]);
    this.val = BigInt("0b"+strval)
    return this
  }

  /**
   * Input from string.
   * @param {string} strval -  with valid representation for radix.
   * @param {integer} radix - the representation adopted in strval, a label of SizedBigInt.kx_baseLabel.
   * @param {integer} maxBits - positive to enforce length; 0 to preserve input length; negative to express only maximum length.
   * @param onErr_cutLSD {Boolean} - flag to not throw error, only truncates LSD of binary representation.
   * @return - new or redefined SizedBigInt.
   */
  fromString(strval, radix=4, maxBits=null, onErr_cutLSD=true) {
    if (typeof strval!='string') throw new Error("ERR2. Invalid input type, must be String");
    let r = SizedBigInt.baseLabel(radix,false)
    if (!strval) return this.fromNull()
    if (r.base==2)
      return this.fromBitString(strval, maxBits, onErr_cutLSD);
    else if (r.label='16js') // ON TESTING!
      return this.fromHexString(strval, maxBits, onErr_cutLSD) // to optimize.
    let trLabel = r.label+'-to-2'
    if (!SizedBigInt.kx_tr[trLabel]) SizedBigInt.kx_trConfig(r.label);
    let tr = SizedBigInt.kx_tr[trLabel]
    let strbin = ''
    for (let i=0; i<strval.length; i++)
      strbin += tr[ strval.charAt(i) ]
    return this.fromBitString(strbin, maxBits, onErr_cutLSD)
  }

  /**
   * Input from BigInt, SizedBigInt or Number.
   * @param val - input value, any type, BigInt, SizedBigInt or Number.
   * @param {integer} maxBits - positive to enforce length; 0 to preserve input length; negative to express only maximum length.
   * @param onErr_cutLSD {Boolean} - flag to not throw error, only truncates LSD of binary representation.
   * @return - new or redefined SizedBigInt.
   */
  fromInt(val, maxBits=0, onErr_cutLSD=true) {
    let t = typeof val
    let isNum = (t=='number')
    let isSBI = (t=='object')
    if (t == 'bigint' || isNum) {
      if (isNum) this.val = BigInt( val>>>0 ); // unsigned  int
      else this.val = isSBI? val.val: val; // supposed positive
      let len = isSBI? val.bits: this.val.toString(2).length  // no optimization as https://stackoverflow.com/q/54758130/287948
      let cutBits = this.setBits_byMax(maxBits, len, onErr_cutLSD)
      if (cutBits[0]) this.val = this.val >> BigInt(len-this.bits); // need to test!
      return this
    } else // null, undefined, string, etc.
      return this.fromNull()
  }


  fromHexString(strval, maxBits=0, onErr_cutLSD=true) {
    // developing for check performance optimizations, valid only for standard Hexadecimals
    if (!strval) return this.fromNull()
    let len = strval.length*4
    let val = BigInt("0x"+strval) // works with asUintN(maxBits)?
    return this.fromInt({val:val,bits:len}, maxBits, onErr_cutLSD)
  }


  // // //
  // Getters and output methods:

  /**
   * Standard default getter for this class.
   */
  get value() { return [this.bits,this.val] }

  /**
   * Converts internal representation (of the SizedBigInt) into a string of ASCII 0s and 1s.
   *
   * Note: Javascript not offers a real array of bits, only array of bytes by Uint8Array().
   * @return {string} the "bit-string ASCII" representation.
   */
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
         ref:"NatCodes"
       }
       ,"4h": {
         base:4,
         isHierar:true, // use hDigit and leading zeros.
         alphabet:"0123GQ", case:"upper", // 2*4-2=6 characters
         regex:'^([0123]*)([GQ])?$',
         ref:"NatCodes"
         }
       ,"8h": {
         base:8,
         isHierar:true, // letters are non-hierarchical
         alphabet:"01234567GHMQRV",  // 2*8-2=14 characters
         regex:'^([0-7]*)([GHMQRV])?$',
         ref:"NatCodes"
       }
       ,"16h": {
         base:16,
         isHierar:true,  // upper case are the non-hierarchical
         alphabet:"0123456789abcdefGHJKMNPQRSTVZY", // 2*16-2=30 characters
         regex:'^([0-9a-f]*)([GHJKMNPQRSTVZY])?$',
         ref:"NatCodes"
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
 } // \kx_RefreshDefaults

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
    // is valid for r.isHierar, to reproduce standard number
    for (let i=0; i<r.base; i++) { // scans alphabet
        let c = r.alphabet.charAt(i)
        SizedBigInt.kx_tr[label][c] = i.toString(2).padStart(r.bitsPerDigit,'0')
    }
    if (r.isHierar) {
      var ordList = (r.base==4)? ['0','1']
            : (r.base==8)? ['0','00','01','1','10','11']
            : ['0','00','000','001','01','010','011', '1','10','100','101','11','110','111'];
      for (var i=0; i<ordList.length; i++) {
        let c = r.alphabet.charAt(r.base+i)
        SizedBigInt.kx_tr[label][c] = ordList[i]
      }
      /* old baseH sequence:
        let alphaPos = r.base;
        for(var bits=1; bits<r.bitsPerDigit; bits++)
          for (let i=0; i<2**bits; i++) {
            let c = r.alphabet.charAt(alphaPos)
            SizedBigInt.kx_tr[label][c] = i.toString(2).padStart(bits,'0')
            alphaPos++
          } // \for i, \for bits
      */
    } // \isHierar
    SizedBigInt.kx_tr['2-to-'+r.label] = SizedBigInt.objSwap(SizedBigInt.kx_tr[label]);
  } // \kx_trConfig

  // // //
  // BigInt auxiliar utilities: (can drop from here!)

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
   * Division N/D with rest.
   * @param {BigInt} N - positive numerator.
   * @param {BigInt} D - positive non-zero denominator.
   * @return {Array} - BigInt values [integerPart,rest]
   */
  static bigint_divrest(N,D) {
    let I = N/D  // ideal a function that returns R and Q.
    let R = N-I*D // compare with performance of R=N%D
    return [I,R]  // quocient and rest.
  }

  /**
   * Division N/D. Returns integer part and "normalized fractional part",
   *  normailized by a power of 2; that is,
   *  result = integerPart + 1/fractionalPart = iP + 1/(nfP*2^P)
   * @param {BigInt} N - positive numerator.
   * @param {BigInt} D - positive non-zero denominator.
   * @param {BigInt} P - default 64, power to be used in 2**P, with P>0 and 2**P/D>=1.
   * @return {Array} - BigInt values [integerPart,normalizedFractionalPart] = [iP,nFP] where fraction=1/(nFP*2^P).
   */
  static bigint_div(N,D,P=64n) {
    let I = N/D  // ideal a function that returns R and Q.
    let R = N-I*D // compare with performance of R=N%D
    let F = ((2n**P)/D)*R  // = ((BigInt(2)**P)*R)/D
    return [I,F]
  }

} // \SizedBigInt


// // // // // //
// for Node:
if (typeof window === 'undefined') { // suppose it is not a browser
  module.exports = { GSfc4qLbl_Morton, GSfc4qLbl_Hilbert, SizedBigInt, GSfc4q }
} // see also https://gist.github.com/rhysburnie/498bfd98f24b7daf5fd5930c7f3c1b7b


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
