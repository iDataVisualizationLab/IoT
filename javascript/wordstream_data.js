function loadNewsData(rawData, draw) {
    //<editor-fold desc="process stopwords">
    let stopWords = ["a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"];
    let removeWords = ["iot", "internet", "things", "--", "will"];
    stopWords = stopWords.concat(removeWords);
    function sanitizeWord(word){
        word = word.replace('"', '');
        word = word.replace("?", '');
        word = word.replace("\.", '');
        word = word.replace(",", '');
        word = word.replace(":", '');
        word = word.replace("'", '');
        word = word.replace("\[", '');
        word = word.replace("\]", '');
        word = word.replace("\(", '');
        word = word.replace("\)", '');
        word = word.replace("‘", '');
        word = word.replace("“", '');
        word = word.replace("”", '');
        word = word.replace("-$", '');
        return word;
    }
    function removeStopWords(words, stopWords) {
        let result = [];
        words.forEach(w => {
            if (stopWords.indexOf(w.toLowerCase()) < 0) {
                result.push(w);
            }
        });
        let result1 = [];
        result.forEach(d => {
            if (d.length >= 2) {
                result1.push(d);
            }
        });
        result = result1;
        return result;
    }
    //</editor-fold>

    let outputFormat = d3.timeFormat('%Y');
    let data = {};
    let topic = "IoT";
    rawData.forEach(d => {
        let date = new Date(d.timestamp);
        date = outputFormat(date);
        if (!data[date]) data[date] = {};
        data[date][topic] = data[date][topic] ? (data[date][topic] + ' ' + d.title) : (d.title);
    });

    data = d3.keys(data).map(function (date) {
        let words = {};
        var raw = {};
        raw[topic] = data[date][topic].split(' ');
        raw[topic] = raw[topic].map(d=>sanitizeWord(d));
        raw[topic] = removeStopWords(raw[topic], stopWords);
        //Count word frequencies
        var counts = raw[topic].reduce(function (obj, word) {
            if (!obj[word]) {
                obj[word] = 0;
            }
            obj[word]++;
            return obj;
        }, {});
        //Convert to array of objects
        words[topic] = d3.keys(counts).map(function (d) {
            return {
                text: d,
                frequency: counts[d],
                topic: topic
            }
        }).sort(function (a, b) {//sort the terms by frequency
            return b.frequency - a.frequency;
        }).filter(function (d) {//filter out empty words
            return d.text;
        });
        words[topic] = words[topic].slice(0, d3.min([words[topic].length, 450]))
        return {
            date: date,
            words: words
        }
    }).sort(function (a, b) {//sort by date
        return outputFormat(a.date) - outputFormat(b.date);
    });
    draw(data);
}

