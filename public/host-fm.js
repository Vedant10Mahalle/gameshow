const socket = io();

let fmQuestions = [];
let currentQuestionIndex = -1;
let currentQuestion = null;
let revealedAnswers = [];
let currentActivePlayer = 'none';

/* -----------------------------
LOAD QUESTIONS
------------------------------*/

fetch('/questions/fm_questions.json')
    .then(r => r.json())
    .then(data => {

        if (data.sets && data.sets.length > 0) {

            fmQuestions = data.sets.flatMap(set => set.questions);

        } else if (data.questions) {

            fmQuestions = data.questions;

        } else {

            console.error('Unknown question format:', data);
            fmQuestions = [];

        }

        populateQuestionSelector();

    })
    .catch(err => console.error('Error loading FM questions:', err));


/* -----------------------------
QUESTION SELECTOR
------------------------------*/

function populateQuestionSelector() {

    const selector = document.getElementById('questionSelector');

    selector.innerHTML = '<option value="">Select a question...</option>';

    fmQuestions.forEach((q, idx) => {

        const option = document.createElement('option');

        option.value = idx;

        option.textContent = `Q${q.question_number}: ${q.question}`;

        selector.appendChild(option);

    });

}


function selectQuestion() {

    const idx = parseInt(document.getElementById('questionSelector').value);

    if (isNaN(idx)) return;

    currentQuestionIndex = idx;

    currentQuestion = fmQuestions[idx];

    revealedAnswers = [];

    displayQuestion();

}


/* -----------------------------
DISPLAY QUESTION
------------------------------*/

function displayQuestion() {

    if (!currentQuestion) return;

    document.getElementById('questionText').textContent = currentQuestion.question;

    socket.emit("broadcastCurrentQuestion", currentQuestion);

    const answersList = document.getElementById('answersList');

    answersList.innerHTML = '';

    currentQuestion.answers.forEach((answer) => {

        const revealedData = revealedAnswers.find(r => r.answer === answer.answer);

        const isRevealed = !!revealedData;

        const safeAnswer = answer.answer.replace(/'/g, "\\'");

        const answerRow = document.createElement('div');

        answerRow.className = `answer-row ${isRevealed ? 'revealed' : ''}`;

        const btnHtml = isRevealed
            ? `<div style="color:#ff1744;font-weight:bold;">
           Already selected by ${revealedData.team}${revealedData.playerIndex + 1}
           </div>`
            :
            `
        <button class="btn btn-small btn-team-a"
        onclick="revealAnswer('A',0,'${safeAnswer}',${answer.weight})">A1</button>

        <button class="btn btn-small btn-team-a"
        onclick="revealAnswer('A',1,'${safeAnswer}',${answer.weight})">A2</button>

        <button class="btn btn-small btn-team-b"
        onclick="revealAnswer('B',0,'${safeAnswer}',${answer.weight})">B1</button>

        <button class="btn btn-small btn-team-b"
        onclick="revealAnswer('B',1,'${safeAnswer}',${answer.weight})">B2</button>
        `;

        answerRow.innerHTML = `
        <div class="answer-text">
        ${answer.answer}
        <span class="answer-weight">(${answer.weight})</span>
        </div>

        <div class="answer-buttons">
        ${btnHtml}
        </div>
        `;

        answersList.appendChild(answerRow);

    });

}


/* -----------------------------
REVEAL ANSWER
------------------------------*/

function revealAnswer(team, playerIndex, answerText, weight) {

    if (currentActivePlayer === 'none') {

        alert('⚠️ Please select an Active Player first');

        return;

    }

    const exists = revealedAnswers.find(a => a.answer === answerText);

    if (exists) return;

    revealedAnswers.push({

        answer: answerText,
        team: team,
        playerIndex: playerIndex

    });

    socket.emit('revealAnswer', {

        team,
        playerIndex,

        answer: {
            answer: answerText,
            weight: weight
        }

    });

    displayQuestion();

    setTimeout(() => {

        nextQuestion();

    }, 600);

}


/* -----------------------------
QUESTION NAVIGATION
------------------------------*/

function nextQuestion() {

    if (currentQuestionIndex < fmQuestions.length - 1) {

        currentQuestionIndex++;

        document.getElementById('questionSelector').value = currentQuestionIndex;

        currentQuestion = fmQuestions[currentQuestionIndex];

        displayQuestion();

    }

}

function prevQuestion() {

    if (currentQuestionIndex > 0) {

        currentQuestionIndex--;

        document.getElementById('questionSelector').value = currentQuestionIndex;

        currentQuestion = fmQuestions[currentQuestionIndex];

        displayQuestion();

    }

}


/* -----------------------------
BOARD
------------------------------*/

function clearBoard() {

    revealedAnswers = [];

    socket.emit('clearBoard');

}

function markCross() {

    if (currentActivePlayer === 'none') {

        alert('⚠️ Select Active Player first');

        return;

    }

    socket.emit('markCross');

    setTimeout(() => {

        nextQuestion();

    }, 600);

}


/* -----------------------------
PLAYERS
------------------------------*/

function updatePlayers() {

    const teamA = document.getElementById('teamA').value || 'Team A';

    const teamB = document.getElementById('teamB').value || 'Team B';

    const playersA = [

        document.getElementById('playerA1').value || 'Player A1',

        document.getElementById('playerA2').value || 'Player A2'

    ];

    const playersB = [

        document.getElementById('playerB1').value || 'Player B1',

        document.getElementById('playerB2').value || 'Player B2'

    ];

    socket.emit('updateTeams', { teamA, teamB });

    socket.emit('updatePlayers', { playersA, playersB });

}


/* -----------------------------
ACTIVE PLAYER
------------------------------*/

function setActivePlayer() {

    const player = document.getElementById('activePlayerSelector').value;

    socket.emit('setActivePlayer', { player });

    if (player !== 'none') {

        revealedAnswers = [];

        socket.emit('clearBoard');

    }

}


/* -----------------------------
SCORE
------------------------------*/

function addScore(team, playerIndex) {

    const points = parseInt(document.getElementById('pointsInput').value) || 0;

    if (points > 0) {

        socket.emit('addScore', { team, playerIndex, points });

    }

}


/* -----------------------------
TIMER
------------------------------*/

function startTimer() {

    const duration = parseInt(document.getElementById('timerInput').value) || 60;

    socket.emit('startTimer', { duration });

}

function stopTimer() {

    socket.emit('stopTimer');

}

function resetTimer() {

    socket.emit('resetTimer');

    document.getElementById('timerDisplay').textContent = '00:00';

}


/* -----------------------------
END GAME
------------------------------*/

function showTeamScore(team) {

    socket.emit('showTeamScore', { team });

}

function showWinner() {

    socket.emit('showWinner');

}

function hideRevealScreen() {

    socket.emit('hideRevealScreen');

}

function showThankYou() {

    if (confirm('End the game and show Thank You screen?')) {

        socket.emit('showThankYou');

    }

}

function resetGame() {

    if (confirm("Reset entire game?")) {

        socket.emit("resetGame");

        revealedAnswers = [];

        document.getElementById("pointsInput").value = "0";

    }

}


/* -----------------------------
SOCKET EVENTS
------------------------------*/

socket.on('timerUpdate', (seconds) => {

    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    document.getElementById('timerDisplay').textContent =
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

});


socket.on('scoreUpdate', (scores) => {

    document.getElementById('scoreA').value = scores.teamA;

    document.getElementById('scoreB').value = scores.teamB;

});


socket.on('stateUpdate', (state) => {

    document.getElementById('scoreA').value = state.teamA.score;

    document.getElementById('scoreB').value = state.teamB.score;

    currentActivePlayer = state.activePlayer || 'none';

    const sel = document.getElementById('activePlayerSelector');

    if (sel && sel.value !== state.activePlayer) {

        sel.value = state.activePlayer || 'none';

    }

});


socket.on('connect', () => {

    console.log('Connected to FM Host server');

});