let mainsvg = d3.select("#mainsvg")
svgWidth = 1600,
    svgHeight = 400,
    margin = {top: 40, right: 40, bottom: 40, left: 40, axisx: 20, axisy: 40},
    width = svgWidth - margin.left - margin.right - margin.axisx,
    height = svgHeight - margin.top - margin.bottom - margin.axisy,
    scaleX = d3.scaleLinear().rangeRound([0, width]),
    scaleY = d3.scaleLog().rangeRound([height, 0]),
    // scaleY = d3.scaleLinear().rangeRound([height, 0]),
    scaleRadius = d3.scaleLinear().rangeRound([2, 9]);
    mainGroup = mainsvg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);

mainsvg.attr("width", svgWidth).attr("height", svgHeight);

d3.json("data/iothackernews.json", function(error, data){
    if(error) throw error;
    let stories=[];
    let comments = [];
    data.forEach(d=>{
        if(d.type==="story"){
            d.commentCount = countAllComments(d.id, data);
            stories.push(d);
        }
        if(d.type==="comment"){
            comments.push(d);
        }
    });
    scaleX.domain(d3.extent(stories.map(d=>+d.timestamp)));
    scaleY.domain(d3.extent(stories.map(d=>+d.score)));
    scaleRadius.domain(d3.extent(stories.map(d=>d.commentCount)));

    let simulation = d3.forceSimulation(stories)
        .force("x", d3.forceX(d=>scaleX(+d.timestamp)))
        .force("y", d3.forceY(d=>scaleY(+d.score)))
        .force("collide", d3.forceCollide(d=>scaleRadius(d.commentCount)+1))
        .stop();
    for (let i = 0; i < 120; i++) {
        simulation.tick();
    }
    mainGroup.append("g")
        .attr("class", 'axis axis--x')
        .attr("transform", `translate(0,${height+margin.axisy})`)
        .call(d3.axisBottom(scaleX).ticks(10).tickFormat(formatTime));

    mainGroup.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(scaleY).ticks(10, ".0s"));

    let cell = mainGroup.append("g")
        .attr("class", "cells")
        .attr("transform", `translate(${margin.axisx}, 0)`)
        .selectAll("g").data(stories).enter().append("g");
    cell.append("circle")
        .attr("r", d=> scaleRadius(d.commentCount))
        .attr("cx", d=>d.x)
        .attr("cy", d=>d.y);
    function formatTime(unix_timestamp){
        let date = new Date(unix_timestamp),
            year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDay(),
            formattedTime = year + '-' + month + '-' + day;
        return formattedTime;
    }
    function getOneLevelCommentsOf(postId, data){
        let result = data.filter(d=>d.parent === postId);
        result.forEach(comment =>{
           if(!comment.commentLevel){
               comment.commentLevel =0;
           }
           comment.commentLevel+=1;
        });
        return result;
    }
    function countAllComments(postId, data){
        let total = 0;
        let queue = [postId];
        while(queue.length > 0){
            let currentPostId = queue.shift();
            let level1Comments = getOneLevelCommentsOf(currentPostId, data);
            if(level1Comments.length>0){
                queue = queue.concat(level1Comments);
                total+=level1Comments.length;
            }
        }
        return total;
    }
});