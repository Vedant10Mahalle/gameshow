const socket = io();

let currentQuestion = null;
let currentRound = null;
let allQuestions = [];
let currentIndex = 0;
let revealedAnswers = new Set();

const QUALIFY_SCORE = 150;


/* -----------------------------
LOAD ROUND DATA
------------------------------*/
document.getElementById("roundSelector").addEventListener("change", async (e) => {

    const round = e.target.value;
    if (!round) return;

    try {

        let url = "";

        if (round === "round1") {
            url = "/questions/foff_round1.json";
        } else {
            url = "/questions/foff_round2.json";
        }

        const response = await fetch(url);
        const data = await response.json();

        allQuestions = [];

        if (data.sets) {
            data.sets.forEach(set => {
                allQuestions = allQuestions.concat(set.questions);
            });
        }

        if (data.matches) {
            data.matches.forEach(match => {
                allQuestions = allQuestions.concat(match.questions);
            });
        }

        currentRound = round;
        currentIndex = 0;
        revealedAnswers.clear();

        socket.emit("loadQuestions", { questions: allQuestions });

        displayQuestion(currentIndex);

    } catch (error) {

        console.error("Error loading round:", error);

    }

});


/* -----------------------------
DISPLAY QUESTION
------------------------------*/
function displayQuestion(index) {

    if (!allQuestions.length) return;
    if (index < 0 || index >= allQuestions.length) return;

    currentQuestion = allQuestions[index];

    const questionText = document.getElementById("questionText");

    if (questionText) {

        questionText.textContent = currentQuestion.question;

        socket.emit("broadcastCurrentQuestion", currentQuestion);

    }

    const answersList = document.getElementById("answersList");

    if (!answersList) return;

    answersList.innerHTML = "";

    if (!currentQuestion.answers) return;

    currentQuestion.answers.forEach((answer) => {

        if (!answer.answer) return;

        const isRevealed = revealedAnswers.has(answer.answer);

        const safeAnswer = answer.answer.replace(/'/g, "\\'");

        const row = document.createElement("div");

        row.className = "answer-row";

        row.innerHTML = `
        <div class="answer-text">
        ${answer.answer}
        <span class="answer-weight">(${answer.weight})</span>
        </div>

        <div class="answer-buttons">

        <button class="btn btn-small btn-team-a"
        onclick="revealAnswer('A','${safeAnswer}',${answer.weight})"
        ${isRevealed ? "disabled" : ""}>
        A
        </button>

        <button class="btn btn-small btn-team-b"
        onclick="revealAnswer('B','${safeAnswer}',${answer.weight})"
        ${isRevealed ? "disabled" : ""}>
        B
        </button>

        </div>
        `;

        answersList.appendChild(row);

    });

}


/* -----------------------------
REVEAL ANSWER
------------------------------*/
function revealAnswer(team, answerText, weight) {

    if (revealedAnswers.has(answerText)) return;

    revealedAnswers.add(answerText);

    socket.emit("revealAnswer", {

        team: team,

        answer: {
            answer: answerText,
            weight: weight
        }

    });

    displayQuestion(currentIndex);

}


/* -----------------------------
TEAM UPDATE
------------------------------*/
function updateTeams() {

    const teamA = document.getElementById("teamA").value || "Team A";
    const teamB = document.getElementById("teamB").value || "Team B";

    socket.emit("updateTeams", { teamA, teamB });

}


/* -----------------------------
RESET GAME
------------------------------*/
function resetGame() {

    if (!confirm("Reset all scores and strikes?")) return;

    revealedAnswers.clear();
    currentIndex = 0;

    socket.emit("resetGame");

    displayQuestion(currentIndex);

}


/* -----------------------------
SCORE CONTROL
------------------------------*/
function addScore(team) {

    const points = parseInt(document.getElementById("pointsInput").value) || 0;

    if (points <= 0) return;

    socket.emit("addScore", { team, points });

}

function deductScore(team) {

    const points = parseInt(document.getElementById("pointsInput").value) || 0;

    if (points <= 0) return;

    socket.emit("deductScore", { team, points });

}


/* -----------------------------
STRIKES
------------------------------*/
function addStrike(team) {

    socket.emit("addStrike", { team });

}

function resetStrikes() {

    socket.emit("resetStrikes");

}


/* -----------------------------
QUESTION NAVIGATION
------------------------------*/
function nextQuestion() {

    if (!allQuestions.length) return;

    if (currentIndex < allQuestions.length - 1) {

        currentIndex++;

        revealedAnswers.clear();

        socket.emit("resetStrikes");
        socket.emit("clearBoard");

        displayQuestion(currentIndex);

    }

}

function previousQuestion() {

    if (!allQuestions.length) return;

    if (currentIndex > 0) {

        currentIndex--;

        revealedAnswers.clear();

        socket.emit("resetStrikes");
        socket.emit("clearBoard");

        displayQuestion(currentIndex);

    }

}


/* -----------------------------
SERVER STATE UPDATE
------------------------------*/
socket.on("stateUpdate", (state) => {

    const scoreA = state.teamA.score;
    const scoreB = state.teamB.score;

    const qualifyMessage = document.getElementById("qualifyMessage");

    if (!qualifyMessage) return;

    if (scoreA >= QUALIFY_SCORE && scoreB >= QUALIFY_SCORE) {

        qualifyMessage.textContent =
            `${state.teamA.name} and ${state.teamB.name} both qualify!`;

    }

    else if (scoreA >= QUALIFY_SCORE) {

        qualifyMessage.textContent =
            `${state.teamA.name} qualifies for the next round!`;

    }

    else if (scoreB >= QUALIFY_SCORE) {

        qualifyMessage.textContent =
            `${state.teamB.name} qualifies for the next round!`;

    }

});


/* -----------------------------
SOCKET CONNECT
------------------------------*/
socket.on("connect", () => {

    console.log("Host connected to server");

});