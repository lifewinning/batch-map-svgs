const asyncForEach = async (array,callback) => {
	for (let index = 0; index < array.length; index++) {
	await callback(array[index], index, array)
	}
}
document.querySelector("#geo").addEventListener("change", function() {

  var reader = new FileReader();
  reader.onload = onReaderLoad;
  reader.readAsText(event.target.files[0])
  //to do here: append inputs to form for h/w dimensions, selecting a key for generating map IDs, and option to select specific site or do all sites (because "thisID" should not be hardcoded)

  function onReaderLoad(event){
  
  let form = document.querySelector('form')
  form.remove();

  let obj = JSON.parse(event.target.result)
  p = params(obj.features, obj.features[0])
}
});

function params(obj, e){
	e.width = window.innerWidth;
	e.height = window.innerHeight;
	e.centroid = turf.centroid(e.geometry)
	//console.log(centroid)
	e.projection = d3.geoMercator()
		.translate([e.width/2, e.height/2])
		.center(e.centroid.geometry.coordinates)
		.fitExtent([[e.width*.05,e.height*.05],[e.width-(e.width*.05),e.height-(e.height*.05)]],e)

	e.projscale = e.projection.scale()
	//this is a bad idea, fix it later
	e.thisID = e.properties.city.replace(' ', '').replace(',','').replace(' ','')
	e.path = d3.geoPath().projection(e.projection)

	//not ideal method but gets the job done–gets zoom level of default view and returns the corresponding scale
	e.getZoom = function(){
		let tile = d3.tile()
		.size([e.width, e.height])
		.scale(e.projscale*(2* Math.PI))
		.translate(e.projection([0, 0]))

		return 1 << (8+tile()[0].z)
	}
	
	zoom = d3.zoom()
    	.scaleExtent([1 << 8, 1 << 21])
		.on("zoom", zoomies)
		.on("end",drawTiles)
	
	e.svg = d3.select("#maps").append('svg').attr('class','map').attr('height',e.height).attr('width',e.width).attr('id', e.thisID)
		.call(zoom)
		.call(zoom.transform, d3.zoomIdentity
		//.translate(e.width/2,e.height/2) //if I do this the zoom starts centered but then does this translate again when zoom is fired?
  		.scale(e.getZoom())
  		)
	tiles = e.svg.append('g').attr('id','tiles')
	
	outline(obj, e)

	function drawTiles(){
		let tiles = d3.tile()
			.size([e.width,e.height])
			.scale(d3.event.transform.k)
			.translate(e.projection([0,0])) 
			//.translate([d3.event.transform.x,d3.event.transform.y]);
		
		console.log(tiles())
		//d3.selectAll('.tile').remove()

		currentTiles = Array.from(document.querySelectorAll('.tile')).map(t => t.id.replace('tile-',''))

		getTiles = []

		checkTiles = []


		tiles().forEach(function(t){
			xyz = `${t.x}-${t.y}-${t.z}`
			checkTiles.push(xyz)
			haveTile = currentTiles.includes(`${t.x}-${t.y}-${t.z}`)
			if (haveTile){
				console.log(`have ${t.x}-${t.y}-${t.z}`)
			} else {
				getTiles.push(t)
			}
		})
		console.log(checkTiles)

		currentTiles.forEach(function(c){
			needTile=checkTiles.includes(c)
			if (!needTile){
				d3.select(`#tile-${c}`).remove()
			}
		})

		let t = Promise.all(getTiles.map(async d => {
		d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.json?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
		return d;}))

	 t.then(function(ti){
	 	ti.forEach(function(tile){
	 		arr = zenArray(tile)
	 		d3.select('#tiles').append('g')
	 		.attr("id",`tile-${tile.x}-${tile.y}-${tile.z}`).attr("class","tile")
	 		.selectAll('path')
	 		.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
			.enter().append("path")
	      	.attr("d", e.path)
	      	.attr("class", function(d) { var kind = d.properties.kind || ''; if(d.properties.boundary){kind += '_boundary';} return d.layer_name + '-layer ' + kind; })
	      	.exit();
			})
	 	})

	}

	function zoomies(){

		e.projection
	      .scale(d3.event.transform.k / (2*Math.PI))
	      .translate([d3.event.transform.x, d3.event.transform.y]);

		d3.select(`#site`)
			.attr("transform",`translate(${d3.event.transform.x}, ${d3.event.transform.y}) scale(${d3.event.transform.k/(e.getZoom())})`)
			.style("stroke-width", 1 / (d3.event.transform.k/e.getZoom()))

		d3.selectAll('.tile').attr("transform",`translate(${d3.event.transform.x}, ${d3.event.transform.y})`)
	} 
	return e;
}


function zenArray(t){
	 	features = [];
		var layers = ['water', 'landuse', 'roads', 'buildings'];
		layers.forEach(function(layer){
				if(t.data[layer]){
					for(let i in t.data[layer].features){
						// Don't include any label placement points
		                // if(d.data[layer].features[i].properties.label_placement) { continue }

		                // // Don't show large buildings at z13 or below.
		                // if(zoom <= 13 && layer == 'buildings') { continue }

		                // // Don't show small buildings at z14 or below.
		                // if(zoom <= 14 && layer == 'buildings' && data[layer].features[i].properties.area < 2000) { continue }
		                //console.log(d.data[layer])
		                t.data[layer].features[i].layer_name = layer;
		                features.push(t.data[layer].features[i]);
		                //console.log(obj[layer][i].properties.kind)
		                //console.log(features.length)
					} 
					}
				})
		 return features;	
		
}

function outline(obj,e){
	d3.select(`#${e.thisID}`).append("g").attr("class","site").attr("id","site")
	//.attr("transform",`translate(${e.width/2}, ${e.height/2}) scale(0)`)
	.selectAll("path").data(obj).enter().append("path").attr("d",e.path).exit()
}

function tileBaseMap(e){
	let tile = d3.tile()
		.size([e.width, e.height])
		.scale(e.projscale*(2* Math.PI))
		.translate(e.projection([0, 0]))
		
	//console.log(tile())
	let t = Promise.all(tile().map(async d => {
		d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.json?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
		return d;
		})
		)
	return t;
}


function makeZenTile(ti,e){
	ti.forEach(function(t){
		let arr = zenArray(t)
		div = d3.select('#tiles').append("g").attr("id",`tile-${t.x}-${t.y}-${t.z}`).attr("class","tile").selectAll("path")
		.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
		.enter().append("path")
      	.attr("d", e.path)
      	.attr("class", function(d) { var kind = d.properties.kind || ''; if(d.properties.boundary){kind += '_boundary';} return d.layer_name + '-layer ' + kind; })
      	.exit();
	})
		
	
}
