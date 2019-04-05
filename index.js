//looping through asynchronous functions is actually a crime
//this is inelegant, but 
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
  let obj = JSON.parse(event.target.result)

  const start = async () => {
  await asyncForEach(obj.features, async (o) => {
    params(o)
    let tiles = await tileBaseMap(o)
    await makeZenTile(tiles,o)
    await outline(obj.features,o)
  })	
  console.log('you made some maps')
}
start()
};

})
//set map size, projection data
function params(e){
	e.width = 600;
	e.height = 600;
	e.centroid = turf.centroid(e.geometry)
	//console.log(centroid)
	e.projection = d3.geoMercator()
		.translate([e.width/2, e.height/2])
		.center(e.centroid.geometry.coordinates)
		.fitExtent([[e.width*.05,e.height*.05],[e.width-(e.width*.05),e.height-(e.height*.05)]],e)
		//.fitSize([e.width,e.height],e) //

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
	
	e.svg = d3.select("#maps").append('svg').attr('class','map').attr('height',e.height).attr('width',e.width).attr('id', e.thisID)
		.call(zoom)
		.call(zoom.transform, d3.zoomIdentity
		//.translate(e.width/2,e.height/2) //if I do this the zoom starts centered but then does this translate again when zoom is fired?
  		.scale(e.getZoom())
  		)
	tiles = e.svg.append('g').attr('id',`${e.thisID}-tiles`)
	function zoomies(){
		let tiles = d3.tile()
			.size([e.width,e.height])
			.scale(d3.event.transform.k)
			.translate(e.projection([0,0])) 
			//.translate([d3.event.transform.x,d3.event.transform.y]);
		
		d3.selectAll(`${e.thisID}-tile`).remove()

		e.projection
	      .scale(d3.event.transform.k / (2*Math.PI))
	      .translate([d3.event.transform.x, d3.event.transform.y]);

		d3.select(`#site`)
			.attr("transform",`translate(${d3.event.transform.x}, ${d3.event.transform.y}) scale(${d3.event.transform.k/(e.getZoom())})`)
			.style("stroke-width", 1 / (d3.event.transform.k/e.getZoom()))

		//this is very slow and I hate it

		let t = Promise.all(tiles().map(async d => {
			d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.json?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
			return d;}))

		 t.then(function(ti){
		 	ti.forEach(function(tile){
		 		arr = zenArray(tile)
		 		d3.select(`${e.thisID}-tiles`).append('g')
		 		.attr("id",`tile-${tile.x}-${tile.y}-${tile.z}`).attr("class",`${e.thisID}-tile`)
		 		.selectAll('path')
		 		.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
				.enter().append("path")
		      	.attr("d", e.path)
		      	.attr("class", function(d) { var kind = d.properties.kind || ''; if(d.properties.boundary){kind += '_boundary';} return kind; })
		      	.exit();
				})
		 })
	} 
	return e;
}
	
// get vector tiles
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

// add geojson polygon
function outline(obj,e){
	d3.select(`#${e.thisID}`).append("g").attr("class","site").attr("id","site").selectAll("path").data(obj).enter().append("path").attr("d",e.path).exit()
}
//functions written borrowing methods from the mapzen demo 
//since we're already using the json endpoint, skipping the steps to parse topojson (possibly will need to change this)

function zenData(ti,e){
	for (var t of ti){
		var data = {};
		for (var key in t.data){
			data[key]= t.data[key].features
		}
	 return data;
	}
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
		                // d.data[layer].features[i].layer_name = layer;
		                features.push(t.data[layer].features[i]);
		                //console.log(obj[layer][i].properties.kind)
		                //console.log(features.length)
					} 
					}
				})
		 return features;	
		
}



function makeZenTile(ti,e){
	ti.forEach(function(t){
		let arr = zenArray(t)
		div = d3.select(`${e.thisID}-tiles`).append("g").attr("id",`tile-${t.x}-${t.y}-${t.z}`).attr("class",`${e.thisID}-tile`);
		d3.select(`#tile-${t.x}-${t.y}-${t.z}`).selectAll("path")
		.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
		.enter().append("path")
      	.attr("d", e.path)
      	.attr("class", function(d) { var kind = d.properties.kind || ''; if(d.properties.boundary){kind += '_boundary';} return d.layer_name + '-layer ' + kind; })
      	.exit();
	})
		
	
}

//topo version (because the internet connection on this plane is bad)
function topoTileBaseMap(e){
	let tile = d3.tile()
		.size([e.width, e.height])
		.scale(e.projscale*(2* Math.PI))
		.translate(e.projection([0, 0]))
		
	//console.log(tile())
	let t = Promise.all(tile().map(async d => {
		d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.topojson?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
		return d;
		})
		)
	return t;
}

function topoZenData(ti,e){
	ti.forEach(function(t){
		d3.select(`#${e.thisID}`).append("g").attr("class",`tile-${d.x}-${d.y}-${d.z}`)
		var data = {};
		for (var key in t.data.objects){
			data[key] = topojson.feature(t.data, t.objects[key])
		}
	return topoZenArray(data)
	})
}

function topoZenArray(obj){
	//this should probably be an interface thing
	layers = ['water', 'landuse', 'roads', 'buildings']
	layers.forEach(function(layer){
		if(obj[layer]){
			for(var i in data[layer].features)
            {
                // Don't include any label placement points
                if(data[layer].features[i].properties.label_placement) { continue }

                // Don't show large buildings at z13 or below.
                if(zoom <= 13 && layer == 'buildings') { continue }

                // Don't show small buildings at z14 or below.
                if(zoom <= 14 && layer == 'buildings' && data[layer].features[i].properties.area < 2000) { continue }

                data[layer].features[i].layer_name = layer;
                features.push(data[layer].features[i]);
            }
		}
	})
}

function topoZenTile(arr,ti,e){
	d3.select(`.tile-${t.x}-${t.y}-${t.z}`).selectAll("path")
	.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
		.enter().append("path")
      	.attr("d", e.path)
      	.exit();
}