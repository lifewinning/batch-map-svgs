
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
  
  let form = document.querySelector('form')
  form.remove();

  let obj = JSON.parse(event.target.result)
  p = params(obj.features, obj.features[0])

  };
})

function outline(obj,e){
	d3.select(`#${e.thisID}`).append("g").attr("class","site").attr("id","site")
	//.attr("transform",`translate(${e.width/2}, ${e.height/2}) scale(0)`)
	.selectAll("path").data(obj).enter().append("path").attr("d",e.path).exit()
}
//set map size, projection data
function params(obj, e){
	e.width = window.innerWidth;
	e.height = window.innerHeight;
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

	//this one is going to kill me tho
	zoom = d3.zoom()
    	.scaleExtent([1 << 8, 1 << 21])
		.on("zoom", zoomies)
	
	zoomcenter = e.projection([e.centroid.geometry.coordinates[0],e.centroid.geometry.coordinates[1]])

	console.log(zoomcenter)

	e.svg = d3.select("#maps").append('svg').attr('class','map').attr('height',e.height).attr('width',e.width).attr('id', e.thisID)
		.call(zoom)
		.call(zoom.transform, d3.zoomIdentity
		//.translate(e.width/2,e.height/2) //this is 
  		.scale(1 << 18) //this is an inelegant solution
  		);

	tiles = e.svg.append('g').attr('id','tiles')
	
	outline(obj, e)

	function zoomies(){
		let tiles = d3.tile()
			.size([e.width,e.height])
			.scale(d3.event.transform.k)
			.translate(e.projection([0,0])) 
			//.translate([d3.event.transform.x,d3.event.transform.y]);
		
		d3.selectAll('.tile').remove()

		e.projection
	      .scale(d3.event.transform.k / (2*Math.PI))
	      .translate([d3.event.transform.x, d3.event.transform.y]);

		d3.select(`#site`)
			//still kind of fucked up hm
			.attr("transform",`translate(${d3.event.transform.x}, ${d3.event.transform.y}) scale(${d3.event.transform.k/(1<<18)})`)
			.style("stroke-width", 1 / (d3.event.transform.k/(1<<18)))
			// bitwise operator here is also an inelegant solution
	
		let t = Promise.all(tiles().map(async d => {
			d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.json?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
			return d;}))

		 t.then(function(ti){
		 	ti.forEach(function(tile){
		 		console.log(tile.x,tile.y,tile.z)
		 		arr = zenArray(tile)
		 		d3.select('#tiles').append('g')
		 		.attr("id",`tile-${tile.x}-${tile.y}-${tile.z}`).attr("class","tile")
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
		div = d3.select(`#${e.thisID}`).append("g").attr("id",`tile-${t.x}-${t.y}-${t.z}`).attr("class","tile");
		d3.select(`#tile-${t.x}-${t.y}-${t.z}`).selectAll("path")
		.data(arr.sort(function(a, b) { return a.properties.sort_rank ? a.properties.sort_rank - b.properties.sort_rank : 0 }))
		.enter().append("path")
      	.attr("d", e.path)
      	.attr("class", function(d) { var kind = d.properties.kind || ''; if(d.properties.boundary){kind += '_boundary';} return d.layer_name + '-layer ' + kind; })
      	.exit();
	})
		
	
}
