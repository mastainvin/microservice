const express = require('express');
const bodyParser = require('body-parser');
const redis = require('redis');

const { Resolver } = require('dns');
const resolver = new Resolver();
resolver.setServers(['127.0.0.11']); // Docker's embedded DNS server

resolver.resolve4('redis', (err, addresses) => {
    if (err) {
        console.error('Error resolving redis address:', err);
    } else {
        console.log('Resolved redis address:', addresses);
    }
});


const app = express();

const cors = require('cors');
app.use(cors());

const client = redis.createClient({
    url: 'redis://redis:6380'
});

(async () => {
    await client.connect();
})();

client.on('connect', () => {
    console.log('Connected to Redis');
});


client.on('error', err => {
    console.error(err);
});





app.use(bodyParser.json());

// Endpoint to get the score
app.get('/getscore', (req, res) => {
    const {username} = req.query;
    client.get('score:' + username)
        .then(reply => {
            let score;
            console.log(reply);
            if (reply) {
                score = JSON.parse(reply);
            } else {
                // If score doesn't exist, initialize with default values
                score = {gamesWon: 0, attempts: 0};
                client.set('score:' + username, JSON.stringify(score)).then(() => {
                    console.log('Score initialized');
                });
            }
            console.log('Getting score:', username, score);
            res.json(score);
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error getting score');
        });
});

// Endpoint to set the score
app.post('/setscore',  (req, res) => {
    const {username, gamesWon, attempts} = req.body;
    if (isNaN(gamesWon) || isNaN(attempts)) {
        res.status(400).send('Games won and attempts must be numbers');
        return;
    }
    const score = JSON.stringify({gamesWon, attempts});
    console.log('Setting score:', username, score);
    client.set('score:' + username, score)
        .then(reply => {
            res.send('Score updated successfully');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error setting score');
        });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
