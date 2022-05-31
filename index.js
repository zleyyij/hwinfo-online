//neat little object where all results are kept
    let formObj = {};
    //data that is not graphed, EG(Time)
    let nonGraphed = {};
                    //time, data, name of div to insert graph, config
    function drawGraph(srs=[], divName, conf) {
	let graphSettings = {
            boost: {
                useGPUTranslations: true
            },

            title: {
                text: divName
            },
		xAxis: {
			tickInterval: 100
            },	
	
            series: srs


	}	
        //see if there's an array called Time if xTime is true(should be for all hwinfo logs)
	//in the same line see if the Time element exists in formObj
        if(conf.xTime == true && "Time" in formObj){
		graphSettings.xAxis.categories = stripMs(formObj["Time"]);

        }
        Highcharts.chart(divName, graphSettings);
    }
//stripping ms with regex cuz it looks nice 
//this function is only used exactly *one* time 
    function stripMs(strip){
        //stripping from each element in the array
      //  if(Array.isArray(strip)){
            for(let i in strip){
		if(/\d{1,2}:\d{1,2}:\d{1,2}/g.exec(strip[i])!== null){
                strip[i] = /\d{1,2}:\d{1,2}:\d{1,2}/g.exec(strip[i])[0];   
		

		}
	}
	return strip;	
}


    function parseCSV() {
	//I am incredibly sorry to have created this nightmare
        Papa.parse(document.getElementById("uploadedFile").files[0],  {
		complete: async function(results){
                //f is the uploaded file
                let f = results.data;
                //f[0] is the title of each column
                for (let i in f[0]) {
                    formObj[f[0][i]] = [];
                }
                //looping through, demessing up the arrays
                for (let i = 1; i < f.length; i++) {
                    for (let j in f[0])
                        formObj[f[0][j]].push(f[i][j]);
                }
                //this is either an artifact from the log, the parser, or my bad code
                delete formObj[""];

		

		//going through, converting number-strings("1") to numbers(1)
		for(let i in formObj){
			//I think it's always the last 5 using this specific parser
			//so will pop for now, should probably come up with a context match instead
			//for the record I did try to use splice, but that was behaving very oddly
		//	for(let j = 0; j < 10; j++){
				formObj[i].pop();
		//	}
			for(let j = 0; j < formObj[i].length; j++){
				if(!Number.isNaN(Number(formObj[i][j]))){
					formObj[i][j] = Number(formObj[i][j]);
				}
				
			}	
	
		}
		//moving time to the nongraphed array
            }
        });
    }
//generating a spot for each chart to live
function createDiv(id, classNm){
	let div = document.createElement("div");
	div.className = classNm;
	div.id=id;
	if(!document.getElementById(id)){
	document.body.appendChild(div);
	}
}
function genDivFromObj(){
	for(var i in formObj){
		createDiv(i, "charts");
	//	drawGraph([{name: i, data: formObj[i]}], i, {
	//		xTime: true

	//	});
	}

}
//parsing the object, consolidating graphs, sorting them, so on and so forth
	function buildGraphs(){
	//arbitrary use case specific alterations
	let srs = [];
	//I'm sure there's a much more efficient way to do this	
	//definitely with a function
	console.log("you are going insane");
	for(let i in formObj){
		//cpu temps
	if(/(CPU \[)(.*)(C])/g.exec(i) !== null){
		srs.push({name: i, data: formObj[i]});

	}
	if(/(Core Temperatures)/g.exec(i) !== null){
		srs.push({name: i, data: formObj[i]});
	}
	if(/(CCD)(\d{1,2})(.*)(C])/gi.exec(i) !== null){
		srs.push({name: i, data: formObj[i], visible: false});

	}

	}
	createDiv("CPU Temps", "charts");
	drawGraph(srs, "CPU Temps", {
	xTime: true
	});
	


	}


//calling things at the appropriate time
window.onload = function () {
	//enabling disability features  
	//broken now, shoulud fix later
	//            accessibility.enabled = true;


//wait for file to upload, then parse it and modify the html to include one div per chart
	document.getElementById("uploadedFile")
		.addEventListener("change", async () => {

			parseCSV();
		//	genDivFromObj()
			buildGraphs();
		}); 
}

