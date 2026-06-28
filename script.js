// ========== CONSTANTS ==========
const MAX_PLAYERS = 9;
const DEFAULT_CHIPS = 1000;
const DEFAULT_FIRST_PLACE_PAYOUT = 1000;
const MONTE_CARLO_SAMPLES = 10000;

let players = [];
let payouts = [];

const numPlayersSelect = document.getElementById('numPlayers');
const playerInputsDiv = document.getElementById('playerInputs');
const payoutInputsDiv = document.getElementById('payoutInputs');
const playerCountBadge = document.getElementById('playerCountBadge');
const payoutCountBadge = document.getElementById('payoutCountBadge');
const resultsDiv = document.getElementById('results');
const resultsContent = document.getElementById('resultsContent');
const loadingDiv = document.getElementById('loading');
const calculateBtn = document.getElementById('calculateBtn');
const explanationDiv = document.getElementById('explanation');
const progressText = document.getElementById('progressText');
const resetBtn = document.getElementById('resetBtn');
const addPayoutsBtn = document.getElementById('addPayoutsBtn');
const themeToggleBtn = document.querySelector('.theme-toggle');

numPlayersSelect.value = 2;
updatePlayerInputs();
updatePayoutInputs();
loadThemePreference();

numPlayersSelect.addEventListener('change', () => {
    updatePlayerInputs();
    updatePayoutInputs();
});

resetBtn.addEventListener('click', resetForm);
addPayoutsBtn.addEventListener('click', addDefaultPayouts);
calculateBtn.addEventListener('click', calculateICM);
themeToggleBtn.addEventListener('click', toggleTheme);

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function updatePlayerInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);
    playerInputsDiv.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const playerRow = document.createElement('div');
        playerRow.className = 'player-row';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Player ${i + 1}`;
        nameInput.value = `Player ${i + 1}`;

        const stackInput = document.createElement('input');
        stackInput.type = 'number';
        stackInput.placeholder = 'Chip stack';
        stackInput.min = '1';
        stackInput.value = DEFAULT_CHIPS;

        playerRow.appendChild(nameInput);
        playerRow.appendChild(stackInput);
        playerInputsDiv.appendChild(playerRow);
    }

    playerCountBadge.textContent = `${numPlayers} players`;
}

function updatePayoutInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);
    payoutInputsDiv.innerHTML = '';

    for (let i = 0; i < numPlayers; i++) {
        const payoutRow = document.createElement('div');
        payoutRow.className = 'payout-row';

        const placeLabel = document.createElement('label');
        placeLabel.textContent = `${i + 1}th place payout ($)`;

        const payoutInput = document.createElement('input');
        payoutInput.type = 'number';
        payoutInput.placeholder = '0';
        payoutInput.min = '0';
        payoutInput.value = i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0;

        payoutRow.appendChild(placeLabel);
        payoutRow.appendChild(payoutInput);
        payoutInputsDiv.appendChild(payoutRow);
    }

    payoutCountBadge.textContent = `${numPlayers} places`;
}

function collectInputs() {
    const numPlayers = parseInt(numPlayersSelect.value);
    const playerRows = playerInputsDiv.querySelectorAll('.player-row');
    players = [];
    for (let i = 0; i < numPlayers; i++) {
        const inputs = playerRows[i].querySelectorAll('input');
        const name = inputs[0].value.trim() || `Player ${i + 1}`;
        const stack = Math.max(1, parseInt(inputs[1].value) || DEFAULT_CHIPS);
        players.push({ name, stack });
    }

    const payoutRows = payoutInputsDiv.querySelectorAll('.payout-row');
    payouts = [];
    for (let i = 0; i < numPlayers; i++) {
        const input = payoutRows[i].querySelector('input');
        const payout = Math.max(0, parseInt(input.value) || (i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0));
        payouts.push(payout);
    }
    return { players, payouts };
}

function resetForm() {
    playerInputsDiv.querySelectorAll('input').forEach(input => {
        if (input.type === 'text') input.value = '';
        else input.value = DEFAULT_CHIPS;
    });
    payoutInputsDiv.querySelectorAll('input').forEach((input, i) => {
        input.value = i === 0 ? DEFAULT_FIRST_PLACE_PAYOUT : 0;
    });
    players = [];
    payouts = [];
    resultsDiv.style.display = 'none';
    explanationDiv.style.display = 'none';
}

function addDefaultPayouts() {
    const numPlayers = parseInt(numPlayersSelect.value);
    const payoutRows = payoutInputsDiv.querySelectorAll('.payout-row');
    const tournamentPayouts = {
        2: [100, 50],
        3: [100, 60, 40],
        4: [100, 70, 50, 30],
        5: [100, 70, 55, 40, 25],
        6: [100, 75, 60, 45, 30, 20],
        7: [100, 75, 65, 50, 35, 25, 15],
        8: [100, 80, 70, 60, 45, 35, 25, 15],
        9: [100, 80, 70, 60, 50, 40, 30, 20, 10]
    };
    const selectedPayouts = tournamentPayouts[numPlayers] || new Array(numPlayers).fill(0);
    payoutRows.forEach((row, i) => {
        const input = row.querySelector('input');
        if (selectedPayouts[i] !== undefined) {
            input.value = selectedPayouts[i] * 1000;
        }
    });
    payouts = selectedPayouts.map(p => p * 1000);
}

function approximateICMWithMonteCarlo(stacks, payouts, samples = MONTE_CARLO_SAMPLES) {
    const n = stacks.length;
    const totalChips = stacks.reduce((sum, stack) => sum + stack, 0);
    const totalPayout = payouts.reduce((sum, p) => sum + p, 0);
    const icmValues = new Array(n).fill(0.0);
    for (let s = 0; s < samples; s++) {
        const permutation = [];
        const remainingStacks = [...stacks];
        for (let i = 0; i < n; i++) {
            const totalRemaining = remainingStacks.reduce((sum, stack) => sum + stack, 0);
            const random = Math.random() * totalRemaining;
            let cumulative = 0;
            let selectedIndex = 0;
            for (let j = 0; j < remainingStacks.length; j++) {
                cumulative += remainingStacks[j];
                if (random <= cumulative) {
                    selectedIndex = j;
                    break;
                }
            }
            permutation.push(remainingStacks.splice(selectedIndex, 1)[0]);
        }
        let probability = 1.0;
        let remaining = totalChips;
        for (let i = 0; i < n; i++) {
            const stack = permutation[i];
            probability *= stack / remaining;
            remaining -= stack;
        }
        for (let pos = 0; pos < n; pos++) {
            const playerIdx = stacks.indexOf(permutation[pos]);
            icmValues[playerIdx] += probability * payouts[pos];
        }
    }
    const totalICM = icmValues.reduce((sum, val) => sum + val, 0);
    const scaleFactor = totalPayout / totalICM;
    return icmValues.map(val => val * scaleFactor);
}

function calculateICM() {
    collectInputs();
    const numPlayers = players.length;
    const totalChips = players.reduce((sum, p) => sum + p.stack, 0);
    const totalPayout = payouts.reduce((sum, p) => sum + p, 0);
    if (totalChips === 0 || totalPayout === 0) return;

    const useMonteCarlo = numPlayers > 8;
    loadingDiv.style.display = 'block';
    calculateBtn.disabled = true;
    resultsDiv.style.display = 'none';

    setTimeout(() => {
        try {
            const stacks = players.map(p => p.stack);
            const payoutArray = payouts.slice();
            let icmValues = approximateICMWithMonteCarlo(stacks, payoutArray, MONTE_CARLO_SAMPLES);
            renderResults(players, payouts, icmValues, totalChips, totalPayout, useMonteCarlo);
        } catch (error) {
            alert(`Error calculating ICM: ${error.message}`);
        } finally {
            loadingDiv.style.display = 'none';
            calculateBtn.disabled = false;
        }
    }, 10);
}

function renderResults(players, payouts, icmValues, totalChips, totalPayout, useMonteCarlo) {
    const totalICM = icmValues.reduce((sum, val) => sum + val, 0.0);
    const chipRows = players.map((player, i) => `<tr><td>${player.name}</td><td>${player.stack}</td><td>$${icmValues[i].toFixed(2)}</td></tr>`).join('');
    const resultsHTML = `<table><thead><tr><th>Player</th><th>Chips</th><th>ICM Value</th></tr></thead><tbody>${chipRows}</tbody></table>`;
    resultsContent.innerHTML = resultsHTML;
    resultsDiv.style.display = 'block';
}
