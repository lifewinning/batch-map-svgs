//looping through asynchronous functions is actually a crime

const asyncForEach = async (array,callback) => {
	for (let index = 0; index < array.length; index++) {
	await callback(array[index], index, array)
	}
}
document.querySelector("#geo").addEventListener("change", function() {

  var reader = new FileReader();
  reader.onload = onReaderLoad;
  reader.readAsText(event.target.files[0])

  function onReaderLoad(event){
  let obj = JSON.parse(event.target.result)

  const start = async () => {
  await asyncForEach(obj.features, async (o) => {
    params(o) //sets width, height, projection scaling for map
    arr = [] //need this later
    await append(await o, await tileArray(await tileBaseMap(o),arr)) //generate map tiles and add them to map svg
    await outline(obj.features,o) //add outline of specific location to the map
  })	
  console.log('Done')
}

start()
};

})

function params(e){
	e.width = 600;
	e.height = 600;
	e.centroid = turf.centroid(e.geometry)
	//console.log(centroid)
	e.projection = d3.geoMercator()
		.translate([e.width/2, e.height/2])
		.center(e.centroid.geometry.coordinates)
		//.fitSize([(e.width/10),(e.height/10)],e)
		.fitSize([e.width,e.height],e)

	e.projscale = e.projection.scale()
	
	e.thisID = e.properties.city.replace(' ', '').replace(',','').replace(' ','')
	e.path = d3.geoPath().projection(e.projection)

	e.svg = d3.select("#maps").append('svg').attr('class','map').attr('height',e.height).attr('width',e.width).attr('id', e.thisID)
	return e;
}
	

function tileBaseMap(e){
	tile = d3.tile()
		.size([e.width, e.height])
		.scale(e.projscale*(2* Math.PI))
		.translate(e.projection([0, 0]))
		
	//console.log(tile())
	t = Promise.all(tile().map(async d => {
		d.data = await d3.json(`https://tile.nextzen.org/tilezen/vector/v1/256/all/${d.z}/${d.x}/${d.y}.json?api_key=ztkh_UPOQRyakWKMjH_Bzg`); 
		return d;
		})
		)
	return t;
}

function tileArray(t,arr){
 for (let [k,v] of Object.entries(t[0].data)){
  //console.log(k,v)
  let obj = {}
  obj[k] = t.map(ti => ti.data[k])
  arr.push(obj)
  //console.log(arr)
 }
 //arr.push({"coastlines": t.filter(d => d.data.water != d.data.boundary)})
 return arr;
}

function append(e,arr){ 
	//TODO: coastline/land shaping stuff, figuring out order for appending different layers
	//TODO: merging paths to save myself some serious headache later
	arr.forEach(function(l){
		for (let [k, v] of Object.entries(l)) {
				  return d3.select(`#${e.thisID}`)
				  .append("g").attr("class",k)
				  .selectAll("path").data(v).enter()
				  .append("path").attr("d",e.path)
				  .attr("class", function(m){
				  	for (var i = m.features.length - 1; i >= 0; i--) {
				  		return m.features[i].properties.kind
				  	}
				  })
				  .exit()
	  }
})
}

function outline(obj,e){
	d3.select(`#${e.thisID}`).append("g").attr("class","site").attr("id","site").selectAll("path").data(obj).enter().append("path").attr("d",e.path).exit()
}

map = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;">${tiles.map(d => `
  <path fill="#eee" d="${path(filter(d.data.water, d => !d.properties.boundary))}"></path>
  <path fill="none" stroke="#aaa" d="${path(filter(d.data.water, d => d.properties.boundary))}"></path>
  <path fill="none" stroke="#000" stroke-width="0.75" d="${path(d.data.roads)}"></path>
`)}
</svg>`