/**
 * Grid module of the GSfc4q project.
 * Source-code:  https://github.com/ppkrauss/Sfc4q
 * License: Apache2, http://www.apache.org/licenses/LICENSE-2.0
 */


/**
 * Grid of a [Space-Filling Curve](https://en.wikipedia.org/wiki/Space-filling_curve) (SFC) of recursive
 * 4-partitions of quadrilaterals. This class implements geometry and operations to handle grids.
 * It is used as complement of the Sfc4q class.
 *
 * Concepts:
 *
 * **grid** of the **unit square** (canvas box): the mathematical entity used as total area filled by the SFC, is the unit square. It can be transformed into any other quadrilateral, it is a reference **canvas geometry**. Partitions over unit square produces the grid of *blevel*. The SFC forms a path conecting centers of the cells of the grid, and SFC distance is used as index to identify the cells of the grid. The set of all *blevel* grids can be named "hierarchical grid", but sometimes we abbreviate to "grid". Grids of *isHalf* levels are named "degenerated grids". The unit square with no partition is the primordial cell, a grid of level zero.
 *
 * **box width** and **box height**: the  unit square is projected to a real "box", used as canvas of the grid.
 *
 * **sfc4**: any SFC object used as reference for *level*, *blevel*, *key*, *bkey*, *id0*, *id* and its labels and operations, mainly decode/encode to IJ coordinates. Typical objects are instances of the *GSfc4qLbl* class extensions to concrete curves, like *GSfc4qLbl_Morton* or *GSfc4qLbl_Hilbert* classes.
 *
 * **(i,j)** coordinates, or "integer [XY grid](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Positions#The_grid)": see grid of the "blind structure". ![](../assets/svg_coordinates.png)
 *   <br/>“i” and “j” are integers in the range [0,2^blevel-1]. IJ=(0,0) in the top-left corner.
 *   <br/>“i” scan columns from left to right, “j” scan lines from top to bottom.
 *
 * Concepts implemented by the Sfc4q class: *level*, *blevel*, *key*, *bkey*, *IJ* coordinates, (i,j).
 *
 */
class GridOfCurve {

  constructor(sfc4, box_width, box_height=null) {
    if (sfc4!==undefined)
      this.refresh(sfc4,box_width,box_height)
    else console.log("ERROR: GridOfCurve(null) is perhaps invalid")
  }

  refresh(sfc4, box_width, box_height=null) {
    // CONFIGS:
    if (sfc4)       this.sfc4 = sfc4; // else reuse or error
    this.box_width  = box_width || this.box_width || null; // null for GridOfCurve_D3.buildSvg()
    this.box_height = box_height || this.box_height || this.box_width;
    this.refreshProperties()
  }

  refreshProperties(novoLevel=null, lblBase=null) {
    if (this.sfc4!==null && this.box_width) {
      if (novoLevel) this.sfc4.refresh(novoLevel);
      if (!this.box_height) this.box_height =this.box_width;
      this.needSwap = this.sfc4.needSwap && (this.box_width != this.box_height)
      this.cell_refWidth  = this.box_width/Number(this.sfc4.nRefRows)
      this.cell_refHeight = this.box_height/Number(this.sfc4.nRefRows)
      this.cell_area   = this.box_width*this.box_height/Number(this.sfc4.nBKeys) // MUST be constant!
      // Cache of calculations (lblChk) of the best choice for labels:
      this.lblBase = lblBase || this.lblBase || 'std'
      const lblIsDec = (this.lblBase=='dec' || this.lblBase==10)
      const lblIs32  = (this.lblBase==32 && !(this.sfc4.level%2.5))
      const lblIs16  = (this.lblBase==16 || (this.lblBase!=4  && this.sfc4.level>2))
      this.lblChk = [
        lblIsDec,lblIs32,lblIs16,  // using check-order
        lblIsDec? "decimal": lblIs32? "base 32": lblIs16? "base 16h": "base 4h",
        lblIsDec? 10: lblIs32? 32: lblIs16? 16: 4
      ]; //  0-2=flags, 3=name, 4=number
      // properties of the unit grid, used in (s,t) coordinates:
      // use SizedBigInt.bigint_div():
      //  this.cell_stWidth = 1n/this.sfc4.nRefRows // and height==width
      //  this.cell_stArea  = 1n/this.sfc4.nBKeys
    }
  }

  /**
   * Translates (i,j) coordinates to (x,y) coordinates, using grid properties.
   * @param integer i: the grid row coordinate.
   * @param integer j: the grid column coordinate.
   * @return [float,float].
   */
  ij_to_xy(i,j,shift=0) { // if rotates, must be checked
    if (shift) [i,j] = [i+shift, j+shift]; // cast to float
    if (this.needSwap) {
      let [x,y] = this.sfc4.ij_swapSides(i,j,this.cell_refWidth,this.cell_refHeight)
      return [i*x, j*y]
    } else
      return [i*this.cell_refWidth, j*this.cell_refHeight]
  }

  ij_to_xyCenter(i,j) {
    return this.ij_to_xy(i,j,0.5)
  }

  /**
   * Translates (x,y) coordinates to (i,j) coordinates, using grid properties.
   * @param float x: the spatial X coordinate.
   * @param float y: the spatial Y coordinate.
   * @return [integer,integer].
   */
  xy_to_ij(x,y) {
    let ref_i = Math.floor(x/this.cell_refWidth),
        ref_j = Math.floor(y/this.cell_refHeight)
    if (this.needSwap) { // use bKey instead key.
      console.log("BUG: needSwap need to develop xy_to_ij()")
      // for Hilbert the number of xSwaps and ySwaps is a constant.
    } else
      return [ref_i,ref_j];
  }

} // \GridOfCurve


/**
 * D3 grid, a GridOfCurve class extension.  D3 is the [D3js.org](https://D3js.org) framework, used to build the grid and its tools.
 */
class GridOfCurve_D3 extends GridOfCurve {

  constructor(conf, sfc4, layout, box_width, box_height=null, grdID=1, reftab='chartsContainer') {
    const toBuildHere=true, toBuildZoomTool=true, toBuildToolTip=true;  // future configs
    if (typeof conf == 'object') {
      super(conf.sfc4, conf.box_width, conf.box_height)
      this.refresh_D3(conf.domRef_id, conf.grdID, conf.reftab, conf.layout)
    } else if (conf!==undefined) {
      super(sfc4, box_width, box_height)
      this.refresh_D3(conf, grdID, reftab, layout)
    }
    this.distinctColors = {}
    this.fracTime = null
    this.D3canvas = null
    this.MIN_RECT_SIZE = 15
    if (toBuildHere) this.build(true) // first
    if (toBuildToolTip) this.tooltip_build()
    if (toBuildZoomTool) this.build_zoomTool()
  }

  refresh_D3(domRef_id, grdID, reftab, layout, colwidth=40) {
    this.domRef_id = domRef_id || null
    this.grdID     = grdID     || null
    this.reftabDOM = document.getElementById(reftab);
    if (!this.reftabDOM) console.log("ops, need CORRECT 'reftab' for canvas sizes")
    if (!this.box_width) {
      let refWidth = this.reftabDOM? parseInt( this.reftabDOM.getBoundingClientRect().width/2.0 ): 999999;
      this.box_width = Math.min(window.innerWidth, refWidth) - colwidth;  // redefined: need propagate
      this.refreshProperties()  // yet triggered by super()
    }
    this.layout = {rects:true, circles:true, labelMain:true, labelIJ:true, drawCurve: true};
    if (typeof layout == 'object')  this.layout = layout || this.layout;
    // check need for call buildSvg() here
  }

  refresh_D3_state(){ // for buildSvg()
    this.num_nBKeys = Number(this.sfc4.nBKeys)
    if (this.sfc4.isHalf) this.num_nBKeys = this.num_nBKeys/2;
    this.nBKeysFrac = Math.round(this.num_nBKeys/150)
    this.fracTime = ((this.num_nBKeys>1000)? 9000: (this.num_nBKeys>200)? 3800: 2800)/this.num_nBKeys;
    // Flag layout corrections:
    let rw = this.cell_refWidth
    this.layout.rects     = this.layout.rects     && rw>this.MIN_RECT_SIZE
    this.layout.drawCurve = this.layout.drawCurve && rw>10
    this.layout.labelMain = this.layout.labelMain && rw>20
    this.layout.labelIJ   = this.layout.labelIJ   && rw>35
    this.layout.labelGeo  = true;
  }

  buildSvg(firstBuild=true) {
    if (firstBuild || !this.D3_svg) {
        if (this.D3_svg)
          this.D3_svg.selectAll("*").remove(); // oops, please test
        if (this.box_width< conf_canvasWidth_min) {
            let perc = Math.round( 100*(conf_canvasWidth_min-this.box_width)/conf_canvasWidth_min )
            let msg = `This visualization not works with small screens.\nPlease use a screen ${perc}% bigger.`
            if (conf_alertLevel>1) alert(msg); else console.log(msg);
        }
        let theChart = '#'+ this.domRef_id +' svg.theChart';
        this.D3_svg0 = d3.select(theChart).attr("width", this.box_width+10).attr("height", this.box_width+10)
        this.D3canvas = this.D3_svg0
        this.D3_svg = this.D3_svg0.append("g"); // set reference D3 for all builds
        this.D3_svg.attr("class", "the_grid" + (this.grdID? ` grdID${this.grdID}`: '') );
    } else
      this.D3_svg.selectAll("*").remove(); // remove elements from svg/g, preserve SVG attributes and catchall
    this.refresh_D3_state()
  } // \buildSvg

  bitsToColors(bs,len) { // enhancing prefixes
    if (typeof bs != 'string') return null; // ensure
    if (bs.length<len) bs = bs.padStart(len,'0')
    let d;
    if (len%2) { bs+='0'; len++; } // more one bit if not even
    if (len<6) {
      let R = '1'+bs.slice(0,1) + bs.slice(0,2).padEnd(2,'1')
      let G = '1'+bs.slice(3,4) + bs.slice(3,5).padEnd(2,'1')
      let B = (len>2? bs.slice(-2): '11')
      d=[ R, G, '1'+B+B.slice(0,1) ]      // binary RGB color
    } else if (len==12 || len==24)
      return '#'+parseInt(bs,2).toString(16).padStart(len/4,'0')
    else { // incluir fator = 1 ou 2 conforme menor ou maior que 24.
      let R = bs.slice(0,4)
      let G = bs.slice(1,2)+bs.slice(3,len<13?5:6).padEnd(3,'1')
      let B = bs.slice(-4) // (bs.slice(0,1)=='0')? ('1'+bs.slice(-3)): bs.slice(-4)
      d=[R, G, B ]        // binary RGB color
    }
    let dHex = d.map(x => parseInt(x,2).toString(16) ).join('')
    return '#'+dHex;
  }

  dataBuild(stopOn=0,xpos=1,ypos=1,useDstClrs=true) {
    if (!stopOn) this.distinctColors = {}
    if (stopOn===true) stopOn = Math.round(this.num_nBKeys/3) // 2*Math.sqrt(this.num_nBKeys)
    const maxIdLoop = (stopOn && this.num_nBKeys>4)? stopOn: this.num_nBKeys;
    const ck  = this.lblChk
    const rw0 = this.cell_refWidth
    const rh0 = this.cell_refHeight
    const l32type = this.layout.labelGeo? '32ghs': '32nvu';
    const mySfc = this.sfc4
    var r = [].fill(null,0,this.num_nBKeys-1)  // será revisto e oTheFly!
    for(let id=0; id<maxIdLoop; id++) {
      let [ij0,ij1] = this.sfc4.key_decode(id)
      let xy = this.ij_to_xy( ij0[0], ij0[1] )  //xy0
      let rw = rw0, rh = rh0;
      let idx = mySfc.setKey(id);
      let colorCode = this.bitsToColors( idx.id_toString('2'), idx.keyBits ) // toBitString
      let id4 = idx.id_toString('4h'),     id16   = idx.id_toString('16h'),
          id32 = idx.id_toString(l32type)
      if (this.sfc4.isHalf) {
         let xy1 = this.ij_to_xy( ij1[0], ij1[1] )
         if (Math.abs(xy[0]-xy1[0]) > 0) rw = rw*2;  // revisar
         if (Math.abs(xy[1]-xy1[1]) > 0) rh = rh*2;
         xy[0] = Math.min(xy[0],xy1[0]);
         xy[1] = Math.min(xy[1],xy1[1]);
      }
      let idPub = ck[0]? id: ck[1]? id32: ck[2]? id16: id4;
      if (!stopOn && useDstClrs && (this.num_nBKeys<150 || (id%this.nBKeysFrac)==1) )
        this.distinctColors[colorCode] = idPub;
      r[id] = { id:id, idPub:idPub, id16:id16, i:ij0[0], j:ij0[1], x:xy[0], y:xy[1], width:rw, height:rh, color:colorCode };
    }
    return r;
  }

  animeFracTime(i) {
    return i*this.fracTime + (i?4:0)*this.fracTime/Math.log2(2+i)
  }

  build(firstBuild=true, line_width=2) { //  draw grid!
    if (conf_alertLevel>1) console.log("debug build:",this.sfc4.curveName);
    this.buildSvg(firstBuild)
    const myThis = this
    let rw = this.cell_refWidth
    const ck4 = this.lblChk[4]
    var mySfc = this.sfc4
    let bits = (mySfc.nBKeys-1n).toString(2).length
    var sbi = new SizedBigInt();
    let D3DataEnter = this.D3_svg.selectAll()
      .data( this.dataBuild() )
      .enter();

    if (this.layout.rects) // // // Red rectangular grid:
      D3DataEnter.append("rect")
      .attr("x", d => d.x ).attr("y", d => d.y )
      .attr("class",d=>`x${d.id16}`)
      .attr("width",d => d.width).attr("height",d => {return d.height})
      .style("fill","#FFF").style("stroke","#F00");

    if (this.layout.drawCurve) { // // // Curve path:
      const dashDelay = this.animeFracTime(this.num_nBKeys)*1.8
      let curvePath = d3.line()
          .x(d=>d.x + d.width/2)
          .y( d=>d.y + d.height/2);
      this.D3_svg.append("path")
        .attr('class',"curve")
        .attr("d", curvePath( myThis.dataBuild() ))  // ? no data cache
        .transition()
          .duration(0)
          .delay(  dashDelay  )
          .attr('class',"curve curve_dash")
    } // if
    if (this.layout.circles)  // // // Colured centroid and point-grid circles:
      D3DataEnter.append("circle")
      .attr('cx', d => d.x + d.width/2)
      .attr('cy', d => d.y + d.height/2)
      .attr("r", rw/3)  // (rw<20)? 5:10
      .style("fill", d=> d.color )
      .call( (s,lev) => {if (lev<4) s.style("stroke", "#F00")}, mySfc.level)
      // animation:
      .style("opacity", 0).transition()
        .duration(0)
        .delay(  (_, i) => myThis.animeFracTime(i)  )
        .style("opacity", 1)
    ;
    if (this.layout.labelMain) { // cell ID label text
      let partialData = this.dataBuild(true);
      if (this.sfc4.nBKeys>4n) D3DataEnter.append("text")  // White text
          .attr("x", d => d.x+d.width/2.15 -0.5 )
          .attr("y", d => d.y+d.height/1.7 +0.9)
          .text( d => d.idPub )
          .style("font-size", (rw<40)? (ck4==4? "8.8pt": "11.6pt"):"11.8pt")
          .attr("fill","#FFF").style("style","label").style("font-weight","bold");

      D3DataEnter.append("text")  // Black text
        .attr("x", d => d.x+d.width/2.1 )
        .attr("y", d => d.y+d.height/1.7 +1.3 )
        .text( d => d.idPub )
        .style("font-size", (rw<40)? (ck4==4? "8.2pt": "10.5pt"):"12.2pt").style("style","label")
    } // \if labelMain

    if (this.layout.labelIJ) // (i,j) label text
      D3DataEnter.append("text")
      .attr("x", d => d.x+0.8 + (mySfc.isHalf? 0.8: 0))
      .attr("y", d => d.y+10 )
      .text( d => `${d.i},${d.j}` )
      .style("font-size", "8pt").attr("fill","#A44").style("style","label");

  } // \build

  buildCaption(svgSelect='#rainbow svg')  {
    const myC = this.distinctColors,
          wd = 10,
          wdExtra = wd+30,
          yShift = 15
    var colors = Object.keys(this.distinctColors)
    var myC_len = colors.length
    var myC_lenFrac = Math.round(myC_len/12)
    var h = this.box_width/(myC_len+1)
    colors.sort()
    let rb = d3.select(svgSelect)
    rb.selectAll("*").remove();
    rb.attr("width", wdExtra)
      .attr("height", this.box_width+20)
    ;
    rb.selectAll().data( colors ).enter().append("rect")
      .attr("x", 0 )
      .attr("y", (d,i) => i*h + yShift)
      .attr("width",wd).attr("height",h)
      .style("fill",d=>d)
    ;
    rb.selectAll().data( colors ).enter().append("text")
      .attr("x", wd )
      .attr("y", (d,i) => h+i*h+yShift )
      .text( (d,i) => (myC_len<9 || (i%myC_lenFrac)==0)? myC[d]: '' )
      .attr("class","gridCaption")
    ;
  }

  tooltip_msg(ij) {
    const lck = this.lblChk
    if (lck===null) return '';
    let id = this.sfc4.sbiID.val // number
    let id4  = this.sfc4.id_toString('4h')
    let id16 = this.sfc4.id_toString('16h')
    const l32type = this.layout.labelGeo? '32ghs': '32nvu';
    let id32 = this.sfc4.id_toString(l32type)
    let idPub     = lck[0]? id: lck[1]? id32: lck[2]? id16: id4;
    let hex = (!lck[0] && !lck[1] && lck[2])?
              '':    `base 16h: ${adTag(id16)}`;
    let dec = lck[0]?  '':  `decimal: ${adTag(id)}${hex? '<br/>':''}`;
    let b4  = (idPub!=id4)? `<br/>base4h: ${adTag(id4)}`: '';
    let ijc = this.sfc4.isHalf? "i',j'": "i,j";
    return [id16, `${lck[3]}: ${adTag(idPub)}<hr/> ${dec}${hex}${b4}<br/>(<i>${ijc}</i>)=(${ij[0]},${ij[1]})`];
  }

  tooltip_build() {
  	const domRef = d3.select('#'+ this.domRef_id);
  	const tpNode = domRef.select('div.theChartTooltip');
  	const mySVG   = this.D3_svg;
  	const myThis  = this;
    const drawRect = (this.layout.rects && this.cell_refWidth > this.MIN_RECT_SIZE)
    const mySfc = this.sfc4  //const
    var lastCellPos = [null,null];
  	this.D3canvas  // BUG on catchall!
    	.on('mouseover', function() {
      	tpNode.style("display", "inline");
    	})
    	.on('mouseout', function() {
        tpNode.style("display", "none");
        if (lastCellPos[2]!==null)
          myThis.D3_svg0.select(`rect.x${lastCellPos[2]}`).style("fill","#FFF")
      	lastCellPos = [null,null,null];
  	})
    .on('mousemove', function () {
      // falta pintar um retangulo
      var coords = d3.mouse(mySVG.node());
      var grd_IJ = myThis.xy_to_ij(coords[0], coords[1]);
      if (lastCellPos[0]!=grd_IJ[0] || lastCellPos[1]!=grd_IJ[1]) { // only to reduce CPU costs
        mySfc.setBkey_byIJ(grd_IJ)
        let msg = myThis.tooltip_msg(grd_IJ)
        tpNode.html(msg[1])
        if (drawRect) {
          grd_IJ.push(msg[0])
          if (lastCellPos[2]!==null)
            myThis.D3_svg0.select(`rect.x${lastCellPos[2]}`).style("fill","#FFF")
          myThis.D3_svg0.select(`rect.x${msg[0]}`).style("fill","#F33")
        }
        lastCellPos = grd_IJ
      }
      tpNode.style('left', d3.event.pageX+'px')
            .style('top', d3.event.pageY+'px');
    })
    .append("rect")  // the "catch all mouse event" area
      .attr("x",0).attr("y",0)
      .attr("class", "catchall") // see https://stackoverflow.com/a/16923563/287948 and  http://jsfiddle.net/H3W3k/
      .attr("width",myThis.box_width).attr("height",myThis.box_width)
      .style('visibility', 'hidden')
    ; // \D3canvas

  } // \Tooltip

  build_zoomTool() {
    // Canvas zoom/pan
    let bxw = this.box_width+10;
    let canvas = this.D3canvas
    this.D3_svg0.call(d3.zoom()
        .translateExtent([ [0,0], [bxw,bxw] ])
        .scaleExtent([1, Infinity])
        .on("zoom", function() {
          if (xzoomNode.value==1)
            canvas.attr("transform", d3.event.transform);
        })
    );
} // build_zoomTool


} // \GridOfCurve_D3


////////////// non-exported components of this module.

function adTag(s,tag="code") { return `<${tag}>${s}</${tag}>`; }
