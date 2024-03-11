const express = require('express');
const session = require('express-session');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;



app.use(express.static('static'))

app.use(express.json());


const loki_uri = process.env.LOKI;


const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");
const options = {
    transports: [
        new LokiTransport({
            host: loki_uri
        })
    ]
};

const logger = createLogger(options);

const http_requests_total = 0;
const login_total = 0;



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


// Use express-session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Middleware to check if user is logged in
app.use((req, res, next) => {
    http_requests_total++;
    if (req.session.username || req.path==='/redirect' || req.path==='/metrics' ) {
        if (req.session.username) {
            logger.info({ message: 'URL '+req.url , labels: { 'url': req.url, 'user': req.session.username } })
        }
        next();
    } else {
        // Redirect to auth server with OpenID parameters
        res.redirect(`http://localhost:3003/authorize?clientid=myclient&scope=openid&redirect_uri=/redirect`);
    }
});

app.get('/metrics', (req, res) => {
    res.send(`http_requests_total ${http_requests_total}\nlogin_total ${login_total}`);
});


app.get('/redirect',  (req, res) => {
   const {code} = req.query;

    axios.post('http://authorization-service:3003/token?code='+code, {
        code: code,
    }).then(response => {
        const decoded = jwt.verify(response.data.id_token, 'secret');

        req.session.username = decoded.secret;
        req.session.save((err) => {
            if (err) {
                console.log(err);
            }
            login_total++;
            res.redirect('/');
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        }
        axios.get('http://authorization-service:3003/disconnect').then(
            response => {
                res.redirect('/');
            }
        ).catch(err => {
            console.log(err);
            res.redirect('/');
        });
    });
});

app.get('/username', (req, res) => {
    res.send(req.session.username);
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/static/motus.html');
});

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

    axios.get('http://score-service:3002/getscore/?username=' + req.session.username)
        .then(response => {
            res.send(response.data);
        })
        .catch(error => {
            console.log(error);
            res.send({gamesWon: 0, attempts: 0});
        });

})

app.post('/score', (req, res) => {
    const body = req.body;
    body.username = req.session.username;

    axios.post('http://score-service:3002/setscore', body).then(r => {
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
