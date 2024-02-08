const express = require('express')
const app = express()
const port = 3000

app.use(express.static('static'));
app.use(express.json())


// get word list from file ./data/liste_francais_utf8.txt
// each line contains a word
const fs = require('fs')
const wordList = fs.readFileSync('./data/liste_francais_utf8.txt', 'utf8').split('\n')


function getIndex() {
    // Generate a random index based on the current day
    const date = new Date();
    const dayOfYear = getDayOfYear(date); // Fonction pour obtenir le jour de l'année
    const randomSeed = dayOfYear * 123456; // Utiliser le jour de l'année comme graine aléatoire
    const random = (randomSeed * 9301 + 49297) % 233280;
    const index = Math.floor(random / 233280 * wordList.length);
    return index;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const day = Math.floor(diff / oneDay);
    return day;
}


const word = wordList[getIndex()]
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
    res.send(word)
})


app.post('/in_dict', (req, res) => {
    const state = req.body.state;
    let wordTested = '';
    for (let i = 0; i < state.length; i++) {
        wordTested += state[i]["char"];
    }
    wordTested += word[word.length-1];
    res.send(wordList.includes(wordTested));
})


app.post('/submit', (req, res) => {
    const state = req.body.state;

    res.send(updateState(state));
})

function updateState(state) {
    const wordList = word.split('');
    const charMapCopy = Object.assign({}, charMap);
    state[0] = {
        "char": wordList[0],
        "status": 0
    }
    for (let i = 1; i < wordList.length-1; i++) {
        if (state.length < wordList.length-1) {
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

    for (let i = 1; i < wordList.length-1; i++) {
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


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
