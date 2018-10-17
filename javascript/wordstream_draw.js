function draw(data){
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

    //Main group
    let mainGroup = mainsvg.append('g').attr('transform', 'translate(' + (margin.left +margin.axisx)+ ',' + margin.top + ')');

    let allWords = [];
    d3.map(boxes.data, function(row){
        boxes.topics.forEach(topic=>{
            allWords = allWords.concat(row.words[topic]);
        });
    });
    let c20 = d3.scaleOrdinal(d3["schemeCategory20c"]);
    //Color based on term
    let terms = [];
    for(let i=0; i< allWords.length; i++){
        terms.concat(allWords[i].text);
    }
    let uniqueTerms = d3.set(terms).values();
    let termColorMap = d3.scaleOrdinal()
        .domain(uniqueTerms)
        .range(c20.range());
    let placed = true;
    mainGroup.selectAll('g').data(allWords).enter().append('g')
        .attr("transform", function(d){return 'translate('+d.x+', '+d.y+')rotate('+d.rotate+')';})
        .append('text')
        .text(function(d){return d.text;})
        .attr("font-family", font)
        .attr("font-size", function(d){return d.fontSize;})
        .attr("fill", function(d, i){return termColorMap(d.text);})
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr("topic", function(d){return d.topic;})
        .attr("visibility", function(d){ return d.placed ? (placed? "visible": "hidden"): (placed? "hidden": "visible");})
}

