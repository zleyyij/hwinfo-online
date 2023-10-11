// https://stackoverflow.com/questions/60981769/resizable-sidebar-drag-to-resize
const documentRoot = document.querySelector(":root");
// this element sits behind the sidebar and drags
const resizer = document.querySelector(".resizer");
const sidebar = document.querySelector(".sidebar");
const closeSidebarButton = document.querySelector(".minimize-icon");
const showSidebarButton = document.querySelector(".maximize_icon");
/**
 * Caches the previous setting for sidebar width to prevent it from being reset
 */
let sidebarWidth;

function resize(element) {
  if (element.x > 90 && element.x < 500) {
    const size = `${(element.x / window.innerWidth) * 100}%`;
    documentRoot.style.setProperty("--sidebar-width", size);
  }
}

/**
 * This method should be called whenever the charts div is resized, it signals to highcharts that it needs to resize the graphs to fit the divs
 */
function reflowCharts() {
  //Highcharts don't resize automatically on div change, so they need to manually be updated
  for (let i in charts) {
    charts[i].reflow();
  }
}

resizer.addEventListener("mousedown", event => {
  document.addEventListener("mousemove", resize, false);
  document.addEventListener("mouseup", () => {
    reflowCharts();
    document.removeEventListener("mousemove", resize, false, false);
  });
});

function hideSidebar() {
  sidebarWidth =
    getComputedStyle(documentRoot).getPropertyValue("--sidebar-width");
  documentRoot.style.setProperty("--sidebar-width", "0px");
  sidebar.style.display = "none";
  resizer.style.display = "none";
  closeSidebarButton.style.display = "none";
  reflowCharts();
}

closeSidebarButton.addEventListener("click", () => {
  hideSidebar();
});

function showSidebar() {
  documentRoot.style.setProperty("--sidebar-width", sidebarWidth);
  sidebar.style.display = "";
  resizer.style.display = "";
  closeSidebarButton.style.display = "";
  reflowCharts();
}

showSidebarButton.addEventListener("click", () => {
  showSidebar();
});
