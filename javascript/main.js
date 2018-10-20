// START: loader spinner settings ****************************
var opts = {
    lines: 25, // The number of lines to draw
    length: 15, // The length of each line
    width: 5, // The line thickness
    radius: 25, // The radius of the inner circle
    color: '#000', // #rgb or #rrggbb or array of colors
    speed: 2, // Rounds per second
    trail: 50, // Afterglow percentage
    className: 'spinner', // The CSS class to assign to the spinner
};
var target = document.getElementById('loadingSpinner');
var spinner = new Spinner(opts).spin(target);
// END: loader spinner settings ****************************

let mainsvg = d3.select("#mainsvg"),
    svgWidth = 1600,
    svgHeight = 900,
    // svgWidth = window.outerWidth,
    // svgHeight = window.outerHeight,
    axisHeight = 40,
    margin = {top: 40, right: 40, bottom: 40, left: 80, axisx: 40, axisy: 40, storyTop: 20},
    width = svgWidth - margin.left - margin.right - margin.axisx,
    height = svgHeight - margin.top - margin.storyTop - margin.axisx - margin.bottom,
    wordStreamHeight = 200,
    wordStreamWidth = width,
    clicked = false,
    links = null,
    axisx = null,
    authorScoreAxis = null,
    storyScoreAxis = null,
    storyHeight = authorHeight = commentHeight = (height - wordStreamHeight) / 3,
    authorStartY = 0 + wordStreamHeight,
    authorEndY = authorStartY + authorHeight,
    storyStartY = authorEndY + margin.storyTop,
    storyEndY = storyStartY + storyHeight,
    commentStartY = storyStartY + storyHeight + axisHeight,

    scaleX = d3.scaleLinear().rangeRound([0, width]),
    scaleAuthorScore = d3.scaleLog().rangeRound([authorEndY, authorStartY]),
    scaleStoryScore = d3.scaleLog().rangeRound([storyEndY, storyStartY]),
    scaleScore = d3.scaleLog().rangeRound([authorHeight, 0]),

    scaleRadius = d3.scaleLinear().rangeRound([2, 9]),
    mainGroup = mainsvg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`),
    dispatch = d3.dispatch("up", "down");

mainsvg.attr("width", svgWidth).attr("height", svgHeight);
let self = null;
let currentScoreRange = null;
d3.json("data/iothackernews.json", function (error, rawData) {
    self = this;
    if (error) throw error;
    //<editor-fold desc="process data">
    //take data from 2011 or later only
    rawData = rawData.filter(d => d.timestamp >= new Date("2011-01-01"));
    let rawStories = extractStories(rawData);

    function extractStories(data) {
        let stories = [];
        data.forEach(d => {
            //initialize all level as 0//this will get increased later-on when we count.
            d.commentLevel = 0;
            d.postCount = countAllComments(d.id, data);
            if (d.type === "story") {
                stories.push(d);
            }
        });
        return stories;
    }

    function getChildren(postId, data) {

        let result = data.filter(d => d.parent === postId);
        result.forEach(comment => {
            comment.commentLevel += 1;
        });
        return result;
    }

    function getChildrenOfNode(node, data) {
        let result = [];
        if (node.type === "word") {
            let authors = wordAuthors[node.id];
            result = data.filter(p => (p.type === "author") && authors.indexOf(p.id) >= 0);
        }
        else if (node.type === "author") {
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

    function getAuthor(post, data) {
        let result = data.filter(d => d.by === post.by && d.type === "author");
        return result;
    }

    function getParent(post, data) {
        let result = [];
        if (post.type === "author") {
            let words = authorWords[post.id];
            if (words) {
                words.forEach(word => {
                    try {
                        result.push(d3.select("#id" + word).datum());
                    } catch (error) {
                        console.log("invalid id #id" + word);
                        console.log(error);
                    }
                });
            }
            return result;
        } else {
            result = data.filter(d => d.id === post.parent).concat(getAuthor(post, data));
            return result;
        }
        return result;
    }

    //</editor-fold>
    //The slider is based on rawData
    scaleX.domain(d3.extent(rawData.map(d => +d.timestamp)));
    let scoreDomain = d3.extent(rawStories.map(d => +d.score));
    scaleScore.domain(scoreDomain);

    //The data
    let allData = null;

    links = mainGroup.append("g")
        .attr("class", "links")
        .attr("transform", `translate(${margin.axisx}, 0)`);

    let cellGroup = mainGroup.append("g")
        .attr("class", "cells")
        .attr("transform", `translate(${margin.axisx}, 0)`);
    self.updateDisplay = function updateDisplay(scoreRange) {

        //Filter stories
        let data = rawData.filter(d => {
            if (d.type !== "story") {
                return true;
            } else {
                return d.score >= scoreRange[0] && d.score <= scoreRange[1];
            }
        });
        let word = document.getElementById("theWord").value;
        if (word) {
            data = data.filter(d=> d.type!=="story" || d.title.toLowerCase().indexOf(word.toLowerCase())>=0)
        }
        let stories = extractStories(data);
        ////TODO: Shouldn't remove all but add/update/exit merge
        //Remove axis for author + story scores since we changed it
        if (authorScoreAxis) authorScoreAxis.remove();
        if (storyScoreAxis) storyScoreAxis.remove();

        loadNewsData(stories, draw);//load the hacker news stories (only title) to display for the word stream
        let authors = processAuthors(data); //load authors data
        allData = data.concat(authors); //add authors data to the list of nodes.

        let scoreDomain = d3.extent(stories.map(d => +d.score));//new score domain after filtering
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
            .on("tick", ticked);

        function ticked() {
            circles.transition().attr("transform", d => `translate(${d.x}, ${d.y})`);
        }

        //</editor-fold>

        //<editor-fold desc="axis">
        let xAxisScale = d3.scaleBand().domain(dateLabels).range([0, width]);
        axisx = mainGroup.append("g")
            .attr("class", 'axis axis--x')
            .attr("transform", `translate(${margin.axisx},${storyStartY + storyHeight + margin.axisx})`)
            .call(d3.axisBottom(xAxisScale));

        authorScoreAxis = mainGroup.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(scaleAuthorScore).ticks(10, ".0s"));

        storyScoreAxis = mainGroup.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(scaleStoryScore).ticks(10, ".0s"));

        //</editor-fold>

        let cells = cellGroup.selectAll("circle").data(allData);
        let circles = cells.enter().append("circle")
            .merge(cells)
            .attr("id", d => "id" + d.id)
            .attr("r", d => scaleRadius(Math.sqrt(d.postCount)))
            .attr("fill", d => d.type === "story" ? "#000" : "steelblue")
            .on("mouseover", (d) => {
                if (!clicked) {
                    mainGroup.selectAll("circle").classed("faded", true);
                    mainGroup.selectAll(".wordletext").classed("faded", true);

                    d3.select("#info").style("display", "inline");
                    if (d.type === "author") {
                        displayAuthor(d);
                    }
                    if (d.type === "story") {
                        displayStory(d);
                    }
                    if (d.type === "comment") {
                        displayComment(d);
                    }
                    dispatch.call("up", null, d);
                    dispatch.call("down", null, d);
                }
            })
            .on("mouseleave", () => {
                if (!clicked) {
                    mainGroup.selectAll(".faded").classed("faded", false);
                    d3.select("#info").style("display", "none");
                    links.selectAll("*").remove();
                    mainGroup.selectAll(".brushed").classed("brushed", false);
                }
            })
            .on("click", () => {
                clicked = !clicked;
            })

        cells.exit().remove();

        //Calculate the position
        for (let i = 0; i < 50; i++) {
            simulation.tick();
        }

        spinner.stop();
    }
    dispatch.on("up", node => {
        let selection = d3.select("#id" + node.id);
        selection.classed("faded", false);
        if (node.type !== "word") {//brush if it is not text
            selection.classed("brushed", true);
        }
        let parents = getParent(node, allData);
        //If the parents are words (parents of author) then we need to check if the word is displayed.
        if (node.type === "author") {
            parents = parents.filter(p => p.placed);
        }
        //brush the nodes (except the text)
        parents.forEach(p => {
            let selection = d3.select("#id" + p.id);
            selection.classed("faded", false);
            if (p.type !== "word") {//brush if it is not text
                selection.classed("brushed", true);
            }
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
            .attr("opacity", 0.9)
            .style("pointer-events", "none");
        parents.forEach(p => {
            //bubble up all the parents
            dispatch.call("up", null, p);
        });

    });
    dispatch.on("down", node => {
        let children = getChildrenOfNode(node, allData);
        let selection = d3.select("#id" + node.id);
        selection.classed("faded", false);
        if (node.type !== "word") {
            selection.classed("brushed", true)
        }

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
            .attr("opacity", 0.9)
            .style("pointer-events", "none");
        children.forEach(c => {
            //bubble up all the parents
            dispatch.call("down", null, c);
        });
    });

    function displayAuthor(author) {
        let msg = "<b>Author: </b>" + author.id + "<br/>" +
            "Posts: " + author.postCount + "<br/>" +
            "Average score: " + author.score;
        d3.select("#info").html(msg);
    }

    function displayStory(story) {
        let msg = "<b>Story: </b>" + story.title + "<br/>" +
            "Posted on: " + formatTime(story.timestamp) + "<br/>" +
            "Comments: " + story.postCount + "<br/>" +
            "Average score: " + story.score + "<br/>" +
            `URL: <a href='${story.url}'>${story.url}</a>`;
        d3.select("#info").html(msg);
    }

    function displayComment(comment) {
        let msg = "<b>By: </b>" + comment.by + "<br/>" +
            "Posted on: " + formatTime(comment.timestamp) + "<br/>" +
            "Sub-Comments: " + comment.postCount + "<br/>" +
            `Text: ${comment.text}`;
        d3.select("#info").html(msg);
    }

    function formatTime(unix_timestamp) {
        let date = new Date(unix_timestamp),
            year = date.getFullYear(),
            month = date.getMonth(),
            day = date.getDate(),
            formattedTime = year + '-' + (month + 1) + '-' + day;
        return formattedTime;
    }

    document.onkeyup = function (e) {
        if (e.key === "Escape") {
            clicked = false;
        }
    };
    //<editor-fold: desc="section for the slider">
    let brushWidth = 6;
    let brush = d3.brushY().extent([[0, 0], [brushWidth, storyHeight]]).on("end", function () {
        currentScoreRange = d3.event.selection.map(scaleScore.invert).reverse();
        updateDisplay(currentScoreRange);
    });
    let brushGroup = mainsvg.append("g").attr("class", "brush")
        .attr("transform", `translate(${(margin.left - brushWidth) / 2}, ${margin.top + storyStartY})`);
    let scoreAxis = brushGroup.append("g")
        .attr("class", "axis axis--y");
    scoreAxis
        .call(d3.axisLeft(scaleScore).ticks(10, ".0s"));

    brushGroup.call(brush);
    brushGroup.selectAll(".overlay").style("fill", '#888');
    brushGroup.selectAll(".selection").style("fill", null).attr("fill-opacity", 1).style("fill", "#ddd");
    brushGroup.selectAll("rect.handle").style('fill', "#aaa");
    brush.move(brushGroup, scaleScore.range().reverse());

//</editor-fold>
});

function searchWord() {
    self.updateDisplay(currentScoreRange);
}