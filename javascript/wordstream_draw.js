let texts = null;

function draw(data) {
    //Layout data
    let width = wordStreamWidth;
    let height = wordStreamHeight;
    let font = "Arial";
    let interpolation = d3.curveCardinal;
    let ws = d3.wordStream()
        .size([width, height])
        .interpolate(interpolation)
        .fontScale(d3.scaleLinear())
        .minFontSize(4)
        .maxFontSize(36)
        .data(data)
        .font(font);
    let boxes = ws.boxes();

    let allWords = [];
    d3.map(boxes.data, function (row) {
        boxes.topics.forEach(topic => {
            row.words[topic].forEach(w => {
                w.id = (w.text + row.date);
                w.type = "word";
            });//add id for selection purpose.
            allWords = allWords.concat(row.words[topic]);
        });
    });
    let c20 = d3.scaleOrdinal(d3["schemeCategory20c"]);
    //Color based on term
    let terms = [];
    for (let i = 0; i < allWords.length; i++) {
        terms.concat(allWords[i].text);
    }
    let uniqueTerms = d3.set(terms).values();
    let termColorMap = d3.scaleOrdinal()
        .domain(uniqueTerms)
        .range(c20.range());
    let placed = true;
    texts = mainGroup.append("g").attr("transform", `translate(${margin.axisx}, 0)`).selectAll('g').data(allWords).enter().append('g');
    texts
        .attr("transform", function (d) {
            return 'translate(' + d.x + ', ' + d.y + ')rotate(' + d.rotate + ')';
        })
        .append('text')
        .text(function (d) {
            return d.text;
        })
        .attr("id", d => ("id" + (d.id)))
        .attr("font-family", font)
        .attr("font-size", function (d) {
            return d.fontSize;
        })
        .attr("fill", function (d, i) {
            return termColorMap(d.text);
        })
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr("topic", function (d) {
            return d.topic;
        })
        .attr("visibility", function (d) {
            return d.placed ? (placed ? "visible" : "hidden") : (placed ? "hidden" : "visible");
        })
        .style("cursor", "pointer")
        .on("mouseover", d => {//Todo: Can generalize this together with the cells so we don't have to re-code
            if (!clicked) {
                mainGroup.selectAll("circle").classed("faded", true);
                mainGroup.selectAll("text").classed("faded", true);
                dispatch.call("down", null, d);
            }
        })
        .on("mouseleave", () => {
            if (!clicked) {
                mainGroup.selectAll(".faded").classed("faded", false);
                links.selectAll("*").remove();
                mainGroup.selectAll(".brushed").classed("brushed", false);
            }
        });
}

