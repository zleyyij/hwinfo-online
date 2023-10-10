//neat little object where all results are kept
import hwgv_parser, {parse_csv} from "./hwgv-parser/pkg/hwgv_parser.js";

let parsedData = {};
//Global config options
let drawGraphConf = {
    xTime: true
};
let charts = [];

//highcharts theming
Highcharts.theme = {
    colors: shuffle(["#bf616a", "#d08770", "#ebcb8b",
        "#a3be8c", "#b48ead", "#88c0d0",
        "#81a1c1", "#5e81ac"]),
    chart: {
        backgroundColor: {
            linearGradient: [0, 0, 500, 500],
            stops: [
                [0, 'rgb(255, 255, 255)'],
                [1, 'rgb(240, 240, 255)']
            ]
        },
    },
    title: {
        style: {
            color: '#FFFFFF',
            backgroundColor: "#3B4252"
        }
    },
    subtitle: {
        style: {
            color: '#FFFFFF',
        }
    },
    tooltip: {
        style: {
            color: 0xffffff
        }
    },
    legend: {
        itemStyle: {
            color: '#FFFFFF'
        },
        itemHoverStyle: {
            color: 'gray'
        }
    },
    xAxis: {
        labels: {
            style: {
                color: '#FFFFFF'
            }
        }
    },
    yAxis: {
        labels: {
            style: {
                color: '#FFFFFF'
            }
        }
    }

};
// Apply the theme
Highcharts.setOptions(Highcharts.theme);

/*
    Helper/utility functions
 */

//shuffle an array, used to make the graphs different colors
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

// helper function stolen from stackoverflow because apparently javascript doesn't have native remap functionality
function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

/**
 * Reformat the hwinfo time to be more legible, and convert to elapsed time
 *
 * @param unformattedTime A list of unformatted time strings
 * @returns {string[]} a list of formatted time strings
 */
function formatTime(unformattedTime) {
    // calculate the elapsed time off of the log time
    let formattedTime = [];

    //needed for elapsed time calculation across iterations
    let startTime;
    // the maximum time found, so that if the time "ticks over",
    // it doesn't end up with -24h displayed
    let maxTime = 0;
    for (let i in unformattedTime) {
        // you can only split a string, and there's some issues with the csv parser
        if (typeof unformattedTime[i] !== "string") {
            continue
        }
        //removing MS and turning into an array of time units
        const splitTime = unformattedTime[i].slice(0, -4).split(":").map(n => ~~n);
        // because there are some artifacts left behind from the csv parser, ensure a valid split time was generated
        if (splitTime.length !== 3) {
            continue;
        }
        // calculate total elapsed time as seconds
        if (i == 0) {
            startTime = splitTime[0] * 3600 + splitTime[1] * 60 + splitTime[2];
        }
        /** total elapsed time in seconds */
        let elapsedTime = splitTime[0] * 3600 + splitTime[1] * 60 + splitTime[2] - startTime;
        if (elapsedTime > maxTime) {
            maxTime = elapsedTime;
        } else {
            // if the log is running past midnight,
            // everything will break and display -24h
            // to counter, add 24h in seconds
            elapsedTime += 86400;
        }
        // convert back to an array of h/m/s now that elapsed time was calculated
        /** elapsed time as an array*/
        let splitElapsedTime = Array(3);
        splitElapsedTime[0] = Math.floor(elapsedTime / 3600);
        // remainder of however many seconds can't evenly convert to hours, / 60
        splitElapsedTime[1] = Math.floor(elapsedTime % 3600 / 60);
        // remainder of whatever doesn't cleanly convert to hours or minutes
        splitElapsedTime[2] = elapsedTime % 3600 % 60;

        //finally, make a list of fully formatted nice looking strings
        let time = "";
        const unitLabels = ["h, ", "m, ", "s"]
        for (let j in splitElapsedTime) {
            if (splitElapsedTime[j]) {
                time += splitElapsedTime[j] + unitLabels[j];
            }
        }
        formattedTime.push(time);
    }
    return formattedTime;
}

//Draw a graph
//time, data, name of div to insert graph, config
function drawGraph(srs = [], divName, conf) {
    /* Current config options:
     * xTime: search for time within the parsed csv, and try to use it instead of datapoints on the x axis
     */
    let graphSettings = {
        chart: {
            zoomType: "x",
            panning: true,
            panKey: "shift"
        },
        // chart: {
        width: "100%",
        //},
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
    };


    //see if there's an array called Time if xTime is true(should be for all hwinfo logs)
    //in the same line see if the Time element exists in formObj
    if (conf.xTime == true && "Time" in parsedData) {
        graphSettings.xAxis.categories = formatTime(parsedData["Time"]);
    }
    if (srs.length > 0) {
        // shuffle the theme settings
        Highcharts.theme.colors = shuffle(Highcharts.theme.colors);
        charts.push(Highcharts.chart(divName, graphSettings));
    } else {
        console.error("tried to draw graph with no items in list.");

    }
}


async function parseCSV(file = document.getElementById("uploadedFile").files[0]) {
    console.time("CSV parsing time");
    //hide the welcome message
    document.getElementById("welcomeMessage").style.display = "none";
    // show the loading icon
    document.getElementById("loadingIcon").style.display = "";
    // initialize the wasm import
    // this should be preloaded
    await hwgv_parser();
    const fileAsBuffer= await file.arrayBuffer();
    const csvResults = parse_csv(new Uint8Array(fileAsBuffer));
    
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
    csvResults.forEach((value, key) => {
        parsedData[key] = value;
    });
    console.log(parsedData);
    buildGraphs();
    makeSearchResults();
    // //I am incredibly sorry to have created this nightmare
    // Papa.parse(file, {
    //     complete: function (results) {
    //         //f is the uploaded file
    //         let f = results.data;
    //         // f[0] is the title of each column
    //         for (let i in f[0]) {
    //             parsedData[f[0][i]] = [];
    //         }
    //         //looping through, demessing up the arrays
    //         //o(n^2) efficiency right here bb
    //         for (let i = 1; i < f.length; i++) {
    //             for (let j in f[0]) {
    //                 parsedData[f[0][j]].push(f[i][j]);
    //             }
    //         }
    //         //this is either an artifact from the log, the parser, or my bad code
    //         delete parsedData[""];

    //         // going through, converting number-strings("1") to numbers(1)
    //         for (let i in parsedData) {
    //             for (let j = 0; j < parsedData[i].length; j++) {
    //                 if (!Number.isNaN(Number(parsedData[i][j]))) {
    //                     parsedData[i][j] = Number(parsedData[i][j]);
    //                 }
    //             }
    //         }
    //         // "Yes" to 1 and "No" to 0
    //         for (let i in parsedData) {
    //             if (["Yes", "No"].includes(parsedData[i][0])) {
    //                 for (let j in parsedData[i]) {
    //                     if (parsedData[i][j] === "Yes") {
    //                         parsedData[i][j] = 1;
    //                     } else {
    //                         // assume it's yes || no with no other states
    //                         parsedData[i][j] = 0;
    //                     }
    //                 }
    //             }

    //         }

    //         console.timeEnd("CSV parsing time");
    //         buildGraphs();
    //         makeSearchResults();

    //     },
    //     encoding: "iso-8859-1"
    // });

    //hide the loading icon
    //document.getElementById("loadingIcon").style.display = "none";
}

/* Sidebar JS */

//filtering the search results
function filterSearch() {
    //https://www.w3schools.com/howto/howto_js_search_menu.asp
    let input, li, button;
    input = document.getElementById("graphSearch").value.toLowerCase();
    li = document.getElementById("searchResults").getElementsByTagName("li");
    if (input.length > 0) {
        makeSearchResults();
        //hide stuff that doesn't match the search query
        for (let i = 0; i < li.length; i++) {
            button = li[i].getElementsByTagName("button")[0];
            if (button.innerHTML.toLowerCase().indexOf(input) != -1) {
                li[i].style.display = "";
            } else {
                li[i].style.display = "none";
            }
        }
    } else {
        for (let i = 0; i < li.length; i++) {
            li[i].style.display = "";
        }
    }
}

//maybe consolidate createDiv and createLi into one
//generating a spot for each chart to live
function createDiv(id, classNm) {
    if (document.getElementById(id) === null) {
        let div = document.createElement("div");
        div.className = classNm;
        div.id = id;

        if (!document.getElementById(id)) {
            document.getElementById("chartDiv").appendChild(div);
        }
    }
}


function createButtonLi(name, dataToDraw, id) {
    if (document.getElementById(id) === null) {
        let li = document.createElement("li");
        let btn = document.createElement("button");
        btn.innerHTML = name;
        btn.id = id;
        btn.onclick = function () {
            quickGraph(name, dataToDraw);
        };
        document.getElementById("searchResults").appendChild(li).appendChild(btn);
    }
}

function showCheckBoxList() {
    let li, button, checkbox, label;
    li = document.getElementById("searchResults").getElementsByTagName("li");
    //hide stuff that doesn't match the search query
    for (let i = 0; i < li.length; i++) {
        button = li[i].getElementsByTagName("button")[0];
        //only create if element doesn't exist
        if (document.getElementById(button.innerHTML + "-checkbox") === null) {
            //creating checkboxes
            checkbox = document.createElement("input");
            checkbox.setAttribute("type", "checkbox");
            checkbox.checked = false;
            checkbox.id = button.innerHTML + "-checkbox";
            checkbox.name = button.innerHTML;
            checkbox.value = button.innerHTML;
            //creating the label for the checkboxes
            label = document.createElement("label");
            label.id = button.innerHTML + "-label";
            label.innerHTML = button.innerHTML;
            label.style.color = "#FFFFFF";
            label.for = button.innerHTML + "-checkbox";

            //creating the checkbox in each li
            li[i].appendChild(label);
            label.prepend(checkbox);
        } else {
            //we assume the elements already exist because we checked
            label = document.getElementById(button.innerHTML + "-label");
            checkbox = document.getElementById(button.innerHTML + "-checkbox");
        }
        checkbox.style.display = "";
        label.style.display = "";
        button.style.display = "none";
    }
}


// This function should only be called after showCheckBoxList
function showButtonList() {
    let li, button, checkbox, checkboxLabel;
    li = document.getElementById("searchResults").getElementsByTagName("li");
    for (let i = 0; i < li.length; i++) {
        button = li[i].getElementsByTagName("button")[0];
        checkbox = document.getElementById(button.innerHTML + "-checkbox");
        checkboxLabel = document.getElementById(button.innerHTML + "-label");
        button.style.display = "";
        checkbox.style.display = "none";
        checkboxLabel.style.display = "none";
    }
}


function quickGraph(name, arr) {
    createDiv(name, "charts");
    drawGraph([{name: name, data: arr, visible: true}], name, drawGraphConf);
    window.scrollTo(0, document.body.scrollHeight);
}


/*
Drag and drop impelmentation
 */
function dragOverHandler(ev) {
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}

function dropHandler(event) {
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    if (event.dataTransfer.items) {
        // Use DataTransferItemList interface to access the file(s)
        [...event.dataTransfer.items].forEach((item) => {
            // If dropped items aren't files, reject them
            if (item.kind === 'file') {
                parseCSV(item.getAsFile());
            }
            if (item.kind === 'string') {
                item.getAsString(str => {
                    fetch(`https://api.47c.in/hw/?url=${str}`).then(file => file.blob().then(blb => parseCSV(blb)));
                });
            }
            console.log(item);
        });
    } else {
        // Use DataTransfer interface to access the file(s)
        [...event.dataTransfer.files].forEach((file, i) => {
        });
    }

}

function genDivFromObj() {
    for (var i in parsedData) {
        createDiv(i, "charts");
        //	drawGraph([{name: i, data: formObj[i]}], i, {
        //		xTime: true

        //	});
    }
}

//generating a bunch of buttons for the graph menu
function makeSearchResults() {
    //make sure it hasn't already been made
    if (
        document.getElementById("searchResults").getElementsByTagName("li") !== null
    ) {
        for (let i in parsedData) {
            createButtonLi(i, parsedData[i], i + "-button");
        }
    }
}

//parsing the object, consolidating graphs, sorting them, so on and so forth
function buildGraphs() {
    console.time("Building graphs");
    /*****************************************************
     * XKCD 974                         *
     ****************************************************/
        //arbitrary use case specific alterations
    let srs = [];
    //I'm sure there's a much more efficient way to do this
    //definitely with a function
    //maybe an array of regex stuff to check against
    //regex.exec to check against, data to push, and visibility state
    function pushRegex(r, d, v) {
        if (r !== null) {
            srs.push({name: d, data: parsedData[d], visible: v});
        }
    }

    //generating the cpu temps graph
    createDiv("CPU Temps", "charts");
    for (let i in parsedData) {
        //cpu temps
        pushRegex(/(CPU \[)(.*)(C])/g.exec(i), i, true);

        pushRegex(/(Core Temperatures)/g.exec(i), i, true);

        pushRegex(/(CCD)(\d{1,2})(.*)(C])/gi.exec(i), i, false);

        pushRegex(/(CPU IOD)/g.exec(i), i, false);

        pushRegex(/(CPU \(Tctl)/g.exec(i), i, false);
    }
    drawGraph(srs, "CPU Temps", drawGraphConf);
    //clearing srs to be used again
    srs = [];

    //cpu clocks, would do gpu temps but this way you can more easily A to B compare the two
    createDiv("CPU Clocks", "charts");
    for (let i in parsedData) {
        //generic grab for core clocks
        pushRegex(/(Core)(.*)(Clock )/gi.exec(i), i, false);
        //sketchy grab for average clocks
        pushRegex(/(Core)(.*)(Clocks)/gi.exec(i), i, true);
    }
    drawGraph(srs, "CPU Clocks", drawGraphConf);
    srs = [];

    //gpu temps, fairly self explainatory.
    createDiv("GPU Temps", "charts");
    for (let i in parsedData) {
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
    for (let i in parsedData) {
        //look mom, my code is inconsistent as well as nonfunctional
        //*useless comments*
        pushRegex(/(GPU Video)(.*)(Mhz\])/gi.exec(i), i, true);
    }
    drawGraph(srs, "GPU Clocks", drawGraphConf);
    srs = [];

    //various voltages, fairly self explainatory at this point, refer to the other
    //useless commments if you want something to read besides my code
    createDiv("3.3v", "charts");
    for (let i in parsedData) {
        pushRegex(/(\+3.3V \[V\])/gi.exec(i), i, true);
        pushRegex(/(3VCC \[V\])/gi.exec(i), i, true);
    }
    drawGraph(srs, "3.3v", drawGraphConf);
    srs = [];

    createDiv("5v", "charts");
    for (let i in parsedData) {
        //This statement is *more* thorough than the others, for *no* reason
        pushRegex(/(\+5V \[V\])/gi.exec(i), i, true);
    }
    drawGraph(srs, "5v", drawGraphConf);
    srs = [];

    createDiv("12v", "charts");
    for (let i in parsedData) {
        pushRegex(/(\+12V \[V\])/gi.exec(i), i, true);
    }
    drawGraph(srs, "12v", drawGraphConf);
    srs = [];

    document.getElementById("loadingIcon").style.display = "none";
    console.timeEnd("Building graphs");
}

/*Event Listeners*/

//on button press, draw the selected graphs
document.getElementById("createMultiPointGraph").addEventListener('click', () => {
    let li, checkbox, remapValues;
//get the checkbox that says to remap values
    remapValues = document.getElementById("remapCheckbox").checked;
//array where all checked elements are sent
    let srs = [];
//list of graphs to graph
    let graphsToGraph = [];
    //get a list of all the values checkboxed
    li = document.getElementById("searchResults").getElementsByTagName("li");
    for (let i = 0; i < li.length; i++) {
        checkbox = li[i].getElementsByTagName("input")[0];
        //if checkbox is checked, add graph to srs then generate a new graph
        if (checkbox.checked) {
            graphsToGraph.push(checkbox.name);
            checkbox.checked = false;
        }
    }

    function arrayMax(arr) {
        let len = arr.length, max = -Infinity;
        while (len--) {
            if (arr[len] > max) {
                max = arr[len];
            }
        }
        return max;
    }

    for (let i in graphsToGraph) {
        if (remapValues) {
            const max = arrayMax(parsedData[graphsToGraph[i]]);
            console.log("maximum value: ", max);
            let remappedValues = [];
            for (let j in parsedData[graphsToGraph[i]]) {
                remappedValues.push(map_range(parsedData[graphsToGraph[i]][j], 0, max, 0, 100));
            }
            srs.push({
                name: graphsToGraph[i],
                data: remappedValues,
                visible: true
            });
        } else {
            srs.push({name: graphsToGraph[i], data: parsedData[graphsToGraph[i]], visible: true});
        }

    }

    createDiv(graphsToGraph.join(", "), "charts");
    drawGraph(srs, graphsToGraph.join(", "), drawGraphConf);
    //scroll to bottom of page
    window.scrollTo(0, document.body.scrollHeight);
});


//on multi point graph checkbox, do the thing
document.getElementById("multiPointGraphCheckbox").addEventListener("change", (event) => {
    if (event.currentTarget.checked) {
        showCheckBoxList();
        document.getElementById("multiPointUI").style.display = "";
    } else {
        document.getElementById("multiPointUI").style.display = "none";
        showButtonList();
    }
});

let upCheck = document.getElementById('uploadedFile');
const urlParams = new URLSearchParams(window.location.search);
//console.log(urlParams);
console.log("url: " + urlParams.get("url"));
if (urlParams.get("url") == null) {
    upCheck.onchange = function () {
        parseCSV();
    };
} else {
    fetch(`https://api.47c.in/hw/?url=${urlParams.get("url")}`).then(file => file.blob().then(blb => parseCSV(blb)));
}


/*function goButtonPressed() {
  parseCSV();
}*/


