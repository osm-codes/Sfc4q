/**
 * GSfc4q module.
 * Source-code:  https://github.com/ppkrauss
 * License: Apache2, http://www.apache.org/licenses/LICENSE-2.0
 */

const conf_alertLevel=1;  // for  debug

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
 * bkey2: the second bkey, used only when isHalf, in 
 *   the "union of cells for building abstract structure from blind structure". See key_encode().
 *
 * (i,j) coordinates, or "matrix index" or "leaf-cell coordinates": see grid of the "blind structure".
 *   “i” and “j” are integers in the range [0,2^blevel-1].
 *
 */
class GSfc4q {

  /** 
   * @constructor
   * @param {float} level - hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   * @param {string} base - the abbreviation of name of standard base (2, 4js, 4h, 16h, 32ghs, etc.)
   */
  constructor(level,base) {
    this.refresh(level,base)
    // spececialized properties, to be overridden:
    this.needSwap = false  // about cell rotation (swapping i and j), default value, need overhide
    this.halfIsOptimized = false  // for adaptated Morton and others, default value, need overhide
  }

  /** 
   * Refresh inicializations, mutating all propertis if necessary. Used by constructor.
   * @param {float} level - null (no mutation) or hierarchical level of aperture-4 hierarchical grid. Valid integer and "half levels".
   * @param {string} base - null (no mutation) or the abbreviation of name of standard base (2, 4js, 4h, 16h, 32ghs, etc.)
   */
  refresh(level,base) { 
    this.level  = level || this.level || 1
    this.base   = base  || this.base  || '4h'

    // PROPRIETIES:
    this.blevel = Math.round(this.level)       // use this level for internal calculus
    this.isHalf = (this.blevel != this.level)  // or !(this.level % 0.5)
    this.level  =  this.blevel - (this.isHalf? 0.5: 0) // redo for exact "0.5 or 0"

    this.nKeys  =  this.nBKeys   = 4n**BigInt(this.blevel)       // number of cells in the grid
    this.keyBits = this.bkeyBits = (this.nKeys - 1n).toString(2).length
    if (this.isHalf) {
      this.nKeys = this.nBKeys/2n  // number of cells in the "blind grid"
      this.keyBits--
    }
    this.nRefRows = 2n**BigInt(this.blevel) // sqrt(nBKeys), reference for number of B-Rows (or cells per column in an uniform reference grid).
  }


  /**
   * Translates ID to (i,j) coordinates.
   * @param {integer} key - distance from origin in the curve.
   * @return {array} - the coordinates IJ in [IJ0,IJ1] with IJ1=null when not isHalf.
   */
  key_decode(key) {
      if (typeof key != 'bigint') key = BigInt(key)
      if (this.isHalf) {
	let bkey = 2n*key
        let key0 = this.bkey_decode(bkey)
	return [ key0, this.bkey_decode(bkey+1n) ]
      } else
        return [ this.bkey_decode(key), null ]
  }


  /**
   * Translates to bkey the (i,j) coordinates of blevel in the "blind grid".
   * Remember that blevel=level, changing only when isHalf (level+0.5).
   * When isHalf the second bkey is at this.bkey2.
   * @param {integer} i - the row coordinate.
   * @param {integer} j - the column coordinate.
   * @return {integer} - mutate bkey1 and bkey2
   */
  key_encode(i,j) {
    if (this.isHalf) {
      let bkey  = this.bkey_encode(i,j); // bkey at blevel
      let key   = bkey>>1; // key at level
      this.bkey = key<<1;  // normalized bkey1
      this.bkey2 = this.bkey0+1; // normalized bkey2.
      return this.bkey
    } else
      return this.bkey_encode(i,j);
  }

  /**
   * Concrete method. Same as key_decode() method, but for integer levels only.
   * @param {integer} bkey - distance from origin in the curve.
   * @return {array} - the IJ coordinates of the key.
   */
  key_toString(key,otherbase=null) {
     let b = otherbase || this.base || '4h'
     return key.
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

} // \class



// // // // // //  Concrete curve implementations as specializations:  // // // // //  


/**
 * Morton curve for 32 bits, waiting better for 64bits. 
 *   See e.g. https://discourse.julialang.org/t/interleaving-bits-z-order-curve-morton-code-transpose-binary-matrix/18458/5
 * REFERENCES:
 *  https://github.com/vasturiano/d3-hilbert
 *  http://graphics.stanford.edu/~seander/bithacks.html#InterleaveBMN
 *  http://bl.ocks.org/jaredwinick/5073432
 *  http://stackoverflow.com/questions/4909263/how-to-efficiently-de-interleave-bits-inverse-morton
 */
class GSfc4q_Morton extends GSfc4q {

  constructor(level,base) {
    super(level,base)
    //default this.needSwap = false
    //default this.halfIsOptimized = false // can be true!
  }

  bkey_encode(x, y) { // for 32 bits positive integers
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
      GSfc4q_Morton.deinterleave(d),
      GSfc4q_Morton.deinterleave(d >> 1n)
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
class GSfc4q_Hilbert extends GSfc4q { // Hilbert Curve.

  constructor(level,base) {
    super(level,base)
    this.needSwap = true // need to implement ij_swapSides(), etc.
    this.halfIsOptimized = false
    if (conf_alertLevel>1) console.log("warning: Hilbert needSwap not implemented.")
  }

  bkey_decode(bkey) {
    return GSfc4q_Hilbert._bkey_decode(bkey, this.nRefRows)
  }

  bkey_encode(i,j) {
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
  static _bkey_decode(key, nRefRows) {
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
    return ij;
  }
  static _bkey_encode(i, j, nRefRows) {
    let rx, ry, key = 0n,
        ij = [i, j];
    for (let s = nRefRows / 2n; s >= 1n; s /= 2n) {
        rx = (ij[0] & s) > 0n;
        ry = (ij[1] & s) > 0n;
        key += s*s * ((3n * rx) ^ ry);
        GSfc4q_Hilbert._rot(s, ij, rx, ry);
    }
    return key;
  }

} //  \GSfc4q_Hilbert


