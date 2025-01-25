// TODO; get rid of jquery
import hwgv_parser, { parse_csv } from "./parser/pkg/hwgv_parser.js";
import { buildGraphs, makeSearchResults } from "./ui.js";
import { API_URL } from '../config.js';

// initialize the wasm import
// this should be preloaded
await hwgv_parser();

export let parsedData = {};

export let charts = [];

//highcharts theming
Highcharts.theme = {
  colors: shuffle([
    "#bf616a",
    "#d08770",
    "#ebcb8b",
    "#a3be8c",
    "#b48ead",
    "#88c0d0",
    "#81a1c1",
    "#5e81ac"
  ]),
  chart: {
    backgroundColor: {
      linearGradient: [0, 0, 500, 500],
      stops: [
        [0, "rgb(255, 255, 255)"],
        [1, "rgb(240, 240, 255)"]
      ]
    }
  },
  title: {
    style: {
      color: "#FFFFFF",
      backgroundColor: "#3B4252"
    }
  },
  subtitle: {
    style: {
      color: "#FFFFFF"
    }
  },
  tooltip: {
    style: {
      color: 0xffffff
    }
  },
  legend: {
    itemStyle: {
      color: "#FFFFFF"
    },
    itemHoverStyle: {
      color: "gray"
    }
  },
  xAxis: {
    labels: {
      style: {
        color: "#FFFFFF"
      }
    }
  },
  yAxis: {
    labels: {
      style: {
        color: "#FFFFFF"
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
  let currentIndex = array.length,
    randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex]
    ];
  }

  return array;
}


/**
 * Reformat the hwinfo time to be more legible, and convert to elapsed time
 *
 * @param unformattedTime A list of the elapsed time as seconds
 * @returns {string[]} a list of formatted time strings
 */
function formatTime(unformattedTime) {
  // calculate the elapsed time off of the log time
  let formattedTime = [];

  //needed for elapsed time calculation across iterations
  let startTime = unformattedTime[0];
  // the maximum time found, so that if the time "ticks over",
  // it doesn't end up with -24h displayed
  let maxTime = 0;
  for (let i in unformattedTime) {
    /** total elapsed time in seconds */
    let elapsedTime = unformattedTime[i] - startTime;
    
    if (elapsedTime >= maxTime) {
      maxTime = elapsedTime;
    } else {
      // everything will break and display -24h
      // to counter, add 24h in seconds
      elapsedTime += 86400;
    }
    // convert back to an array of h/m/s now that elapsed time was calculated
    /** elapsed time as an array*/
    let splitElapsedTime = Array(3);
    splitElapsedTime[0] = Math.floor(elapsedTime / 3600);
    // remainder of however many seconds can't evenly convert to hours, / 60
    splitElapsedTime[1] = Math.floor((elapsedTime % 3600) / 60);
    // remainder of whatever doesn't cleanly convert to hours or minutes
    splitElapsedTime[2] = (elapsedTime % 3600) % 60;

    //finally, make a list of fully formatted nice looking strings
    let time = "";
    const unitLabels = ["h, ", "m, ", "s"];
    for (let j in splitElapsedTime) {
      if (splitElapsedTime[j]) {
        time += splitElapsedTime[j] + unitLabels[j];
      }
    }
    formattedTime.push(time);
  }
  return formattedTime;
}

/**
 * Create a new graph in the specified div
 * @param {array} srs a list of numbers to graph
 * @param {string} divName the name of the div to render the graph under
 */
export function drawGraph(srs = [], divName) {
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
  if ("Time" in parsedData) {
    graphSettings.xAxis.categories = parsedData["Time"];
  }
  if (srs.length > 0) {
    // shuffle the theme settings
    Highcharts.theme.colors = shuffle(Highcharts.theme.colors);
    charts.push(Highcharts.chart(divName, graphSettings));
  } else {
    console.error("tried to draw graph with no items in list.");
  }
}
console.log(document.getElementById("uploadedFile").files);
export async function parseCSV(
  file = document.getElementById("uploadedFile").files[0]
) {
  //hide the welcome message
  document.getElementById("welcomeMessage").style.display = "none";
  // show the loading icon
  document.getElementById("loadingIcon").style.display = "";
  // Clear the searchbar
  document.getElementById("graphSearch").value = "";
  document.getElementById("searchResults").replaceChildren();
  console.time("CSV parsing time");
  // wipe the results, in case a new file is being rendered
  for (const chart of charts) {
    chart.destroy();
  }
  for (const key in parsedData) {
    // Directly modify every array to wipe them in case the garbage collector doesn't behave like we want it to
    parsedData[key].length = 0;
  }
  parsedData = {};
  charts = [];
  // just delete *all of the charts*
  document.getElementById("chartDiv").replaceChildren();
  const fileAsBuffer = await file.arrayBuffer();
  const csvResults = parse_csv(new Uint8Array(fileAsBuffer));
  csvResults.forEach((value, key) => {
    parsedData[key] = value;
  });
  // modify the "Time" key to display nicely rendered times
  parsedData["Time"] = formatTime(parsedData["Time"]);
  console.timeEnd("CSV parsing time");
  makeSearchResults();
  buildGraphs();
  //hide the loading icon
  //document.getElementById("loadingIcon").style.display = "none";
}

// if a file is uploaded using the upload button, do the thing
let upCheck = document.getElementById("uploadedFile");
const apiUrl = `${API_URL}`;

// This is a very hacky way to extract a URL and manually encode the &
// You must operate on the raw string rather than using the URL property
//  because `urlParams.get("url")` will terminate at the first &
const urlParams = new URLSearchParams(window.location.search);
let ampersandUrl = urlParams.toString().replace('url=', '');
let csvUrl = ampersandUrl.replace(/&/g, '%26');

console.log(`Raw URL: ${urlParams}`);
console.log(`Clean URL: ${csvUrl}`);

if (urlParams.get("url") == null) {
    upCheck.onchange = function () {
        document.getElementById("loadingIcon").style.display = "";
        document.getElementById("welcomeMessage").style.display = "none";
    parseCSV(document.getElementById("uploadedFile").files[0]);
    };
} else {
  fetch(`${apiUrl}/?url=${csvUrl}`).then(file =>
    file.blob().then(blb => parseCSV(blb))
  );
}

// if a file is pasted, do the thing
document.addEventListener("paste", async (e) => {
  // read the file from the clipboard, if there is one
  if (e.clipboardData.files.length == 0) {
    return;
  }
  // non-null assertion: there's at least one because of the above check
  const file = e.clipboardData.files.item(0);
  // parse the csv, draw graphs, et cetera
  if (file.type.endsWith('csv')) {
    parseCSV(file);
  }
});