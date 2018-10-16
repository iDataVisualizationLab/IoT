let mainsvg = d3.select("#mainsvg"),
    svgWidth = 1600,
    svgHeight = 900,
    axisHeight = 40,
    margin = {top: 40, right: 40, bottom: 40, left: 40, axisx: 40, axisy: 40, storyTop: 20},
    width = svgWidth - margin.left - margin.right - margin.axisx,
    height = svgHeight - margin.top - margin.storyTop - margin.axisx - margin.bottom,
    storyHeight = authorHeight = commentHeight = height / 3,
    authorStartY = 0,
    authorEndY = authorStartY + authorHeight,
    storyStartY = authorHeight + margin.storyTop,
    storyEndY = storyStartY + storyHeight,
    commentStartY = storyStartY + storyHeight + axisHeight,

    scaleX = d3.scaleLinear().rangeRound([0, width]),
    scaleAuthorScore = d3.scaleLog().rangeRound([authorEndY, authorStartY]),
    scaleStoryScore = d3.scaleLog().rangeRound([storyEndY, storyStartY]),
    scaleRadius = d3.scaleLinear().rangeRound([2, 9]),
    mainGroup = mainsvg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`),
    dispatch = d3.dispatch("up", "down");


function getAuthor(post, data) {
    let result = data.filter(d => d.by === post.by && d.type === "author");
    return result;
}

function getParent(post, data) {
    let result = [];
    if (post.type === "author") {
        return result;
    } else {
        result = data.filter(d => d.id === post.parent).concat(getAuthor(post, data));
        return result;
    }
    return result;
}

mainsvg.attr("width", svgWidth).attr("height", svgHeight);

d3.json("data/iothackernews.json", function (error, data) {
    if (error) throw error;
    //<editor-fold desc="process data">
    let stories = [];
    data.forEach(d => {
        //initialize all level as 0//this will get increased later-on when we count.
        d.commentLevel = 0;
        d.postCount = countAllComments(d.id, data);
        if (d.type === "story") {
            stories.push(d);
        }
    });
    let authors = processAuthors(data);
    let allData = data.concat(authors);
    function getChildren(postId, data) {

        let result = data.filter(d => d.parent === postId);
        result.forEach(comment => {
            comment.commentLevel += 1;
        });
        return result;
    }

    function getChildrenOfNode(node, data) {
        let result = [];
        if (node.type === "author") {
            result = data.filter(p => (p.by === node.by) && p.type !== "author");
        } else {
            result = getChildren(node.id, data);
        }
        return result;
    }

    function countAllComments(postId, data) {
        let total = 0;
        let queue = [postId];
        while (queue.length > 0) {
            let currentPostId = queue.shift();
            let level1Comments = getChildren(currentPostId, data);
            if (level1Comments.length > 0) {
                queue = queue.concat(level1Comments);
                total += level1Comments.length;
            }
        }
        return total;
    }

    function processAuthors(data) {
        let result = [];
        let nested = d3.nest().key(d => d.by).sortKeys(d3.ascending).map(data.filter(p => p.type === "story"));
        // let nested = d3.nest().key(d => d.by).sortKeys(d3.ascending).map(data);
        let authors = d3.keys(nested);
        authors = authors.filter(a => a.indexOf("$") >= 0);
        authors.forEach(a => {
            let singleAuthor = {};
            singleAuthor.by = a.substring(1, a.length);//chip off the leading $ sign to get the name
            singleAuthor.id = singleAuthor.by;
            let x = nested[a];
            singleAuthor.score = d3.mean(x, p => +p.score);
            singleAuthor.timestamp = d3.mean(x, p => +p.timestamp);
            singleAuthor.postCount = nested[a].length;
            singleAuthor.type = "author";
            result.push(singleAuthor);
        });
        return result;
    }

    //</editor-fold>

    scaleX.domain(d3.extent(data.map(d => +d.timestamp)));
    let scoreDomain = d3.extent(stories.map(d => +d.score));
    scaleStoryScore.domain(scoreDomain);
    scaleAuthorScore.domain(scoreDomain);
    scaleRadius.domain(d3.extent(stories.concat(authors).map(d => Math.sqrt(d.postCount))));

    //<editor-fold desc="force simulation">
    let simulation = d3.forceSimulation(allData)
        .force("x", d3.forceX(d => scaleX(+d.timestamp)))
        .force("y", d3.forceY(d => {
            if (d.type === "author") {
                return scaleAuthorScore(+d.score);
            }
            if (d.type === "story") {
                return scaleStoryScore(+d.score);
            }
            if (d.type === "comment") {
                return commentStartY + 80 + d.commentLevel * commentHeight;//80 is for the expansion of the comments due to collisions (may remove this since displayin gcomments on demand only => would not have this many.
            }
        }))
        .force("collide", d3.forceCollide(d => scaleRadius(Math.sqrt(d.postCount)) + 1))
        .stop();

    for (let i = 0; i < 120; i++) {
        simulation.tick();
    }
    //</editor-fold>

    //<editor-fold desc="axis">
    mainGroup.append("g")
        .attr("class", 'axis axis--x')
        .attr("transform", `translate(0,${storyStartY + storyHeight + margin.axisx})`)
        .call(d3.axisBottom(scaleX).ticks(10).tickFormat(formatTime));

    mainGroup.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(scaleAuthorScore).ticks(10, ".0s"));

    mainGroup.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(scaleStoryScore).ticks(10, ".0s"));

    function formatTime(unix_timestamp) {
        let date = new Date(unix_timestamp),
            year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDate(),
            formattedTime = year + '-' + (month+1) + '-' + day;
        return formattedTime;
    }
    //</editor-fold>

    let links = mainGroup.append("g")
        .attr("class", "links")
        .attr("transform", `translate(${margin.axisx}, 0)`);

    let cells = mainGroup.append("g")
        .attr("class", "cells")
        .attr("transform", `translate(${margin.axisx}, 0)`)
        .selectAll("g").data(allData).enter().append("g");

    cells.append("circle")
        .attr("id", d => "id"+d.id)
        .attr("r", d => scaleRadius(Math.sqrt(d.postCount)))
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("fill", d => d.type === "story" ? "#000" : "steelblue")
        .on("mouseover", (d) => {
            cells.selectAll("circle").classed("faded", true);
            d3.select("#info").style("display", "inline");
            if(d.type==="author"){
                displayAuthor(d);
            }
            if(d.type==="story"){
                displayStory(d);
            }
            if(d.type==="comment"){
                displayComment(d);
            }
            dispatch.call("up", null, d);
            dispatch.call("down", null, d);

        })
        .on("mouseleave", () => {
            cells.selectAll("circle").classed("faded", false);
            d3.select("#info").style("display", "none");
            links.selectAll("*").remove();
            mainGroup.selectAll(".brushed").classed("brushed", false);
        });

    dispatch.on("up", node => {
        if (node.type === "comment" || node.type === "story") {
            d3.select("#id" + node.id).classed("brushed", true).classed("faded", false);
            let parents = getParent(node, allData);
            //brush the nodes
            parents.forEach(p => {
                d3.select("#id" + p.id).classed("brushed", true).classed("faded", false);
            });
            //create links from this node to the parents
            links
                .selectAll(".links")
                .data(parents)
                .enter()
                .append("line")
                .attr("x1", node.x)
                .attr("y1", node.y)
                .attr("x2", d => d.x)
                .attr("y2", d => d.y)
                .attr("stroke", "red")
                .attr("stroke-width", 0.3)
                .attr("opacity", .9)
                .style("pointer-events", "none");
            parents.forEach(p => {
                //bubble up all the parents
                dispatch.call("up", null, p);
            });

        }
    });
    dispatch.on("down", node => {
        let children = getChildrenOfNode(node, allData);
        d3.select("#id" + node.id).classed("brushed", true).classed("faded", false);

        children.forEach(p => {
            d3.select("#id" + p.id).classed("brushed", true).classed("faded", false);
        });
        links
            .selectAll(".links")
            .data(children)
            .enter()
            .append("line")
            .attr("x1", node.x)
            .attr("y1", node.y)
            .attr("x2", d => d.x)
            .attr("y2", d => d.y)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5)
            .attr("opacity", .9)
            .style("pointer-events", "none");
        children.forEach(c => {
            //bubble up all the parents
            dispatch.call("down", null, c);
        });
    });
    function displayAuthor(author){
        let msg = "<b>Author: </b>" + author.id + "<br/>" +
            "Posts: " + author.postCount + "<br/>" +
            "Average score: " + author.score;
        d3.select("#info").html(msg);
    }
    function displayStory(story){
        let msg = "<b>Story: </b>" + story.title + "<br/>" +
            "Posted on: " + formatTime(story.timestamp) + "<br/>" +
            "Comments: " + story.postCount + "<br/>" +
            "Average score: " + story.score + "<br/>" +
            `URL: <a href='${story.url}'>${story.url}</a>`;
        d3.select("#info").html(msg);
    }
    function displayComment(comment){
        let msg = "<b>By: </b>" + comment.by + "<br/>" +
            "Posted on: " + formatTime(comment.timestamp) + "<br/>" +
            "Sub-Comments: " + comment.postCount + "<br/>" +
            `Text: ${comment.text}`;
        d3.select("#info").html(msg);
    }
});