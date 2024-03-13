$(document).ready(function() {
    let state = [];
    let pointer = 1;
    let remainingAttempts = null;
    let gamesWon = 0;
    let attempts = 0;

    $.ajax({
        url: '/username',
        type: 'GET',
        success: function(data) {
            if (data) {
                $("#username").html(data);
            }
        }
    });


    $("#logout").click(function() {
        $.ajax({
            url: '/logout',
            type: 'GET',
            success: function(data) {
                window.location.href = "/";
            }
        });
    });


    initGame();
    function initGame() {
        state = [];
        pointer = 1;
        remainingAttempts = null;


        // remove previous words
        $("#previousWords").html("");

        // get new state
        $.ajax({
            url: '/submit',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                "state": state
            }),
            success: function(data) {
                state = data;
                remainingAttempts = Math.floor(state.length / 2);
                printState(data);
                showAttempts();
            }
        });



        get_score_from_bdd();
    }

    function update_score() {
        let avg = 0;
        if (gamesWon !== 0) {
            avg = attempts / gamesWon;
        }
        $('#score').html("Games won: " + gamesWon + " - Avg: " + avg.toFixed(2));
    }

    function get_score_from_bdd() {
        $.ajax({
            url: '/score',
            type: 'GET',
            success: function(data) {
                gamesWon = data.gamesWon;
                attempts = data.attempts;
                update_score();
            }
        });
    }

    function set_score_in_bdd(gamesWon, attempts) {
        $.ajax({
            url: '/score',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                "gamesWon": gamesWon,
                "attempts": attempts
            }),
            success: function(data) {
                get_score_from_bdd();
            }
        });
    }

    function printState() {
        $('#word').html(createHTML());
    }

    function createHTML() {
        let resultHtml = '';
        for (let i = 0; i < state.length; i++) {
            if (state[i]["status"] === 0) {
                resultHtml += createSpan(state[i]["char"], "GOOD", i);
            } else if (state[i]["status"] === 1) {
                resultHtml += createSpan(state[i]["char"], "BAD", i);
            } else {
                if (state[i]["char"]) {
                    resultHtml += createSpan(state[i]["char"], "WRONG", i);
                } else {
                    resultHtml += createSpan(" ", "WRONG", i);
                }
            }
        }

        return "<div class='word'>" + resultHtml + "</>";
    }


    function createSpan(letter, mode,index) {
        switch (mode) {
            case "GOOD":
                if (index === pointer) {
                    return `<span class="letter_box good selected">${letter}</span>`;
                }
                return `<span class="letter_box good">${letter}</span>`;
            case "WRONG":
                if (index === pointer) {
                    return `<span class="letter_box wrong selected">${letter}</span>`;
                }

                return `<span class="letter_box">${letter}</span>`;
            case "BAD":
                if (index === pointer) {
                    return `<span class="letter_box bad selected">${letter}</span>`;
                }
                return `<span class="letter_box bad">${letter}</span>`;
        }
    }


    $(document).keydown(function(event) {
        const keyPressed = event.key.toLowerCase();

        if (keyPressed.length === 1 && keyPressed.match(/[a-z]/) && pointer < state.length) {
            addLetter(keyPressed);
        } else if (keyPressed === 'backspace' && pointer > 1) {
            backspace();
        } else if (keyPressed === 'enter' && state.every((el) => el["char"] !== null)){
            isInDict().then((inDict) => {
                if (inDict) {
                    submitWord();
                } else {
                    alert("This word is not in the dictionary");
                }
            });
        }
    });

    function addLetter(keyPressed) {
        // change state
        state[pointer] = {"char": keyPressed, "status": 2};

        // move pointer
        pointer++;

        // go to first letter not found
        while (pointer < state.length && state[pointer]["status"] === 0) {
            pointer++;
        }
        printState();
    }

    function backspace() {
        // return to first letter not found
        let tmpPointer = pointer;
        while (pointer > 1 && state[pointer-1]["status"] === 0) {
            pointer--;
        }

        // if every letter is good then return to last letter
        if (state[pointer-1]["status"] === 0) {
            pointer = tmpPointer;
        }

        // remove last letter
        if (state[pointer-1]["status"] !== 0) {

            // change state
            state[pointer-1] = {"char": null, "status": 2};

            // move pointer
            pointer--;

            // go to first letter not found
            let tmpPointer = pointer;
            while (pointer > 1 && state[pointer]["status"] === 0) {
                pointer--;
            }
            if (state[pointer-1]["status"] === 0) {
                pointer = tmpPointer;
            }
        }
        printState();
    }
    async function isInDict() {
        let inDict = false;
        await $.ajax({
            url: '/in_dict',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                "state": state
            }),
            success: function (in_dict) {
                inDict = in_dict;
            }
        })
        return inDict;
    }


    function submitWord() {
        $.ajax({
            url: '/submit',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                "state": state
            }),
            success: function(data) {
                state = data;
                attempts++;
                saveState();

                // if every letter is good
                if (state.every((el) => el["status"] === 0)) {
                    printState();
                    alert("You won!");
                    set_score_in_bdd(gamesWon+1, attempts);
                    initGame();
                } else {
                    // not won


                    // go to first letter not found
                    pointer = 1;


                    // remove all letters
                    for (let i = 1; i < state.length; i++) {
                        state[i] = {"char": null, "status": 2};
                    }

                    printState();

                    // decrease remaining attempts
                    remainingAttempts--;
                    if (remainingAttempts <= 0) {
                        alert("You lost!");
                        set_score_in_bdd(gamesWon, attempts);
                        initGame();
                    }

                    showAttempts();
                }
            }
        });
    }

    function showAttempts() {
        $('#attempts').html("");
        for (let i = 0; i < remainingAttempts; i++) {
            $('#attempts').append('<i class="fa-solid fa-heart heart" ></i>');
        }
    }

    function saveState() {
        $('#previousWords').append(createHTML());
    }
});