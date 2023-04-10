// https://stackoverflow.com/questions/60981769/resizable-sidebar-drag-to-resize
const documentRoot = document.querySelector(":root")
// this element sits behind the sidebar and drags
const resizer = document.querySelector(".resizer");

resizer.addEventListener("mousedown", (event) => {
    document.addEventListener("mousemove", resize, false)
    document.addEventListener("mouseup", () => {
        reflowCharts();
        document.removeEventListener("mousemove", resize, false, false)
    });
})

function resize(element) {
    if (element.x > 90 && element.x < 500) {
        const size = `${(element.x / window.innerWidth) * 100}%`;
        documentRoot.style.setProperty("--sidebar-width", size)
    }
}

function reflowCharts() {

    //Highcharts don't resize automatically on div change, so they need to manually be updated
    for(let i in charts) {
        charts[i].reflow();
    }
}