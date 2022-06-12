//neat little object where all results are kept
    let formObj = {};
    //data that is not graphed, EG(Time)
    //actually currently not used, but might later
    let nonGraphed = {};
    //Global config options
    let drawGraphConf = {
	xTime: true,
    }

                    //time, data, name of div to insert graph, config
    function drawGraph(srs=[], divName, conf) {
	/* Current config options:
	     * xTime: search for time within the parsed csv, and try to use it instead of datapoints on the x axis
	     *
	     *
	     * */
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

//maybe consolidate createDiv and createLi into one 
//generating a spot for each chart to live
function createDiv(id, classNm){
	if(document.getElementById(id) === null){
		let div = document.createElement("div");
		div.className = classNm;
		div.id=id;
	
		if(!document.getElementById(id)){
			document.body.appendChild(div);
		}
	}
}



function createLi(content, id, classNm){
	let li = document.createElement("li");
	li.className = classNm;
	li.id = id;
	li.textContent = content;



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
/*****************************************************
 * XKCD 974					     *
 ****************************************************/
	//arbitrary use case specific alterations
	let srs = [];
	//I'm sure there's a much more efficient way to do this	
	//definitely with a function
	//maybe an array of regex stuff to check against
		//regex.exec to check against, data to push, and visibility state
	function pushRegex(r, d, v){
			if(r !== null){
				srs.push({name: d,  data: formObj[d], visible: v});
			}	

		}
	//generating the cpu temps graph
	createDiv("CPU Temps", "charts");
	for(let i in formObj){
		//cpu temps
	pushRegex(/(CPU \[)(.*)(C])/g.exec(i), i, true);

	pushRegex(/(Core Temperatures)/g.exec(i), i, true);

	pushRegex(/(CCD)(\d{1,2})(.*)(C])/gi.exec(i), i, false);
	
	pushRegex(/(CPU IOD)/g.exec(i), i, false);
	
	pushRegex(/(CPU \(Tctl)/g.exec(i), i, false);
	}
	if(srs.length > 0){
	drawGraph(srs, "CPU Temps", drawGraphConf);
	}
	//clearing srs to be used again
	srs = [];


		//cpu clocks, would do gpu temps but this way you can more easily A to B compare the two
	createDiv("CPU Clocks", "charts");
	for(let i in formObj){
		//generic grab for core clocks
		pushRegex(/(Core)(.*)(Clock )/gi.exec(i), i, false);
		//sketchy grab for average clocks
		pushRegex(/(Core)(.*)(Clocks)/gi.exec(i), i, true);

	}
	drawGraph(srs, "CPU Clocks", drawGraphConf);
	srs = [];



		//gpu temps, fairly self explainatory.
	createDiv("GPU Temps", "charts");
	for(let i in formObj){
		//one *terrible* catchall regex statement that will go horribly wrong
		pushRegex(/(GPU)(.*)(C\])/gi.exec(i), i, true);
		

	}
	drawGraph(srs, "GPU Temps", {
	xTime: true
	});
	srs = [];
	//it is at this point in this monstrosity that I consider why I shouldn't have just done more functions
	//maybe quit programming and become a carpenter
	
	//GPU Clocks
	createDiv("GPU Clocks", "charts");
	for(let i in formObj){
		//look mom, my code is inconsistent as well as nonfunctional
		//*useless comments*
		pushRegex(/(GPU Video)(.*)(Mhz\])/gi.exec(i), i, true);
	}
	drawGraph(srs, "GPU Clocks", drawGraphConf);
	srs = [];


	//various voltages, fairly self explainatory at this point, refer to the other
	//useless commments if you want something to read besides my code
	createDiv("3.3v", "charts");
	for(let i in formObj){
		pushRegex(/(\+3.3V \[V\])/gi.exec(i) , i, true);
		pushRegex(/(3VCC \[V\])/gi.exec(i), i, true);

	}
	drawGraph(srs, "3.3v", drawGraphConf);
	srs = [];
	
	createDiv("5v", "charts");
	for(let i in formObj){
	//This statement is *more* thorough than the others, for *no* reason
	pushRegex(/(\+5V \[V\])/gi.exec(i), i, true);

	}
	drawGraph(srs, "5v", drawGraphConf);
	srs = [];

	createDiv("12v", "charts");
	for(let i in formObj){
	pushRegex(/(\+12V \[V\])/gi.exec(i), i, true);

	}
	drawGraph(srs, "12v", drawGraphConf);
	srs = [];
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

