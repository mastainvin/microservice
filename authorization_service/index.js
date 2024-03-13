const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const redis = require('redis');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10; // Number of salt rounds for bcrypt


const app = express();

const cors = require('cors');
app.use(cors());

const client = redis.createClient({url: 'redis://redis:6380'});

// const client = redis.createClient();
app.use(bodyParser.urlencoded({ extended: true }));


(async () => {
    await client.connect();
})();


// Use the express-session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.get('/main', (req, res) => {
    const redirect_uri = req.session.redirect_uri || '/default'; // Modifier '/default' par l'URL par défaut souhaitée
    // generate a random code
    const code = crypto.randomBytes(16).toString('hex');
    // store the code in the database with the user
    client.set('codes:' + code, req.session.user).then(r => {
        const redirect_url = 'http://localhost:3005' + redirect_uri+ '?code=' + code;
        res.redirect(redirect_url);
    });

});


app.post('/token', (req, res) => {
    const { code } = req.query;
    // check if the code exists in the database
    client.get('codes:' + code).then(reply => {
        if (reply) {
            // if the code exists, return the user from the users db
            client.get('users:' + reply).then(user => {
                res.json({id_token: jwt.sign({ secret: reply, algorithms: ["HS256"] }, "secret")});
            });
        } else {
            res.status(400).send('Invalid code');
        }
    });
});

// disconnect (delete the session)
app.get('/disconnect', (req, res) => {
    req.session.destroy();
    res.send('Disconnected');
});


// Login form route
app.get('/login', (req, res) => {
    // Display login form
    res.sendFile(__dirname + '/static/login.html');
});

// Login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Retrieve password hash from Redis
    client.get('users:' + username).then(storedPasswordHash => {
        if (storedPasswordHash) {
            // Compare the provided password with the stored hash
            bcrypt.compare(password, storedPasswordHash, (err, result) => {
                if (result) {
                    // Passwords match, set the session user
                    req.session.user = username;
                    res.redirect('/main');
                } else {
                    res.send('Invalid username or password');
                }
            });
        } else {
            res.send('Invalid username or password');
        }
    });
});


// Register form route
app.get('/register', (req, res) => {
    // Display register form
    res.sendFile(__dirname + '/static/register.html');
});

// Registration form submission
app.post('/register', (req, res) => {
    const { username, password, confirmPassword } = req.body;
    // Check if the passwords match
    if (password !== confirmPassword) {
        res.send('Passwords do not match');
    } else {
        // Check if the username already exists in Redis

        const password_hash = bcrypt.hashSync(password, saltRounds);

        client.get('users:' + username)
            .then(reply => {
                if (reply) {
                    // If the username exists, send an error message
                    res.send('Username already exists');
                } else {
                    // If the username doesn't exist, create a new user
                    client.set('users:' + username, password_hash);
                    // Set the session user and redirect to main page
                    req.session.user = username;
                    res.redirect('/main');
                }
            });



    }
});

// Route for authorization
app.get('/authorize', (req, res) => {
    const { clientid, scope, redirect_uri } = req.query;

    if (clientid === 'myclient' && scope === 'openid') {

        if (req.session.user) {
            res.redirect('/main');
        } else {
            req.session.redirect_uri = redirect_uri;
            res.redirect("/login");
        }

    } else {
        // If client ID or score is incorrect, store redirect_uri in session and redirect to login
        res.send('Invalid client ID or score');
    }
});

// Start the server
const PORT = process.env.PORT || 3003;

app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});
