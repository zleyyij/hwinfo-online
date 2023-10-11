import { parsedData, drawGraph, parseCSV } from "./index.js";

// helper function stolen from stackoverflow because apparently javascript doesn't have native remap functionality
function mapRange(value, low1, high1, low2, high2) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

//filtering the search results when input is typed
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

document.getElementById("graphSearch").addEventListener("keyup", filterSearch);

/**
 * Create a new div in the `chartDiv` div if it does not exist
 * @param {string} id The ID of the div to create
 * @param {string} classNm The CSS class to assign to this div
 */
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

/**
 * scroll the view to the ID of the provided div
 * @param {string} divId The ID of the div to scroll to 
 */
function scrollToDiv(divId) {
    const referenceDiv = document.getElementById(divId);
    const divYCoord = referenceDiv.offsetTop - referenceDiv.offsetHeight / 2;
    window.scrollTo(0, divYCoord);
}

// create a new button in the list of graphs to add
function createButtonLi(name, dataToDraw, id) {
  if (document.getElementById(id) === null) {
    let li = document.createElement("li");
    let btn = document.createElement("button");
    btn.innerHTML = name;
    btn.id = id;
    btn.onclick = function () {
      createDiv(name);
      console.log(dataToDraw)
      drawGraph([{name: name, data: dataToDraw}], name);
      scrollToDiv(name);
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

// TODO: this is probably broken
function dragOverHandler(ev) {
  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();
}

function dropHandler(event) {
  // Prevent default behavior (Prevent file from being opened)
  event.preventDefault();
  if (event.dataTransfer.items) {
    document.getElementById("loadingIcon").style.display = "";
    document.getElementById("welcomeMessage").style.display = "none";
    // Use DataTransferItemList interface to access the file(s)
    const item = event.dataTransfer.items[0];
      // If dropped items aren't files, reject them
      if (item.kind === "file") {
        parseCSV(item.getAsFile());
      }
      // when a file is dropped directly from discord, it's passed as a url
      if (item.kind === "string") {
        item.getAsString(str => {
          fetch(`https://api.47c.in/hw/?url=${str}`).then(file =>
            file.blob().then(blb => parseCSV(blb))
          );
        });
      }
    
  } else {
    // Use DataTransfer interface to access the file(s)
    [...event.dataTransfer.files].forEach((file, i) => {});
  }
}

document.getElementsByClassName("dropzone")[0].addEventListener("drop" , (e )=> dropHandler(e));
document.getElementsByClassName("dropzone")[0].addEventListener("dragover" , (e )=> dragOverHandler(e));

//generating a bunch of buttons for the graph menu
export function makeSearchResults() {
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
export function buildGraphs() {
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
      srs.push({ name: d, data: parsedData[d], visible: v });
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
  drawGraph(srs, "CPU Temps");
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
  drawGraph(srs, "CPU Clocks");
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
  drawGraph(srs, "GPU Clocks");
  srs = [];

  //various voltages, fairly self explainatory at this point, refer to the other
  //useless commments if you want something to read besides my code
  createDiv("3.3v", "charts");
  for (let i in parsedData) {
    pushRegex(/(\+3.3V \[V\])/gi.exec(i), i, true);
    pushRegex(/(3VCC \[V\])/gi.exec(i), i, true);
  }
  drawGraph(srs, "3.3v");
  srs = [];

  createDiv("5v", "charts");
  for (let i in parsedData) {
    //This statement is *more* thorough than the others, for *no* reason
    pushRegex(/(\+5V \[V\])/gi.exec(i), i, true);
  }
  drawGraph(srs, "5v");
  srs = [];

  createDiv("12v", "charts");
  for (let i in parsedData) {
    pushRegex(/(\+12V \[V\])/gi.exec(i), i, true);
  }
  drawGraph(srs, "12v");
  srs = [];

  document.getElementById("loadingIcon").style.display = "none";
  console.timeEnd("Building graphs");
}

/*Event Listeners*/

//on button press, draw the selected graphs
document
  .getElementById("createMultiPointGraph")
  .addEventListener("click", () => {
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
      let len = arr.length,
        max = -Infinity;
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
        let remappedValues = [];
        for (let j in parsedData[graphsToGraph[i]]) {
          remappedValues.push(
            mapRange(parsedData[graphsToGraph[i]][j], 0, max, 0, 100)
          );
        }
        srs.push({
          name: graphsToGraph[i],
          data: remappedValues,
          visible: true
        });
      } else {
        srs.push({
          name: graphsToGraph[i],
          data: parsedData[graphsToGraph[i]],
          visible: true
        });
      }
    }

    const graphName = graphsToGraph.join(", ");
    createDiv(graphName, "charts");
    drawGraph(srs, graphName);
    //scroll to the element created
    scrollToDiv(graphName);
  });

//on multi point graph checkbox, do the thing
document
  .getElementById("multiPointGraphCheckbox")
  .addEventListener("change", event => {
    if (event.currentTarget.checked) {
      showCheckBoxList();
      document.getElementById("multiPointUI").style.display = "";
    } else {
      document.getElementById("multiPointUI").style.display = "none";
      showButtonList();
    }
  });
