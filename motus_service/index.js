const express = require('express')
const axios = require('axios')
const app = express()
const port = process.env.PORT || 3000

app.use(express.static('static'));
app.use(express.json())

const request = require('request');


// get word list from file ./data/liste_francais_utf8.txt
// each line contains a word
const fs = require('fs')
const {hostname} = require("os");
const wordList = fs.readFileSync('./data/liste_francais_utf8.txt', 'utf8').split('\n');
const wordListClean = wordList.map(word => removeAccentsAndSpecialChars(word));

function removeAccentsAndSpecialChars(str) {
    str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    str = str.replace(/[^a-zA-Z]/g, '');

    return str;
}


function getIndex() {
    // Generate a random index based on the current day
    const date = new Date();
    const dayOfYear = getDayOfYear(date); // Fonction pour obtenir le jour de l'année
    const randomSeed = dayOfYear * 123456; // Utiliser le jour de l'année comme graine aléatoire
    const random = (randomSeed * 9301 + 49297) % 233280;
    const index = Math.floor(random / 233280 * wordListClean.length);
    return index;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return day;
}



const word = wordListClean[getIndex()];
console.log(word);

const charMap = {}
for (let i = 0; i < word.length; i++) {
    if (charMap[word[i]]) {
        charMap[word[i]] += 1
    } else {
        charMap[word[i]] = 1
    }
}



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/word', (req, res) => {
    res.send(word);
})


app.post('/in_dict', (req, res) => {
    const state = req.body.state;
    let wordTested = '';
    for (let i = 0; i < state.length; i++) {
        wordTested += state[i]["char"];
    }
    res.send(wordListClean.includes(wordTested));
})


app.post('/submit', (req, res) => {
    const state = req.body.state;

    res.send(updateState(state));

})


app.get('/score', (req, res) => {
    //call the application deployed on PORT 3002 with the end point /getscore

    console.log("calling score service");
    axios.get('http://score-service:3002/getscore')
        .then(response => {
            res.send(response.data);
        })
        .catch(error => {
            res.send({gamesWon: 0, attempts: 0});
        });

})

app.post('/score', (req, res) => {
        axios.post('http://score-service:3002/setscore', req.body).then(r => {
            res.send(r.data);
        });
})

function updateState(state) {
    const wordList = word.split('');
    const charMapCopy = Object.assign({}, charMap);
    state[0] = {
        "char": wordList[0],
        "status": 0
    }
    for (let i = 1; i < wordList.length; i++) {
        if (state.length < wordList.length) {
            state.push({
                "char": null,
                "status": 2
            })
        }
        if (wordList[i] === state[i]["char"]) {
            state[i]["status"] = 0;
            charMapCopy[state[i]["char"]] -= 1;
        }
    }

    for (let i = 1; i < wordList.length; i++) {
        if (wordList[i] !== state[i]["char"]) {
            if (charMapCopy[state[i]["char"]] > 0) {
                state[i]["status"] = 1;
                charMapCopy[state[i]["char"]] -= 1;
            } else {
                state[i]["status"] = 2;
            }
        }
    }

    return state;
}


app.get('/port', (req, res) => {
    res.send("SUMOT APP working on " + hostname() + " port " + port);
});


app.get('/healthcheck', (req, res) => {
    res.status(200).send("Heathcheck OK");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
